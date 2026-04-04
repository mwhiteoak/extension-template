// Seed Catalog Companion Planner — Popup JS

function formatFrostDate(mmdd) {
  if (!mmdd) return '—';
  const [m, d] = mmdd.split('-').map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function init() {
  const sync = await chrome.storage.sync.get({
    isPro: false,
    zip: '',
    zone: '',
    lastSpringFrost: '',
    firstFallFrost: '',
  });

  document.getElementById('zipVal').textContent = sync.zip || 'Not set';
  document.getElementById('zoneVal').textContent = sync.zone || '—';
  document.getElementById('lsfVal').textContent = formatFrostDate(sync.lastSpringFrost);
  document.getElementById('fffVal').textContent = formatFrostDate(sync.firstFallFrost);
  document.getElementById('planVal').textContent = sync.isPro ? 'Pro ✓' : 'Free';

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
