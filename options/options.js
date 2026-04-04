// Seed Catalog Companion Planner — Options Page

const SYNC_DEFAULTS = {
  isPro: false,
  zip: '',
  zone: '',
  lastSpringFrost: '',
  firstFallFrost: '',
};

let zipZonesData = null;

async function loadZipZones() {
  if (zipZonesData) return zipZonesData;
  const url = chrome.runtime.getURL('data/zip-zones.json');
  const resp = await fetch(url);
  zipZonesData = await resp.json();
  return zipZonesData;
}

function formatFrostDate(mmdd) {
  if (!mmdd) return '—';
  const [m, d] = mmdd.split('-').map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function showMsg(id, duration = 3000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

async function loadOptions() {
  const sync = await chrome.storage.sync.get(SYNC_DEFAULTS);
  document.getElementById('zip').value = sync.zip;
  updateProUI(sync.isPro);
  if (sync.zone) {
    showZoneResult(sync.zone, sync.lastSpringFrost, sync.firstFallFrost);
  }
}

function updateProUI(isPro) {
  document.getElementById('pro-badge').style.display = isPro ? '' : 'none';
  document.getElementById('pro-upgrade-section').style.display = isPro ? 'none' : '';
  document.getElementById('pro-active-section').style.display = isPro ? '' : 'none';
}

function showZoneResult(zone, lsf, fff) {
  const resultEl = document.getElementById('zone-result');
  const errorEl = document.getElementById('zone-error');
  errorEl.style.display = 'none';
  resultEl.style.display = '';
  document.getElementById('zone-display').textContent = zone;
  const lsfStr = formatFrostDate(lsf);
  const fffStr = formatFrostDate(fff);
  document.getElementById('zone-detail').textContent =
    `Last spring frost: ${lsfStr} · First fall frost: ${fffStr}`;
}

document.getElementById('lookup-btn').addEventListener('click', async () => {
  const zip = document.getElementById('zip').value.trim().replace(/\D/g, '').slice(0, 5);
  if (zip.length < 5) {
    document.getElementById('zone-error').style.display = '';
    document.getElementById('zone-result').style.display = 'none';
    return;
  }

  const data = await loadZipZones();
  const prefix = zip.slice(0, 3);
  const entry = data[prefix];

  if (!entry) {
    document.getElementById('zone-error').style.display = '';
    document.getElementById('zone-result').style.display = 'none';
    return;
  }

  const { zone, lsf, fff } = entry;
  await chrome.storage.sync.set({
    zip,
    zone,
    lastSpringFrost: lsf,
    firstFallFrost: fff,
  });

  showZoneResult(zone, lsf, fff);
  showMsg('zip-saved');
});

document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

document.getElementById('disable-pro-btn')?.addEventListener('click', async () => {
  await chrome.storage.sync.set({ isPro: false });
  updateProUI(false);
});

document.getElementById('clear-data').addEventListener('click', async () => {
  if (!confirm('Clear all saved data? Your ZIP code and settings will be deleted.')) return;
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  document.getElementById('zip').value = '';
  document.getElementById('zone-result').style.display = 'none';
  document.getElementById('zone-error').style.display = 'none';
  updateProUI(false);
  showMsg('data-cleared');
});

loadOptions();
