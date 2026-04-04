// Auto-Context Time Tracker — Popup JS

// ─── State ────────────────────────────────────────────────────────────────────

let timerInterval = null;
let currentState = null;
let optionsData = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const clientDot        = document.getElementById('client-dot');
const clientNameEl     = document.getElementById('client-name');
const projectNameEl    = document.getElementById('project-name');
const elapsedEl        = document.getElementById('elapsed-time');
const stateLabelEl     = document.getElementById('timer-state-label');

const clientSelect     = document.getElementById('client-select');
const projectSelect    = document.getElementById('project-select');
const startBtn         = document.getElementById('start-btn');
const stopBtn          = document.getElementById('stop-btn');

const reviewBtn        = document.getElementById('review-btn');
const pendingBadge     = document.getElementById('pending-badge');

const appPanel         = document.getElementById('app');
const reviewPanel      = document.getElementById('review-panel');
const reviewList       = document.getElementById('review-list');
const approveAllBtn    = document.getElementById('approve-all-btn');
const syncBtn          = document.getElementById('sync-btn');
const syncStatus       = document.getElementById('sync-status');
const reviewBackBtn    = document.getElementById('review-back-btn');

const upgradeBanner    = document.getElementById('upgrade-banner');
const upgradeBtn       = document.getElementById('upgrade-btn');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(startedAt) {
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(startedAt, endedAt) {
  const sec = Math.floor((endedAt - startedAt) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function msg(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

// ─── Main View ────────────────────────────────────────────────────────────────

async function loadMainView() {
  const [stateResp, optResp] = await Promise.all([
    msg('GET_STATE'),
    msg('GET_OPTIONS'),
  ]);

  currentState = stateResp;
  optionsData  = optResp;

  renderTimerCard(stateResp);
  populateManualControls(optResp);
  await loadPendingBadge();
  checkUpgradeBanner(optResp);
}

function renderTimerCard(stateResp) {
  const { timer, client, project } = stateResp;

  // Clear interval
  if (timerInterval) clearInterval(timerInterval);

  if (timer.state === 'tracking') {
    clientDot.className = 'dot dot-tracking';
    clientNameEl.textContent = client?.name || 'Unknown client';
    projectNameEl.textContent = project?.name || '';
    stateLabelEl.textContent = 'Tracking';
    elapsedEl.textContent = formatElapsed(timer.startedAt);
    timerInterval = setInterval(() => {
      elapsedEl.textContent = formatElapsed(timer.startedAt);
    }, 1000);
    stopBtn.style.display = '';
    document.getElementById('manual-start-row').style.display = 'none';
  } else if (timer.state === 'paused') {
    clientDot.className = 'dot dot-paused';
    clientNameEl.textContent = client?.name || 'Paused';
    projectNameEl.textContent = project?.name || '';
    stateLabelEl.textContent = 'Paused';
    elapsedEl.textContent = '--:--:--';
    stopBtn.style.display = '';
    document.getElementById('manual-start-row').style.display = '';
  } else {
    clientDot.className = 'dot dot-idle';
    clientNameEl.textContent = 'Not tracking';
    projectNameEl.textContent = '';
    stateLabelEl.textContent = 'Idle';
    elapsedEl.textContent = '--:--:--';
    stopBtn.style.display = 'none';
    document.getElementById('manual-start-row').style.display = '';
  }
}

function populateManualControls(optResp) {
  const { clients, projects } = optResp;

  // Populate client dropdown
  clientSelect.innerHTML = '<option value="">Select client…</option>';
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    clientSelect.appendChild(opt);
  });

  // Project dropdown populated on client change
  clientSelect.addEventListener('change', () => {
    const cid = clientSelect.value;
    projectSelect.innerHTML = '<option value="">Select project…</option>';
    projects.filter(p => p.clientId === cid).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      projectSelect.appendChild(opt);
    });
    startBtn.disabled = !cid;
  });

  projectSelect.addEventListener('change', () => {
    startBtn.disabled = !(clientSelect.value && projectSelect.value);
  });
}

async function loadPendingBadge() {
  const resp = await msg('GET_REVIEW_DATA');
  const count = resp.sessions?.length || 0;
  if (count > 0) {
    pendingBadge.textContent = count;
    pendingBadge.style.display = '';
  } else {
    pendingBadge.style.display = 'none';
  }
}

function checkUpgradeBanner(optResp) {
  const FREE_MAPPING_LIMIT = 2;
  if (optResp.mappings.length >= FREE_MAPPING_LIMIT) {
    upgradeBanner.style.display = '';
  }
}

// ─── Manual controls ──────────────────────────────────────────────────────────

startBtn.addEventListener('click', async () => {
  const clientId  = clientSelect.value;
  const projectId = projectSelect.value;
  if (!clientId) return;
  await msg('MANUAL_START', { clientId, projectId: projectId || null });
  await loadMainView();
});

stopBtn.addEventListener('click', async () => {
  await msg('MANUAL_STOP');
  await loadMainView();
});

// ─── Review Panel ─────────────────────────────────────────────────────────────

reviewBtn.addEventListener('click', async () => {
  appPanel.style.display = 'none';
  upgradeBanner.style.display = 'none';
  reviewPanel.style.display = '';
  await loadReviewPanel();
});

reviewBackBtn.addEventListener('click', () => {
  reviewPanel.style.display = 'none';
  appPanel.style.display = '';
  loadMainView();
});

async function loadReviewPanel() {
  const resp = await msg('GET_REVIEW_DATA');
  const sessions = resp.sessions || [];

  reviewList.innerHTML = '';

  if (!sessions.length) {
    reviewList.innerHTML = '<p style="color:#888;font-size:12px;text-align:center;padding:16px">No pending sessions for today.</p>';
    approveAllBtn.disabled = true;
    syncBtn.disabled = true;
    return;
  }

  approveAllBtn.disabled = false;

  sessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.dataset.id = session.id;

    const duration = session.endedAt ? formatDuration(session.startedAt, session.endedAt) : '(running)';
    const timeRange = `${formatTime(session.startedAt)} – ${session.endedAt ? formatTime(session.endedAt) : 'now'}`;

    item.innerHTML = `
      <div class="review-item-header">
        <span><span class="status-dot status-${session.status}"></span>${session.clientName}</span>
        <span style="font-weight:400;font-size:12px">${duration}</span>
      </div>
      <div class="review-item-meta">${session.projectName} &middot; ${timeRange}</div>
      <input type="text" class="note-input" placeholder="Add note…" value="${escapeHtmlAttr(session.note || '')}">
      <div class="review-item-actions">
        <button class="btn btn-green approve-btn" data-id="${session.id}">Approve</button>
        <button class="btn btn-red delete-btn" data-id="${session.id}">Delete</button>
      </div>
    `;
    reviewList.appendChild(item);
  });

  // Check if any approved sessions exist (for sync button state)
  const resp2 = await chrome.runtime.sendMessage({ type: 'GET_OPTIONS' });
  const hasSyncTarget = resp2.settings?.syncTarget !== 'none';
  syncBtn.disabled = !hasSyncTarget;
  if (!hasSyncTarget) {
    syncStatus.textContent = 'Configure sync in Settings';
  }

  // Wire item-level buttons
  reviewList.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const item = reviewList.querySelector(`[data-id="${id}"]`);
      const note = item.querySelector('.note-input').value;
      await msg('APPROVE_SESSION', { sessionId: id, note });
      await loadReviewPanel();
      await loadPendingBadge();
    });
  });

  reviewList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await msg('DELETE_SESSION', { sessionId: id });
      await loadReviewPanel();
      await loadPendingBadge();
    });
  });
}

approveAllBtn.addEventListener('click', async () => {
  await msg('APPROVE_ALL');
  await loadReviewPanel();
  await loadPendingBadge();
});

syncBtn.addEventListener('click', async () => {
  syncStatus.textContent = 'Syncing…';
  syncBtn.disabled = true;
  const result = await msg('SYNC_SESSIONS');
  if (result.errors && result.errors.length > 0) {
    syncStatus.textContent = `Synced ${result.synced}, ${result.errors.length} error(s)`;
  } else {
    syncStatus.textContent = `Synced ${result.synced} session(s)`;
  }
  syncBtn.disabled = false;
  await loadReviewPanel();
  await loadPendingBadge();
});

// ─── Upgrade banner ───────────────────────────────────────────────────────────

upgradeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://your-stripe-checkout-url.example.com/checkout' });
});

// ─── Utils ────────────────────────────────────────────────────────────────────

function escapeHtmlAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadMainView);
