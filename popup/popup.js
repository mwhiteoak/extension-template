// Homebrew Recipe Sidekick — Popup JS

async function init() {
  const sync = await chrome.storage.sync.get({
    isPro: false,
    units: 'imperial',
    defaultBatchSize: 5,
  });

  document.getElementById('planVal').textContent = sync.isPro ? 'Pro ✓' : 'Free';
  document.getElementById('unitsVal').textContent =
    sync.units === 'metric' ? 'Metric' : 'Imperial';

  const batchUnit = sync.units === 'metric' ? 'L' : 'gal';
  const batchDisplay = sync.units === 'metric'
    ? (sync.defaultBatchSize * 3.785).toFixed(0)
    : sync.defaultBatchSize;
  document.getElementById('batchVal').textContent = `${batchDisplay} ${batchUnit}`;

  if (sync.isPro) {
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
