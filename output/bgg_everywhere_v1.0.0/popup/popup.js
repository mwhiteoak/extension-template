// BGG Everywhere — Popup Script

(function () {
  'use strict';

  const SITES = ['amazon', 'target', 'walmart', 'miniaturemarket', 'coolstuffinc', 'gamenerdz', 'funagain'];

  async function load() {
    const opts = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, resolve);
    });

    // Tier badge
    const tierBadge = document.getElementById('bgg-tier-badge');
    if (opts.isPro) {
      tierBadge.textContent = 'Pro';
      tierBadge.classList.add('pro');
    }

    // Active sites
    const activeSites = opts.activeSites || SITES;
    SITES.forEach(site => {
      const cb = document.getElementById(`site-${site}`);
      if (cb) cb.checked = activeSites.includes(site);
    });

    // Display mode
    const displayEl = document.getElementById('bgg-display');
    if (displayEl) displayEl.value = opts.displayMode || 'expanded';
  }

  async function save() {
    const activeSites = SITES.filter(s => {
      const cb = document.getElementById(`site-${s}`);
      return cb && cb.checked;
    });
    const displayMode = document.getElementById('bgg-display')?.value || 'expanded';

    await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'SAVE_OPTIONS',
        options: { activeSites, displayMode },
      }, resolve);
    });
  }

  SITES.forEach(site => {
    document.getElementById(`site-${site}`)?.addEventListener('change', save);
  });

  document.getElementById('bgg-display')?.addEventListener('change', save);

  document.getElementById('bgg-options-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    window.close();
  });

  load();

})();
