// Auto-Context Time Tracker — Background Service Worker
// MV3: uses chrome.alarms to survive the 5-min inactivity shutdown

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'actt_data';
const ALARM_KEEP_ALIVE = 'keepAlive';
const ALARM_DAILY_REVIEW = 'dailyReview';

// Timer states
const STATE = { IDLE: 'idle', TRACKING: 'tracking', PAUSED: 'paused' };

// Badge colours per state
const BADGE_COLOR = {
  [STATE.IDLE]: '#9E9E9E',
  [STATE.TRACKING]: '#4CAF50',
  [STATE.PAUSED]: '#FF9800',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || defaultData();
}

function defaultData() {
  return {
    mappings: [],
    clients: [],
    projects: [],
    sessions: [],
    timer: { state: STATE.IDLE, clientId: null, projectId: null, sessionId: null, startedAt: null },
    settings: {
      togglToken: '',
      clockifyApiKey: '',
      togglWorkspaceId: '',
      clockifyWorkspaceId: '',
      idleThresholdMinutes: 5,
      dailyReviewTime: '18:00',
      syncTarget: 'none', // 'none' | 'toggl' | 'clockify'
    },
  };
}

async function saveData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// ─── Pattern Matching ─────────────────────────────────────────────────────────

/**
 * Test a URL string against a mapping pattern.
 * Supports:
 *   exact   — "https://app.notion.so/MyWorkspace"
 *   domain  — "notion.so" or "*.notion.so"
 *   wildcard— "github.com/acme-corp*" (glob-style * becomes .*)
 */
function patternMatchesUrl(pattern, url) {
  try {
    const urlObj = new URL(url);
    const href = url.replace(/\/$/, '');

    // Full URL pattern (has ://)
    if (pattern.includes('://')) {
      const p = pattern.replace(/\/$/, '');
      if (p.includes('*')) {
        const regex = new RegExp('^' + escapeForRegex(p).replace(/\\\*/g, '.*') + '$');
        return regex.test(href);
      }
      return href === p || href.startsWith(p + '/');
    }

    // Domain-only pattern (e.g. "notion.so" or "*.notion.so" or "github.com/acme*")
    const withWildcard = pattern.startsWith('*.');
    const cleanPattern = withWildcard ? pattern.slice(2) : pattern;

    if (cleanPattern.includes('*')) {
      const regex = new RegExp('^' + escapeForRegex(cleanPattern).replace(/\\\*/g, '.*') + '$');
      const hostPlusPath = urlObj.hostname.replace(/^www\./, '') + urlObj.pathname + urlObj.search;
      return regex.test(hostPlusPath);
    }

    const host = urlObj.hostname.replace(/^www\./, '');
    const patternDomain = cleanPattern.split('/')[0];
    const patternPath = cleanPattern.slice(patternDomain.length);

    const domainMatch = withWildcard
      ? (host === patternDomain || host.endsWith('.' + patternDomain))
      : (host === patternDomain || host.endsWith('.' + patternDomain));

    if (!domainMatch) return false;
    if (patternPath) return urlObj.pathname.startsWith(patternPath);
    return true;
  } catch {
    return false;
  }
}

function escapeForRegex(str) {
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the best-matching mapping for a URL.
 * Best = longest pattern (most specific).
 */
function findMapping(mappings, url) {
  const matches = mappings.filter(m => patternMatchesUrl(m.pattern, url));
  if (!matches.length) return null;
  return matches.reduce((best, m) => (m.pattern.length > best.pattern.length ? m : best));
}

// ─── Timer State Machine ──────────────────────────────────────────────────────

async function startTracking(data, clientId, projectId) {
  const now = Date.now();
  const sessionId = generateId();
  data.sessions.push({
    id: sessionId,
    clientId,
    projectId,
    startedAt: now,
    endedAt: null,
    status: 'pending',
    note: '',
  });
  data.timer = { state: STATE.TRACKING, clientId, projectId, sessionId, startedAt: now };
  await saveData(data);
  await updateBadge(data);
}

async function pauseTracking(data) {
  if (data.timer.state !== STATE.TRACKING) return;
  const session = data.sessions.find(s => s.id === data.timer.sessionId);
  if (session) session.endedAt = Date.now();
  data.timer = { ...data.timer, state: STATE.PAUSED };
  await saveData(data);
  await updateBadge(data);
}

async function stopTracking(data) {
  if (data.timer.state === STATE.TRACKING) {
    const session = data.sessions.find(s => s.id === data.timer.sessionId);
    if (session) session.endedAt = Date.now();
  }
  data.timer = { state: STATE.IDLE, clientId: null, projectId: null, sessionId: null, startedAt: null };
  await saveData(data);
  await updateBadge(data);
}

// ─── Badge ────────────────────────────────────────────────────────────────────

async function updateBadge(data) {
  const { state, clientId } = data.timer;
  const color = BADGE_COLOR[state] || BADGE_COLOR[STATE.IDLE];
  const client = data.clients.find(c => c.id === clientId);

  chrome.action.setBadgeBackgroundColor({ color });

  if (state === STATE.TRACKING && client) {
    const abbrev = client.name.slice(0, 2).toUpperCase();
    chrome.action.setBadgeText({ text: abbrev });
  } else if (state === STATE.PAUSED) {
    chrome.action.setBadgeText({ text: '||' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Tab Change Handler ───────────────────────────────────────────────────────

async function handleTabChange(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

  const data = await loadData();
  const mapping = findMapping(data.mappings, url);

  if (mapping) {
    const { clientId, projectId } = mapping;
    if (data.timer.state === STATE.TRACKING) {
      if (data.timer.clientId === clientId && data.timer.projectId === projectId) {
        return; // Same client, keep going
      }
      // Different client — close current session, start new
      const session = data.sessions.find(s => s.id === data.timer.sessionId);
      if (session) session.endedAt = Date.now();
      await startTracking(data, clientId, projectId);
    } else {
      await startTracking(data, clientId, projectId);
    }
  } else {
    if (data.timer.state === STATE.TRACKING) {
      await pauseTracking(data);
    }
  }
}

// ─── Chrome Event Listeners ───────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) await handleTabChange(tab.url);
  } catch { /* tab closed */ }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id === tabId) {
      await handleTabChange(tab.url);
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const data = await loadData();
    if (data.timer.state === STATE.TRACKING) await pauseTracking(data);
  } else {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, windowId });
      if (activeTab && activeTab.url) await handleTabChange(activeTab.url);
    } catch { /* ignore */ }
  }
});

chrome.idle.onStateChanged.addListener(async (newState) => {
  const data = await loadData();
  if (newState === 'idle' || newState === 'locked') {
    if (data.timer.state === STATE.TRACKING) await pauseTracking(data);
  } else if (newState === 'active') {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url) await handleTabChange(activeTab.url);
    } catch { /* ignore */ }
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_KEEP_ALIVE) {
    // Wakes the service worker — no-op
    return;
  }
  if (alarm.name === ALARM_DAILY_REVIEW) {
    const data = await loadData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pending = data.sessions.filter(
      s => s.status === 'pending' && s.endedAt && s.startedAt >= today.getTime()
    );
    if (pending.length > 0) {
      chrome.notifications.create('daily-review', {
        type: 'basic',
        iconUrl: '../assets/icons/icon48.png',
        title: 'Review your tracked sessions',
        message: `${pending.length} session(s) pending review before sync.`,
        buttons: [{ title: 'Review Now' }],
      });
    }
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId) => {
  if (notificationId === 'daily-review') {
    chrome.action.openPopup();
  }
});

// ─── Install / Startup ────────────────────────────────────────────────────────

async function setupAlarms(data) {
  await chrome.alarms.create(ALARM_KEEP_ALIVE, { periodInMinutes: 4 });

  const [h, m] = (data.settings.dailyReviewTime || '18:00').split(':').map(Number);
  const now = new Date();
  let reviewTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (reviewTime <= now) reviewTime.setDate(reviewTime.getDate() + 1);
  await chrome.alarms.create(ALARM_DAILY_REVIEW, {
    when: reviewTime.getTime(),
    periodInMinutes: 24 * 60,
  });

  const idleMin = data.settings.idleThresholdMinutes || 5;
  chrome.idle.setDetectionInterval(idleMin * 60);
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const data = await loadData();
  await saveData(data);
  await setupAlarms(data);
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await loadData();
  await setupAlarms(data);
  await updateBadge(data);
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    const data = await loadData();

    switch (message.type) {
      case 'GET_STATE': {
        const session = data.sessions.find(s => s.id === data.timer.sessionId) || null;
        const client = data.clients.find(c => c.id === data.timer.clientId) || null;
        const project = data.projects.find(p => p.id === data.timer.projectId) || null;
        sendResponse({ timer: data.timer, session, client, project });
        break;
      }

      case 'MANUAL_STOP': {
        await stopTracking(data);
        sendResponse({ ok: true });
        break;
      }

      case 'MANUAL_START': {
        await startTracking(data, message.clientId, message.projectId);
        sendResponse({ ok: true });
        break;
      }

      case 'GET_REVIEW_DATA': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sessions = data.sessions
          .filter(s => s.status === 'pending' && s.endedAt && s.startedAt >= today.getTime())
          .map(s => ({
            ...s,
            clientName: data.clients.find(c => c.id === s.clientId)?.name || 'Unknown',
            projectName: data.projects.find(p => p.id === s.projectId)?.name || 'Unknown',
          }));
        sendResponse({ sessions });
        break;
      }

      case 'APPROVE_SESSION': {
        const s = data.sessions.find(s => s.id === message.sessionId);
        if (s) {
          s.status = 'approved';
          if (message.note !== undefined) s.note = message.note;
          if (message.startedAt !== undefined) s.startedAt = message.startedAt;
          if (message.endedAt !== undefined) s.endedAt = message.endedAt;
        }
        await saveData(data);
        sendResponse({ ok: true });
        break;
      }

      case 'DELETE_SESSION': {
        data.sessions = data.sessions.filter(s => s.id !== message.sessionId);
        await saveData(data);
        sendResponse({ ok: true });
        break;
      }

      case 'APPROVE_ALL': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        data.sessions
          .filter(s => s.status === 'pending' && s.endedAt && s.startedAt >= today.getTime())
          .forEach(s => { s.status = 'approved'; });
        await saveData(data);
        sendResponse({ ok: true });
        break;
      }

      case 'SYNC_SESSIONS': {
        const result = await syncSessions(data);
        await saveData(data);
        sendResponse(result);
        break;
      }

      case 'GET_OPTIONS': {
        sendResponse({
          mappings: data.mappings,
          clients: data.clients,
          projects: data.projects,
          settings: data.settings,
        });
        break;
      }

      case 'SAVE_OPTIONS': {
        if (message.mappings !== undefined) data.mappings = message.mappings;
        if (message.clients !== undefined) data.clients = message.clients;
        if (message.projects !== undefined) data.projects = message.projects;
        if (message.settings !== undefined) data.settings = { ...data.settings, ...message.settings };
        await saveData(data);
        const idleMin = data.settings.idleThresholdMinutes || 5;
        chrome.idle.setDetectionInterval(idleMin * 60);
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true;
});

// ─── Sync ─────────────────────────────────────────────────────────────────────

async function syncSessions(data) {
  const approved = data.sessions.filter(s => s.status === 'approved');
  if (!approved.length) return { synced: 0, errors: [] };

  const { syncTarget, togglToken, togglWorkspaceId, clockifyApiKey, clockifyWorkspaceId } = data.settings;
  const errors = [];
  let synced = 0;

  for (const session of approved) {
    const client = data.clients.find(c => c.id === session.clientId);
    const project = data.projects.find(p => p.id === session.projectId);
    const description = `${client?.name || 'Unknown'} — ${project?.name || 'Unknown'}`;
    const startIso = new Date(session.startedAt).toISOString();
    const endIso = new Date(session.endedAt).toISOString();
    const durationSec = Math.round((session.endedAt - session.startedAt) / 1000);

    try {
      if (syncTarget === 'toggl' && togglToken && togglWorkspaceId) {
        const resp = await fetch(
          `https://api.track.toggl.com/api/v9/workspaces/${togglWorkspaceId}/time_entries`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + btoa(togglToken + ':api_token'),
            },
            body: JSON.stringify({
              description,
              start: startIso,
              stop: endIso,
              duration: durationSec,
              created_with: 'AutoContextTimeTracker',
            }),
          }
        );
        if (!resp.ok) throw new Error(`Toggl ${resp.status}`);
      } else if (syncTarget === 'clockify' && clockifyApiKey && clockifyWorkspaceId) {
        const resp = await fetch(
          `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/time-entries`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': clockifyApiKey,
            },
            body: JSON.stringify({ description, start: startIso, end: endIso }),
          }
        );
        if (!resp.ok) throw new Error(`Clockify ${resp.status}`);
      } else {
        break; // No sync configured
      }
      session.status = 'synced';
      synced++;
    } catch (err) {
      errors.push({ sessionId: session.id, error: err.message });
      session.status = 'error';
    }
  }

  return { synced, errors };
}
