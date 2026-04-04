// stripe-handler.js — Stripe Checkout stub for Proposal Template Manager Pro
//
// MVP: clicking "Upgrade" opens the Stripe Checkout URL directly in a new tab.
// For production, replace CHECKOUT_URL with your Stripe Payment Link URL.
// A server-side session approach is recommended for subscriptions but is NOT
// required for the Stripe Payment Links flow (no backend needed).

const CHECKOUT_URL = 'https://buy.stripe.com/REPLACE_WITH_YOUR_PAYMENT_LINK';

/**
 * Open the Stripe Checkout page for the Pro subscription ($9/mo).
 * Call this from the upgrade button click handler.
 */
function openCheckout() {
  chrome.tabs.create({ url: CHECKOUT_URL });
}

/**
 * Check whether the user has a Pro entitlement stored locally.
 * In production, verify via your backend after a Stripe webhook sets this flag.
 * @returns {Promise<boolean>}
 */
async function isEntitled() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ptm_settings'], (result) => {
      const settings = result.ptm_settings || {};
      resolve(settings.isPro === true);
    });
  });
}

/**
 * Grant Pro entitlement locally.
 * Call this after your webhook confirms a successful payment.
 * @returns {Promise<void>}
 */
async function grantEntitlement() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ptm_settings'], (result) => {
      const settings = Object.assign({ reminderEnabled: true, reminderHours: 48 }, result.ptm_settings || {});
      settings.isPro = true;
      chrome.storage.local.set({ ptm_settings: settings }, resolve);
    });
  });
}

/**
 * Revoke Pro entitlement locally (e.g. subscription cancelled).
 * @returns {Promise<void>}
 */
async function revokeEntitlement() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ptm_settings'], (result) => {
      const settings = Object.assign({}, result.ptm_settings || {});
      settings.isPro = false;
      chrome.storage.local.set({ ptm_settings: settings }, resolve);
    });
  });
}
