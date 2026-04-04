// Lightroom Web Keyboard Enhancer — Popup JS

const ACTION_LABELS = {
  pick:   'Pick flag',
  reject: 'Reject flag',
  unflag: 'Unflag',
  star1:  '1 Star',
  star2:  '2 Stars',
  star3:  '3 Stars',
  star4:  '4 Stars',
  star5:  '5 Stars',
  prev:   'Previous photo',
  next:   'Next photo',
};

function msg(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

function formatKey(key) {
  if (!key) return '—';
  const map = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' };
  return map[key.toLowerCase()] || key.toUpperCase();
}

async function render() {
  const resp = await msg('GET_CONFIG');
  const config = resp.config;

  // Enable toggle
  const toggle = document.getElementById('enabled-toggle');
  toggle.checked = config.enabled;

  // Shortcut rows
  const tbody = document.getElementById('shortcut-rows');
  tbody.innerHTML = '';

  for (const [action, sc] of Object.entries(config.shortcuts)) {
    const label = ACTION_LABELS[action] || action;
    const keyStr = formatKey(sc.key);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><kbd>${escHtml(keyStr)}</kbd></td>
      <td class="${sc.enabled ? 'action-name' : 'action-disabled'}">${escHtml(label)}</td>
      <td>
        <span class="status-chip ${sc.enabled ? 'chip-on' : 'chip-off'}">
          ${sc.enabled ? 'ON' : 'OFF'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Auto-advance chip
  const aaEl = document.getElementById('auto-advance-status');
  aaEl.textContent = config.autoAdvance ? 'ON' : 'OFF';
  aaEl.className = `status-chip ${config.autoAdvance ? 'chip-on' : 'chip-off'}`;
}

// Toggle enable/disable
document.getElementById('enabled-toggle').addEventListener('change', async (e) => {
  const resp = await msg('GET_CONFIG');
  const config = resp.config;
  config.enabled = e.target.checked;
  await msg('SAVE_CONFIG', { config });
});

// Upgrade button
document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://buy.stripe.com/REPLACE_WITH_YOUR_PAYMENT_LINK' });
});

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', render);
