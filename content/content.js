// content.js - Content script injected into web pages
// Runs in the context of the page but in an isolated world.

(function () {
  'use strict';

  // Listen for messages from the popup or service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ACTION') {
      // Perform action on the page
      sendResponse({ message: 'Action completed' });
    }
    return true;
  });
})();
