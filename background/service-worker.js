// Triathlon Race Day Pacing Planner — Background Service Worker
// Handles install, settings relay, and Stripe stub.

const DEFAULT_SETTINGS = {
  isPro: false,
  units: 'metric', // 'metric' | 'imperial'
  swimPacePer100: '',   // e.g. "1:45" (min:sec per 100m)
  bikePace: '',         // e.g. "30" (kph) or "250" (watts if bikeInputMode=watts)
  bikeInputMode: 'speed', // 'speed' | 'watts'
  runPacePer1k: '',     // e.g. "5:30" (min:sec per km)
  t1Minutes: '3',
  t2Minutes: '2',
};

// ── Install ───────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const existing = await chrome.storage.sync.get('tri_settings');
  if (!existing.tri_settings) {
    await chrome.storage.sync.set({ tri_settings: DEFAULT_SETTINGS });
  }
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      case 'GET_SETTINGS': {
        const result = await chrome.storage.sync.get('tri_settings');
        sendResponse(result.tri_settings || DEFAULT_SETTINGS);
        break;
      }

      case 'SAVE_SETTINGS': {
        const current = await chrome.storage.sync.get('tri_settings');
        const merged = Object.assign({}, DEFAULT_SETTINGS, current.tri_settings || {}, message.settings);
        await chrome.storage.sync.set({ tri_settings: merged });
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace URL with real Stripe Payment Link
        chrome.tabs.create({ url: 'https://buy.stripe.com/tri_pacing_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // Keep channel open for async response
});
