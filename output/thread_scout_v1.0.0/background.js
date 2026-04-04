/**
 * Thread Scout — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Set the extension badge when the popup is installed/updated.
 * - Forward STASH_UPDATED messages from popup to active content script tabs.
 *   (Direct tab messaging from popup handles this; background is kept minimal.)
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[Thread Scout] Installed. Open the popup to manage your stash.');
  }
});

// Keep service worker alive just long enough to handle messages.
// No persistent background logic needed — all state lives in chrome.storage.local.
