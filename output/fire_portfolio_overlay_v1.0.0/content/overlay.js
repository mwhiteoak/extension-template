// Triathlon Race Day Pacing Planner — Overlay Panel Logic

// ── Race distance definitions ────────────────────────────────────────────────

const RACE_DISTANCES = {
  sprint:  { label: 'Sprint',       swim: 750,  bike: 20000,  run: 5000  },
  olympic: { label: 'Olympic',      swim: 1500, bike: 40000,  run: 10000 },
  half:    { label: '70.3 Half',    swim: 1900, bike: 90000,  run: 21097 },
  full:    { label: 'Full Ironman', swim: 3800, bike: 180000, run: 42195 },
};

// ── State ────────────────────────────────────────────────────────────────────

let currentRace = null;      // { type, distances }
let currentResults = null;   // Calculated split data
let bikeMode = 'speed';      // 'speed' | 'watts'
let isPro = true;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePace(str) {
  // Accepts "m:ss" or "mm:ss" → seconds
  if (!str || !str.trim()) return null;
  const parts = str.trim().split(':');
  if (parts.length !== 2) return null;
  const min = parseInt(parts[0], 10);
  const sec = parseInt(parts[1], 10);
  if (isNaN(min) || isNaN(sec) || sec >= 60) return null;
  return min * 60 + sec;
}

function fmtTime(totalSeconds) {
  // HH:MM:SS or MM:SS
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtDist(meters, units) {
  if (units === 'imperial') {
    if (meters >= 1609) return `${(meters / 1609.34).toFixed(1)} mi`;
    return `${Math.round(meters * 1.0936)} yd`;
  }
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function paceDisplay(secPerUnit, units, discipline) {
  // Returns e.g. "1:45 /100m" or "5:30 /km"
  if (discipline === 'swim') {
    const unit = units === 'imperial' ? '/100yd' : '/100m';
    return fmtTime(secPerUnit) + ' ' + unit;
  }
  const unit = units === 'imperial' ? '/mi' : '/km';
  return fmtTime(secPerUnit) + ' ' + unit;
}

function getUnits() {
  return document.querySelector('input[name="units"]:checked')?.value || 'metric';
}

// FTP-based speed estimation (Coggan model approximation)
// Power (W) at target intensity → speed via simplified drag model:
//   speed (m/s) = cubeRoot(P_watts * efficiency / (0.5 * rho * Cd * A))
// We use simplified constants for a typical triathlete on a TT bike
function ftpToSpeedKph(ftp, raceType) {
  const intensity = { sprint: 0.90, olympic: 0.85, half: 0.75, full: 0.65 }[raceType] || 0.75;
  const targetWatts = ftp * intensity;
  // Simplified: ~3.6 km/h per 10W for typical triathlete at race effort
  // More precisely: v = cubeRoot(P / K), K ≈ 0.0087 for typical CdA+mass
  const K = 0.0087;
  const vMs = Math.cbrt(targetWatts / K); // m/s
  return vMs * 3.6; // kph
}

// ── Calculation ──────────────────────────────────────────────────────────────

function calculate() {
  if (!currentRace) {
    showError('Select or detect a race distance first.');
    return;
  }

  const units = getUnits();
  const { swim: swimM, bike: bikeM, run: runM } = currentRace.distances;

  // Swim
  const swimPaceRaw = document.getElementById('swimPace').value;
  let swimPaceSec = parsePace(swimPaceRaw); // sec per 100m
  if (units === 'imperial' && swimPaceSec) {
    // Convert from per-100yd to per-100m: 1 yard = 0.9144m, so 100yd = 91.44m
    // pace per 100m = pace_per_100yd * (100 / 91.44) → user inputs per 100yd, we need per 100m
    swimPaceSec = swimPaceSec * (100 / 91.44);
  }
  if (!swimPaceSec) { showError('Enter a valid swim pace (e.g. 1:45).'); return; }

  // Bike
  let bikeSpeedKph;
  if (bikeMode === 'watts') {
    const ftp = parseFloat(document.getElementById('bikeWatts').value);
    if (!ftp || ftp <= 0) { showError('Enter your FTP watts.'); return; }
    bikeSpeedKph = ftpToSpeedKph(ftp, currentRace.type);
    if (units === 'imperial') {
      // We work in kph internally; display in mph later
    }
  } else {
    let speed = parseFloat(document.getElementById('bikeSpeed').value);
    if (!speed || speed <= 0) { showError('Enter your bike speed.'); return; }
    if (units === 'imperial') speed = speed * 1.60934; // mph → kph
    bikeSpeedKph = speed;
  }

  // Run
  const runPaceRaw = document.getElementById('runPace').value;
  let runPaceSec = parsePace(runPaceRaw); // sec per km
  if (units === 'imperial' && runPaceSec) {
    // User inputs per mile → convert to per km: 1 mi = 1.60934 km
    runPaceSec = runPaceSec / 1.60934;
  }
  if (!runPaceSec) { showError('Enter a valid run pace (e.g. 5:30).'); return; }

  // Transitions
  const t1Sec = (parseFloat(document.getElementById('t1Min').value) || 3) * 60;
  const t2Sec = (parseFloat(document.getElementById('t2Min').value) || 2) * 60;

  // Calculate times (seconds)
  const swimSec = (swimM / 100) * swimPaceSec;
  const bikeSec = (bikeM / 1000 / bikeSpeedKph) * 3600;
  const runSec  = (runM / 1000) * runPaceSec;
  const totalSec = swimSec + t1Sec + bikeSec + t2Sec + runSec;

  currentResults = { swimSec, t1Sec, bikeSec, t2Sec, runSec, totalSec, bikeSpeedKph, units };

  // ── Display results ──
  document.getElementById('resSwim').textContent = fmtTime(swimSec);
  document.getElementById('resSwimDist').textContent = fmtDist(swimM, units);

  document.getElementById('resT1').textContent = fmtTime(t1Sec);

  document.getElementById('resBike').textContent = fmtTime(bikeSec);
  const bikeDistStr = fmtDist(bikeM, units);
  const avgSpeedStr = units === 'imperial'
    ? `${(bikeSpeedKph / 1.60934).toFixed(1)} mph avg`
    : `${bikeSpeedKph.toFixed(1)} kph avg`;
  document.getElementById('resBikeSub').textContent = `${bikeDistStr} · ${avgSpeedStr}`;

  document.getElementById('resT2').textContent = fmtTime(t2Sec);

  document.getElementById('resRun').textContent = fmtTime(runSec);
  document.getElementById('resRunDist').textContent = fmtDist(runM, units);

  document.getElementById('resTotal').textContent = fmtTime(totalSec);

  // Print button
  const printBtn = document.getElementById('printBtn');
  if (isPro) {
    printBtn.className = 'print-btn';
    printBtn.textContent = '🖨 Print Cheat Sheet';
  } else {
    printBtn.className = 'print-btn locked';
    printBtn.textContent = '🖨 Print Cheat Sheet (Pro)';
  }

  document.getElementById('resultsSection').classList.remove('hidden');

  // Save paces if checkbox checked
  if (document.getElementById('saveCheck').checked) savePaces();

  // Update nutrition tab if on it
  updateNutrition();
}

function showError(msg) {
  alert(msg);
}

// ── Nutrition calculations (Pro) ──────────────────────────────────────────────

function updateNutrition() {
  const hint = document.getElementById('nutritionHint');
  const gate = document.getElementById('nutritionProGate');
  const results = document.getElementById('nutritionResults');

  if (!currentResults) {
    hint.style.display = 'block';
    results.style.display = 'none';
    return;
  }
  hint.style.display = 'none';

  if (!isPro) {
    gate.style.display = 'block';
    results.style.display = 'none';
    return;
  }
  gate.style.display = 'none';
  results.style.display = 'block';

  const { swimSec, t1Sec, bikeSec, t2Sec, runSec, totalSec } = currentResults;

  // Calorie estimates (approximate)
  const swimCal = Math.round((swimSec / 3600) * 600);
  const bikeCal = Math.round((bikeSec / 3600) * 700);
  const runCal  = Math.round((runSec / 3600) * 800);
  const totalCal = swimCal + bikeCal + runCal;

  // Carb targets: 60g/hr on events < 2.5hr, 90g/hr on longer
  const totalHr = totalSec / 3600;
  const carbPerHr = totalHr < 2.5 ? 60 : 75;
  const activeSec = bikeSec + runSec; // carbs mainly on bike + run
  const totalCarbs = Math.round((activeSec / 3600) * carbPerHr);

  // Fluid: ~600ml/hr during bike, ~400ml/hr during run
  const fluidMl = Math.round((bikeSec / 3600) * 600 + (runSec / 3600) * 400);

  const grid = document.getElementById('nutritionGrid');
  grid.innerHTML = [
    { value: totalCal, unit: 'kcal', label: 'Est. Calorie Burn' },
    { value: carbPerHr + 'g', unit: '/hr', label: 'Carb Target' },
    { value: totalCarbs + 'g', unit: 'total', label: 'Total Carbs' },
    { value: Math.round(fluidMl / 100) / 10 + 'L', unit: 'fluid', label: 'Hydration Est.' },
  ].map(d => `
    <div class="nutrition-card">
      <div class="n-value">${d.value}</div>
      <div class="n-unit">${d.unit}</div>
      <div class="n-label">${d.label}</div>
    </div>
  `).join('');

  // Aid station plan
  buildAidPlan(swimSec, t1Sec, bikeSec, t2Sec, runSec);
}

function buildAidPlan(swimSec, t1Sec, bikeSec, t2Sec, runSec) {
  const tbody = document.getElementById('aidBody');
  tbody.innerHTML = '';
  const events = [];

  events.push({ time: 0, seg: 'Start', action: 'Pre-race gel/bar 15 min before' });
  events.push({ time: swimSec + t1Sec, seg: 'T1', action: 'Gel + water, bottles on bike' });

  // Bike aid every 45 min
  let t = swimSec + t1Sec;
  let bikeStop = 1;
  while (t + 45 * 60 < swimSec + t1Sec + bikeSec) {
    t += 45 * 60;
    events.push({ time: t, seg: `Bike Aid ${bikeStop++}`, action: 'Gel or bar + electrolytes' });
  }

  events.push({ time: swimSec + t1Sec + bikeSec + t2Sec, seg: 'T2', action: 'Cola or gel, fresh shoes' });

  // Run aid every 15 min
  t = swimSec + t1Sec + bikeSec + t2Sec;
  let runStop = 1;
  while (t + 15 * 60 < swimSec + t1Sec + bikeSec + t2Sec + runSec) {
    t += 15 * 60;
    const action = runStop % 2 === 0 ? 'Water only' : 'Cola or gel + water';
    events.push({ time: t, seg: `Run Aid ${runStop++}`, action });
  }

  events.push({ time: swimSec + t1Sec + bikeSec + t2Sec + runSec, seg: 'Finish', action: 'Banana + recovery drink' });

  events.forEach(ev => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${fmtTime(ev.time)}</td><td>${ev.seg}</td><td>${ev.action}</td>`;
    tbody.appendChild(tr);
  });
}

// ── Settings persistence ──────────────────────────────────────────────────────

async function loadSettings() {
  const result = await chrome.storage.sync.get('tri_settings');
  const s = result.tri_settings || {};
  if (s.units === 'imperial') document.getElementById('unitImperial').checked = true;
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
    isPro = true;
  }
  updateUnitLabels();
}

function savePaces() {
  const units = getUnits();
  const bikeVal = bikeMode === 'watts'
    ? document.getElementById('bikeWatts').value
    : document.getElementById('bikeSpeed').value;
  const settings = {
    units,
    swimPacePer100: document.getElementById('swimPace').value,
    bikeInputMode: bikeMode,
    bikePace: bikeVal,
    runPacePer1k: document.getElementById('runPace').value,
    t1Minutes: document.getElementById('t1Min').value,
    t2Minutes: document.getElementById('t2Min').value,
  };
  chrome.storage.sync.get('tri_settings', (result) => {
    const merged = Object.assign({}, result.tri_settings || {}, settings);
    chrome.storage.sync.set({ tri_settings: merged });
    const msg = document.getElementById('saveMsg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
  });
}

// ── Unit label updates ────────────────────────────────────────────────────────

function updateUnitLabels() {
  const units = getUnits();
  document.getElementById('swimLabel').textContent = units === 'imperial' ? 'Pace /100yd' : 'Pace /100m';
  document.getElementById('bikeSpeedLabel').textContent = units === 'imperial' ? 'Speed (mph)' : 'Speed (kph)';
  document.getElementById('bikeSpeedUnit').textContent = units === 'imperial' ? 'mph' : 'kph';
  document.getElementById('bikeWeightLabel').textContent = units === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)';
  document.getElementById('bikeWeightUnit').textContent = units === 'imperial' ? 'lbs' : 'kg';
  document.getElementById('runLabel').textContent = units === 'imperial' ? 'Pace /mile' : 'Pace /km';
}

// ── Bike mode switching ───────────────────────────────────────────────────────

function switchBikeMode(mode) {
  bikeMode = mode;
  const speedRow = document.getElementById('bikeSpeedRow');
  const wattsRow = document.getElementById('bikeWattsRow');
  const weightRow = document.getElementById('bikeWeightRow');
  const speedBtn = document.getElementById('bikeModeSpeed');
  const wattsBtn = document.getElementById('bikeModeWatts');

  if (mode === 'watts') {
    speedRow.classList.add('hidden');
    wattsRow.classList.remove('hidden');
    weightRow.classList.remove('hidden');
    speedBtn.classList.remove('active');
    wattsBtn.classList.add('active');
  } else {
    speedRow.classList.remove('hidden');
    wattsRow.classList.add('hidden');
    weightRow.classList.add('hidden');
    speedBtn.classList.add('active');
    wattsBtn.classList.remove('active');
  }
}

// ── Race detection ────────────────────────────────────────────────────────────

function applyRaceData(raceData) {
  if (!raceData) return;
  currentRace = raceData;
  const badge = document.getElementById('raceBadge');
  const def = RACE_DISTANCES[raceData.type];
  badge.textContent = def ? def.label : raceData.type;
  badge.classList.remove('undetected');
}

// ── Tab routing ───────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'nutrition') updateNutrition();
  });
});

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('closeBtn').addEventListener('click', () => {
  window.parent.postMessage({ type: 'TRI_CLOSE' }, '*');
});

document.getElementById('calcBtn').addEventListener('click', calculate);

document.getElementById('bikeModeSpeed').addEventListener('click', () => switchBikeMode('speed'));
document.getElementById('bikeModeWatts').addEventListener('click', () => switchBikeMode('watts'));

document.querySelectorAll('input[name="units"]').forEach(radio => {
  radio.addEventListener('change', updateUnitLabels);
});

document.getElementById('raceSelect').addEventListener('change', (e) => {
  const val = e.target.value;
  if (!val) return;
  const def = RACE_DISTANCES[val];
  if (def) applyRaceData({ type: val, distances: def });
});

document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

// ── Receive race data from injector ──────────────────────────────────────────

window.addEventListener('message', (e) => {
  if (e.data?.type === 'TRI_RACE_DATA') {
    applyRaceData(e.data.raceData);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings();
