// Triathlon Race Day Pacing Planner — Options Page

let bikeMode = 'speed';

// ── Load settings ─────────────────────────────────────────────────────────────

async function loadSettings() {
  const result = await chrome.storage.sync.get('tri_settings');
  const s = result.tri_settings || {};

  if (s.units === 'imperial') {
    document.getElementById('unitMetric').classList.remove('selected');
    document.getElementById('unitImperial').classList.add('selected');
  }
  if (s.swimPacePer100) document.getElementById('swimPace').value = s.swimPacePer100;
  if (s.bikeInputMode === 'watts') switchBikeMode('watts');
  if (s.bikePace) {
    if (s.bikeInputMode === 'watts') document.getElementById('bikeWatts').value = s.bikePace;
    else document.getElementById('bikeSpeed').value = s.bikePace;
  }
  if (s.runPacePer1k) document.getElementById('runPace').value = s.runPacePer1k;
  if (s.t1Minutes) document.getElementById('t1Min').value = s.t1Minutes;
  if (s.t2Minutes) document.getElementById('t2Min').value = s.t2Minutes;

  if (s.isPro) {
    document.getElementById('proBanner').style.display = 'none';
  }

  updateUnitLabels();
}

// ── Save settings ─────────────────────────────────────────────────────────────

async function saveSettings() {
  const units = document.querySelector('.unit-opt.selected')?.dataset.val || 'metric';
  const bikeVal = bikeMode === 'watts'
    ? document.getElementById('bikeWatts').value
    : document.getElementById('bikeSpeed').value;

  const current = await chrome.storage.sync.get('tri_settings');
  const merged = Object.assign({}, current.tri_settings || {}, {
    units,
    swimPacePer100: document.getElementById('swimPace').value,
    bikeInputMode: bikeMode,
    bikePace: bikeVal,
    runPacePer1k: document.getElementById('runPace').value,
    t1Minutes: document.getElementById('t1Min').value,
    t2Minutes: document.getElementById('t2Min').value,
  });

  await chrome.storage.sync.set({ tri_settings: merged });

  const msg = document.getElementById('successMsg');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 3000);
}

// ── Unit labels ───────────────────────────────────────────────────────────────

function updateUnitLabels() {
  const isImperial = document.getElementById('unitImperial').classList.contains('selected');
  document.getElementById('swimLabel').textContent = isImperial ? 'Pace per 100yd' : 'Pace per 100m';
  document.getElementById('bikeSpeedLabel').textContent = isImperial ? 'Average Race Speed' : 'Average Race Speed';
  document.getElementById('bikeSpeedUnit').textContent = isImperial ? 'mph' : 'kph';
  document.getElementById('runLabel').textContent = isImperial ? 'Pace per mile' : 'Pace per km';
}

// ── Bike mode ─────────────────────────────────────────────────────────────────

function switchBikeMode(mode) {
  bikeMode = mode;
  document.getElementById('bikeSpeedRow').classList.toggle('hidden', mode === 'watts');
  document.getElementById('bikeWattsRow').classList.toggle('hidden', mode !== 'watts');
  document.getElementById('bikeModeSpeed').classList.toggle('active', mode === 'speed');
  document.getElementById('bikeModeWatts').classList.toggle('active', mode === 'watts');
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('unitMetric').addEventListener('click', () => {
  document.getElementById('unitMetric').classList.add('selected');
  document.getElementById('unitImperial').classList.remove('selected');
  updateUnitLabels();
});

document.getElementById('unitImperial').addEventListener('click', () => {
  document.getElementById('unitImperial').classList.add('selected');
  document.getElementById('unitMetric').classList.remove('selected');
  updateUnitLabels();
});

document.getElementById('bikeModeSpeed').addEventListener('click', () => switchBikeMode('speed'));
document.getElementById('bikeModeWatts').addEventListener('click', () => switchBikeMode('watts'));
document.getElementById('saveBtn').addEventListener('click', saveSettings);

document.getElementById('upgradeBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings();
