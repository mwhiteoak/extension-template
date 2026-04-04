// Lightroom Web Keyboard Enhancer — Options Page

const ACTION_LABELS = {
  pick:   'Pick flag (P)',
  reject: 'Reject flag (X)',
  unflag: 'Unflag (U)',
  star1:  '1 Star',
  star2:  '2 Stars',
  star3:  '3 Stars',
  star4:  '4 Stars',
  star5:  '5 Stars',
  prev:   'Previous photo (←)',
  next:   'Next photo (→)',
};

const DEFAULT_CONFIG = {
  enabled: true,
  autoAdvance: true,
  shortcuts: {
    pick:    { key: 'p', enabled: true },
    reject:  { key: 'x', enabled: true },
    unflag:  { key: 'u', enabled: true },
    star1:   { key: '1', enabled: true },
    star2:   { key: '2', enabled: true },
    star3:   { key: '3', enabled: true },
    star4:   { key: '4', enabled: true },
    star5:   { key: '5', enabled: true },
    prev:    { key: 'arrowleft',  enabled: true },
    next:    { key: 'arrowright', enabled: true },
  },
};

let config = null;

function msg(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

// ─── Load & Render ────────────────────────────────────────────────────────────

async function load() {
  const resp = await msg('GET_CONFIG');
  config = resp.config || JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  renderAll();
}

function renderAll() {
  document.getElementById('enabled-toggle').checked      = config.enabled;
  document.getElementById('auto-advance-toggle').checked = config.autoAdvance;
  renderShortcuts();
}

function renderShortcuts() {
  const tbody = document.getElementById('shortcuts-body');
  tbody.innerHTML = '';

  for (const [action, sc] of Object.entries(config.shortcuts)) {
    const label = ACTION_LABELS[action] || action;
    const tr = document.createElement('tr');

    const keyDisplay = sc.key
      ? (sc.key.startsWith('Arrow') ? sc.key : sc.key.toUpperCase())
      : '';

    tr.innerHTML = `
      <td>${escHtml(label)}</td>
      <td>
        <input
          type="text"
          class="key-input"
          data-action="${action}"
          value="${escHtml(keyDisplay)}"
          placeholder="key…"
          readonly
        >
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="sc-enabled" data-action="${action}" ${sc.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Wire key capture — click input, then press a key
  tbody.querySelectorAll('.key-input').forEach(input => {
    input.addEventListener('click', () => {
      input.value = '…press a key…';
      input.style.background = '#e8f0fe';

      function onKey(e) {
        e.preventDefault();
        e.stopPropagation();
        const key = e.key;
        // Ignore pure modifiers
        if (['Control','Shift','Alt','Meta'].includes(key)) return;
        input.value = key.startsWith('Arrow') ? key : key.toUpperCase();
        input.style.background = '';
        const action = input.dataset.action;
        config.shortcuts[action].key = key.toLowerCase();
        input.removeEventListener('keydown', onKey, true);
      }

      input.addEventListener('keydown', onKey, true);
    });
  });

  // Wire enabled toggles
  tbody.querySelectorAll('.sc-enabled').forEach(cb => {
    cb.addEventListener('change', () => {
      config.shortcuts[cb.dataset.action].enabled = cb.checked;
    });
  });
}

// ─── Save ─────────────────────────────────────────────────────────────────────

document.getElementById('enabled-toggle').addEventListener('change', (e) => {
  config.enabled = e.target.checked;
});

document.getElementById('auto-advance-toggle').addEventListener('change', (e) => {
  config.autoAdvance = e.target.checked;
});

document.getElementById('save-btn').addEventListener('click', async () => {
  await msg('SAVE_CONFIG', { config });
  const savedMsg = document.getElementById('saved-msg');
  savedMsg.style.display = 'inline';
  setTimeout(() => { savedMsg.style.display = 'none'; }, 2500);
});

document.getElementById('reset-btn').addEventListener('click', () => {
  config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  renderAll();
});

document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://buy.stripe.com/REPLACE_WITH_YOUR_PAYMENT_LINK' });
});

// ─── Utils ────────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', load);
