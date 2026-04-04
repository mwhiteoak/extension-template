/**
 * Thread Scout — Popup Script
 * Handles stash manager UI: view, add, remove, search, CSV import.
 */

(function () {
  'use strict';

  let dmcColors = null;
  let equivalents = null;
  let stash = [];         // ordered array of DMC codes
  let pendingImport = []; // codes queued for import confirmation

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  async function init() {
    const [colorsResp, equivResp] = await Promise.all([
      fetch(chrome.runtime.getURL('data/dmc-colors.json')),
      fetch(chrome.runtime.getURL('data/equivalents.json')),
    ]);
    const colorsData = await colorsResp.json();
    const equivData = await equivResp.json();
    dmcColors = colorsData.colors;
    equivalents = equivData.equivalents;

    await loadStash();
    renderStash();
    bindTabs();
    bindStashTab();
    bindAddTab();
    bindImportTab();
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  function loadStash() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['stash'], (result) => {
        stash = result.stash || [];
        resolve();
      });
    });
  }

  function saveStash() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ stash }, () => {
        notifyContentScripts();
        resolve();
      });
    });
  }

  function notifyContentScripts() {
    chrome.tabs.query({}, (tabs) => {
      const targetHosts = ['etsy.com', 'dmc.com', '123stitch.com'];
      for (const tab of tabs) {
        try {
          const url = new URL(tab.url);
          if (targetHosts.some((h) => url.hostname.includes(h))) {
            chrome.tabs.sendMessage(tab.id, { type: 'STASH_UPDATED', stash }).catch(() => {});
          }
        } catch {
          // ignore non-URL tabs
        }
      }
    });
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

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

  // ── Stash tab ──────────────────────────────────────────────────────────────

  function bindStashTab() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
      renderStash(e.target.value.trim().toLowerCase());
    });
  }

  function renderStash(filter = '') {
    const list = document.getElementById('stashList');
    const empty = document.getElementById('stashEmpty');
    const count = document.getElementById('stashCount');

    count.textContent = `${stash.length} thread${stash.length === 1 ? '' : 's'}`;

    const filtered = filter
      ? stash.filter((code) => {
          const color = dmcColors[code];
          return (
            code.toLowerCase().includes(filter) ||
            (color && color.name.toLowerCase().includes(filter))
          );
        })
      : stash;

    list.innerHTML = '';

    if (stash.length === 0) {
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    for (const code of filtered) {
      const color = dmcColors[code];
      const li = document.createElement('li');
      li.className = 'thread-item';

      const swatch = document.createElement('div');
      swatch.className = 'thread-swatch';
      swatch.style.background = color ? color.hex : '#ddd';

      const codeEl = document.createElement('span');
      codeEl.className = 'thread-code';
      codeEl.textContent = code;

      const nameEl = document.createElement('span');
      nameEl.className = 'thread-name';
      nameEl.textContent = color ? color.name : '(unknown)';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'thread-remove';
      removeBtn.title = 'Remove from stash';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => removeThread(code));

      li.appendChild(swatch);
      li.appendChild(codeEl);
      li.appendChild(nameEl);
      li.appendChild(removeBtn);
      list.appendChild(li);
    }
  }

  function removeThread(code) {
    stash = stash.filter((c) => c !== code);
    saveStash().then(() => renderStash(document.getElementById('searchInput').value.trim().toLowerCase()));
  }

  // ── Add thread tab ─────────────────────────────────────────────────────────

  let selectedCode = null;
  let suggFocusIndex = -1;

  function bindAddTab() {
    const input = document.getElementById('addInput');
    const suggestionsEl = document.getElementById('addSuggestions');
    const addBtn = document.getElementById('addBtn');

    input.addEventListener('input', () => {
      selectedCode = null;
      addBtn.disabled = true;
      clearPreview();
      showSuggestions(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      const items = suggestionsEl.querySelectorAll('.suggestion-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        suggFocusIndex = Math.min(suggFocusIndex + 1, items.length - 1);
        updateSuggFocus(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        suggFocusIndex = Math.max(suggFocusIndex - 1, 0);
        updateSuggFocus(items);
      } else if (e.key === 'Enter') {
        if (suggFocusIndex >= 0 && items[suggFocusIndex]) {
          items[suggFocusIndex].click();
        } else if (selectedCode) {
          addBtn.click();
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

    addBtn.addEventListener('click', () => {
      if (!selectedCode) return;
      if (!stash.includes(selectedCode)) {
        stash.push(selectedCode);
        saveStash().then(() => {
          renderStash();
          showFeedback('addFeedback', `DMC ${selectedCode} added!`);
          input.value = '';
          selectedCode = null;
          clearPreview();
          addBtn.disabled = true;
          suggestionsEl.innerHTML = '';
        });
      } else {
        showFeedback('addFeedback', `DMC ${selectedCode} already in stash.`, true);
      }
    });
  }

  function showSuggestions(query) {
    const suggestionsEl = document.getElementById('addSuggestions');
    suggFocusIndex = -1;
    suggestionsEl.innerHTML = '';

    if (!query || query.length < 1) return;

    const q = query.toLowerCase();
    const matches = Object.entries(dmcColors)
      .filter(([code, color]) => {
        return code.toLowerCase().includes(q) || color.name.toLowerCase().includes(q);
      })
      .slice(0, 8);

    for (const [code, color] of matches) {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.dataset.code = code;

      const swatch = document.createElement('div');
      swatch.className = 'suggestion-swatch';
      swatch.style.background = color.hex;

      const codeEl = document.createElement('span');
      codeEl.className = 'suggestion-code';
      codeEl.textContent = code;

      const nameEl = document.createElement('span');
      nameEl.className = 'suggestion-name';
      nameEl.textContent = color.name;

      item.appendChild(swatch);
      item.appendChild(codeEl);
      item.appendChild(nameEl);

      item.addEventListener('click', () => {
        selectCode(code);
        suggestionsEl.innerHTML = '';
        document.getElementById('addInput').value = code;
      });

      suggestionsEl.appendChild(item);
    }
  }

  function updateSuggFocus(items) {
    items.forEach((item, i) => {
      item.classList.toggle('focused', i === suggFocusIndex);
    });
  }

  function selectCode(code) {
    selectedCode = code;
    const addBtn = document.getElementById('addBtn');
    addBtn.disabled = false;

    const color = dmcColors[code];
    const equiv = equivalents[code] || {};
    const preview = document.getElementById('addPreview');
    preview.style.display = '';

    document.getElementById('addSwatch').style.background = color ? color.hex : '#ddd';
    document.getElementById('addCode').textContent = `DMC ${code}`;
    document.getElementById('addName').textContent = color ? color.name : '';
    const equivParts = [];
    if (equiv.anchor) equivParts.push(`Anchor ${equiv.anchor}`);
    if (equiv.madeira) equivParts.push(`Madeira ${equiv.madeira}`);
    document.getElementById('addEquivs').textContent = equivParts.join(' · ') || '';
  }

  function clearPreview() {
    document.getElementById('addPreview').style.display = 'none';
  }

  // ── Import CSV tab ─────────────────────────────────────────────────────────

  function bindImportTab() {
    const csvInput = document.getElementById('csvInput');
    const dropZone = document.getElementById('dropZone');

    csvInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('click', () => csvInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    document.getElementById('importConfirmBtn').addEventListener('click', confirmImport);
    document.getElementById('importCancelBtn').addEventListener('click', cancelImport);
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const codes = new Set();

    for (const line of lines) {
      // Split on commas and/or whitespace, handle optional quotes
      const parts = line.split(/[,\t]+/).map((p) => p.replace(/^["'\s]+|["'\s]+$/g, '').toUpperCase());
      for (const part of parts) {
        // Match: 3-4 digit numbers, or "White", "Ecru", "B5200"
        const normalized = normalizeCode(part);
        if (normalized && dmcColors[normalized]) {
          codes.add(normalized);
        }
      }
    }

    pendingImport = [...codes];
    showImportPreview(pendingImport);
  }

  function normalizeCode(raw) {
    if (!raw) return null;
    const upper = raw.trim().toUpperCase();
    // Check as-is (handles "White", "Ecru", "B5200")
    if (dmcColors[upper]) return upper;
    // Check title-case (handles "white" -> "White")
    const title = upper.charAt(0) + upper.slice(1).toLowerCase();
    if (dmcColors[title]) return title;
    // Numeric codes
    const num = upper.replace(/^DMC\s*#?\s*/, '');
    if (dmcColors[num]) return num;
    return null;
  }

  function showImportPreview(codes) {
    const preview = document.getElementById('importPreview');
    const listEl = document.getElementById('importList');
    const foundEl = document.getElementById('importFound');
    const dupesEl = document.getElementById('importDupes');
    const dropZone = document.getElementById('dropZone');

    const dupes = codes.filter((c) => stash.includes(c));
    const newCodes = codes.filter((c) => !stash.includes(c));

    foundEl.textContent = `${codes.length} thread${codes.length === 1 ? '' : 's'} found`;
    dupesEl.textContent = dupes.length ? `(${dupes.length} already in stash)` : '';

    listEl.innerHTML = '';
    for (const code of codes) {
      const isDupe = stash.includes(code);
      const color = dmcColors[code];

      const li = document.createElement('li');
      li.className = `import-item${isDupe ? ' is-dupe' : ''}`;

      const swatch = document.createElement('div');
      swatch.className = 'thread-swatch';
      swatch.style.background = color ? color.hex : '#ddd';

      const codeEl = document.createElement('span');
      codeEl.className = 'thread-code';
      codeEl.textContent = code;

      const nameEl = document.createElement('span');
      nameEl.className = 'thread-name';
      nameEl.textContent = color ? color.name : '';

      if (isDupe) {
        const dupeTag = document.createElement('span');
        dupeTag.style.cssText = 'font-size:10px;color:#94a3b8;';
        dupeTag.textContent = 'already owned';
        li.appendChild(swatch);
        li.appendChild(codeEl);
        li.appendChild(nameEl);
        li.appendChild(dupeTag);
      } else {
        li.appendChild(swatch);
        li.appendChild(codeEl);
        li.appendChild(nameEl);
      }

      listEl.appendChild(li);
    }

    dropZone.style.display = 'none';
    preview.style.display = '';
  }

  function confirmImport() {
    const newCodes = pendingImport.filter((c) => !stash.includes(c));
    stash = [...stash, ...newCodes];
    saveStash().then(() => {
      renderStash();
      cancelImport();
      showFeedback('importFeedback', `${newCodes.length} thread${newCodes.length === 1 ? '' : 's'} imported!`);
    });
  }

  function cancelImport() {
    pendingImport = [];
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('dropZone').style.display = '';
    document.getElementById('csvInput').value = '';
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
