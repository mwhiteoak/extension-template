// Wedding Vendor Tracker — Options Page

'use strict';

const CATEGORIES = [
  'Venue', 'Photographer', 'Videographer', 'Caterer', 'Florist',
  'DJ', 'Band', 'Officiant', 'Hair & Makeup', 'Wedding Planner',
  'Cake & Desserts', 'Transportation', 'Stationery', 'Rentals', 'Other',
];

let isPro = false;
let categoryBudgets = {};

async function init() {
  const opts = await new Promise(resolve =>
    chrome.storage.sync.get({ isPro: false, categoryBudgets: {} }, resolve)
  );
  isPro = opts.isPro;
  categoryBudgets = opts.categoryBudgets || {};

  // Plan badge
  const badge = document.getElementById('plan-badge');
  badge.textContent = isPro ? 'Pro ★' : 'Free';
  badge.className = isPro ? 'plan-badge plan-badge--pro' : 'plan-badge plan-badge--free';

  // Pro banner
  document.getElementById('pro-banner').style.display = isPro ? 'none' : '';

  // Budget fields (always shown; disabled for Free users)
  renderBudgetFields();

  document.getElementById('upgrade-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  });

  document.getElementById('save-btn').addEventListener('click', saveSettings);
}

function renderBudgetFields() {
  const container = document.getElementById('budget-fields');
  container.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'budget-row';
    row.innerHTML = `
      <label for="budget-${cat}">${cat}</label>
      <input type="number" id="budget-${escAttr(cat)}" placeholder="e.g. 5000" min="0" step="100"
        value="${categoryBudgets[cat] != null ? categoryBudgets[cat] : ''}"
        ${isPro ? '' : 'disabled title="Upgrade to Pro to set category budgets"'} />
    `;
    container.appendChild(row);
  });

  if (!isPro) {
    const note = document.createElement('p');
    note.style.cssText = 'font-size:12px;color:#7a6b65;margin-top:8px';
    note.textContent = 'Upgrade to Pro to enable budget tracking.';
    container.appendChild(note);
  }
}

async function saveSettings() {
  const newBudgets = {};
  if (isPro) {
    CATEGORIES.forEach(cat => {
      const input = document.getElementById(`budget-${escAttr(cat)}`);
      const val = input ? parseFloat(input.value) : NaN;
      if (!isNaN(val) && val > 0) newBudgets[cat] = val;
    });
  }

  await new Promise(resolve =>
    chrome.storage.sync.set({ categoryBudgets: newBudgets }, resolve)
  );

  const msg = document.getElementById('save-msg');
  msg.style.display = 'inline';
  setTimeout(() => { msg.style.display = 'none'; }, 2000);
}

function escAttr(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

document.addEventListener('DOMContentLoaded', init);
