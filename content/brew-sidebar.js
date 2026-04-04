// Homebrew Recipe Sidekick — Sidebar
// Injects sidebar panel and handles all brewing tools

(function () {
  'use strict';

  if (document.getElementById('hbs-panel')) return; // already injected

  // ─── State ────────────────────────────────────────────────────────
  let opts = { isPro: false, units: 'imperial', defaultBatchSize: 5 };
  let hopsDb = [];
  let activeTab = 'hops';

  // ─── Bootstrap ────────────────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, res => {
    if (res) opts = { ...opts, ...res };
    loadHopsDb().then(() => {
      injectUI();
      bindEvents();
      prefillFromPage();
    });
  });

  async function loadHopsDb() {
    try {
      const url = chrome.runtime.getURL('data/hops.json');
      const r = await fetch(url);
      hopsDb = await r.json();
    } catch (e) {
      hopsDb = [];
    }
  }

  // ─── UI Injection ─────────────────────────────────────────────────
  function injectUI() {
    const batchLabel = opts.units === 'metric' ? 'L' : 'gal';
    const batchDefault = opts.units === 'metric'
      ? (opts.defaultBatchSize * 3.785).toFixed(1)
      : opts.defaultBatchSize;

    const panel = document.createElement('div');
    panel.id = 'hbs-panel';
    panel.innerHTML = `
      <div class="hbs-header">
        <div>
          <div class="hbs-header h1" style="font-size:14px;font-weight:700;margin:0">🍺 Homebrew Recipe Sidekick</div>
          <div class="hbs-header-sub">All calculations local — no data leaves your browser</div>
        </div>
        <button class="hbs-close-btn" id="hbs-close" title="Close">✕</button>
      </div>
      <div class="hbs-tabs">
        <button class="hbs-tab hbs-active" data-tab="hops">
          <span class="hbs-tab-icon">🌿</span>Hops
        </button>
        <button class="hbs-tab" data-tab="calc">
          <span class="hbs-tab-icon">🧮</span>Calc
        </button>
        <button class="hbs-tab" data-tab="water">
          <span class="hbs-tab-icon">💧</span>Water
          <span class="hbs-tab-pro-badge">PRO</span>
        </button>
        <button class="hbs-tab" data-tab="yeast">
          <span class="hbs-tab-icon">🦠</span>Yeast
          <span class="hbs-tab-pro-badge">PRO</span>
        </button>
      </div>
      <div class="hbs-body">

        <!-- HOP SUBSTITUTIONS TAB -->
        <div class="hbs-pane hbs-active" id="hbs-pane-hops">
          <div class="hbs-section-title">Hop Substitution Lookup</div>
          <div class="hbs-search-wrap">
            <input type="text" class="hbs-search-input" id="hbs-hop-search" placeholder="Type a hop name, e.g. Cascade…" autocomplete="off" />
            <div class="hbs-suggestions" id="hbs-hop-suggestions"></div>
          </div>
          <div id="hbs-hop-result"></div>
        </div>

        <!-- CALCULATORS TAB -->
        <div class="hbs-pane" id="hbs-pane-calc">
          <!-- IBU Calculator -->
          <div class="hbs-section-title">IBU — Tinseth Formula</div>
          <div class="hbs-field">
            <label>OG (e.g. 1.055)</label>
            <input type="number" id="hbs-ibu-og" min="1.000" max="1.200" step="0.001" value="1.055" />
          </div>
          <div class="hbs-row">
            <div class="hbs-field">
              <label>Batch Size (${batchLabel})</label>
              <input type="number" id="hbs-ibu-batch" min="0.1" step="0.1" value="${batchDefault}" />
            </div>
            <div class="hbs-field">
              <label>Units</label>
              <select id="hbs-ibu-units">
                <option value="imperial" ${opts.units === 'imperial' ? 'selected' : ''}>Imperial (oz/gal)</option>
                <option value="metric" ${opts.units === 'metric' ? 'selected' : ''}>Metric (g/L)</option>
              </select>
            </div>
          </div>
          <div class="hbs-section-title" style="margin-top:4px">Hop Additions</div>
          <div class="hbs-hop-row" style="font-size:10px;color:#666;margin-bottom:2px;padding:0 2px">
            <span>Hop Name</span>
            <span>Weight</span>
            <span>AA%</span>
            <span>Time (min)</span>
            <span></span>
          </div>
          <div class="hbs-hop-rows" id="hbs-ibu-hop-rows">
            <!-- rows injected by JS -->
          </div>
          <button class="hbs-add-hop-btn" id="hbs-add-ibu-hop">+ Add Hop Addition</button>
          <button class="hbs-btn" id="hbs-calc-ibu">Calculate IBU</button>
          <div id="hbs-ibu-result"></div>

          <hr class="hbs-divider" />

          <!-- ABV Calculator -->
          <div class="hbs-section-title">ABV Calculator</div>
          <div class="hbs-row">
            <div class="hbs-field">
              <label>Original Gravity (OG)</label>
              <input type="number" id="hbs-abv-og" min="1.000" max="1.200" step="0.001" value="1.055" />
            </div>
            <div class="hbs-field">
              <label>Final Gravity (FG)</label>
              <input type="number" id="hbs-abv-fg" min="1.000" max="1.200" step="0.001" value="1.012" />
            </div>
          </div>
          <div class="hbs-field">
            <label>Formula</label>
            <select id="hbs-abv-formula">
              <option value="standard">Standard: (OG−FG)×131.25</option>
              <option value="alternate">Alternate (Miller)</option>
            </select>
          </div>
          <button class="hbs-btn" id="hbs-calc-abv">Calculate ABV</button>
          <div id="hbs-abv-result"></div>

          <hr class="hbs-divider" />

          <!-- SRM Calculator -->
          <div class="hbs-section-title">SRM Color Estimator — Morey Equation</div>
          <div class="hbs-row">
            <div class="hbs-field">
              <label>Batch Size (${batchLabel})</label>
              <input type="number" id="hbs-srm-batch" min="0.1" step="0.1" value="${batchDefault}" />
            </div>
            <div class="hbs-field">
              <label>Units</label>
              <select id="hbs-srm-units">
                <option value="imperial" ${opts.units === 'imperial' ? 'selected' : ''}>Imperial (lb/gal)</option>
                <option value="metric" ${opts.units === 'metric' ? 'selected' : ''}>Metric (kg/L)</option>
              </select>
            </div>
          </div>
          <div class="hbs-section-title" style="margin-top:4px">Grain Bill</div>
          <div style="font-size:10px;color:#666;display:grid;grid-template-columns:2fr 1fr 1fr 18px;gap:4px;padding:0 2px;margin-bottom:2px">
            <span>Grain</span><span>Weight</span><span>Lovibond</span><span></span>
          </div>
          <div id="hbs-srm-grain-rows"></div>
          <button class="hbs-add-hop-btn" id="hbs-add-grain">+ Add Grain</button>
          <button class="hbs-btn" id="hbs-calc-srm">Calculate SRM</button>
          <div id="hbs-srm-result"></div>
        </div>

        <!-- WATER CHEMISTRY TAB (Pro) -->
        <div class="hbs-pane" id="hbs-pane-water">
          <div id="hbs-water-content"></div>
        </div>

        <!-- YEAST TAB (Pro) -->
        <div class="hbs-pane" id="hbs-pane-yeast">
          <div id="hbs-yeast-content"></div>
        </div>

      </div>
    `;

    const toggle = document.createElement('button');
    toggle.id = 'hbs-toggle-btn';
    toggle.title = 'Homebrew Recipe Sidekick';
    toggle.innerHTML = '🍺<span style="writing-mode:vertical-rl;font-size:10px;margin-top:4px">Brew Tools</span>';

    document.body.appendChild(panel);
    document.body.appendChild(toggle);

    // Add initial hop row
    addIbuHopRow();
    addGrainRow();

    // Render pro-gated tabs
    renderWaterTab();
    renderYeastTab();
  }

  // ─── Events ───────────────────────────────────────────────────────
  function bindEvents() {
    const panel = document.getElementById('hbs-panel');
    const toggle = document.getElementById('hbs-toggle-btn');

    toggle.addEventListener('click', () => {
      panel.classList.toggle('hbs-open');
      toggle.style.right = panel.classList.contains('hbs-open') ? '370px' : '0';
    });

    document.getElementById('hbs-close').addEventListener('click', () => {
      panel.classList.remove('hbs-open');
      toggle.style.right = '0';
    });

    // Tab switching
    panel.querySelectorAll('.hbs-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        panel.querySelectorAll('.hbs-tab').forEach(t => t.classList.remove('hbs-active'));
        btn.classList.add('hbs-active');
        panel.querySelectorAll('.hbs-pane').forEach(p => p.classList.remove('hbs-active'));
        document.getElementById('hbs-pane-' + activeTab).classList.add('hbs-active');
      });
    });

    // Hop search
    const hopSearch = document.getElementById('hbs-hop-search');
    const suggestions = document.getElementById('hbs-hop-suggestions');

    hopSearch.addEventListener('input', () => {
      const q = hopSearch.value.trim().toLowerCase();
      if (!q || q.length < 2) {
        suggestions.classList.remove('hbs-visible');
        return;
      }
      const matches = hopsDb.filter(h => h.name.toLowerCase().includes(q)).slice(0, 8);
      if (matches.length === 0) {
        suggestions.classList.remove('hbs-visible');
        return;
      }
      suggestions.innerHTML = matches.map(h =>
        `<div class="hbs-suggestion-item" data-name="${escHtml(h.name)}">${escHtml(h.name)} <span style="color:#666;font-size:10px">${h.origin} | AA: ${h.aa[0]}–${h.aa[1]}%</span></div>`
      ).join('');
      suggestions.classList.add('hbs-visible');
    });

    suggestions.addEventListener('click', e => {
      const item = e.target.closest('.hbs-suggestion-item');
      if (!item) return;
      const name = item.dataset.name;
      hopSearch.value = name;
      suggestions.classList.remove('hbs-visible');
      showHopResult(name);
    });

    hopSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = hopSearch.value.trim().toLowerCase();
        const match = hopsDb.find(h => h.name.toLowerCase() === q) ||
                      hopsDb.find(h => h.name.toLowerCase().includes(q));
        if (match) {
          hopSearch.value = match.name;
          suggestions.classList.remove('hbs-visible');
          showHopResult(match.name);
        }
      }
      if (e.key === 'Escape') suggestions.classList.remove('hbs-visible');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('#hbs-hop-search') && !e.target.closest('#hbs-hop-suggestions')) {
        suggestions.classList.remove('hbs-visible');
      }
    });

    // IBU calculator
    document.getElementById('hbs-add-ibu-hop').addEventListener('click', addIbuHopRow);
    document.getElementById('hbs-calc-ibu').addEventListener('click', calcIbu);

    // ABV calculator
    document.getElementById('hbs-calc-abv').addEventListener('click', calcAbv);

    // SRM calculator
    document.getElementById('hbs-add-grain').addEventListener('click', addGrainRow);
    document.getElementById('hbs-calc-srm').addEventListener('click', calcSrm);
  }

  // ─── Hop Substitution Logic ───────────────────────────────────────
  function showHopResult(name) {
    const hop = hopsDb.find(h => h.name.toLowerCase() === name.toLowerCase());
    const el = document.getElementById('hbs-hop-result');
    if (!hop) {
      el.innerHTML = `<div class="hbs-no-result">No data found for "${escHtml(name)}".<br>Check spelling or try a partial name.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="hbs-hop-result">
        <div class="hbs-hop-name">${escHtml(hop.name)}</div>
        <div class="hbs-hop-meta">${escHtml(hop.origin)} · AA: ${hop.aa[0]}–${hop.aa[1]}% · ${escHtml(hop.use)}</div>
        <div class="hbs-hop-flavors">
          ${hop.flavors.map(f => `<span class="hbs-flavor-tag">${escHtml(f)}</span>`).join('')}
        </div>
        ${hop.substitutes.length === 0
          ? '<div class="hbs-no-result">No substitutes on record for this hop.</div>'
          : `<ul class="hbs-sub-list">
              ${hop.substitutes.map(s => `
                <li class="hbs-sub-item">
                  <div class="hbs-sub-name">${escHtml(s.name)}</div>
                  <div class="hbs-sub-notes">${escHtml(s.notes)}</div>
                </li>
              `).join('')}
            </ul>`
        }
      </div>
    `;
  }

  // ─── IBU Calculator ───────────────────────────────────────────────
  function addIbuHopRow(prefill) {
    const container = document.getElementById('hbs-ibu-hop-rows');
    const row = document.createElement('div');
    row.className = 'hbs-hop-row';
    row.innerHTML = `
      <input type="text" placeholder="Hop name" value="${prefill ? escHtml(prefill.name || '') : ''}" />
      <input type="number" placeholder="oz" min="0" step="0.01" value="${prefill ? (prefill.weightOz || '') : ''}" />
      <input type="number" placeholder="AA%" min="0" max="30" step="0.1" value="${prefill ? (prefill.alphaAcid || '') : ''}" />
      <input type="number" placeholder="min" min="0" max="120" step="1" value="${prefill ? (prefill.boilTimeMin || '') : ''}" />
      <button class="hbs-remove-hop" title="Remove">✕</button>
    `;
    row.querySelector('.hbs-remove-hop').addEventListener('click', () => {
      if (container.children.length > 1) row.remove();
    });
    container.appendChild(row);
  }

  function calcIbu() {
    const og = parseFloat(document.getElementById('hbs-ibu-og').value) || 1.055;
    let batchSize = parseFloat(document.getElementById('hbs-ibu-batch').value) || 5;
    const units = document.getElementById('hbs-ibu-units').value;
    if (units === 'metric') batchSize = batchSize / 3.785; // to gallons

    const rows = document.querySelectorAll('#hbs-ibu-hop-rows .hbs-hop-row');
    let totalIbu = 0;
    let details = [];
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const name = inputs[0].value.trim();
      let weight = parseFloat(inputs[1].value) || 0;
      const aa = (parseFloat(inputs[2].value) || 0) / 100;
      const time = parseFloat(inputs[3].value) || 0;
      if (weight === 0 || aa === 0 || time === 0) return;
      if (units === 'metric') weight = weight / 28.35; // g to oz

      const bigness = 1.65 * Math.pow(0.000125, og - 1);
      const boilFactor = (1 - Math.exp(-0.04 * time)) / 4.15;
      const utilization = bigness * boilFactor;
      const ibu = (weight * aa * utilization * 7489) / batchSize;
      totalIbu += ibu;
      details.push({ name: name || 'Hop', ibu: ibu.toFixed(1) });
    });

    const el = document.getElementById('hbs-ibu-result');
    if (details.length === 0) {
      el.innerHTML = `<div class="hbs-no-result">Enter at least one hop addition with weight, AA%, and boil time.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="hbs-result">
        <div class="hbs-result-label">Total IBU</div>
        <div class="hbs-result-value">${totalIbu.toFixed(1)}</div>
        <div class="hbs-result-sub">${ibuStyle(totalIbu)} · Tinseth formula</div>
        ${details.length > 1 ? `<div style="margin-top:8px;font-size:11px;color:#888">
          ${details.map(d => `<span style="margin-right:10px">${escHtml(d.name)}: ${d.ibu} IBU</span>`).join('')}
        </div>` : ''}
      </div>
    `;
  }

  function ibuStyle(ibu) {
    if (ibu < 10) return 'Very low bitterness (Berliner, Wit)';
    if (ibu < 20) return 'Low bitterness (Wheat, Blonde)';
    if (ibu < 30) return 'Moderate (Pale Ale, Amber)';
    if (ibu < 45) return 'Hoppy (APA, IPA)';
    if (ibu < 65) return 'Very hoppy (IPA, DIPA)';
    return 'Extremely bitter (Imperial IPA)';
  }

  // ─── ABV Calculator ───────────────────────────────────────────────
  function calcAbv() {
    const og = parseFloat(document.getElementById('hbs-abv-og').value) || 1.055;
    const fg = parseFloat(document.getElementById('hbs-abv-fg').value) || 1.012;
    const formula = document.getElementById('hbs-abv-formula').value;

    let abv;
    if (formula === 'standard') {
      abv = (og - fg) * 131.25;
    } else {
      abv = (76.08 * (og - fg) / (1.775 - og)) * (fg / 0.794);
    }

    const el = document.getElementById('hbs-abv-result');
    el.innerHTML = `
      <div class="hbs-result">
        <div class="hbs-result-label">ABV</div>
        <div class="hbs-result-value">${abv.toFixed(2)}%</div>
        <div class="hbs-result-sub">Apparent Attenuation: ${apparentAttenuation(og, fg).toFixed(1)}%</div>
      </div>
    `;
  }

  function apparentAttenuation(og, fg) {
    return ((og - fg) / (og - 1.000)) * 100;
  }

  // ─── SRM Calculator ───────────────────────────────────────────────
  function addGrainRow(prefill) {
    const container = document.getElementById('hbs-srm-grain-rows');
    const row = document.createElement('div');
    row.className = 'hbs-grain-row';
    row.innerHTML = `
      <input type="text" placeholder="Grain name" value="${prefill ? escHtml(prefill.name || '') : ''}" />
      <input type="number" placeholder="lb" min="0" step="0.01" value="${prefill ? (prefill.weightLbs || '') : ''}" />
      <input type="number" placeholder="°L" min="0" step="0.1" value="${prefill ? (prefill.lovibond || '') : ''}" />
      <button class="hbs-remove-hop" title="Remove">✕</button>
    `;
    row.querySelector('.hbs-remove-hop').addEventListener('click', () => {
      if (container.children.length > 1) row.remove();
    });
    container.appendChild(row);
  }

  function calcSrm() {
    let batchSize = parseFloat(document.getElementById('hbs-srm-batch').value) || 5;
    const units = document.getElementById('hbs-srm-units').value;
    if (units === 'metric') batchSize = batchSize / 3.785; // L to gal

    const rows = document.querySelectorAll('#hbs-srm-grain-rows .hbs-grain-row');
    let totalMcu = 0;
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      let weight = parseFloat(inputs[1].value) || 0;
      const lovibond = parseFloat(inputs[2].value) || 0;
      if (weight === 0 || lovibond === 0) return;
      if (units === 'metric') weight = weight * 2.20462; // kg to lbs
      totalMcu += (weight * lovibond) / batchSize;
    });

    const el = document.getElementById('hbs-srm-result');
    if (totalMcu === 0) {
      el.innerHTML = `<div class="hbs-no-result">Enter at least one grain with weight and Lovibond value.</div>`;
      return;
    }

    const srm = 1.4922 * Math.pow(totalMcu, 0.6859);
    const color = srmToHex(srm);
    const styleName = srmStyle(srm);

    el.innerHTML = `
      <div class="hbs-result">
        <div class="hbs-result-label">Estimated SRM</div>
        <div class="hbs-srm-row">
          <span class="hbs-srm-swatch" style="background:${color}"></span>
          <div>
            <div class="hbs-result-value">${srm.toFixed(1)} SRM</div>
            <div class="hbs-result-sub">${styleName}</div>
          </div>
        </div>
      </div>
    `;
  }

  function srmToHex(srm) {
    const table = [
      [1,'#FFE699'],[2,'#FFD878'],[3,'#FFCA5A'],[4,'#FFBF42'],[5,'#FBB123'],
      [6,'#F8A600'],[7,'#F39C00'],[8,'#EA8F00'],[9,'#E58500'],[10,'#DE7C00'],
      [12,'#CF6900'],[14,'#C35900'],[16,'#B54C00'],[18,'#A63E00'],[20,'#9B3200'],
      [22,'#8E2900'],[24,'#821E00'],[26,'#771900'],[28,'#6A0F00'],[30,'#5E0B00'],
      [35,'#4A0500'],[40,'#360100'],[50,'#1A0000']
    ];
    let prev = table[0];
    for (const entry of table) {
      if (srm <= entry[0]) {
        return entry[1];
      }
      prev = entry;
    }
    return prev[1];
  }

  function srmStyle(srm) {
    if (srm < 3) return 'Pale Straw';
    if (srm < 6) return 'Straw/Gold';
    if (srm < 10) return 'Gold/Light Amber';
    if (srm < 14) return 'Amber';
    if (srm < 20) return 'Deep Amber / Brown';
    if (srm < 30) return 'Dark Brown';
    if (srm < 40) return 'Very Dark Brown';
    return 'Black (Stout/Porter)';
  }

  // ─── Water Chemistry Tab (Pro) ────────────────────────────────────
  const WATER_PROFILES = {
    'Custom': { Ca: 0, Mg: 0, Na: 0, Cl: 0, SO4: 0, HCO3: 0 },
    'Pilsen (Soft)': { Ca: 7, Mg: 3, Na: 2, Cl: 5, SO4: 5, HCO3: 25 },
    'Munich': { Ca: 75, Mg: 18, Na: 2, Cl: 2, SO4: 10, HCO3: 295 },
    'Vienna': { Ca: 75, Mg: 15, Na: 10, Cl: 15, SO4: 60, HCO3: 225 },
    'London': { Ca: 52, Mg: 32, Na: 86, Cl: 34, SO4: 32, HCO3: 104 },
    'Dublin': { Ca: 119, Mg: 4, Na: 12, Cl: 19, SO4: 55, HCO3: 319 },
    'Edinburgh': { Ca: 125, Mg: 25, Na: 55, Cl: 65, SO4: 140, HCO3: 225 },
    'Burton on Trent': { Ca: 295, Mg: 45, Na: 55, Cl: 25, SO4: 725, HCO3: 300 },
    'Balanced': { Ca: 50, Mg: 5, Na: 10, Cl: 50, SO4: 50, HCO3: 100 },
  };

  // Mineral additions in ppm per gram per gallon
  const MINERALS = {
    'Gypsum (CaSO4)': { Ca: 61.5, Mg: 0, Na: 0, Cl: 0, SO4: 147.4, HCO3: 0 },
    'Calcium Chloride (CaCl2)': { Ca: 72.0, Mg: 0, Na: 0, Cl: 127.5, SO4: 0, HCO3: 0 },
    'Epsom Salt (MgSO4)': { Ca: 0, Mg: 26.4, Na: 0, Cl: 0, SO4: 103.7, HCO3: 0 },
    'Table Salt (NaCl)': { Ca: 0, Mg: 0, Na: 104.1, Cl: 160.3, SO4: 0, HCO3: 0 },
    'Baking Soda (NaHCO3)': { Ca: 0, Mg: 0, Na: 72.3, Cl: 0, SO4: 0, HCO3: 191.9 },
    'Chalk (CaCO3)': { Ca: 105.9, Mg: 0, Na: 0, Cl: 0, SO4: 0, HCO3: 158.1 },
  };

  function renderWaterTab() {
    const el = document.getElementById('hbs-water-content');
    if (!opts.isPro) {
      el.innerHTML = proGate('Water Chemistry Calculator',
        'Calculate mineral additions to hit target water profiles (Pilsen, Burton, Dublin, Balanced) from your source water. Supports gypsum, CaCl2, Epsom salt, baking soda, and more.');
      el.querySelector('.hbs-upgrade-btn').addEventListener('click', openStripe);
      return;
    }
    renderWaterCalc(el);
  }

  function renderWaterCalc(el) {
    const profileOptions = Object.keys(WATER_PROFILES).map(k =>
      `<option value="${escHtml(k)}">${escHtml(k)}</option>`
    ).join('');
    const mineralRows = Object.keys(MINERALS).map(m =>
      `<tr><td>${escHtml(m)}</td><td><input type="number" class="hbs-mineral-input" data-mineral="${escHtml(m)}" min="0" step="0.1" value="0" style="width:60px;background:#2a2a2a;border:1px solid #3a3a3a;color:#f0ece4;border-radius:4px;padding:3px 5px;font-size:11px;font-family:inherit" /></td></tr>`
    ).join('');

    el.innerHTML = `
      <div class="hbs-section-title">Water Chemistry Calculator</div>
      <div class="hbs-row">
        <div class="hbs-field">
          <label>Volume (gal)</label>
          <input type="number" id="hbs-water-vol" min="0.1" step="0.1" value="5" />
        </div>
        <div class="hbs-field">
          <label>Target Profile</label>
          <select id="hbs-water-profile">${profileOptions}</select>
        </div>
      </div>
      <div class="hbs-section-title">Source Water (ppm)</div>
      <div class="hbs-mineral-inputs" style="grid-template-columns:1fr 1fr 1fr">
        <div class="hbs-field"><label>Ca²⁺</label><input type="number" id="hbs-w-ca" value="0" min="0" step="1" /></div>
        <div class="hbs-field"><label>Mg²⁺</label><input type="number" id="hbs-w-mg" value="0" min="0" step="1" /></div>
        <div class="hbs-field"><label>Na⁺</label><input type="number" id="hbs-w-na" value="0" min="0" step="1" /></div>
        <div class="hbs-field"><label>Cl⁻</label><input type="number" id="hbs-w-cl" value="0" min="0" step="1" /></div>
        <div class="hbs-field"><label>SO₄²⁻</label><input type="number" id="hbs-w-so4" value="0" min="0" step="1" /></div>
        <div class="hbs-field"><label>HCO₃⁻</label><input type="number" id="hbs-w-hco3" value="0" min="0" step="1" /></div>
      </div>
      <div class="hbs-section-title" style="margin-top:8px">Mineral Additions (grams)</div>
      <table class="hbs-chem-table">
        <thead><tr><th>Mineral</th><th>Grams to add</th></tr></thead>
        <tbody>${mineralRows}</tbody>
      </table>
      <button class="hbs-btn" id="hbs-calc-water" style="margin-top:10px">Calculate Result</button>
      <div id="hbs-water-result"></div>
    `;

    // Profile auto-fill
    document.getElementById('hbs-water-profile').addEventListener('change', function () {
      const profile = WATER_PROFILES[this.value];
      if (!profile) return;
      document.getElementById('hbs-w-ca').value = profile.Ca;
      // Don't change source; target is shown separately
    });

    document.getElementById('hbs-calc-water').addEventListener('click', calcWater);
  }

  function calcWater() {
    const vol = parseFloat(document.getElementById('hbs-water-vol').value) || 5;
    const profile = WATER_PROFILES[document.getElementById('hbs-water-profile').value] || WATER_PROFILES['Balanced'];
    const source = {
      Ca: parseFloat(document.getElementById('hbs-w-ca').value) || 0,
      Mg: parseFloat(document.getElementById('hbs-w-mg').value) || 0,
      Na: parseFloat(document.getElementById('hbs-w-na').value) || 0,
      Cl: parseFloat(document.getElementById('hbs-w-cl').value) || 0,
      SO4: parseFloat(document.getElementById('hbs-w-so4').value) || 0,
      HCO3: parseFloat(document.getElementById('hbs-w-hco3').value) || 0,
    };

    // Get mineral gram inputs
    const mineralGrams = {};
    document.querySelectorAll('.hbs-mineral-input').forEach(inp => {
      mineralGrams[inp.dataset.mineral] = parseFloat(inp.value) || 0;
    });

    // Calculate result profile
    const result = { ...source };
    for (const [mineral, grams] of Object.entries(mineralGrams)) {
      if (grams <= 0) continue;
      const contrib = MINERALS[mineral];
      for (const ion of Object.keys(contrib)) {
        result[ion] = (result[ion] || 0) + (contrib[ion] * grams / vol);
      }
    }

    const ions = ['Ca', 'Mg', 'Na', 'Cl', 'SO4', 'HCO3'];
    const ionsDisplay = { Ca: 'Ca²⁺', Mg: 'Mg²⁺', Na: 'Na⁺', Cl: 'Cl⁻', SO4: 'SO₄²⁻', HCO3: 'HCO₃⁻' };

    const rows = ions.map(ion => {
      const src = source[ion].toFixed(0);
      const res = result[ion].toFixed(0);
      const tgt = profile[ion].toFixed(0);
      const diff = result[ion] - profile[ion];
      const diffStr = diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0);
      const diffColor = Math.abs(diff) < 15 ? '#6db86d' : Math.abs(diff) < 30 ? '#e8a96a' : '#e86d6d';
      return `<tr>
        <td>${ionsDisplay[ion]}</td>
        <td>${src}</td>
        <td>${tgt}</td>
        <td style="color:#e8a96a">${res}</td>
        <td style="color:${diffColor}">${diffStr}</td>
      </tr>`;
    }).join('');

    document.getElementById('hbs-water-result').innerHTML = `
      <div class="hbs-result" style="margin-top:10px;padding:0;overflow:hidden">
        <table class="hbs-chem-table">
          <thead><tr><th>Ion</th><th>Source</th><th>Target</th><th>Result</th><th>Δ</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="padding:8px 12px;font-size:10px;color:#666">All values in ppm (mg/L). Negative Δ = below target.</div>
      </div>
    `;
  }

  // ─── Yeast Tab (Pro) ──────────────────────────────────────────────
  const YEAST_DB = [
    { name: 'Safale US-05', type: 'Dry', style: 'American Ale', attLow: 73, attHigh: 77 },
    { name: 'Safale S-04', type: 'Dry', style: 'English Ale', attLow: 71, attHigh: 75 },
    { name: 'Safale S-33', type: 'Dry', style: 'Belgian Ale', attLow: 67, attHigh: 72 },
    { name: 'Lallemand Nottingham', type: 'Dry', style: 'British Ale', attLow: 73, attHigh: 82 },
    { name: 'Lallemand Windsor', type: 'Dry', style: 'British Ale', attLow: 62, attHigh: 72 },
    { name: 'Lallemand BRY-97', type: 'Dry', style: 'American Ale', attLow: 72, attHigh: 77 },
    { name: 'Mangrove Jack M05', type: 'Dry', style: 'Mead / Cider', attLow: 71, attHigh: 75 },
    { name: 'Mangrove Jack M36 Liberty Bell', type: 'Dry', style: 'American Ale', attLow: 73, attHigh: 82 },
    { name: 'White Labs WLP001 California Ale', type: 'Liquid', style: 'American Ale', attLow: 73, attHigh: 80 },
    { name: 'White Labs WLP002 English Ale', type: 'Liquid', style: 'English Ale', attLow: 63, attHigh: 70 },
    { name: 'White Labs WLP004 Irish Ale', type: 'Liquid', style: 'Irish Ale', attLow: 69, attHigh: 74 },
    { name: 'White Labs WLP007 Dry English Ale', type: 'Liquid', style: 'English Ale', attLow: 70, attHigh: 80 },
    { name: 'White Labs WLP300 Hefeweizen', type: 'Liquid', style: 'Wheat Beer', attLow: 72, attHigh: 76 },
    { name: 'White Labs WLP320 American Hefeweizen', type: 'Liquid', style: 'American Wheat', attLow: 70, attHigh: 75 },
    { name: 'White Labs WLP400 Belgian Wit', type: 'Liquid', style: 'Witbier', attLow: 74, attHigh: 78 },
    { name: 'White Labs WLP500 Trappist Ale', type: 'Liquid', style: 'Belgian Strong', attLow: 75, attHigh: 80 },
    { name: 'White Labs WLP565 Belgian Saison', type: 'Liquid', style: 'Saison', attLow: 65, attHigh: 75 },
    { name: 'White Labs WLP820 Oktoberfest Lager', type: 'Liquid', style: 'Lager', attLow: 65, attHigh: 73 },
    { name: 'Wyeast 1056 American Ale', type: 'Liquid', style: 'American Ale', attLow: 73, attHigh: 77 },
    { name: 'Wyeast 1084 Irish Ale', type: 'Liquid', style: 'Irish Stout', attLow: 71, attHigh: 75 },
    { name: 'Wyeast 1272 American Ale II', type: 'Liquid', style: 'American Ale', attLow: 72, attHigh: 76 },
    { name: 'Wyeast 1318 London Ale III', type: 'Liquid', style: 'English Ale', attLow: 71, attHigh: 75 },
    { name: 'Wyeast 1332 Northwest Ale', type: 'Liquid', style: 'Northwest Ale', attLow: 67, attHigh: 71 },
    { name: 'Wyeast 1388 Belgian Strong Ale', type: 'Liquid', style: 'Belgian', attLow: 73, attHigh: 77 },
    { name: 'Wyeast 1762 Belgian Abbey II', type: 'Liquid', style: 'Belgian Abbey', attLow: 73, attHigh: 77 },
    { name: 'Wyeast 2124 Bohemian Lager', type: 'Liquid', style: 'Lager', attLow: 69, attHigh: 73 },
    { name: 'Wyeast 2206 Bavarian Lager', type: 'Liquid', style: 'Lager', attLow: 73, attHigh: 77 },
    { name: 'Wyeast 3068 Weihenstephan Weizen', type: 'Liquid', style: 'Hefeweizen', attLow: 73, attHigh: 77 },
    { name: 'Wyeast 3711 French Saison', type: 'Liquid', style: 'Saison', attLow: 77, attHigh: 83 },
    { name: 'Wyeast 3787 Trappist High Gravity', type: 'Liquid', style: 'Belgian', attLow: 74, attHigh: 78 },
  ];

  function renderYeastTab() {
    const el = document.getElementById('hbs-yeast-content');
    if (!opts.isPro) {
      el.innerHTML = proGate('Yeast Attenuation Estimator',
        'Select your yeast strain and OG to estimate expected FG range and ABV spread. Auto-reads OG from the page when detected.');
      el.querySelector('.hbs-upgrade-btn').addEventListener('click', openStripe);
      return;
    }
    renderYeastCalc(el);
  }

  function renderYeastCalc(el) {
    const yeastOptions = YEAST_DB.map(y =>
      `<option value="${escHtml(y.name)}">${escHtml(y.name)} (${y.attLow}–${y.attHigh}%)</option>`
    ).join('');

    const detectedOg = (window.HBS_RECIPE_DATA && window.HBS_RECIPE_DATA.og) ? window.HBS_RECIPE_DATA.og : '';
    const autoTag = detectedOg ? '<span class="hbs-auto-tag">auto</span>' : '';
    const detectedYeast = (window.HBS_RECIPE_DATA && window.HBS_RECIPE_DATA.yeast)
      ? window.HBS_RECIPE_DATA.yeast : null;

    el.innerHTML = `
      <div class="hbs-section-title">Yeast Attenuation Estimator</div>
      <div class="hbs-field">
        <label>Original Gravity (OG) ${autoTag}</label>
        <input type="number" id="hbs-yeast-og" min="1.000" max="1.200" step="0.001" value="${detectedOg || 1.055}" />
      </div>
      <div class="hbs-field">
        <label>Yeast Strain</label>
        <select id="hbs-yeast-strain" class="hbs-yeast-select">${yeastOptions}</select>
      </div>
      <div class="hbs-row">
        <div class="hbs-field">
          <label>Attenuation Low %</label>
          <input type="number" id="hbs-yeast-att-low" min="50" max="100" step="1" value="${detectedYeast ? detectedYeast.attenuationLow : 73}" />
        </div>
        <div class="hbs-field">
          <label>Attenuation High %</label>
          <input type="number" id="hbs-yeast-att-high" min="50" max="100" step="1" value="${detectedYeast ? detectedYeast.attenuationHigh : 77}" />
        </div>
      </div>
      <button class="hbs-btn" id="hbs-calc-yeast">Estimate FG &amp; ABV</button>
      <div id="hbs-yeast-result"></div>
    `;

    // Update attenuation fields when strain is selected
    document.getElementById('hbs-yeast-strain').addEventListener('change', function () {
      const yeast = YEAST_DB.find(y => y.name === this.value);
      if (yeast) {
        document.getElementById('hbs-yeast-att-low').value = yeast.attLow;
        document.getElementById('hbs-yeast-att-high').value = yeast.attHigh;
      }
    });

    document.getElementById('hbs-calc-yeast').addEventListener('click', calcYeast);
  }

  function calcYeast() {
    const og = parseFloat(document.getElementById('hbs-yeast-og').value) || 1.055;
    const attLow = (parseFloat(document.getElementById('hbs-yeast-att-low').value) || 73) / 100;
    const attHigh = (parseFloat(document.getElementById('hbs-yeast-att-high').value) || 77) / 100;

    const fgHigh = og - (og - 1.000) * attLow;  // low att → higher FG
    const fgLow = og - (og - 1.000) * attHigh;   // high att → lower FG
    const abvLow = (og - fgHigh) * 131.25;
    const abvHigh = (og - fgLow) * 131.25;

    document.getElementById('hbs-yeast-result').innerHTML = `
      <div class="hbs-result">
        <div class="hbs-row">
          <div>
            <div class="hbs-result-label">FG Range</div>
            <div class="hbs-result-value" style="font-size:18px">${fgLow.toFixed(3)}–${fgHigh.toFixed(3)}</div>
          </div>
          <div>
            <div class="hbs-result-label">ABV Range</div>
            <div class="hbs-result-value" style="font-size:18px">${abvLow.toFixed(1)}–${abvHigh.toFixed(1)}%</div>
          </div>
        </div>
        <div class="hbs-result-sub" style="margin-top:6px">
          Attenuation ${(attLow*100).toFixed(0)}–${(attHigh*100).toFixed(0)}% · OG ${og.toFixed(3)}
        </div>
      </div>
    `;
  }

  // ─── Pro Gate ─────────────────────────────────────────────────────
  function proGate(featureName, featureDesc) {
    return `
      <div class="hbs-pro-gate">
        <div class="hbs-pro-gate-icon">🔒</div>
        <h3>${escHtml(featureName)}</h3>
        <p>${escHtml(featureDesc)}</p>
        <button class="hbs-btn hbs-upgrade-btn" style="max-width:200px;margin:0 auto">
          Upgrade to Pro — $5/mo
        </button>
        <div style="font-size:10px;color:#666;margin-top:8px">Cancel anytime · Stripe Checkout</div>
      </div>
    `;
  }

  function openStripe() {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  }

  // ─── Page Prefill ─────────────────────────────────────────────────
  function prefillFromPage() {
    const d = window.HBS_RECIPE_DATA;
    if (!d) return;

    // Prefill IBU OG
    if (d.og) {
      const ogInput = document.getElementById('hbs-ibu-og');
      if (ogInput) { ogInput.value = d.og; ogInput.nextElementSibling && (ogInput.nextElementSibling.textContent = ''); }
      document.getElementById('hbs-ibu-og').value = d.og;
    }

    // Prefill ABV OG/FG
    if (d.og) document.getElementById('hbs-abv-og').value = d.og;
    if (d.fg) document.getElementById('hbs-abv-fg').value = d.fg;

    // Prefill IBU batch size
    if (d.batchSizeGal) {
      const batchVal = opts.units === 'metric' ? (d.batchSizeGal * 3.785).toFixed(1) : d.batchSizeGal.toFixed(1);
      document.getElementById('hbs-ibu-batch').value = batchVal;
      document.getElementById('hbs-srm-batch').value = batchVal;
    }

    // Prefill hop rows
    if (d.hops && d.hops.length > 0) {
      const container = document.getElementById('hbs-ibu-hop-rows');
      container.innerHTML = '';
      d.hops.forEach(h => addIbuHopRow(h));
    }

    // Prefill grain rows
    if (d.grains && d.grains.length > 0) {
      const container = document.getElementById('hbs-srm-grain-rows');
      container.innerHTML = '';
      d.grains.forEach(g => addGrainRow(g));
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
