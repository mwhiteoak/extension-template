// Espresso Community Intelligence — Options Page

const DEFAULTS = {
  enabledSites: ['seattlecoffeegear.com', 'prima-coffee.com', 'clivecoffee.com'],
  showTier: true,
  showSentiment: true,
  showRedditLink: true,
  showUpgrade: true,
  isPro: false,
};

async function loadOptions() {
  const opts = await chrome.storage.sync.get(DEFAULTS);

  document.getElementById('site-scg').checked = opts.enabledSites.includes('seattlecoffeegear.com');
  document.getElementById('site-prima').checked = opts.enabledSites.includes('prima-coffee.com');
  document.getElementById('site-clive').checked = opts.enabledSites.includes('clivecoffee.com');

  document.getElementById('toggleTier').checked = opts.showTier;
  document.getElementById('toggleSentiment').checked = opts.showSentiment;
  document.getElementById('toggleUpgrade').checked = opts.showUpgrade;

  if (opts.isPro) {
    document.getElementById('proBanner').style.display = 'none';
  }
}

async function saveOptions() {
  const enabledSites = [];
  if (document.getElementById('site-scg').checked) enabledSites.push('seattlecoffeegear.com');
  if (document.getElementById('site-prima').checked) enabledSites.push('prima-coffee.com');
  if (document.getElementById('site-clive').checked) enabledSites.push('clivecoffee.com');

  await chrome.storage.sync.set({
    enabledSites,
    showTier: document.getElementById('toggleTier').checked,
    showSentiment: document.getElementById('toggleSentiment').checked,
    showRedditLink: true,
    showUpgrade: document.getElementById('toggleUpgrade').checked,
  });

  const msg = document.getElementById('successMsg');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 3000);
}

document.getElementById('saveBtn').addEventListener('click', saveOptions);

document.getElementById('upgradeBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

loadOptions();
