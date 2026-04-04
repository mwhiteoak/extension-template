// Wedding Vendor Tracker — Content Script
// Detects vendor listing cards on The Knot and WeddingWire,
// injects "Track Vendor" buttons, and scrapes vendor data on click.

(function () {
  'use strict';

  const SITE = location.hostname.replace(/^www\./, '');

  // ── Site-specific selectors ───────────────────────────────────────────────
  // Multiple fallback selectors per field to handle DOM changes gracefully.

  const SITE_RULES = {
    'theknot.com': {
      // Vendor listing cards — The Knot uses React-rendered vendor cards
      cardSelectors: [
        '[data-testid="vendor-card"]',
        '[class*="VendorCard"]',
        '[class*="vendorCard"]',
        '[class*="listing-card"]',
        '[class*="listingCard"]',
        '.search-result',
        '.vendor-result',
      ],
      nameSelectors: [
        '[data-testid="vendor-name"]',
        '[class*="VendorCard__name"]',
        '[class*="vendorName"]',
        '[class*="listing-name"]',
        'h3',
        'h2',
      ],
      categorySelectors: [
        '[data-testid="vendor-category"]',
        '[class*="VendorCard__category"]',
        '[class*="vendorCategory"]',
        '[class*="category-label"]',
        '[class*="categoryLabel"]',
      ],
      priceSelectors: [
        '[data-testid="starting-price"]',
        '[class*="startingPrice"]',
        '[class*="StartingPrice"]',
        '[class*="price-range"]',
        '[class*="priceRange"]',
        '[class*="PriceRange"]',
      ],
      ctaSelectors: [
        // Inject adjacent to The Knot's "Save" / "Request Quote" buttons
        '[data-testid="save-button"]',
        '[aria-label*="Save"]',
        '[class*="SaveButton"]',
        '[class*="saveButton"]',
        'button[class*="cta"]',
      ],
      emailSelectors: [
        'a[href^="mailto:"]',
        '[data-testid="vendor-email"]',
      ],
    },
    'weddingwire.com': {
      cardSelectors: [
        '[data-testid="vendor-card"]',
        '[class*="ProCard"]',
        '[class*="proCard"]',
        '[class*="StorefrontCard"]',
        '[class*="storefrontCard"]',
        '.vendor-card',
        '.pro-card',
      ],
      nameSelectors: [
        '[data-testid="vendor-name"]',
        '[class*="ProCard__name"]',
        '[class*="storefrontName"]',
        '[class*="pro-name"]',
        'h3',
        'h2',
      ],
      categorySelectors: [
        '[class*="ProCard__category"]',
        '[class*="storefrontCategory"]',
        '[class*="pro-category"]',
        '[class*="categoryLabel"]',
      ],
      priceSelectors: [
        '[class*="startingPrice"]',
        '[class*="StartingPrice"]',
        '[class*="price-range"]',
        '[class*="priceRange"]',
        '[class*="PriceRange"]',
      ],
      ctaSelectors: [
        '[class*="FavoriteButton"]',
        '[class*="favoriteButton"]',
        'button[aria-label*="favorite"]',
        'button[aria-label*="save"]',
        '[class*="SaveButton"]',
        'button[class*="cta"]',
      ],
      emailSelectors: [
        'a[href^="mailto:"]',
        '[data-testid="vendor-email"]',
      ],
    },
  };

  const rules = SITE_RULES[SITE];
  if (!rules) return; // not a supported site

  // ── Utility: first matching element ───────────────────────────────────────

  function queryFirst(parent, selectors) {
    for (const sel of selectors) {
      try {
        const el = parent.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function textOf(el) {
    return el ? el.textContent.trim() : '';
  }

  // ── Scrape vendor data from a card ────────────────────────────────────────

  function scrapeVendor(card) {
    const name = textOf(queryFirst(card, rules.nameSelectors));
    const category = textOf(queryFirst(card, rules.categorySelectors));
    const priceRange = textOf(queryFirst(card, rules.priceSelectors));
    const emailEl = queryFirst(card, rules.emailSelectors);
    const contactEmail = emailEl ? (emailEl.href || '').replace('mailto:', '') : '';

    // Best-effort URL: prefer the first anchor that looks like a vendor page
    let url = '';
    const anchors = card.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        url = href.startsWith('http') ? href : location.origin + href;
        break;
      }
    }

    return { name, category, priceRange, contactEmail, url, site: SITE };
  }

  // ── Inject "Track Vendor" button ──────────────────────────────────────────

  const MARKER = 'data-wvt-injected';

  function injectButton(card) {
    if (card.hasAttribute(MARKER)) return;
    card.setAttribute(MARKER, '1');

    const btn = document.createElement('button');
    btn.className = 'wvt-track-btn';
    btn.textContent = '+ Track Vendor';
    btn.title = 'Save to Wedding Vendor Tracker';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const vendor = scrapeVendor(card);

      btn.textContent = 'Saving…';
      btn.disabled = true;

      chrome.runtime.sendMessage({ type: 'TRACK_VENDOR', vendor }, (resp) => {
        if (resp?.alreadyTracked) {
          btn.textContent = '✓ Already Tracked';
          btn.classList.add('wvt-track-btn--tracked');
        } else {
          btn.textContent = '✓ Tracked!';
          btn.classList.add('wvt-track-btn--tracked');
        }
        btn.disabled = false;
      });
    });

    // Try to inject next to a known CTA button; fallback to appending to card
    const cta = queryFirst(card, rules.ctaSelectors);
    if (cta && cta.parentNode) {
      cta.parentNode.insertBefore(btn, cta.nextSibling);
    } else {
      card.appendChild(btn);
    }
  }

  // ── Scan for cards ────────────────────────────────────────────────────────

  function scanCards() {
    for (const sel of rules.cardSelectors) {
      try {
        const cards = document.querySelectorAll(sel);
        if (cards.length > 0) {
          cards.forEach(injectButton);
          return; // use first selector that matches
        }
      } catch (_) {}
    }
  }

  // ── MutationObserver for SPA navigation ───────────────────────────────────

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanCards, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan
  scanCards();
})();
