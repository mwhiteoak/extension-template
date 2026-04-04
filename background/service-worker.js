// Specialty Coffee Cross-Site Companion — Service Worker
// Handles messaging from content scripts, popup, options page, and Stripe stub.

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'GET_OPTIONS': {
        const opts = await chrome.storage.sync.get({
          isPro: false,
          disabledSites: [],
          showPricePerGram: true,
          showFreshnessBadge: true,
          slaOverrides: {},
        });
        sendResponse(opts);
        break;
      }

      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace with real Stripe Payment Link before launch
        chrome.tabs.create({ url: 'https://buy.stripe.com/coffee_companion_pro_placeholder' });
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

      case 'GET_PAGE_COMPARISON': {
        // Returns cached comparison data for the popup (origin/process comparisons)
        const cache = await chrome.storage.local.get({ comparisonCache: {} });
        sendResponse({ data: cache.comparisonCache[msg.origin] || null });
        break;
      }

      case 'CACHE_PAGE_DATA': {
        // Content script saves current page's coffee data for popup to read
        const cache = await chrome.storage.local.get({ pageDataCache: {} });
        cache.pageDataCache[msg.tabId] = msg.data;
        await chrome.storage.local.set({ pageDataCache: cache.pageDataCache });
        sendResponse({ ok: true });
        break;
      }

      case 'GET_PAGE_DATA_FOR_TAB': {
        const cache = await chrome.storage.local.get({ pageDataCache: {} });
        sendResponse({ data: cache.pageDataCache[msg.tabId] || null });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async response
});
