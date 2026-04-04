// Triathlon Race Day Pacing Planner — Popup JS

async function init() {
  const result = await chrome.storage.sync.get('tri_settings');
  const s = result.tri_settings || {};

  const hasPaces = !!(s.swimPacePer100 || s.bikePace || s.runPacePer1k);
  document.getElementById('pacesSaved').textContent = hasPaces ? 'Yes ✓' : 'No';
  document.getElementById('unitsVal').textContent = s.units === 'imperial' ? 'Imperial' : 'Metric';

  const unitSuffix = s.units === 'imperial';

  if (s.swimPacePer100) {
    document.getElementById('swimRow').style.display = 'flex';
    document.getElementById('swimVal').textContent = s.swimPacePer100 + (unitSuffix ? ' /100yd' : ' /100m');
  }

  if (s.bikePace) {
    document.getElementById('bikeRow').style.display = 'flex';
    const suffix = s.bikeInputMode === 'watts' ? 'W FTP' : (unitSuffix ? 'mph' : 'kph');
    document.getElementById('bikeVal').textContent = s.bikePace + ' ' + suffix;
  }

  if (s.runPacePer1k) {
    document.getElementById('runRow').style.display = 'flex';
    document.getElementById('runVal').textContent = s.runPacePer1k + (unitSuffix ? ' /mi' : ' /km');
  }

  if (s.isPro) {
    document.getElementById('proBar').style.display = 'none';
  }
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('proBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

init();
