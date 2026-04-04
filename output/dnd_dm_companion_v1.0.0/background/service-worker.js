// D&D Beyond DM Companion — Service Worker

// ── Install ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.sync.set({ isPro: true, dmcNotes: '', dmcPartySize: 4, dmcPartyLevel: 5 });
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      // ── GET_OPTIONS ───────────────────────────────────────────────────────
      case 'GET_OPTIONS': {
        const opts = await chrome.storage.sync.get({
          isPro: true,
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
