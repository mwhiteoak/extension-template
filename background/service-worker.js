// Homebrew Recipe Sidekick — Service Worker
// Handles messaging from content scripts, options, and Stripe stub.

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'GET_OPTIONS': {
        const opts = await chrome.storage.sync.get({
          isPro: false,
          units: 'imperial',
          defaultBatchSize: 5
        });
        sendResponse(opts);
        break;
      }

      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace with real Stripe Payment Link before launch
        chrome.tabs.create({ url: 'https://buy.stripe.com/homebrew_recipe_sidekick_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      case 'SET_PRO': {
        await chrome.storage.sync.set({ isPro: msg.isPro });
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_OPTIONS': {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        break;
      }

      case 'SAVE_RECIPE': {
        // Pro: save up to 20 recipes to chrome.storage.sync
        const { recipe } = msg;
        if (!recipe || !recipe.name) {
          sendResponse({ ok: false, error: 'Recipe must have a name.' });
          break;
        }
        const stored = await chrome.storage.sync.get({ savedRecipes: [] });
        const recipes = stored.savedRecipes;
        const existingIdx = recipes.findIndex(r => r.name === recipe.name);
        if (existingIdx >= 0) {
          recipes[existingIdx] = recipe;
        } else {
          if (recipes.length >= 20) {
            sendResponse({ ok: false, error: 'Max 20 saved recipes reached.' });
            break;
          }
          recipes.push(recipe);
        }
        await chrome.storage.sync.set({ savedRecipes: recipes });
        sendResponse({ ok: true, count: recipes.length });
        break;
      }

      case 'GET_RECIPES': {
        const stored = await chrome.storage.sync.get({ savedRecipes: [] });
        sendResponse({ recipes: stored.savedRecipes });
        break;
      }

      case 'DELETE_RECIPE': {
        const stored = await chrome.storage.sync.get({ savedRecipes: [] });
        const filtered = stored.savedRecipes.filter(r => r.name !== msg.name);
        await chrome.storage.sync.set({ savedRecipes: filtered });
        sendResponse({ ok: true, count: filtered.length });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async response
});
