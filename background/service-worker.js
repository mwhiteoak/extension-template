// service-worker.js - MV3 background service worker
// Note: Service workers do not have access to the DOM.
// They terminate when idle and restart when needed — do not rely on global state.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log('Extension installed');
    // Set default storage values
    chrome.storage.local.set({ initialized: true });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BACKGROUND_ACTION') {
    // Handle action
    sendResponse({ success: true });
  }
  // Return true to indicate async response if needed
  return true;
});

// Handle tab updates (example listener)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    // Tab finished loading
  }
});
