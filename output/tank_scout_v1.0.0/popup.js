/**
 * Tank Scout — Popup Script
 * Tank profile editor: set tank size/parameters and manage fish list.
 */

(function () {
  'use strict';

  let speciesDB = [];  // array from data/species.json
  let tankProfile = {
    gallons: null,
    ph: null,
    tempF: null,
    fish: [],  // [{ scientificName, commonName }]
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  async function init() {
    const resp = await fetch(chrome.runtime.getURL('data/species.json'));
    const data = await resp.json();
    speciesDB = data.species;

    await loadProfile();
    renderProfileForm();
    renderSummary();
    renderFishList();

    bindTabs();
    bindProfileForm();
    bindFishSearch();
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  function loadProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tankProfile'], (result) => {
        if (result.tankProfile) {
          tankProfile = result.tankProfile;
        }
        resolve();
      });
    });
  }

  function saveProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ tankProfile }, () => {
        notifyContentScripts();
        resolve();
      });
    });
  }

  function notifyContentScripts() {
    chrome.runtime.sendMessage({ type: 'TANK_UPDATED', tankProfile }).catch(() => {});
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  function bindTabs() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  // ── Profile form ───────────────────────────────────────────────────────────

  function renderProfileForm() {
    if (tankProfile.gallons) document.getElementById('gallonsInput').value = tankProfile.gallons;
    if (tankProfile.ph)      document.getElementById('phInput').value = tankProfile.ph;
    if (tankProfile.tempF)   document.getElementById('tempInput').value = tankProfile.tempF;
  }

  function bindProfileForm() {
    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
      const gallons = parseFloat(document.getElementById('gallonsInput').value) || null;
      const ph      = parseFloat(document.getElementById('phInput').value) || null;
      const tempF   = parseFloat(document.getElementById('tempInput').value) || null;

      tankProfile.gallons = gallons;
      tankProfile.ph      = ph;
      tankProfile.tempF   = tempF;

      await saveProfile();
      renderSummary();
      showFeedback('profileFeedback', 'Profile saved!');
    });
  }

  function renderSummary() {
    const hasSomething = tankProfile.gallons || tankProfile.ph || tankProfile.tempF;
    const summary = document.getElementById('profileSummary');
    summary.style.display = hasSomething ? '' : 'none';

    document.getElementById('sumGallons').textContent =
      tankProfile.gallons ? `${tankProfile.gallons} gal` : '—';
    document.getElementById('sumPh').textContent =
      tankProfile.ph ? tankProfile.ph : '—';
    document.getElementById('sumTemp').textContent =
      tankProfile.tempF ? `${tankProfile.tempF}°F` : '—';
    document.getElementById('sumFishCount').textContent =
      (tankProfile.fish || []).length;
  }

  // ── Fish search ────────────────────────────────────────────────────────────

  let suggFocusIndex = -1;

  function bindFishSearch() {
    const input = document.getElementById('fishSearch');
    const suggestionsEl = document.getElementById('fishSuggestions');

    input.addEventListener('input', () => {
      suggFocusIndex = -1;
      showSuggestions(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      const items = suggestionsEl.querySelectorAll('.suggestion-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        suggFocusIndex = Math.min(suggFocusIndex + 1, items.length - 1);
        updateFocus(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        suggFocusIndex = Math.max(suggFocusIndex - 1, 0);
        updateFocus(items);
      } else if (e.key === 'Enter') {
        if (suggFocusIndex >= 0 && items[suggFocusIndex]) {
          items[suggFocusIndex].click();
        }
      } else if (e.key === 'Escape') {
        suggestionsEl.innerHTML = '';
      }
    });

    document.addEventListener('click', (e) => {
      if (!suggestionsEl.contains(e.target) && e.target !== input) {
        suggestionsEl.innerHTML = '';
      }
    });
  }

  function showSuggestions(query) {
    const suggestionsEl = document.getElementById('fishSuggestions');
    suggestionsEl.innerHTML = '';

    if (!query || query.length < 2) return;

    const q = query.toLowerCase();
    const matches = speciesDB
      .filter((sp) => {
        const commonMatch = (sp.commonNames || []).some((n) => n.toLowerCase().includes(q));
        const sciMatch = sp.scientificName.toLowerCase().includes(q);
        return commonMatch || sciMatch;
      })
      .slice(0, 8);

    for (const sp of matches) {
      const item = document.createElement('div');
      item.className = 'suggestion-item';

      const common = document.createElement('span');
      common.className = 'suggestion-common';
      common.textContent = sp.commonNames[0] || sp.scientificName;

      const sci = document.createElement('span');
      sci.className = 'suggestion-sci';
      sci.textContent = sp.scientificName;

      const addLabel = document.createElement('span');
      addLabel.className = 'suggestion-add';
      addLabel.textContent = '+ Add';

      item.appendChild(common);
      item.appendChild(sci);
      item.appendChild(addLabel);

      item.addEventListener('click', () => {
        addFish(sp);
        document.getElementById('fishSearch').value = '';
        suggestionsEl.innerHTML = '';
      });

      suggestionsEl.appendChild(item);
    }
  }

  function updateFocus(items) {
    items.forEach((item, i) => item.classList.toggle('focused', i === suggFocusIndex));
  }

  // ── Fish list ──────────────────────────────────────────────────────────────

  function addFish(sp) {
    if (!tankProfile.fish) tankProfile.fish = [];
    const alreadyIn = tankProfile.fish.some((f) => f.scientificName === sp.scientificName);
    if (alreadyIn) {
      showFeedback('profileFeedback', `${sp.commonNames[0] || sp.scientificName} is already in your tank.`, true);
      return;
    }
    tankProfile.fish.push({
      scientificName: sp.scientificName,
      commonName: sp.commonNames[0] || sp.scientificName,
    });
    saveProfile().then(() => {
      renderFishList();
      renderSummary();
    });
  }

  function removeFish(scientificName) {
    tankProfile.fish = (tankProfile.fish || []).filter((f) => f.scientificName !== scientificName);
    saveProfile().then(() => {
      renderFishList();
      renderSummary();
    });
  }

  function renderFishList() {
    const list = document.getElementById('fishList');
    const empty = document.getElementById('fishEmpty');
    list.innerHTML = '';

    const fish = tankProfile.fish || [];
    empty.style.display = fish.length === 0 ? '' : 'none';

    for (const f of fish) {
      const item = document.createElement('div');
      item.className = 'fish-item';

      const info = document.createElement('div');
      info.className = 'fish-item-info';

      const commonEl = document.createElement('div');
      commonEl.className = 'fish-common';
      commonEl.textContent = f.commonName || f.scientificName;

      const sciEl = document.createElement('div');
      sciEl.className = 'fish-sci';
      sciEl.textContent = f.scientificName;

      info.appendChild(commonEl);
      info.appendChild(sciEl);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-danger';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeFish(f.scientificName));

      item.appendChild(info);
      item.appendChild(removeBtn);
      list.appendChild(item);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showFeedback(elId, msg, isError = false) {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.className = `feedback${isError ? ' error' : ''}`;
    setTimeout(() => { el.textContent = ''; }, 3000);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);
})();
