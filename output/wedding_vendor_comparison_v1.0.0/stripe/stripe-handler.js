// Wedding Vendor Tracker — Stripe Handler Stub
// Replace PAYMENT_LINK_URL with your real Stripe Payment Link before launch.
// billingCode: EXT-005-PRO

const PAYMENT_LINK_URL = 'https://buy.stripe.com/wedding_vendor_tracker_pro_placeholder';

/**
 * Open the Stripe Checkout popup for the Pro subscription.
 * Call this from the service worker or any extension page.
 */
function openCheckout() {
  chrome.tabs.create({ url: PAYMENT_LINK_URL });
}

/**
 * Check whether the current user has an active Pro entitlement.
 * @returns {Promise<boolean>}
 */
async function isEntitled() {
  const { isPro } = await chrome.storage.sync.get({ isPro: false });
  return isPro === true;
}

/**
 * Grant Pro entitlement. Call this from your Stripe webhook handler
 * or from a success redirect page after checkout completes.
 */
async function grantEntitlement() {
  await chrome.storage.sync.set({ isPro: true });
}

/**
 * Revoke Pro entitlement. Call this when a subscription is cancelled
 * or payment fails (from your Stripe webhook handler).
 */
async function revokeEntitlement() {
  await chrome.storage.sync.set({ isPro: false });
}

// Export for use in background service worker (if bundled)
if (typeof module !== 'undefined') {
  module.exports = { openCheckout, isEntitled, grantEntitlement, revokeEntitlement };
}
