// Vinyl Companion — Popup Script

(function () {
  'use strict';

  const SITES = ['spotify', 'youtube', 'pitchfork', 'allmusic'];

  async function load() {
    const opts = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, resolve);
    });

    // Tier badge
    const tierBadge = document.getElementById('vc-tier-badge');
    if (opts.isPro) {
      tierBadge.textContent = 'Pro';
      tierBadge.classList.add('pro');
    } else {
      tierBadge.textContent = 'Free';
    }

    // Active sites
    const activeSites = opts.activeSites || SITES;
    SITES.forEach(site => {
      const cb = document.getElementById(`site-${site}`);
      if (cb) cb.checked = activeSites.includes(site);
    });

    // Currency
    const currencyEl = document.getElementById('vc-currency');
    if (currencyEl) currencyEl.value = opts.currency || 'USD';

    // Pro section
    document.getElementById('vc-pro-section').style.display = opts.isPro ? '' : 'none';

    if (opts.isPro) {
      // Discogs connection status
      const statusEl = document.getElementById('vc-discogs-status');
      statusEl.textContent = opts.discogsUsername ? `@${opts.discogsUsername}` : 'Not connected';
      statusEl.classList.toggle('connected', !!opts.discogsUsername);

      // Alert count
      const stored = await chrome.storage.local.get('vc_alerts');
      const alertCount = Object.keys(stored.vc_alerts || {}).length;
      document.getElementById('vc-alerts-count').textContent = `${alertCount} active`;
    }
  }

  async function save() {
    const activeSites = SITES.filter(s => {
      const cb = document.getElementById(`site-${s}`);
      return cb && cb.checked;
    });
    const currency = document.getElementById('vc-currency')?.value || 'USD';

    await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'SAVE_OPTIONS',
        options: { activeSites, currency },
      }, resolve);
    });
  }

  // ── Listeners ────────────────────────────────────────────────────────────────

  SITES.forEach(site => {
    document.getElementById(`site-${site}`)?.addEventListener('change', save);
  });

  document.getElementById('vc-currency')?.addEventListener('change', save);

  document.getElementById('vc-options-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    window.close();
  });

  load();

})();
