// FIRE Portfolio Overlay — Balance Detector
// Reads portfolio balance and daily gain/loss from brokerage DOM.
// Dispatches 'fire:balance-update' events consumed by fire-sidebar.js.

(function () {
  'use strict';

  // ── Brokerage selector configs ───────────────────────────────────────────────

  const BROKERAGE_CONFIGS = [
    {
      name: 'fidelity',
      matchHost: /fidelity\.com/,
      // Fidelity account summary — total portfolio value
      balanceSelectors: [
        '[data-testid="portfolio-balance"]',
        '.account-value__amount',
        '.js-portfolio-total-value',
        '[class*="portfolio-total"]',
        '[class*="account-total"]',
        '.balance-value',
        '[data-automation-id="account-total-value"]',
      ],
      gainLossSelectors: [
        '[data-testid="portfolio-gain-loss"]',
        '.account-value__gain-loss',
        '[class*="gain-loss-value"]',
        '[class*="daily-change"]',
        '[data-automation-id="today-change-value"]',
      ],
    },
    {
      name: 'vanguard',
      matchHost: /vanguard\.com/,
      balanceSelectors: [
        '.balances__total-balance',
        '[data-testid="total-balance"]',
        '.total-balance-amount',
        '[class*="total-balance"]',
        '.account-balance',
        '[class*="portfolio-value"]',
      ],
      gainLossSelectors: [
        '.balances__change',
        '[data-testid="balance-change"]',
        '[class*="daily-change"]',
        '[class*="gain-loss"]',
        '.change-amount',
      ],
    },
    {
      name: 'schwab',
      matchHost: /schwab\.com/,
      balanceSelectors: [
        '[data-testid="account-value"]',
        '.account-value',
        '[class*="total-value"]',
        '[class*="account-balance"]',
        '.balance-amount',
        '[data-id="total-market-value"]',
      ],
      gainLossSelectors: [
        '[data-testid="daily-change"]',
        '.daily-change',
        '[class*="gain-loss"]',
        '[class*="change-amount"]',
      ],
    },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function parseDollarAmount(text) {
    if (!text) return null;
    // Strip currency symbols, commas, spaces; handle negatives and parentheses
    const cleaned = text.replace(/[$,\s]/g, '').replace(/\(([^)]+)\)/, '-$1');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  function trySelectors(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const val = parseDollarAmount(el.textContent);
          if (val !== null) return val;
        }
      } catch (_) {
        // invalid selector — skip
      }
    }
    return null;
  }

  function detectBrokerageConfig() {
    const host = window.location.hostname;
    return BROKERAGE_CONFIGS.find(c => c.matchHost.test(host)) || null;
  }

  // ── Detection ────────────────────────────────────────────────────────────────

  let lastBalance = null;
  let lastGainLoss = null;
  let config = null;

  function readAndDispatch() {
    if (!config) return;

    const balance = trySelectors(config.balanceSelectors);
    const gainLoss = trySelectors(config.gainLossSelectors);

    // Only dispatch when something meaningful changed
    if (balance === lastBalance && gainLoss === lastGainLoss) return;
    lastBalance = balance;
    lastGainLoss = gainLoss;

    window.dispatchEvent(new CustomEvent('fire:balance-update', {
      detail: {
        balance,
        dailyGainLoss: gainLoss,
        brokerage: config.name,
        detectedAt: Date.now(),
      },
    }));
  }

  function startObserver() {
    readAndDispatch(); // immediate check

    const observer = new MutationObserver(() => readAndDispatch());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────

  config = detectBrokerageConfig();
  if (!config) return; // not a supported brokerage page

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();
