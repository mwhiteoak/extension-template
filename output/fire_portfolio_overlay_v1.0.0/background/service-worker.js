// FIRE Portfolio Overlay — Service Worker
// Handles messaging from content scripts and Stripe stub.

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'GET_OPTIONS': {
        const opts = await chrome.storage.sync.get({ isPro: false, enabledBrokerages: ['fidelity', 'vanguard', 'schwab'] });
        sendResponse(opts);
        break;
      }

      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace billingCode link with real Stripe Payment Link before launch
        chrome.tabs.create({ url: 'https://buy.stripe.com/fire_portfolio_overlay_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      case 'SET_PRO': {
        await chrome.storage.sync.set({ isPro: msg.isPro });
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_OPTIONS': {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        break;
      }

      case 'STORE_BROKERAGE_BALANCE': {
        // Multi-account aggregation stub (Pro feature)
        // Each brokerage tab writes its balance; background aggregates
        const { brokerage, balance } = msg;
        if (brokerage && balance !== null) {
          const key = 'balance_' + brokerage;
          await chrome.storage.local.set({ [key]: { balance, updatedAt: Date.now() } });
        }
        sendResponse({ ok: true });
        break;
      }

      case 'GET_AGGREGATE_BALANCE': {
        // Pro: sum balances from all registered brokerages
        const opts = await chrome.storage.sync.get({ isPro: false });
        if (!opts.isPro) { sendResponse({ aggregate: null }); break; }
        const keys = ['balance_fidelity', 'balance_vanguard', 'balance_schwab'];
        const stored = await chrome.storage.local.get(keys);
        const maxAgeMs = 24 * 60 * 60 * 1000;
        let total = 0;
        let count = 0;
        for (const k of keys) {
          const entry = stored[k];
          if (entry && Date.now() - entry.updatedAt < maxAgeMs) {
            total += entry.balance;
            count++;
          }
        }
        sendResponse({ aggregate: count > 0 ? total : null, count });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async response
});
