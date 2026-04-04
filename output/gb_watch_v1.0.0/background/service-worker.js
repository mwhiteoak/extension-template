// GB Watch — Background Service Worker
// Handles alarm-based polling, status parsing, and notification dispatch

const ALARM_NAME = 'gb-watch-poll';
const POLL_INTERVAL_MINUTES = 30;

const OPT_DEFAULTS = {
  notificationsEnabled: true,
  pollIntervalMinutes: POLL_INTERVAL_MINUTES
};

async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('gbwatchOptions', (data) => {
      resolve({ ...OPT_DEFAULTS, ...(data.gbwatchOptions || {}) });
    });
  });
}

// ─── Status Parser Classes ────────────────────────────────────────────────────

class GeekHackParser {
  static domain = 'geekhack.org';

  static parseStatus(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const text = (titleMatch?.[1] || h1Match?.[1] || '').toUpperCase();

    if (text.includes('[SHIPPED]') || text.includes('[SHIPPING]')) return 'Shipping';
    if (text.includes('[CLOSED]') || text.includes('[ENDED]')) return 'GB Closed';
    if (text.includes('[GB]') || text.includes('[GROUP BUY]')) return 'GB Open';
    if (text.includes('[IC]') || text.includes('[INTEREST CHECK]')) return 'Interest Check';

    // Fallback: scan body for shipping language
    if (html.toLowerCase().includes('shipping now') || html.toLowerCase().includes('units shipped')) {
      return 'Shipping';
    }
    return 'Unknown';
  }

  static isGBPage(url) {
    return url.includes('geekhack.org/index.php?topic=');
  }

  static extractName(html, url) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      // Strip site name suffix like " - GeekHack"
      return titleMatch[1].replace(/\s*[-–|]\s*GeekHack.*$/i, '').trim();
    }
    return url;
  }
}

class DropParser {
  static domain = 'drop.com';

  static parseStatus(html) {
    // Target button text, not layout — DOM changes frequently
    if (/join\s+group\s+buy/i.test(html)) return 'GB Open';
    if (/notify\s+me/i.test(html)) return 'GB Closed';
    if (/add\s+to\s+cart/i.test(html)) return 'GB Open';
    if (/sold\s+out/i.test(html)) return 'GB Closed';
    if (/shipping\s+now/i.test(html) || /in\s+production/i.test(html)) return 'Shipping';
    return 'Unknown';
  }

  static isGBPage(url) {
    return url.includes('drop.com/buy/') || url.includes('drop.com/sell/');
  }

  static extractName(html, url) {
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const raw = ogTitle?.[1] || titleMatch?.[1] || url;
    return raw.replace(/\s*[-–|]\s*Drop.*$/i, '').trim();
  }
}

class NovelKeysParser {
  static domain = 'novelkeys.com';

  static parseStatus(html) {
    if (/sold\s+out/i.test(html)) return 'GB Closed';
    if (/waitlist/i.test(html)) return 'GB Closed';
    if (/pre[\s-]?order/i.test(html) && /add\s+to\s+cart/i.test(html)) return 'GB Open';
    if (/add\s+to\s+cart/i.test(html)) return 'GB Open';
    if (/shipping/i.test(html) && /now/i.test(html)) return 'Shipping';
    if (/interest\s+check/i.test(html) || /\bic\b/i.test(html)) return 'Interest Check';
    return 'Unknown';
  }

  static isGBPage(url) {
    return url.includes('novelkeys.com/products/');
  }

  static extractName(html, url) {
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const raw = ogTitle?.[1] || titleMatch?.[1] || url;
    return raw.replace(/\s*[-–|]\s*NovelKeys.*$/i, '').trim();
  }
}

class CannonKeysParser {
  static domain = 'cannonkeys.com';

  static parseStatus(html) {
    if (/sold\s+out/i.test(html)) return 'GB Closed';
    if (/waitlist/i.test(html)) return 'GB Closed';
    if (/pre[\s-]?order/i.test(html)) return 'GB Open';
    if (/add\s+to\s+cart/i.test(html)) return 'GB Open';
    if (/group\s+buy\s+open/i.test(html)) return 'GB Open';
    if (/group\s+buy\s+closed/i.test(html)) return 'GB Closed';
    if (/shipping/i.test(html) && /now/i.test(html)) return 'Shipping';
    if (/interest\s+check/i.test(html)) return 'Interest Check';
    return 'Unknown';
  }

  static isGBPage(url) {
    return url.includes('cannonkeys.com/products/');
  }

  static extractName(html, url) {
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const raw = ogTitle?.[1] || titleMatch?.[1] || url;
    return raw.replace(/\s*[-–|]\s*CannonKeys.*$/i, '').trim();
  }
}

// ─── Domain Router ────────────────────────────────────────────────────────────

function getParserForUrl(url) {
  if (url.includes('geekhack.org')) return GeekHackParser;
  if (url.includes('drop.com')) return DropParser;
  if (url.includes('novelkeys.com')) return NovelKeysParser;
  if (url.includes('cannonkeys.com')) return CannonKeysParser;
  return null;
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

async function getWatchList() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('watchList', (data) => {
      resolve(data.watchList || []);
    });
  });
}

async function saveWatchList(watchList) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ watchList }, resolve);
  });
}

// ─── Fetch & Parse ────────────────────────────────────────────────────────────

async function fetchAndParseStatus(item) {
  try {
    const response = await fetch(item.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GBWatch/1.0)' }
    });
    if (!response.ok) return { status: 'Unknown', name: item.name };

    const html = await response.text();
    const Parser = getParserForUrl(item.url);
    if (!Parser) return { status: 'Unknown', name: item.name };

    const status = Parser.parseStatus(html);
    const name = item.name || Parser.extractName(html, item.url);
    return { status, name };
  } catch {
    return { status: item.lastStatus || 'Unknown', name: item.name };
  }
}

// ─── Notification ─────────────────────────────────────────────────────────────

async function fireNotification(item, oldStatus, newStatus) {
  const opts = await getOptions();
  if (!opts.notificationsEnabled) return;
  const domain = new URL(item.url).hostname.replace('www.', '');
  chrome.notifications.create(`gbwatch-${item.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'GB Watch — Status Update',
    message: `${item.name} · ${domain}\nStatus changed: ${oldStatus} → ${newStatus}`
  });
}

// ─── Poll Logic ───────────────────────────────────────────────────────────────

async function pollWatchList() {
  const watchList = await getWatchList();
  if (!watchList.length) return;

  const updated = await Promise.all(
    watchList.map(async (item) => {
      const { status, name } = await fetchAndParseStatus(item);
      const now = new Date().toISOString();

      if (item.lastStatus && item.lastStatus !== status) {
        fireNotification({ ...item, name }, item.lastStatus, status);
      }

      return {
        ...item,
        name: name || item.name,
        lastStatus: status,
        lastChecked: now
      };
    })
  );

  await saveWatchList(updated);
}

// ─── Alarm Setup ──────────────────────────────────────────────────────────────

async function scheduleAlarm() {
  const opts = await getOptions();
  const interval = opts.pollIntervalMinutes;
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: interval,
    periodInMinutes: interval
  });
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    pollWatchList();
  }
});

// ─── Message Handler (from popup/content) ────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ADD_ITEM') {
    handleAddItem(message.url, message.name).then(sendResponse);
    return true; // async
  }
  if (message.type === 'REMOVE_ITEM') {
    handleRemoveItem(message.id).then(sendResponse);
    return true;
  }
  if (message.type === 'POLL_NOW') {
    pollWatchList().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'GET_WATCH_LIST') {
    getWatchList().then((list) => sendResponse({ watchList: list }));
    return true;
  }
  if (message.type === 'OPTIONS_UPDATED') {
    scheduleAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function handleAddItem(url, name) {
  const watchList = await getWatchList();
  const existing = watchList.find((i) => i.url === url);
  if (existing) return { ok: false, error: 'Already watching this URL.' };

  const Parser = getParserForUrl(url);
  if (!Parser) return { ok: false, error: 'Unsupported site. Use GeekHack, Drop, NovelKeys, or CannonKeys.' };

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let resolvedName = name || '';
  let lastStatus = 'Unknown';

  try {
    const response = await fetch(url);
    if (response.ok) {
      const html = await response.text();
      lastStatus = Parser.parseStatus(html);
      if (!resolvedName) resolvedName = Parser.extractName(html, url);
    }
  } catch {
    // proceed with Unknown status
  }

  const newItem = {
    id,
    url,
    name: resolvedName || url,
    lastStatus,
    lastChecked: new Date().toISOString(),
    addedAt: new Date().toISOString()
  };

  watchList.push(newItem);
  await saveWatchList(watchList);
  return { ok: true, item: newItem };
}

async function handleRemoveItem(id) {
  const watchList = await getWatchList();
  const filtered = watchList.filter((i) => i.id !== id);
  await saveWatchList(filtered);
  return { ok: true };
}
