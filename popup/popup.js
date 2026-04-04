// Specialty Coffee Cross-Site Companion — Popup JS

const ROASTERY_CONFIG_URL = chrome.runtime.getURL('data/roastery-config.json');

function formatCpg(cpg) {
  return `$${cpg.toFixed(3)}/g`;
}

async function loadConfig() {
  const res = await fetch(ROASTERY_CONFIG_URL);
  return res.json();
}

async function init() {
  const [sync, cfg] = await Promise.all([
    chrome.storage.sync.get({ isPro: false, disabledSites: [] }),
    loadConfig(),
  ]);

  document.getElementById('planVal').textContent = sync.isPro ? 'Pro ✓' : 'Free';

  if (sync.isPro) {
    document.getElementById('proBar').style.display = 'none';
  }

  // Try to get current tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const hostname = url.hostname.replace(/^www\./, '');
      const roastery = cfg.roasteries.find(r => hostname.endsWith(r.hostname));

      if (roastery) {
        document.getElementById('currentSite').textContent = roastery.name;

        // Attempt to get cached page data from the tab
        const resp = await chrome.runtime.sendMessage({ type: 'GET_PAGE_DATA_FOR_TAB', tabId: tab.id });
        if (resp && resp.data && resp.data.price && resp.data.weightGrams) {
          const cpg = resp.data.price / resp.data.weightGrams;
          const avgCpg = roastery.avgPricePerGram;
          document.getElementById('priceRow').style.display = 'flex';
          document.getElementById('cpgVal').textContent = formatCpg(cpg);
          document.getElementById('compRow').style.display = 'flex';
          const diff = ((cpg - avgCpg) / avgCpg * 100).toFixed(0);
          const sign = diff > 0 ? '+' : '';
          document.getElementById('compVal').textContent = `${sign}${diff}% vs ${roastery.name} avg (${formatCpg(avgCpg)})`;
        }
      }
    }
  } catch (_) {
    // Tab access may fail on some pages — not critical
  }

  // Render roastery comparison list
  const list = document.getElementById('comparisonList');
  list.innerHTML = '';

  const enabledRoasteries = cfg.roasteries.filter(r => !sync.disabledSites.includes(r.key));
  const sorted = [...enabledRoasteries].sort((a, b) => a.avgPricePerGram - b.avgPricePerGram);

  sorted.forEach(r => {
    const tier = cfg.freshnessTiers[r.freshnessModel];
    const row = document.createElement('div');
    row.className = 'comp-row';
    row.innerHTML = `
      <span class="comp-roastery">${r.name}</span>
      <span>
        <span class="freshness-tag" style="background:${tier.color}">${tier.icon}</span>
        <span class="comp-value">${formatCpg(r.avgPricePerGram)}</span>
      </span>
    `;
    list.appendChild(row);
  });
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('proBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

init();
