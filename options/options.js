// Specialty Coffee Cross-Site Companion — Options Page

const CONFIG_URL = chrome.runtime.getURL('data/roastery-config.json');

let roasteryConfig = null;

async function loadConfig() {
  if (roasteryConfig) return roasteryConfig;
  const res = await fetch(CONFIG_URL);
  roasteryConfig = await res.json();
  return roasteryConfig;
}

function showMsg(id, duration = 3000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function updateProUI(isPro) {
  document.getElementById('pro-badge').style.display = isPro ? '' : 'none';
  document.getElementById('pro-upgrade-section').style.display = isPro ? 'none' : '';
  document.getElementById('pro-active-section').style.display = isPro ? '' : 'none';
}

async function loadOptions() {
  const [sync, cfg] = await Promise.all([
    chrome.storage.sync.get({
      isPro: false,
      disabledSites: [],
      showPricePerGram: true,
      showFreshnessBadge: true,
      slaOverrides: {},
    }),
    loadConfig(),
  ]);

  document.getElementById('showPricePerGram').checked = sync.showPricePerGram;
  document.getElementById('showFreshnessBadge').checked = sync.showFreshnessBadge;
  updateProUI(sync.isPro);

  // Build site toggles
  const siteToggles = document.getElementById('siteToggles');
  siteToggles.innerHTML = '';
  cfg.roasteries.forEach(r => {
    const isEnabled = !sync.disabledSites.includes(r.key);
    const row = document.createElement('div');
    row.className = 'toggle-row';
    row.innerHTML = `
      <div>
        <div class="toggle-label">${r.name}</div>
        <div class="toggle-sublabel">${r.hostname}</div>
      </div>
      <label class="toggle">
        <input type="checkbox" data-site="${r.key}" ${isEnabled ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </label>
    `;
    siteToggles.appendChild(row);
  });

  // Build SLA override inputs
  const slaContainer = document.getElementById('slaOverrides');
  slaContainer.innerHTML = '';
  cfg.roasteries.forEach(r => {
    const override = sync.slaOverrides[r.key];
    const val = override !== undefined ? override : r.shipSLADays;
    const row = document.createElement('div');
    row.className = 'sla-row';
    row.innerHTML = `
      <span class="sla-name">${r.name}</span>
      <input class="sla-input" type="number" min="1" max="30" data-sla="${r.key}" value="${val}" />
      <span class="sla-unit">days</span>
    `;
    slaContainer.appendChild(row);
  });
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const showPricePerGram = document.getElementById('showPricePerGram').checked;
  const showFreshnessBadge = document.getElementById('showFreshnessBadge').checked;

  const disabledSites = [];
  document.querySelectorAll('[data-site]').forEach(inp => {
    if (!inp.checked) disabledSites.push(inp.dataset.site);
  });

  const slaOverrides = {};
  document.querySelectorAll('[data-sla]').forEach(inp => {
    const val = parseInt(inp.value, 10);
    if (!isNaN(val) && val > 0) slaOverrides[inp.dataset.sla] = val;
  });

  await chrome.storage.sync.set({ showPricePerGram, showFreshnessBadge, disabledSites, slaOverrides });
  showMsg('saved-msg');
});

document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

document.getElementById('disable-pro-btn')?.addEventListener('click', async () => {
  await chrome.storage.sync.set({ isPro: false });
  updateProUI(false);
});

document.getElementById('clear-data').addEventListener('click', async () => {
  if (!confirm('Clear all saved data? Your settings will be deleted.')) return;
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  updateProUI(false);
  showMsg('data-cleared');
  await loadOptions();
});

loadOptions();
