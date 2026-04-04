/**
 * FilmDB Background Script
 *
 * Minimal background context. Currently handles:
 * - Extension installation event (future: migrate storage, show welcome page)
 *
 * Chrome uses this as a service worker (via manifest background.service_worker).
 * Firefox uses this as a background module script.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open the options page on first install so the user can configure eBay App ID
    chrome.runtime.openOptionsPage();
  }
});
