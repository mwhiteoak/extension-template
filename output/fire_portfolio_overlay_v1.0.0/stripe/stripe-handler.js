// stripe-handler.js — Stripe Checkout stub for FIRE Portfolio Overlay Pro
//
// MVP: clicking "Upgrade" opens the Stripe Payment Link in a new tab.
// For production, replace CHECKOUT_URL with your actual Stripe Payment Link.
// A server-side webhook should POST back to set isPro: true in chrome.storage.sync.
//
// Billing code: EXT-005-PRO

const CHECKOUT_URL = 'https://buy.stripe.com/fire_portfolio_overlay_pro_placeholder';

/**
 * Opens the Stripe Checkout page in a new tab.
 * Called by the background service worker on OPEN_STRIPE_CHECKOUT message.
 */
function openCheckout() {
  chrome.tabs.create({ url: CHECKOUT_URL });
}

/**
 * Returns true if the user has an active Pro entitlement.
 * @returns {Promise<boolean>}
 */
async function isEntitled() {
  const result = await chrome.storage.sync.get({ isPro: false });
  return !!result.isPro;
}

/**
 * Grants Pro entitlement (call this after a successful Stripe webhook confirmation).
 * @returns {Promise<void>}
 */
async function grantEntitlement() {
  await chrome.storage.sync.set({ isPro: true });
}

/**
 * Revokes Pro entitlement (call this on subscription cancellation webhook).
 * @returns {Promise<void>}
 */
async function revokeEntitlement() {
  await chrome.storage.sync.set({ isPro: false });
}

// Export for use in service worker (if bundled) or testing
if (typeof module !== 'undefined') {
  module.exports = { openCheckout, isEntitled, grantEntitlement, revokeEntitlement };
}
