// FIRE Portfolio Overlay — Popup JS

function formatCurrency(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n).toLocaleString();
  return '$' + n.toFixed(0);
}

async function init() {
  const [local, sync] = await Promise.all([
    chrome.storage.local.get(['fire_settings']),
    chrome.storage.sync.get({ isPro: true, enabledBrokerages: ['fidelity', 'vanguard', 'schwab'] }),
  ]);

  const fire = local.fire_settings;
  if (fire && fire.annualExpenses) {
    const target = fire.annualExpenses * 25;
    document.getElementById('fireTargetVal').textContent = formatCurrency(target);
  }

  document.getElementById('planVal').textContent = sync.isPro ? 'Pro ✓' : 'Free';

  if (!fire) {
    document.getElementById('fiRatioVal').textContent = 'Setup needed';
    document.getElementById('statusVal').textContent = 'Setup needed';
    document.getElementById('statusVal').style.color = '#e67e22';
  }
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
