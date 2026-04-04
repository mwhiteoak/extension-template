// Homebrew Recipe Sidekick — Options Page

const SYNC_DEFAULTS = {
  isPro: false,
  units: 'imperial',
  defaultBatchSize: 5,
};

function showMsg(id, duration = 3000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

async function loadOptions() {
  const sync = await chrome.storage.sync.get(SYNC_DEFAULTS);
  document.getElementById('units').value = sync.units;
  document.getElementById('defaultBatchSize').value = sync.defaultBatchSize;
  updateProUI(sync.isPro);
}

function updateProUI(isPro) {
  document.getElementById('pro-badge').style.display = isPro ? '' : 'none';
  document.getElementById('pro-upgrade-section').style.display = isPro ? 'none' : '';
  document.getElementById('pro-active-section').style.display = isPro ? '' : 'none';
}

document.getElementById('save-units').addEventListener('click', async () => {
  const units = document.getElementById('units').value;
  const defaultBatchSize = parseFloat(document.getElementById('defaultBatchSize').value) || 5;
  await chrome.storage.sync.set({ units, defaultBatchSize });
  showMsg('units-saved');
});

document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

document.getElementById('disable-pro-btn')?.addEventListener('click', async () => {
  await chrome.storage.sync.set({ isPro: false });
  updateProUI(false);
});

document.getElementById('clear-data').addEventListener('click', async () => {
  if (!confirm('Clear all saved data? Saved recipes and settings will be deleted.')) return;
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  loadOptions();
  showMsg('data-cleared');
});

loadOptions();
