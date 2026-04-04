// Espresso Community Intelligence — Product Detector Content Script
// Detects espresso product pages and extracts the product name.

(function () {
  'use strict';

  const SITE_RULES = [
    {
      // seattlecoffeegear.com — product pages have /p/ in path or end with .html under a category
      hostname: /seattlecoffeegear\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        // Product pages: /espresso-machines/breville-bambino-plus-espresso-machine.html
        return /\/[^/]+-[^/]+\.html$/.test(path) && !/\/(search|cart|checkout|account|blog)/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product-name, h1[itemprop="name"], h1.page-title, h1')?.textContent?.trim() ||
          document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      // prima-coffee.com — Shopify store, product pages at /products/:handle
      hostname: /prima-coffee\.com$/,
      isProductPage() {
        return /^\/products\/[^/]+/.test(window.location.pathname);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1.product-title, h1')?.textContent?.trim() ||
          document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('–')[0]?.trim()
        );
      },
    },
    {
      // clivecoffee.com — Shopify store, product pages at /products/:handle
      hostname: /clivecoffee\.com$/,
      isProductPage() {
        return /^\/products\/[^/]+/.test(window.location.pathname);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1.product-single__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.split('–')[0]?.trim() ||
          document.title?.split('–')[0]?.trim()
        );
      },
    },
  ];

  function getSiteRule() {
    const host = window.location.hostname;
    return SITE_RULES.find(r => r.hostname.test(host)) || null;
  }

  function detectProduct() {
    const rule = getSiteRule();
    if (!rule || !rule.isProductPage()) return null;
    const name = rule.extractName();
    return name && name.length > 2 ? { productName: name, url: window.location.href } : null;
  }

  function broadcast(productData) {
    window.__eci_product = productData;
    window.dispatchEvent(new CustomEvent('eci:product-detected', { detail: productData }));
  }

  // Initial detection
  let detected = detectProduct();
  if (detected) broadcast(detected);

  // Re-detect on SPA navigation (Shopify uses history.pushState)
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const fresh = detectProduct();
      if (fresh && fresh.productName !== detected?.productName) {
        detected = fresh;
        broadcast(fresh);
      } else if (!fresh && detected) {
        detected = null;
        window.__eci_product = null;
        window.dispatchEvent(new CustomEvent('eci:product-cleared'));
      }
    }, 600);
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });

  // Respond to requests from the panel
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_PRODUCT_DATA') {
      sendResponse(detected || null);
    }
    return false;
  });
})();
