/**
 * Tank Scout — Content Script
 * Detects aquarium fish species names on listing pages and injects
 * an inline compatibility panel.
 */

(function () {
  'use strict';

  if (window.__tankScoutRunning) return;
  window.__tankScoutRunning = true;

  // ── State ─────────────────────────────────────────────────────────────────

  let speciesDB = {};       // scientificName -> species object (from bundled JSON)
  let nameIndex = [];       // sorted array of {pattern, scientificName} for matching
  let tankProfile = null;   // { gallons, ph, tempF, fish: [{scientificName, commonName}] }

  // ── Load data ─────────────────────────────────────────────────────────────

  async function loadSpecies() {
    const resp = await fetch(chrome.runtime.getURL('data/species.json'));
    const data = await resp.json();
    speciesDB = {};
    nameIndex = [];
    for (const sp of data.species) {
      speciesDB[sp.scientificName] = sp;
      // Index by scientific name
      nameIndex.push({ pattern: sp.scientificName.toLowerCase(), scientificName: sp.scientificName });
      // Index by each common name
      for (const common of sp.commonNames || []) {
        nameIndex.push({ pattern: common.toLowerCase(), scientificName: sp.scientificName });
      }
    }
    // Longest patterns first to prefer specific matches
    nameIndex.sort((a, b) => b.pattern.length - a.pattern.length);
  }

  function loadTankProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tankProfile'], (result) => {
        tankProfile = result.tankProfile || null;
        resolve();
      });
    });
  }

  // Listen for tank profile updates from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TANK_UPDATED') {
      tankProfile = msg.tankProfile;
      refreshPanels();
    }
  });

  // ── Species detection ─────────────────────────────────────────────────────

  /**
   * Search text for any known species name (common or scientific).
   * Returns the first match found, or null.
   */
  function detectSpecies(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const entry of nameIndex) {
      // Word-boundary-aware: check that the match isn't mid-word
      const idx = lower.indexOf(entry.pattern);
      if (idx === -1) continue;
      const before = idx === 0 ? ' ' : lower[idx - 1];
      const after = idx + entry.pattern.length >= lower.length ? ' ' : lower[idx + entry.pattern.length];
      const wordBoundary = /\W/.test(before) && /\W/.test(after);
      if (wordBoundary) {
        return speciesDB[entry.scientificName];
      }
    }
    return null;
  }

  /**
   * Extract listing title text from the current page.
   * Different selectors per site.
   */
  function getListingTitle() {
    const host = location.hostname;
    let el = null;

    if (host.includes('liveaquaria.com')) {
      el = document.querySelector('h1.product-title, h1[itemprop="name"], h1');
    } else if (host.includes('aquabid.com')) {
      el = document.querySelector('td.adtitle, h1, .listing-title');
    } else if (host.includes('ebay.com')) {
      el = document.querySelector('h1.x-item-title__mainTitle span, h1#itemTitle span, h1.it-ttl');
    }

    return el ? el.innerText || el.textContent : null;
  }

  /**
   * Extract listing description text (first ~500 chars to reduce noise).
   */
  function getListingDescription() {
    const host = location.hostname;
    let el = null;

    if (host.includes('liveaquaria.com')) {
      el = document.querySelector('.product-description, [itemprop="description"]');
    } else if (host.includes('aquabid.com')) {
      el = document.querySelector('.ad-description, td.addesc');
    } else if (host.includes('ebay.com')) {
      el = document.querySelector('#desc_ifr') ? null : document.querySelector('.x-item-description, #description');
    }

    if (!el) return null;
    const text = el.innerText || el.textContent || '';
    return text.slice(0, 500);
  }

  // ── Compatibility logic ───────────────────────────────────────────────────

  const COMPAT_OK = 'ok';
  const COMPAT_CAUTION = 'caution';
  const COMPAT_CONFLICT = 'conflict';

  /**
   * Check compatibility of a target species against the saved tank profile.
   * Returns { status, reasons[] }
   */
  function checkCompatibility(species) {
    if (!tankProfile) return null;

    const reasons = [];
    let worst = COMPAT_OK;

    function escalate(level) {
      if (level === COMPAT_CONFLICT) worst = COMPAT_CONFLICT;
      else if (level === COMPAT_CAUTION && worst !== COMPAT_CONFLICT) worst = COMPAT_CAUTION;
    }

    // Tank size check
    if (species.minTankGallons && tankProfile.gallons) {
      if (tankProfile.gallons < species.minTankGallons) {
        reasons.push(`Tank too small: needs ${species.minTankGallons}gal, you have ${tankProfile.gallons}gal`);
        escalate(COMPAT_CONFLICT);
      }
    }

    // pH check
    if (species.phMin != null && species.phMax != null && tankProfile.ph) {
      if (tankProfile.ph < species.phMin || tankProfile.ph > species.phMax) {
        reasons.push(`pH mismatch: species needs ${species.phMin}–${species.phMax}, tank is ${tankProfile.ph}`);
        escalate(COMPAT_CONFLICT);
      } else if (tankProfile.ph < species.phMin + 0.3 || tankProfile.ph > species.phMax - 0.3) {
        reasons.push(`pH borderline: species range ${species.phMin}–${species.phMax}, tank is ${tankProfile.ph}`);
        escalate(COMPAT_CAUTION);
      }
    }

    // Temperature check (tank stores °F)
    if (species.tempFMin != null && species.tempFMax != null && tankProfile.tempF) {
      if (tankProfile.tempF < species.tempFMin || tankProfile.tempF > species.tempFMax) {
        reasons.push(`Temp mismatch: species needs ${species.tempFMin}–${species.tempFMax}°F, tank is ${tankProfile.tempF}°F`);
        escalate(COMPAT_CONFLICT);
      }
    }

    // Aggression / tank-mate check
    if (tankProfile.fish && tankProfile.fish.length > 0 && species.aggression) {
      for (const tankFish of tankProfile.fish) {
        const tankFishData = speciesDB[tankFish.scientificName];
        if (!tankFishData) continue;

        // Highly aggressive species conflicts with peaceful tank mates
        if (species.aggression === 'aggressive' && tankFishData.aggression === 'peaceful') {
          reasons.push(`Aggression conflict: ${species.commonNames[0] || species.scientificName} is aggressive; ${tankFish.commonName || tankFishData.commonNames[0]} is peaceful`);
          escalate(COMPAT_CONFLICT);
        } else if (species.aggression === 'aggressive' || tankFishData.aggression === 'aggressive') {
          if (!reasons.some(r => r.includes('Aggression'))) {
            reasons.push(`Aggression caution: ${species.commonNames[0] || species.scientificName} may be aggressive with some tank mates`);
            escalate(COMPAT_CAUTION);
          }
        }
      }
    }

    return { status: worst, reasons };
  }

  // ── Panel injection ───────────────────────────────────────────────────────

  const PANEL_ID = 'ts-tank-scout-panel';

  function buildPanel(species) {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();

    const compat = checkCompatibility(species);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'tsc-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'tsc-header';

    const logoMark = document.createElement('span');
    logoMark.className = 'tsc-logo';
    logoMark.textContent = '🐟';

    const titleEl = document.createElement('div');
    titleEl.className = 'tsc-title';
    titleEl.innerHTML = `<strong>${escHtml(species.commonNames[0] || species.scientificName)}</strong>
      <em>${escHtml(species.scientificName)}</em>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tsc-close';
    closeBtn.title = 'Dismiss';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => panel.remove());

    header.appendChild(logoMark);
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Compatibility banner
    if (compat) {
      const banner = document.createElement('div');
      banner.className = `tsc-compat tsc-compat-${compat.status}`;

      const icon = compat.status === COMPAT_OK ? '✅' : compat.status === COMPAT_CAUTION ? '⚠️' : '❌';
      const label = compat.status === COMPAT_OK ? 'Compatible with your tank'
        : compat.status === COMPAT_CAUTION ? 'Caution — check details'
        : 'Conflict with your tank';

      banner.innerHTML = `<span class="tsc-compat-icon">${icon}</span> <strong>${escHtml(label)}</strong>`;
      panel.appendChild(banner);

      if (compat.reasons.length > 0) {
        const reasonList = document.createElement('ul');
        reasonList.className = 'tsc-compat-reasons';
        for (const r of compat.reasons) {
          const li = document.createElement('li');
          li.textContent = r;
          reasonList.appendChild(li);
        }
        panel.appendChild(reasonList);
      }
    } else {
      const noProfile = document.createElement('div');
      noProfile.className = 'tsc-no-profile';
      noProfile.innerHTML = `<a href="#" class="tsc-open-popup">Set up your tank profile</a> to check compatibility.`;
      noProfile.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      });
      panel.appendChild(noProfile);
    }

    // Care parameters grid
    const grid = document.createElement('div');
    grid.className = 'tsc-grid';

    grid.appendChild(makeStatCard('Min Tank Size',
      species.minTankGallons ? `${species.minTankGallons} gal` : '—'));
    grid.appendChild(makeStatCard('pH Range',
      species.phMin != null ? `${species.phMin} – ${species.phMax}` : '—'));
    grid.appendChild(makeStatCard('Temp',
      species.tempFMin != null ? `${species.tempFMin}–${species.tempFMax}°F` : '—'));
    grid.appendChild(makeStatCard('Care Level', species.careDifficulty || '—', difficultyClass(species.careDifficulty)));

    panel.appendChild(grid);

    return panel;
  }

  function makeStatCard(label, value, extraClass = '') {
    const card = document.createElement('div');
    card.className = `tsc-stat ${extraClass}`;
    const lbl = document.createElement('div');
    lbl.className = 'tsc-stat-label';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.className = 'tsc-stat-value';
    val.textContent = value;
    card.appendChild(lbl);
    card.appendChild(val);
    return card;
  }

  function difficultyClass(level) {
    if (!level) return '';
    const map = { Easy: 'tsc-diff-easy', Moderate: 'tsc-diff-moderate', Difficult: 'tsc-diff-difficult', Expert: 'tsc-diff-expert' };
    return map[level] || '';
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Insertion ─────────────────────────────────────────────────────────────

  function findInsertionPoint() {
    const host = location.hostname;

    if (host.includes('liveaquaria.com')) {
      return document.querySelector('.product-title, h1') ||
             document.querySelector('.product-image, .product-main') ||
             document.querySelector('main');
    }
    if (host.includes('aquabid.com')) {
      return document.querySelector('td.adtitle, .listing-header') ||
             document.querySelector('table.adcontainer') ||
             document.querySelector('body');
    }
    if (host.includes('ebay.com')) {
      return document.querySelector('.x-item-title, #itemTitle') ||
             document.querySelector('#mainContent') ||
             document.querySelector('main');
    }

    return document.querySelector('main') || document.body;
  }

  let detectedSpecies = null;

  function injectPanel(species) {
    detectedSpecies = species;
    const panel = buildPanel(species);
    const anchor = findInsertionPoint();
    if (anchor) {
      anchor.insertAdjacentElement('afterend', panel);
    } else {
      document.body.insertAdjacentElement('afterbegin', panel);
    }
  }

  function refreshPanels() {
    if (detectedSpecies) {
      const panel = buildPanel(detectedSpecies);
      const existing = document.getElementById(PANEL_ID);
      if (existing) {
        existing.replaceWith(panel);
      }
    }
  }

  // ── Main entry ────────────────────────────────────────────────────────────

  async function init() {
    try {
      await Promise.all([loadSpecies(), loadTankProfile()]);

      const title = getListingTitle();
      const description = getListingDescription();
      const combined = [title, description].filter(Boolean).join(' ');

      const species = detectSpecies(combined);
      if (species) {
        injectPanel(species);
      }

      // Watch for dynamic content changes (SPA navigations, lazy-loaded titles)
      let scanTimer = null;
      const observer = new MutationObserver(() => {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(() => {
          if (!document.getElementById(PANEL_ID)) {
            const t = getListingTitle();
            const d = getListingDescription();
            const c = [t, d].filter(Boolean).join(' ');
            const sp = detectSpecies(c);
            if (sp) injectPanel(sp);
          }
        }, 600);
      });
      observer.observe(document.body, { childList: true, subtree: true });

    } catch (err) {
      console.warn('[Tank Scout] init error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
