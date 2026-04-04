// D&D Beyond DM Companion — Service Worker
// Handles Stripe checkout stub, Pro entitlement, and install events.

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/dnd_dm_companion_pro_placeholder';

// ── Install ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.sync.set({ isPro: false, dmcNotes: '', dmcPartySize: 4, dmcPartyLevel: 5 });
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      // ── OPEN_STRIPE_CHECKOUT ──────────────────────────────────────────────
      // Stripe stub — replace STRIPE_PAYMENT_LINK with real Payment Link URL.
      // After checkout completes, the Stripe webhook should call SET_PRO.
      case 'OPEN_STRIPE_CHECKOUT': {
        await chrome.tabs.create({ url: STRIPE_PAYMENT_LINK });
        sendResponse({ ok: true });
        break;
      }

      // ── SET_PRO ───────────────────────────────────────────────────────────
      case 'SET_PRO': {
        await chrome.storage.sync.set({ isPro: msg.isPro });
        sendResponse({ ok: true });
        break;
      }

      // ── GET_OPTIONS ───────────────────────────────────────────────────────
      case 'GET_OPTIONS': {
        const opts = await chrome.storage.sync.get({
          isPro: false,
          dmcPartySize: 4,
          dmcPartyLevel: 5,
          hotkey: 'D',
        });
        sendResponse(opts);
        break;
      }

      // ── SAVE_OPTIONS ──────────────────────────────────────────────────────
      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true;
});
