// Vinyl Companion — Options Page Script

(function () {
  'use strict';

  const SITES = ['spotify', 'youtube', 'pitchfork', 'allmusic'];

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function load() {
    const opts = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, resolve);
    });

    // Tier
    const tierPill = document.getElementById('vc-tier-pill');
    if (opts.isPro) {
      tierPill.textContent = 'Pro';
      tierPill.classList.add('pro');
    }

    // Sites
    const activeSites = opts.activeSites || SITES;
    SITES.forEach(s => {
      const el = document.getElementById(`opt-${s}`);
      if (el) el.checked = activeSites.includes(s);
    });

    // Currency
    const currEl = document.getElementById('opt-currency');
    if (currEl) currEl.value = opts.currency || 'USD';

    // Discogs credentials
    const tokenEl = document.getElementById('opt-token');
    const userEl = document.getElementById('opt-username');
    if (opts.discogsToken) tokenEl.value = opts.discogsToken;
    if (opts.discogsUsername) userEl.value = opts.discogsUsername;
    updateAuthStatus(opts.discogsUsername, opts.discogsToken);

    // Pro sections
    document.getElementById('vc-alerts-section').style.display = opts.isPro ? '' : 'none';
    document.getElementById('vc-collection-section').style.display = opts.isPro ? '' : 'none';
    document.getElementById('vc-upgrade-block').style.display = opts.isPro ? 'none' : '';

    if (opts.isPro) {
      loadAlerts();
    }
  }

  function updateAuthStatus(username, token) {
    const statusEl = document.getElementById('vc-auth-status');
    if (username && token) {
      statusEl.textContent = `Connected as @${username}`;
      statusEl.className = 'vc-auth-status connected';
    } else {
      statusEl.textContent = 'Not connected';
      statusEl.className = 'vc-auth-status disconnected';
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function save() {
    const activeSites = SITES.filter(s => {
      const el = document.getElementById(`opt-${s}`);
      return el && el.checked;
    });

    const currency = document.getElementById('opt-currency')?.value || 'USD';
    const token = document.getElementById('opt-token')?.value.trim() || null;
    const username = document.getElementById('opt-username')?.value.trim() || null;

    await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'SAVE_OPTIONS',
        options: { activeSites, currency, discogsToken: token, discogsUsername: username },
      }, resolve);
    });

    const statusEl = document.getElementById('vc-save-status');
    statusEl.style.display = 'inline';
    setTimeout(() => { statusEl.style.display = 'none'; }, 2500);

    updateAuthStatus(username, token);
  }

  // ── Alerts ───────────────────────────────────────────────────────────────────

  async function loadAlerts() {
    const stored = await chrome.storage.local.get('vc_alerts');
    const alerts = stored.vc_alerts || {};
    const container = document.getElementById('vc-alerts-list');

    const ids = Object.keys(alerts);
    if (ids.length === 0) {
      container.innerHTML = '<div style="font-size:12px;color:#6060a0;text-align:center;padding:10px 0">No price alerts set yet.<br>Add alerts from the panel while browsing.</div>';
      return;
    }

    container.innerHTML = '';
    ids.forEach(releaseId => {
      const alert = alerts[releaseId];
      const item = document.createElement('div');
      item.className = 'vc-alert-item';
      item.innerHTML = `
        <span class="vc-alert-item-title">${escHtml(alert.releaseTitle || releaseId)}</span>
        <span class="vc-alert-item-price">${alert.currency || 'USD'} ${alert.threshold}</span>
        <button class="vc-alert-remove" data-id="${releaseId}" title="Remove alert">&times;</button>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('.vc-alert-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const stored2 = await chrome.storage.local.get('vc_alerts');
        const a = stored2.vc_alerts || {};
        delete a[id];
        await chrome.storage.local.set({ vc_alerts: a });
        loadAlerts();
      });
    });
  }

  // ── Collection value ─────────────────────────────────────────────────────────

  document.getElementById('vc-refresh-collection-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('vc-refresh-collection-btn');
    const valEl = document.getElementById('vc-collection-value');
    btn.disabled = true;
    btn.textContent = 'Loading…';
    valEl.textContent = '…';

    const result = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_COLLECTION_VALUE' }, resolve);
    });

    btn.disabled = false;
    btn.textContent = 'Refresh Collection Value';

    if (result?.error === 'no_auth') {
      valEl.textContent = 'Connect your account first';
      valEl.style.fontSize = '13px';
    } else if (result?.total !== undefined) {
      valEl.textContent = `USD ${result.total.toFixed(2)}`;
      valEl.style.fontSize = '22px';
      const note = document.createElement('div');
      note.style.cssText = 'font-size:11px;color:#6060a0;margin-top:4px';
      note.textContent = `Based on ${result.counted} of ${result.sampleSize} releases`;
      valEl.parentNode.insertBefore(note, valEl.nextSibling);
    } else {
      valEl.textContent = 'Error loading collection';
      valEl.style.fontSize = '13px';
    }
  });

  // ── Listeners ────────────────────────────────────────────────────────────────

  document.getElementById('vc-save-btn')?.addEventListener('click', save);

  document.getElementById('vc-connect-btn')?.addEventListener('click', async () => {
    // Save current token/username, then open Discogs developer settings
    await save();
    chrome.runtime.sendMessage({ type: 'DISCOGS_OAUTH_START' });
  });

  document.getElementById('vc-upgrade-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  load();

})();
