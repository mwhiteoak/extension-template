// Specialty Coffee Cross-Site Companion — Coffee Detector Content Script
// Detects specialty coffee product pages and extracts product name, price, and weight.

(function () {
  'use strict';

  const SITE_RULES = [
    {
      hostname: /tradecoffeeco\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|coffee)\/[^/]+/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1.product-title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /bluebottlecoffee\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|collections)\/[^/]+/.test(path) && !/\/(cart|checkout|account)/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1[class*="product"], h1[class*="title"], h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('–')[0]?.trim()
        );
      },
    },
    {
      hostname: /onyxcoffeelab\.com$/,
      isProductPage() {
        return /^\/products\/[^/]+/.test(window.location.pathname);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1.product-single__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('–')[0]?.trim()
        );
      },
    },
    {
      hostname: /counterculturecoffee\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|coffee)\/[^/]+/.test(path) && !/\/(cart|checkout|account)/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /intelligentsiacoffee\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|coffees)\/[^/]+/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /stumptowncoffee\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|coffee)\/[^/]+/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /atlascoffeeclub\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|coffees)\/[^/]+/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /beanbox\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(coffees|products)\/[^/]+/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /vervecoffee\.com$/,
      isProductPage() {
        return /^\/products\/[^/]+/.test(window.location.pathname);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1.product-single__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
    {
      hostname: /chromecoffee\.com$/,
      isProductPage() {
        const path = window.location.pathname;
        return /\/(products|collections)\/[^/]+/.test(path) && !/\/(cart|checkout|account)/.test(path);
      },
      extractName() {
        return (
          document.querySelector('h1.product__title, h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content?.trim() ||
          document.title?.split('|')[0]?.trim()
        );
      },
    },
  ];

  // Weight patterns: match oz, lb, g, kg in product text
  const WEIGHT_PATTERNS = [
    { re: /(\d+(?:\.\d+)?)\s*lb/i, toGrams: 453.592 },
    { re: /(\d+(?:\.\d+)?)\s*oz/i, toGrams: 28.3495 },
    { re: /(\d+(?:\.\d+)?)\s*kg/i, toGrams: 1000 },
    { re: /(\d+(?:\.\d+)?)\s*g(?:ram)?s?\b/i, toGrams: 1 },
  ];

  function extractWeightGrams(text) {
    for (const { re, toGrams } of WEIGHT_PATTERNS) {
      const m = text.match(re);
      if (m) return parseFloat(m[1]) * toGrams;
    }
    return null;
  }

  function extractPrice(text) {
    const m = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    return m ? parseFloat(m[1]) : null;
  }

  function getPageData() {
    const hostname = window.location.hostname;
    const rule = SITE_RULES.find(r => r.hostname.test(hostname));
    if (!rule || !rule.isProductPage()) return null;

    const name = rule.extractName();

    // Try to extract price from common price elements
    let price = null;
    const priceEls = document.querySelectorAll(
      '.price, [class*="price"], [data-price], [class*="Price"]'
    );
    for (const el of priceEls) {
      const txt = el.textContent.trim();
      const p = extractPrice(txt);
      if (p && p > 0 && p < 200) { price = p; break; }
    }

    // Try to extract weight from page text: title, selected variant, weight elements
    let weightGrams = null;
    const weightCandidates = [
      ...document.querySelectorAll('[class*="variant"], [class*="size"], [class*="weight"], select option:checked, .product-form select option[selected]'),
    ];
    for (const el of weightCandidates) {
      const wg = extractWeightGrams(el.textContent);
      if (wg) { weightGrams = wg; break; }
    }
    // Fallback: scan full page title/h1 for weight info
    if (!weightGrams && name) {
      weightGrams = extractWeightGrams(name);
    }
    // Fallback: scan meta description
    if (!weightGrams) {
      const meta = document.querySelector('meta[name="description"], meta[property="og:description"]');
      if (meta) weightGrams = extractWeightGrams(meta.content || '');
    }

    // Determine roastery key from hostname
    const roasteryKey = hostname.replace(/^www\./, '').split('.')[0].replace(/(coffee|coffeelab|coffeeco|coffeeclub|coffeeclub)/g, '');

    return { name, price, weightGrams, hostname, roasteryKey };
  }

  // Expose for coffee-badge.js
  window.__coffeeDetector = { getPageData };
})();
