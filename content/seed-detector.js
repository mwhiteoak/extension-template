// Seed Catalog Companion Planner — Seed Detector
// Extracts crop name and days-to-maturity from product pages.
// Runs before planting-badge.js to populate window.__SCCP_PRODUCT.

(function () {
  'use strict';

  const hostname = location.hostname.replace(/^www\./, '');

  // Site-specific selectors. Selectors pinned to live DOM as of 2026-04.
  const SITE_CONFIG = {
    'burpee.com': {
      nameSelector: 'h1.product-title, h1[class*="product-title"], h1[class*="ProductTitle"]',
      dtmSelector: '.product-details__value[data-label*="Days"], [data-label*="Days to Maturity"] .value, .pdp-attribute--days .pdp-attribute__value',
      dtmPattern: /(\d{2,3})\s*(?:days?|d)/i,
    },
    'rareseeds.com': {
      nameSelector: 'h1.product_title, h1.entry-title, h1[class*="product"]',
      dtmSelector: '.woocommerce-product-details__short-description, .product-short-description',
      dtmPattern: /(\d{2,3})\s*(?:days?|DTM)/i,
    },
    'johnnyseeds.com': {
      nameSelector: 'h1.product-name, h1[itemprop="name"], h1.product__title',
      dtmSelector: '.product-attribute--days-to-maturity .value, .attr-days-to-maturity, [class*="days-to-maturity"] .attribute-value',
      dtmPattern: /(\d{2,3})/,
    },
    'parkseed.com': {
      nameSelector: 'h1#productTitle, h1.product-title, h1[class*="product"]',
      dtmSelector: '.productDetail-days, .product-detail-days, [class*="daysToMaturity"]',
      dtmPattern: /(\d{2,3})/,
    },
    'territorialseed.com': {
      nameSelector: 'h1.product-single__title, h1.product__title, h1[class*="product-title"]',
      dtmSelector: '.product-description, .product-single__description',
      dtmPattern: /(\d{2,3})\s*days?/i,
    },
    'westcoastseeds.com': {
      nameSelector: 'h1.product_title, h1.entry-title',
      dtmSelector: '.short_description, .woocommerce-product-details__short-description',
      dtmPattern: /(\d{2,3})\s*days?/i,
    },
    'migardener.com': {
      nameSelector: 'h1.product_title, h1.entry-title',
      dtmSelector: '.woocommerce-product-details__short-description, .product-description',
      dtmPattern: /(\d{2,3})\s*days?/i,
    },
    'seedsavers.org': {
      nameSelector: 'h1.product-name, h1[class*="product-name"], h1[itemprop="name"]',
      dtmSelector: '.product-info-main, .product-attribute-value',
      dtmPattern: /(\d{2,3})\s*days?/i,
    },
  };

  function detect() {
    const config = SITE_CONFIG[hostname];
    if (!config) return null;

    let name = null;
    let dtm = null;

    // Extract product name
    const nameEl = document.querySelector(config.nameSelector);
    if (nameEl) {
      name = nameEl.textContent.trim();
    }

    // Extract days to maturity
    const dtmEl = document.querySelector(config.dtmSelector);
    if (dtmEl) {
      const text = dtmEl.textContent;
      const match = text.match(config.dtmPattern);
      if (match) {
        dtm = parseInt(match[1], 10);
      }
    }

    if (!name) return null;

    return { name, dtm, site: hostname };
  }

  // Expose result globally for planting-badge.js
  window.__SCCP_PRODUCT = detect();

  // For SPA navigation (React-based sites like Baker Creek / MiGardener):
  // Watch for title/H1 changes and re-detect.
  let lastH1 = document.querySelector('h1')?.textContent || '';
  const observer = new MutationObserver(() => {
    const currentH1 = document.querySelector('h1')?.textContent || '';
    if (currentH1 !== lastH1) {
      lastH1 = currentH1;
      window.__SCCP_PRODUCT = detect();
      // Signal planting-badge.js to re-render
      window.dispatchEvent(new CustomEvent('sccp:product-changed'));
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
