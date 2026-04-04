/**
 * FilmDB Content Script
 * Detects film stock on product pages and injects an overlay panel.
 */

(async function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────

  const STORAGE_KEY_DISMISSED = 'filmdb_dismissed';
  const STORAGE_KEY_EBAY_APP_ID = 'filmdb_ebay_app_id';
  const CURRENT_YEAR = new Date().getFullYear();
  const EBAY_EXPIRED_THRESHOLD_YEAR = CURRENT_YEAR - 2;

  // ── Retailer Detection ───────────────────────────────────────────────────────

  const hostname = location.hostname;

  function isBH() { return hostname.includes('bhphotovideo.com'); }
  function isAdorama() { return hostname.includes('adorama.com'); }
  function isFPS() { return hostname.includes('filmphotographystore.com'); }
  function isEbay() { return /ebay\.(com|co\.uk|de|com\.au)/.test(hostname); }

  function isProductPage() {
    if (isBH()) return /\/c\/product\//.test(location.pathname) || document.querySelector('[itemprop="name"]') !== null;
    if (isAdorama()) return /\/product\//.test(location.pathname);
    if (isFPS()) return /\/products\//.test(location.pathname);
    if (isEbay()) return /\/itm\//.test(location.pathname);
    return false;
  }

  if (!isProductPage()) return;

  // ── Product Title Extraction ─────────────────────────────────────────────────

  function getProductTitle() {
    const selectors = [
      // Generic
      'h1[itemprop="name"]',
      'h1.product-title',
      'h1.pdp-product-name',
      // B&H
      'h1[data-selenium="productTitle"]',
      '[data-selenium="productTitle"]',
      // Adorama
      '.product-name h1',
      '.page-title-wrapper h1',
      // Film Photography Store (Shopify)
      '.product__title',
      'h1.product-single__title',
      // eBay
      'h1.x-item-title__mainTitle span',
      '#itemTitle',
      '.it-ttl',
      // Fallback
      'h1',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 0) {
        return el.textContent.trim();
      }
    }

    return document.title;
  }

  // ── Film Matching ────────────────────────────────────────────────────────────

  /**
   * Normalize a film name for fuzzy matching:
   * - lowercase
   * - strip format suffixes (35mm, 120, 4x5, 5x7, 8x10)
   * - strip leading/trailing whitespace
   * - collapse multiple spaces
   */
  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/\b(35mm?|120|4x5|5x7|8x10|135|medium format|large format)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  let filmsDb = null;

  async function loadFilmsDb() {
    if (filmsDb) return filmsDb;
    const url = chrome.runtime.getURL('data/films.json');
    const res = await fetch(url);
    filmsDb = await res.json();
    return filmsDb;
  }

  async function matchFilm(productTitle) {
    const films = await loadFilmsDb();
    const normalizedTitle = normalize(productTitle);

    // Build a scored list — find the best match
    let bestMatch = null;
    let bestScore = 0;

    for (const film of films) {
      const candidates = [film.name, ...film.aliases];
      for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        if (normalizedTitle.includes(normalizedCandidate) && normalizedCandidate.length > bestScore) {
          bestScore = normalizedCandidate.length;
          bestMatch = film;
        }
      }
    }

    return bestMatch;
  }

  // ── Expired Film Detection ───────────────────────────────────────────────────

  function isExpiredListing(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();

    // Explicit "expired" keyword
    if (/\bexpired?\b/.test(text)) return true;

    // "EXP" abbreviation (but not words like "experience", "expert")
    if (/\bexp\b/.test(text)) return true;

    // Year in title <= CURRENT_YEAR - 2
    const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
      for (const year of yearMatches) {
        if (parseInt(year, 10) <= EBAY_EXPIRED_THRESHOLD_YEAR) return true;
      }
    }

    return false;
  }

  function getEbayItemDescription() {
    const selectors = [
      '#desc_div',
      '#vi-desc-maincntr',
      '.d-item-description',
      'iframe#desc_ifr', // description may be in iframe — skip
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.tagName !== 'IFRAME') return el.textContent || '';
    }
    return '';
  }

  // ── eBay Price Benchmark ─────────────────────────────────────────────────────

  async function fetchEbayPriceBenchmark(filmName, appId) {
    if (!appId) return null;

    // Search for sold/completed expired film listings via eBay Browse API
    const searchTerm = encodeURIComponent(`${filmName} film expired`);
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchTerm}&filter=buyingOptions:%7BFIXED_PRICE%7D,conditions:%7BUSED%7D&sort=price&limit=50`;

    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${appId}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        }
      });

      if (!res.ok) return null;

      const data = await res.json();
      const items = (data.itemSummaries || []).filter(item => {
        const price = parseFloat(item.price?.value || '0');
        return price > 0 && price < 100; // sanity filter: per-roll prices
      });

      if (items.length === 0) return null;

      const prices = items.map(item => parseFloat(item.price.value)).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];

      return {
        medianPrice: median.toFixed(2),
        currency: items[0]?.price?.currency || 'USD',
        sampleCount: items.length,
      };
    } catch {
      return null;
    }
  }

  function getPriceBadge(currentPriceText, benchmark) {
    if (!benchmark || !currentPriceText) return null;

    const current = parseFloat(currentPriceText.replace(/[^0-9.]/g, ''));
    const med = parseFloat(benchmark.medianPrice);
    if (isNaN(current) || isNaN(med)) return null;

    const ratio = current / med;
    if (ratio <= 0.85) return { label: 'Deal', colour: '#22c55e' };
    if (ratio <= 1.15) return { label: 'Fair', colour: '#f59e0b' };
    return { label: 'Above market', colour: '#ef4444' };
  }

  function getCurrentPrice() {
    const selectors = [
      '.x-price-primary .ux-textspans',
      '#prcIsum',
      '.notranslate[itemprop="price"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el.textContent.trim();
    }
    return null;
  }

  // ── Overlay HTML ─────────────────────────────────────────────────────────────

  function grainBadgeColour(grain) {
    return { fine: '#4ade80', medium: '#fbbf24', coarse: '#f87171' }[grain] || '#9ca3af';
  }

  function profileBadgeColour(profile) {
    return { warm: '#fb923c', neutral: '#94a3b8', cool: '#60a5fa' }[profile] || '#9ca3af';
  }

  function processBadgeColour(process) {
    return { 'C-41': '#a78bfa', 'E-6': '#34d399', 'B&W': '#e2e8f0' }[process] || '#9ca3af';
  }

  function buildOverlayHTML(film, ebayBenchmark, isExpired, priceBadge) {
    const samples = (film.analogCafeSamples || []).slice(0, 5);
    const samplesHTML = samples.map(s => `
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 4px 0 0;border-radius:4px;overflow:hidden;border:1px solid #374151;">
        <img src="${s.thumb}" alt="Sample scan" loading="lazy"
          style="width:72px;height:54px;object-fit:cover;display:block;"
          onerror="this.parentElement.style.display='none'">
      </a>
    `).join('');

    const benchmarkHTML = (ebayBenchmark && isExpired) ? `
      <div style="margin-top:10px;padding:8px 10px;background:#1f2937;border-radius:6px;border:1px solid #374151;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:4px;">Price Benchmark (last 90 days · eBay)</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:15px;font-weight:600;color:#f9fafb;">
            ${ebayBenchmark.currency === 'USD' ? '$' : ''}${ebayBenchmark.medianPrice} median/roll
          </span>
          <span style="font-size:11px;color:#6b7280;">(${ebayBenchmark.sampleCount} listings)</span>
          ${priceBadge ? `<span style="font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;color:#fff;background:${priceBadge.colour};">${priceBadge.label}</span>` : ''}
        </div>
      </div>
    ` : (isExpired && !ebayBenchmark ? `
      <div style="margin-top:10px;padding:6px 10px;background:#1f2937;border-radius:6px;border:1px solid #374151;font-size:11px;color:#6b7280;">
        eBay App ID not configured — <a href="${chrome.runtime.getURL('options/options.html')}" target="_blank" style="color:#60a5fa;">add it in settings</a> to see price benchmarks.
      </div>
    ` : '');

    return `
      <div id="filmdb-inner" style="font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#f9fafb;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#60a5fa;">FilmDB</span>
            <span style="font-size:13px;font-weight:600;color:#f9fafb;">${film.name}</span>
            ${isExpired ? '<span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:#7f1d1d;color:#fca5a5;">EXPIRED</span>' : ''}
          </div>
          <button id="filmdb-collapse" title="Collapse FilmDB panel"
            style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:16px;padding:0 2px;line-height:1;">▾</button>
        </div>

        <div id="filmdb-body">
          <!-- Row 1: technical badges -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="padding:3px 8px;border-radius:4px;background:#1f2937;border:1px solid #374151;font-size:12px;">
              ISO ${film.iso}
            </span>
            <span style="padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;background:${grainBadgeColour(film.grain)}22;border:1px solid ${grainBadgeColour(film.grain)}55;color:${grainBadgeColour(film.grain)};">
              ${film.grain} grain
            </span>
            <span style="padding:3px 8px;border-radius:4px;font-size:12px;background:#1f2937;border:1px solid #374151;">
              +${film.latitude.over} / −${film.latitude.under} stops
            </span>
            <span style="padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;background:${processBadgeColour(film.process)}22;border:1px solid ${processBadgeColour(film.process)}55;color:${processBadgeColour(film.process)};">
              ${film.process}
            </span>
          </div>

          <!-- Row 2: colour profile + filmdev count -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
            <span style="padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;background:${profileBadgeColour(film.colourProfile)}22;border:1px solid ${profileBadgeColour(film.colourProfile)}55;color:${profileBadgeColour(film.colourProfile)};">
              ${film.colourProfile} tones
            </span>
            <a href="https://filmdev.org/recipe/search?film=${encodeURIComponent(film.name)}" target="_blank" rel="noopener noreferrer"
              style="padding:3px 8px;border-radius:4px;font-size:12px;background:#1f2937;border:1px solid #374151;color:#60a5fa;text-decoration:none;">
              ${film.filmdevRecipes} FilmDev recipes ↗
            </a>
          </div>

          <!-- Row 3: sample scans -->
          ${samplesHTML ? `
            <div style="margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Community samples (Analog.cafe)</div>
            <div style="display:flex;gap:0;margin-bottom:10px;overflow-x:auto;">${samplesHTML}</div>
          ` : ''}

          <!-- eBay benchmark (expired only) -->
          ${benchmarkHTML}

          <!-- Description -->
          ${film.description ? `<div style="font-size:12px;color:#9ca3af;margin-top:8px;line-height:1.5;">${film.description}</div>` : ''}
        </div>
      </div>
    `;
  }

  // ── Inject Overlay ───────────────────────────────────────────────────────────

  function findInsertionPoint() {
    // Try retailer-specific insertion points
    const selectors = [
      // B&H — below product description
      '[data-selenium="productDescription"]',
      '.overview-info',
      // Adorama
      '.product-info-main',
      '.product-add-form',
      // Film Photography Store (Shopify)
      '.product-form',
      '.product__form-wrapper',
      // eBay
      '#vi-desc-maincntr',
      '.d-item-description',
      '#desc_div',
      // Generic fallbacks
      'form[action*="cart"]',
      '#add-to-cart-form',
      'h1',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  async function injectOverlay(film, isExpired, ebayBenchmark, priceBadge) {
    // Check if already dismissed for this page
    const sessionKey = `${STORAGE_KEY_DISMISSED}_${location.pathname}`;
    const result = await chrome.storage.local.get([sessionKey]);
    if (result[sessionKey]) return;

    // Check if already injected
    if (document.getElementById('filmdb-root')) return;

    const host = document.createElement('div');
    host.id = 'filmdb-root';
    host.style.cssText = 'margin:16px 0;';

    const shadow = host.attachShadow({ mode: 'closed' });

    const container = document.createElement('div');
    container.style.cssText = `
      background: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 12px 14px;
      box-sizing: border-box;
      max-width: 680px;
    `;
    container.innerHTML = buildOverlayHTML(film, ebayBenchmark, isExpired, priceBadge);
    shadow.appendChild(container);

    // Wire up collapse button
    const collapseBtn = container.querySelector('#filmdb-collapse');
    const body = container.querySelector('#filmdb-body');
    let collapsed = false;

    collapseBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? 'none' : '';
      collapseBtn.textContent = collapsed ? '▸' : '▾';
      chrome.storage.local.set({ [sessionKey]: collapsed });
    });

    // Insert into page
    const insertPoint = findInsertionPoint();
    if (insertPoint.tagName === 'H1') {
      insertPoint.parentNode.insertBefore(host, insertPoint.nextSibling);
    } else {
      insertPoint.parentNode.insertBefore(host, insertPoint.nextSibling || insertPoint);
    }
  }

  // ── Main ─────────────────────────────────────────────────────────────────────

  async function main() {
    const title = getProductTitle();
    if (!title) return;

    const film = await matchFilm(title);
    if (!film) return;

    let isExpired = false;
    let ebayBenchmark = null;
    let priceBadge = null;

    if (isEbay()) {
      const description = getEbayItemDescription();
      isExpired = isExpiredListing(title, description);

      if (isExpired) {
        const storage = await chrome.storage.local.get([STORAGE_KEY_EBAY_APP_ID]);
        const appId = storage[STORAGE_KEY_EBAY_APP_ID];
        if (appId) {
          ebayBenchmark = await fetchEbayPriceBenchmark(film.name, appId);
          const currentPrice = getCurrentPrice();
          priceBadge = getPriceBadge(currentPrice, ebayBenchmark);
        }
      }
    }

    await injectOverlay(film, isExpired, ebayBenchmark, priceBadge);
  }

  // Run on load, and re-run for SPAs that navigate without full page loads
  main();

  // For eBay and Adorama which may do partial navigations
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(main, 800);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
