// Lightroom Web Keyboard Enhancer — Background Service Worker
// Minimal MV3 service worker: handles install and settings messages.

const DEFAULT_CONFIG = {
  enabled: true,
  autoAdvance: true,
  shortcuts: {
    pick:    { key: 'p', enabled: true },
    reject:  { key: 'x', enabled: true },
    unflag:  { key: 'u', enabled: true },
    star1:   { key: '1', enabled: true },
    star2:   { key: '2', enabled: true },
    star3:   { key: '3', enabled: true },
    star4:   { key: '4', enabled: true },
    star5:   { key: '5', enabled: true },
    prev:    { key: 'arrowleft',  enabled: true },
    next:    { key: 'arrowright', enabled: true },
  },
};

async function getConfig() {
  const result = await chrome.storage.sync.get('lrkb_config');
  return result.lrkb_config || DEFAULT_CONFIG;
}

async function saveConfig(cfg) {
  await chrome.storage.sync.set({ lrkb_config: cfg });
}

// ─── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_CONFIG': {
        const cfg = await getConfig();
        sendResponse({ config: cfg });
        break;
      }
      case 'SAVE_CONFIG': {
        await saveConfig(message.config);
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true;
});

// ─── Install ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const existing = await chrome.storage.sync.get('lrkb_config');
  if (!existing.lrkb_config) {
    await saveConfig(DEFAULT_CONFIG);
  }
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});
