// BGG Everywhere — Game Detector Content Script
// Detects board game product titles from retail site DOM.
// Dispatches 'bgg:game-detected' or 'bgg:game-cleared' custom events.

(function () {
  'use strict';

  let lastKey = null;
  let observerTimer = null;

  function dispatch(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function normalize(str) {
    return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function detectSite() {
    const h = location.hostname.replace(/^www\./, '');
    if (h === 'amazon.com') return 'amazon';
    if (h === 'target.com') return 'target';
    if (h === 'walmart.com') return 'walmart';
    if (h === 'miniaturemarket.com') return 'miniaturemarket';
    if (h === 'coolstuffinc.com') return 'coolstuffinc';
    if (h === 'gamenerdz.com') return 'gamenerdz';
    if (h === 'funagain.com') return 'funagain';
    return null;
  }

  // ── Site-specific product title extractors ────────────────────────────────

  function extractAmazon() {
    // Only trigger on product pages
    if (!location.pathname.startsWith('/dp/') && !location.pathname.includes('/gp/product/')) return null;

    const titleEl = document.getElementById('productTitle')
      || document.querySelector('#title span, h1.a-size-large');
    if (!titleEl) return null;

    let title = titleEl.textContent.trim();
    // Strip common Amazon noise
    title = title.replace(/\s*\|.*$/, '')
      .replace(/\s*-\s*(board game|card game|game|tabletop game).*$/i, '')
      .trim();
    return title || null;
  }

  function extractTarget() {
    // Product pages: /p/-/A-XXXXXXXX
    if (!location.pathname.match(/\/p\/.+\/-\/A-/)) return null;

    const titleEl = document.querySelector('h1[data-test="product-title"], h1.ProductTitle, [data-test="@web/ProductDetail/ProductDetailSticky/ProductTitleText"]');
    if (titleEl) return titleEl.textContent.trim() || null;

    // OG fallback
    const og = document.querySelector('meta[property="og:title"]');
    return og ? og.getAttribute('content')?.trim() || null : null;
  }

  function extractWalmart() {
    // Product pages: /ip/ or /grocery/
    if (!location.pathname.includes('/ip/')) return null;

    const titleEl = document.querySelector('h1[itemprop="name"], h1.prod-ProductTitle, [data-automation-id="product-title"]');
    if (titleEl) return titleEl.textContent.trim() || null;

    const og = document.querySelector('meta[property="og:title"]');
    return og ? og.getAttribute('content')?.trim() || null : null;
  }

  function extractMiniatureMarket() {
    const titleEl = document.querySelector('h1.product_title, h1.product-title, h1[itemprop="name"]');
    if (titleEl) return titleEl.textContent.trim() || null;

    const og = document.querySelector('meta[property="og:title"]');
    return og ? og.getAttribute('content')?.replace(/\s*[-|].*$/, '').trim() || null : null;
  }

  function extractCoolStuffInc() {
    const titleEl = document.querySelector('h1.productname, h1.product-name, [class*="product-title"]');
    if (titleEl) return titleEl.textContent.trim() || null;

    const og = document.querySelector('meta[property="og:title"]');
    return og ? og.getAttribute('content')?.replace(/\s*[-|].*$/, '').trim() || null : null;
  }

  function extractGameNerdz() {
    const titleEl = document.querySelector('h1.product-name, h1[itemprop="name"], h1.title');
    if (titleEl) return titleEl.textContent.trim() || null;

    const og = document.querySelector('meta[property="og:title"]');
    return og ? og.getAttribute('content')?.replace(/\s*[-|].*$/, '').trim() || null : null;
  }

  function extractFunAgain() {
    const titleEl = document.querySelector('h1.product-title, h1[itemprop="name"], h1.title');
    if (titleEl) return titleEl.textContent.trim() || null;

    const og = document.querySelector('meta[property="og:title"]');
    return og ? og.getAttribute('content')?.replace(/\s*[-|].*$/, '').trim() || null : null;
  }

  // ── Main detection ────────────────────────────────────────────────────────

  function detectGame() {
    const site = detectSite();
    if (!site) return;

    let title = null;
    switch (site) {
      case 'amazon':         title = extractAmazon(); break;
      case 'target':         title = extractTarget(); break;
      case 'walmart':        title = extractWalmart(); break;
      case 'miniaturemarket': title = extractMiniatureMarket(); break;
      case 'coolstuffinc':   title = extractCoolStuffInc(); break;
      case 'gamenerdz':      title = extractGameNerdz(); break;
      case 'funagain':       title = extractFunAgain(); break;
    }

    if (!title || title.length < 3) {
      if (lastKey !== null) {
        lastKey = null;
        dispatch('bgg:game-cleared', {});
      }
      return;
    }

    const key = normalize(title);
    if (key === lastKey) return;

    lastKey = key;
    dispatch('bgg:game-detected', { title, site });
  }

  // ── SPA navigation observer ──────────────────────────────────────────────

  function scheduleDetect(delay) {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(detectGame, delay);
  }

  let lastUrl = location.href;
  const navObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastKey = null;
      scheduleDetect(700);
    }
  });
  navObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Initial runs (staggered for slow-loading pages)
  scheduleDetect(600);
  scheduleDetect(1800);
  scheduleDetect(4000);

})();
