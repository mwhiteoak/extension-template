// Seed Catalog Companion Planner — Planting Badge Overlay
// Injects a Shadow DOM panel below the product title with personalized
// planting dates, season suitability, and companion plant chips.

(function () {
  'use strict';

  const EXT_ID = chrome.runtime.id;

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadJSON(filename) {
    const url = chrome.runtime.getURL(`data/${filename}`);
    const resp = await fetch(url);
    return resp.json();
  }

  let zipZones, cropKeywords, plantingGuide, companions;

  async function loadAllData() {
    [zipZones, cropKeywords, plantingGuide, companions] = await Promise.all([
      loadJSON('zip-zones.json'),
      loadJSON('crop-keywords.json'),
      loadJSON('planting-guide.json'),
      loadJSON('companions.json'),
    ]);
  }

  // ── Storage helpers ───────────────────────────────────────────────────────

  async function getOptions() {
    return chrome.storage.sync.get({
      zip: '',
      zone: '',
      lastSpringFrost: '',
      firstFallFrost: '',
      isPro: false,
    });
  }

  // ── Crop normalization ─────────────────────────────────────────────────────

  function normalizeCropType(productName) {
    if (!productName) return null;
    const lower = productName.toLowerCase();
    // Try multi-word matches first (longest first)
    const keys = Object.keys(cropKeywords)
      .filter(k => !k.startsWith('_'))
      .sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (lower.includes(key)) {
        return cropKeywords[key];
      }
    }
    return null;
  }

  // ── Date math ─────────────────────────────────────────────────────────────

  function parseFrostDate(mmdd) {
    // mmdd is "MM-DD", returns a Date for the current year
    const [m, d] = mmdd.split('-').map(Number);
    const now = new Date();
    const year = now.getFullYear();
    return new Date(year, m - 1, d);
  }

  function addWeeks(date, weeks) {
    const d = new Date(date);
    d.setDate(d.getDate() + Math.round(weeks * 7));
    return d;
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function computePlantingInfo(guide, lastSpringFrost, firstFallFrost, overrideDtm) {
    const lsf = parseFrostDate(lastSpringFrost);
    const fff = parseFrostDate(firstFallFrost);
    const now = new Date();
    const dtm = overrideDtm || guide.daysToMaturity;

    let startIndoorsDate = null;
    let directSowDate = null;
    let transplantDate = null;
    let lastChanceDate = null;

    // Start indoors date
    if (guide.startIndoorsWeeks != null) {
      startIndoorsDate = addWeeks(lsf, -guide.startIndoorsWeeks);
    }

    // Direct sow date (relative to last spring frost)
    if (guide.directSowWeeksAfterFrost != null) {
      directSowDate = addWeeks(lsf, guide.directSowWeeksAfterFrost);
    }

    // Transplant date
    if (guide.transplantWeeksAfterFrost != null) {
      transplantDate = addWeeks(lsf, guide.transplantWeeksAfterFrost);
    }

    // Last chance: frost - DTM days (need enough warm days before frost)
    const dtmWeeks = dtm / 7;
    if (guide.warmSeason) {
      // Must finish before first fall frost
      lastChanceDate = addWeeks(fff, -dtmWeeks);
    } else {
      // Cool season — last chance before summer heat, or fall planting
      // Use a simplified last-chance as 8 weeks before first fall frost for fall planting
      lastChanceDate = addWeeks(fff, -8);
    }

    // Season suitability
    const daysToLastChance = daysBetween(now, lastChanceDate);
    let suitability, suitabilityLabel, suitabilityColor;
    if (daysToLastChance > 14) {
      suitability = 'green';
      suitabilityLabel = 'Good timing — ample season remaining';
      suitabilityColor = '#2d7a2d';
    } else if (daysToLastChance >= 0) {
      suitability = 'yellow';
      suitabilityLabel = 'Marginal — check days-to-maturity vs. frost window';
      suitabilityColor = '#a07c00';
    } else {
      suitability = 'red';
      suitabilityLabel = guide.warmSeason
        ? 'Too late this season — note next planting window'
        : 'Past ideal window — consider fall planting';
      suitabilityColor = '#c0392b';
    }

    // Frost countdown (Pro): days until first fall frost
    const daysToFff = daysBetween(now, fff);

    return {
      startIndoorsDate,
      directSowDate,
      transplantDate,
      lastChanceDate,
      suitability,
      suitabilityLabel,
      suitabilityColor,
      daysToFff,
      dtm,
      lsf,
      fff,
    };
  }

  // ── Companion chips ──────────────────────────────────────────────────────

  function getCompanionChips(cropType) {
    const data = companions[cropType];
    if (!data) return { companions: [], avoid: null };
    return {
      companions: (data.companions || []).slice(0, 3),
      avoid: (data.avoid || [])[0] || null,
    };
  }

  // ── Shadow DOM injection ──────────────────────────────────────────────────

  const BADGE_ID = 'sccp-planting-badge-host';

  function findInsertionPoint() {
    // Try to insert below the product title / main H1
    const selectors = [
      'h1',
      '.product-title',
      '.product-name',
      '#productTitle',
      '.product__title',
      '.product-single__title',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function createBadgeHTML(info, cropType, chipData, opts, guide) {
    const { startIndoorsDate, directSowDate, transplantDate, suitability, suitabilityLabel, suitabilityColor, daysToFff, dtm } = info;

    const suitabilityBg = suitability === 'green' ? '#e8f5e9' : suitability === 'yellow' ? '#fff8e1' : '#ffebee';
    const suitabilityDot = suitability === 'green' ? '🟢' : suitability === 'yellow' ? '🟡' : '🔴';

    const dateRows = [];
    if (startIndoorsDate) {
      dateRows.push(`<div class="date-row"><span class="date-label">Start indoors</span><span class="date-val">${formatDate(startIndoorsDate)}</span></div>`);
    }
    if (transplantDate) {
      dateRows.push(`<div class="date-row"><span class="date-label">Transplant outdoors</span><span class="date-val">${formatDate(transplantDate)}</span></div>`);
    } else if (directSowDate) {
      dateRows.push(`<div class="date-row"><span class="date-label">Direct sow</span><span class="date-val">${formatDate(directSowDate)}</span></div>`);
    }
    if (info.lastChanceDate) {
      dateRows.push(`<div class="date-row"><span class="date-label">Last chance</span><span class="date-val">${formatDate(info.lastChanceDate)}</span></div>`);
    }

    const companionChips = chipData.companions
      .map(c => `<span class="chip chip-companion">${c}</span>`)
      .join('');
    const avoidChip = chipData.avoid
      ? `<span class="chip chip-avoid">avoid: ${chipData.avoid}</span>`
      : '';

    // Pro: frost countdown
    const frostCountdown = opts.isPro && daysToFff > 0
      ? `<div class="pro-section">
           <div class="frost-countdown">
             <span class="pro-label">⏱ Frost countdown</span>
             <span class="frost-days">${daysToFff} days</span> until first fall frost
             (this variety needs ~${dtm} more days to mature)
           </div>
         </div>`
      : !opts.isPro
        ? `<div class="pro-upsell">
             <span class="pro-upsell-icon">🔒</span>
             <span class="pro-upsell-text">Frost countdown &amp; succession planner — <button class="pro-btn" id="sccp-upgrade-btn">Upgrade to Pro $5/mo</button></span>
           </div>`
        : '';

    return `
      <div class="sccp-badge">
        <div class="badge-header">
          <span class="badge-icon">🌱</span>
          <span class="badge-title">Planting Guide for Zone ${opts.zone}</span>
          <span class="badge-zip">${opts.zip}</span>
        </div>

        <div class="suitability-bar" style="background:${suitabilityBg}; border-left:3px solid ${suitabilityColor}">
          <span>${suitabilityDot} ${suitabilityLabel}</span>
        </div>

        <div class="dates-section">
          ${dateRows.join('')}
        </div>

        <div class="companions-section">
          <div class="companions-label">Companion plants</div>
          <div class="chips">${companionChips}${avoidChip}</div>
        </div>

        ${frostCountdown}

        <div class="badge-footer">
          <span>Dates for your frost zone · <button class="settings-link" id="sccp-settings-btn">Change ZIP</button></span>
        </div>
      </div>
    `;
  }

  const BADGE_CSS = `
    :host {
      display: block;
      margin: 12px 0 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .sccp-badge {
      background: #f0f7f0;
      border: 1.5px solid #5a9a5a;
      border-radius: 10px;
      padding: 14px 16px 12px;
      font-size: 13px;
      color: #222;
      max-width: 480px;
    }
    .badge-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }
    .badge-icon { font-size: 16px; }
    .badge-title { font-weight: 700; font-size: 13px; color: #2d6a2d; flex: 1; }
    .badge-zip { font-size: 11px; color: #888; background: #e0eee0; padding: 2px 7px; border-radius: 10px; }

    .suitability-bar {
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .dates-section { margin-bottom: 10px; }
    .date-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid #d8ecd8;
    }
    .date-row:last-child { border-bottom: none; }
    .date-label { color: #555; font-size: 12px; }
    .date-val { font-weight: 700; font-size: 13px; color: #2d6a2d; }

    .companions-section { margin-bottom: 8px; }
    .companions-label { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px; }
    .chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .chip-companion { background: #d4edda; color: #1a5c1a; }
    .chip-avoid { background: #fde8e8; color: #8b0000; }

    .pro-section {
      background: #e8f5e9;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .frost-countdown { font-size: 12px; color: #2d6a2d; }
    .pro-label { font-weight: 700; margin-right: 4px; }
    .frost-days { font-weight: 700; color: #1a5c1a; }

    .pro-upsell {
      background: #fff8e1;
      border: 1px solid #ffe082;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pro-upsell-icon { font-size: 14px; }
    .pro-btn {
      background: #2d6a2d;
      color: #fff;
      border: none;
      border-radius: 5px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .pro-btn:hover { background: #1a5c1a; }

    .badge-footer {
      font-size: 11px;
      color: #888;
      padding-top: 6px;
      border-top: 1px solid #d8ecd8;
    }
    .settings-link {
      background: none;
      border: none;
      color: #2d6a2d;
      font-size: 11px;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
      font-family: inherit;
    }
    .settings-link:hover { color: #1a5c1a; }

    .no-zip-banner {
      background: #fff8e1;
      border: 1.5px solid #f0c040;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      max-width: 480px;
    }
    .no-zip-banner strong { color: #5c4000; }
    .setup-btn {
      display: inline-block;
      margin-top: 8px;
      background: #2d6a2d;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .setup-btn:hover { background: #1a5c1a; }
  `;

  function createNoZipBanner() {
    return `
      <div class="no-zip-banner">
        <strong>🌱 Seed Catalog Companion</strong><br>
        Enter your ZIP code to see personalized planting dates for this variety.
        <br><button class="setup-btn" id="sccp-setup-btn">Set Up My ZIP Code</button>
      </div>
    `;
  }

  function injectBadge(htmlContent) {
    // Remove any existing badge
    const existing = document.getElementById(BADGE_ID);
    if (existing) existing.remove();

    const insertAfter = findInsertionPoint();
    if (!insertAfter) return;

    const host = document.createElement('div');
    host.id = BADGE_ID;

    // Insert after the insertion point's parent container (e.g., after H1)
    insertAfter.insertAdjacentElement('afterend', host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BADGE_CSS;

    const content = document.createElement('div');
    content.innerHTML = htmlContent;

    shadow.appendChild(style);
    shadow.appendChild(content);

    // Wire up buttons inside shadow DOM
    const upgradeBtn = shadow.getElementById('sccp-upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
      });
    }
    const settingsBtn = shadow.getElementById('sccp-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      });
    }
    const setupBtn = shadow.getElementById('sccp-setup-btn');
    if (setupBtn) {
      setupBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      });
    }
  }

  // ── Main render ───────────────────────────────────────────────────────────

  async function render() {
    const product = window.__SCCP_PRODUCT;
    if (!product || !product.name) return;

    const opts = await getOptions();

    // No ZIP configured — show setup banner
    if (!opts.zip || !opts.zone) {
      injectBadge(createNoZipBanner());
      return;
    }

    // Normalize crop type
    const cropType = normalizeCropType(product.name);
    if (!cropType || !plantingGuide[cropType]) {
      // Unknown crop — still show zone info but skip dates
      return;
    }

    const guide = plantingGuide[cropType];
    const info = computePlantingInfo(
      guide,
      opts.lastSpringFrost,
      opts.firstFallFrost,
      product.dtm
    );
    const chipData = getCompanionChips(cropType);
    const html = createBadgeHTML(info, cropType, chipData, opts, guide);
    injectBadge(html);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────

  async function init() {
    try {
      await loadAllData();
      await render();
    } catch (e) {
      // Silent fail — never break the seed catalog page
    }
  }

  // Wait for DOMContentLoaded or run immediately if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-render on SPA product navigation
  window.addEventListener('sccp:product-changed', () => {
    render().catch(() => {});
  });
})();
