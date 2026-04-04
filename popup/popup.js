// Espresso Community Intelligence — Popup JS

async function init() {
  const opts = await chrome.storage.sync.get({
    enabledSites: ['seattlecoffeegear.com', 'prima-coffee.com', 'clivecoffee.com'],
    isPro: false,
  });

  document.getElementById('sitesVal').textContent = opts.enabledSites.length;
  document.getElementById('planVal').textContent = opts.isPro ? 'Pro ✓' : 'Free';

  if (opts.isPro) {
    document.getElementById('proBar').style.display = 'none';
  }
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('proBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

init();
