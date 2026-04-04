// FIRE Portfolio Overlay — Options Page

const SYNC_DEFAULTS = {
  isPro: false,
  enabledBrokerages: ['fidelity', 'vanguard', 'schwab'],
};

function showMsg(id, duration = 3000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

async function loadOptions() {
  // Load FIRE params from local storage
  const local = await chrome.storage.local.get(['fire_settings']);
  const fire = local.fire_settings || {};
  if (fire.annualExpenses) document.getElementById('annualExpenses').value = fire.annualExpenses;
  if (fire.monthlyContribution !== undefined) document.getElementById('monthlyContribution').value = fire.monthlyContribution;
  if (fire.expectedReturn !== undefined) document.getElementById('expectedReturn').value = fire.expectedReturn;
  else document.getElementById('expectedReturn').value = 7;

  // Load sync options
  const sync = await chrome.storage.sync.get(SYNC_DEFAULTS);
  const brokerages = sync.enabledBrokerages;
  document.getElementById('enable-fidelity').checked = brokerages.includes('fidelity');
  document.getElementById('enable-vanguard').checked = brokerages.includes('vanguard');
  document.getElementById('enable-schwab').checked = brokerages.includes('schwab');

  // Pro status
  updateProUI(sync.isPro);
}

function updateProUI(isPro) {
  document.getElementById('pro-badge').style.display = isPro ? '' : 'none';
  document.getElementById('pro-upgrade-section').style.display = isPro ? 'none' : '';
  document.getElementById('pro-active-section').style.display = isPro ? '' : 'none';
}

document.getElementById('save-fire').addEventListener('click', async () => {
  const expenses = parseFloat(document.getElementById('annualExpenses').value);
  const contribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
  const ret = parseFloat(document.getElementById('expectedReturn').value) || 7;
  if (!expenses || expenses <= 0) { alert('Please enter a valid annual expenses amount.'); return; }
  await chrome.storage.local.set({ fire_settings: { annualExpenses: expenses, monthlyContribution: contribution, expectedReturn: ret } });
  showMsg('fire-saved');
});

document.getElementById('save-sites').addEventListener('click', async () => {
  const brokerages = [];
  if (document.getElementById('enable-fidelity').checked) brokerages.push('fidelity');
  if (document.getElementById('enable-vanguard').checked) brokerages.push('vanguard');
  if (document.getElementById('enable-schwab').checked) brokerages.push('schwab');
  await chrome.storage.sync.set({ enabledBrokerages: brokerages });
  showMsg('sites-saved');
});

document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

document.getElementById('disable-pro-btn')?.addEventListener('click', async () => {
  await chrome.storage.sync.set({ isPro: false });
  updateProUI(false);
});

document.getElementById('clear-data').addEventListener('click', async () => {
  if (!confirm('Clear all FIRE data? Your FIRE parameters and cached balances will be deleted.')) return;
  await chrome.storage.local.clear();
  document.getElementById('annualExpenses').value = '';
  document.getElementById('monthlyContribution').value = '';
  document.getElementById('expectedReturn').value = 7;
  showMsg('data-cleared');
});

loadOptions();
