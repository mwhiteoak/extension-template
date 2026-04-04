// FIRE Portfolio Overlay — Popup JS

function formatCurrency(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n).toLocaleString();
  return '$' + n.toFixed(0);
}

async function init() {
  const [local, sync] = await Promise.all([
    chrome.storage.local.get(['fire_settings']),
    chrome.storage.sync.get({ isPro: false, enabledBrokerages: ['fidelity', 'vanguard', 'schwab'] }),
  ]);

  const fire = local.fire_settings;
  if (fire && fire.annualExpenses) {
    const target = fire.annualExpenses * 25;
    document.getElementById('fireTargetVal').textContent = formatCurrency(target);
  }

  document.getElementById('planVal').textContent = sync.isPro ? 'Pro ✓' : 'Free';

  if (sync.isPro) {
    document.getElementById('proBar').style.display = 'none';
  }

  if (!fire) {
    document.getElementById('fiRatioVal').textContent = 'Setup needed';
    document.getElementById('statusVal').textContent = 'Setup needed';
    document.getElementById('statusVal').style.color = '#e67e22';
  }
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('proBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

init();
