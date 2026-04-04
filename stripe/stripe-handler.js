// stripe-handler.js — Stripe Checkout stub for Triathlon Race Day Pacing Planner Pro
//
// MVP: clicking "Upgrade" opens the Stripe Payment Link in a new tab.
// For production, replace CHECKOUT_URL with your actual Stripe Payment Link.
// A server-side webhook should POST back to set isPro: true in the user's storage.
//
// Billing code: EXT-003-PRO

const CHECKOUT_URL = 'https://buy.stripe.com/tri_pacing_pro_placeholder';

/**
 * Opens the Stripe Checkout page in a new tab.
 * Called by background service worker on OPEN_STRIPE_CHECKOUT message.
 */
function openCheckout() {
  chrome.tabs.create({ url: CHECKOUT_URL });
}

/**
 * Returns true if the user has an active Pro entitlement.
 * @returns {Promise<boolean>}
 */
async function isEntitled() {
  const result = await chrome.storage.sync.get('tri_settings');
  return !!(result.tri_settings?.isPro);
}

/**
 * Grants Pro entitlement (call this after a successful Stripe webhook).
 * @returns {Promise<void>}
 */
async function grantEntitlement() {
  const result = await chrome.storage.sync.get('tri_settings');
  const settings = Object.assign({}, result.tri_settings || {}, { isPro: true });
  await chrome.storage.sync.set({ tri_settings: settings });
}

/**
 * Revokes Pro entitlement (call this on subscription cancellation webhook).
 * @returns {Promise<void>}
 */
async function revokeEntitlement() {
  const result = await chrome.storage.sync.get('tri_settings');
  const settings = Object.assign({}, result.tri_settings || {}, { isPro: false });
  await chrome.storage.sync.set({ tri_settings: settings });
}

// Export for use in service worker (if bundled) or testing
if (typeof module !== 'undefined') {
  module.exports = { openCheckout, isEntitled, grantEntitlement, revokeEntitlement };
}
