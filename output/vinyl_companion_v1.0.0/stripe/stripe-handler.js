// Vinyl Companion — Stripe Stub
// Replace PAYMENT_LINK_URL with a real Stripe Payment Link before launch.
// After successful payment, Stripe webhook should call your backend which
// sets chrome.storage.sync { isPro: true } via a native messaging host or
// sets a flag the extension reads on the success redirect page.

const PAYMENT_LINK_URL = 'https://buy.stripe.com/vinyl_companion_pro_placeholder';

// Success URL should be a chrome-extension:// page or a hosted thank-you page
// that sends a message to the extension to unlock Pro.
// Example success handler (add to a hosted page or extension page):
//
//   if (new URLSearchParams(location.search).get('vc_pro') === '1') {
//     chrome.runtime.sendMessage({ type: 'SET_PRO', isPro: true });
//   }

export { PAYMENT_LINK_URL };
