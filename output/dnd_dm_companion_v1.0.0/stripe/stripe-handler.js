// D&D Beyond DM Companion — Stripe Handler Stub
// Replace PAYMENT_LINK_URL with your real Stripe Payment Link before launch.
// billingCode: EXT-007-PRO

const PAYMENT_LINK_URL = 'https://buy.stripe.com/dnd_dm_companion_pro_placeholder';

/**
 * Open the Stripe Checkout for the Pro subscription ($6/mo).
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
 * Grant Pro entitlement.
 * Call from your Stripe webhook success handler or post-checkout redirect page.
 */
async function grantEntitlement() {
  await chrome.storage.sync.set({ isPro: true });
}

/**
 * Revoke Pro entitlement.
 * Call when a subscription is cancelled or payment fails (Stripe webhook).
 */
async function revokeEntitlement() {
  await chrome.storage.sync.set({ isPro: false });
}

if (typeof module !== 'undefined') {
  module.exports = { openCheckout, isEntitled, grantEntitlement, revokeEntitlement };
}
