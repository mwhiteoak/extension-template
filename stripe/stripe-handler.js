// stripe-handler.js — Stripe Checkout stub for Homebrew Recipe Sidekick Pro
//
// MVP: clicking "Upgrade" opens the Stripe Payment Link in a new tab.
// For production, replace CHECKOUT_URL with your actual Stripe Payment Link.
// A server-side webhook should POST back to set isPro: true in chrome.storage.sync.
//
// Billing code: EXT-010-PRO

const CHECKOUT_URL = 'https://buy.stripe.com/homebrew_recipe_sidekick_pro_placeholder';

function openCheckout() {
  chrome.tabs.create({ url: CHECKOUT_URL });
}

async function isEntitled() {
  const result = await chrome.storage.sync.get({ isPro: false });
  return !!result.isPro;
}

async function grantEntitlement() {
  await chrome.storage.sync.set({ isPro: true });
}

async function revokeEntitlement() {
  await chrome.storage.sync.set({ isPro: false });
}

if (typeof module !== 'undefined') {
  module.exports = { openCheckout, isEntitled, grantEntitlement, revokeEntitlement };
}
