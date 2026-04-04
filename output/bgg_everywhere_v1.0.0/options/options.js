// BGG Everywhere — Options Page Script

(function () {
  'use strict';

  const SITES = ['amazon', 'target', 'walmart', 'miniaturemarket', 'coolstuffinc', 'gamenerdz', 'funagain'];

  async function load() {
    const opts = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, resolve);
    });

    // Tier
    const tierPill = document.getElementById('bgg-tier-pill');
    if (opts.isPro) {
      tierPill.textContent = 'Pro';
      tierPill.classList.add('pro');
      document.getElementById('bgg-upgrade-section').style.display = 'none';
    }

    // Active sites
    const activeSites = opts.activeSites || SITES;
    SITES.forEach(s => {
      const el = document.getElementById(`opt-${s}`);
      if (el) el.checked = activeSites.includes(s);
    });

    // Display mode
    const displayEl = document.getElementById('opt-display');
    if (displayEl) displayEl.value = opts.displayMode || 'expanded';

    // BGG username
    const usernameEl = document.getElementById('opt-username');
    if (usernameEl && opts.bggUsername) usernameEl.value = opts.bggUsername;
  }

  async function save() {
    const activeSites = SITES.filter(s => {
      const el = document.getElementById(`opt-${s}`);
      return el && el.checked;
    });

    const displayMode = document.getElementById('opt-display')?.value || 'expanded';
    const bggUsername = document.getElementById('opt-username')?.value.trim() || null;

    await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'SAVE_OPTIONS',
        options: { activeSites, displayMode, bggUsername },
      }, resolve);
    });

    const statusEl = document.getElementById('bgg-save-status');
    statusEl.style.display = 'inline';
    setTimeout(() => { statusEl.style.display = 'none'; }, 2500);
  }

  document.getElementById('bgg-save-btn')?.addEventListener('click', save);

  document.getElementById('bgg-upgrade-btn')?.addEventListener('click', () => {
    // Stripe stub — opens BGG to show context
    chrome.tabs.create({ url: 'https://boardgamegeek.com' });
  });

  load();

})();
