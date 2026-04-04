// stripe-handler.js - Stripe Checkout flow stub
// Replace STRIPE_PUBLISHABLE_KEY with your actual key before use.
// For production, initiate sessions server-side, not from the extension.

const STRIPE_PUBLISHABLE_KEY = 'pk_live_REPLACE_ME';

/**
 * Opens a Stripe Checkout session for a one-time payment or subscription.
 * @param {object} options
 * @param {string} options.priceId - Stripe Price ID (from dashboard)
 * @param {string} options.successUrl - URL to redirect on success
 * @param {string} options.cancelUrl - URL to redirect on cancel
 */
async function openCheckout({ priceId, successUrl, cancelUrl }) {
  // In a real extension, you'd call your backend to create a Checkout session
  // and return the session URL. Direct Stripe.js usage from extensions is limited.
  // Example backend call:
  //
  // const response = await fetch('https://your-backend.com/create-checkout-session', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ priceId, successUrl, cancelUrl }),
  // });
  // const { url } = await response.json();
  // chrome.tabs.create({ url });

  console.warn('stripe-handler: implement backend session creation before use');
}

/**
 * Check entitlement via chrome.storage (set by webhook / backend after payment).
 * @returns {Promise<boolean>}
 */
async function isEntitled() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['stripe_entitled'], (result) => {
      resolve(result.stripe_entitled === true);
    });
  });
}

/**
 * Grant entitlement locally (called after webhook confirmation).
 */
async function grantEntitlement() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ stripe_entitled: true }, resolve);
  });
}
