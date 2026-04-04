// Wedding Vendor Tracker — Side Panel Script

'use strict';

// ── State ─────────────────────────────────────────────────────────────────────

let allVendors = [];
let isPro = false;
let currentView = 'list'; // 'list' | 'compare'
let detailVendorId = null;
let saveDebounce = null;

const STATUS_VALUES = ['Contacted', 'Quoted', 'Booked', 'Rejected'];
const RESPONSE_VALUES = ['Awaiting', 'Yes', 'No'];

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const [opts] = await Promise.all([
    sendMsg({ type: 'GET_OPTIONS' }),
  ]);
  isPro = opts?.isPro === true;

  await loadVendors();
  renderCategoryFilters();
  bindEvents();
}

async function loadVendors() {
  const resp = await sendMsg({ type: 'GET_VENDORS' });
  allVendors = resp?.vendors || [];
  renderVendorList();
  renderCompareView();
}

// ── Messaging ─────────────────────────────────────────────────────────────────

function sendMsg(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

// ── Render vendor list ────────────────────────────────────────────────────────

function getFilteredVendors() {
  const cat = document.getElementById('sp-filter-category').value;
  const status = document.getElementById('sp-filter-status').value;
  return allVendors.filter(v => {
    if (cat && v.category !== cat) return false;
    if (status && v.status !== status) return false;
    return true;
  });
}

function renderVendorList() {
  const list = document.getElementById('sp-vendor-list');
  const empty = document.getElementById('sp-empty-state');
  const vendors = getFilteredVendors();

  list.innerHTML = '';

  if (vendors.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  vendors.forEach(v => {
    const card = document.createElement('div');
    card.className = 'sp-vendor-card';
    card.dataset.id = v.id;

    const statusClass = `sp-status--${(v.status || 'contacted').toLowerCase()}`;
    card.innerHTML = `
      <div class="sp-vendor-card-header">
        <div class="sp-vendor-name">${escHtml(v.name)}</div>
        <span class="sp-status-badge ${statusClass}">${escHtml(v.status)}</span>
      </div>
      <div class="sp-vendor-meta">
        <span>${escHtml(v.category)}</span>
        ${v.priceRange ? `<span>${escHtml(v.priceRange)}</span>` : ''}
        <span>${escHtml(v.site || '')}</span>
      </div>
      ${v.notes ? `<div class="sp-vendor-notes-preview">${escHtml(v.notes)}</div>` : ''}
    `;

    card.addEventListener('click', () => openDetail(v.id));
    list.appendChild(card);
  });
}

// ── Category filter options ───────────────────────────────────────────────────

function renderCategoryFilters() {
  const categories = [...new Set(allVendors.map(v => v.category).filter(Boolean))].sort();
  const sel = document.getElementById('sp-filter-category');
  const compareSel = document.getElementById('sp-compare-category');
  // Reset
  sel.innerHTML = '<option value="">All Categories</option>';
  compareSel.innerHTML = '<option value="">Select Category</option>';
  categories.forEach(cat => {
    sel.insertAdjacentHTML('beforeend', `<option value="${escHtml(cat)}">${escHtml(cat)}</option>`);
    compareSel.insertAdjacentHTML('beforeend', `<option value="${escHtml(cat)}">${escHtml(cat)}</option>`);
  });
}

// ── Vendor detail ─────────────────────────────────────────────────────────────

function openDetail(vendorId) {
  detailVendorId = vendorId;
  const v = allVendors.find(x => x.id === vendorId);
  if (!v) return;

  const body = document.getElementById('sp-detail-body');

  body.innerHTML = `
    <div class="sp-detail-name">${escHtml(v.name)}</div>
    <div class="sp-detail-meta">
      <span>${escHtml(v.category)}</span>
      <span>${v.priceRange ? escHtml(v.priceRange) : '—'}</span>
      <span>${v.site ? `<a href="${escHtml(v.url || '')}" target="_blank" rel="noopener">${escHtml(v.site)}</a>` : ''}</span>
    </div>

    <!-- Status -->
    <div class="sp-detail-section">
      <div class="sp-detail-label">Status</div>
      <select class="sp-detail-select" id="sp-detail-status">
        ${STATUS_VALUES.map(s => `<option value="${s}"${v.status === s ? ' selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>

    <!-- Notes -->
    <div class="sp-detail-section">
      <div class="sp-detail-label">Notes</div>
      <textarea class="sp-detail-textarea" id="sp-detail-notes" rows="3">${escHtml(v.notes || '')}</textarea>
      <div class="sp-save-indicator" id="sp-save-indicator"></div>
    </div>

    <!-- Pro: Quoted price -->
    ${renderProSection(v)}
  `;

  // Auto-save status on change
  document.getElementById('sp-detail-status').addEventListener('change', () => saveDetailField('status', document.getElementById('sp-detail-status').value));

  // Auto-save notes with debounce
  document.getElementById('sp-detail-notes').addEventListener('input', () => {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
      saveDetailField('notes', document.getElementById('sp-detail-notes').value);
    }, 600);
  });

  if (isPro) bindProDetailEvents(v);

  // Show detail panel
  const detail = document.getElementById('sp-vendor-detail');
  detail.classList.remove('sp-detail-hidden');
  detail.classList.add('sp-detail-visible');
}

function renderProSection(v) {
  if (!isPro) {
    return `
      <div class="sp-pro-section">
        <div class="sp-pro-section-header">&#9733; Pro Features</div>
        <div class="sp-pro-lock-msg">Unlock price quotes, contact log, availability notes, and email shortcuts.</div>
        <button class="sp-pro-btn" style="margin-top:8px;font-size:11px;padding:6px 14px" id="sp-detail-upgrade-btn">Upgrade to Pro — $7/mo</button>
      </div>
    `;
  }

  const log = (v.contactLog || []);
  const logRows = log.map((entry, i) => `
    <tr>
      <td>${escHtml(entry.dateContacted)}</td>
      <td>${escHtml(entry.responseReceived)}</td>
      <td>${escHtml(entry.followUpDate || '—')}</td>
      <td>${escHtml(entry.notes || '')}</td>
      <td><button data-log-idx="${i}" class="sp-delete-log-btn">&#128465;</button></td>
    </tr>
  `).join('');

  const emailLink = v.contactEmail
    ? `<a class="sp-email-btn" href="mailto:${escHtml(v.contactEmail)}?subject=${encodeURIComponent('Inquiry: ' + v.name)}&body=${encodeURIComponent('Hi,\n\nI found your listing on ' + v.site + ' and I am interested in your services for my wedding.\n\nCould you please provide more details about availability and pricing?\n\nThank you!')}">&#9993; Draft Email to ${escHtml(v.name)}</a>`
    : '<span class="sp-pro-lock-msg">No contact email found on listing page.</span>';

  return `
    <div class="sp-pro-section">
      <div class="sp-pro-section-header">&#9733; Quoted Price</div>
      <input class="sp-detail-input" type="number" id="sp-detail-quoted-price" placeholder="Enter quoted price (e.g. 3500)" value="${v.quotedPrice != null ? escHtml(String(v.quotedPrice)) : ''}" />
    </div>

    <div class="sp-pro-section">
      <div class="sp-pro-section-header">&#9733; Availability</div>
      <input class="sp-detail-input" type="text" id="sp-detail-availability" placeholder="e.g. Available Oct 12, Waitlisted" value="${escHtml(v.availabilityNotes || '')}" />
    </div>

    <div class="sp-pro-section">
      <div class="sp-pro-section-header">&#9733; Contact Log</div>
      ${log.length > 0 ? `
        <table class="sp-contact-log">
          <thead><tr><th>Date</th><th>Response</th><th>Follow-up</th><th>Notes</th><th></th></tr></thead>
          <tbody id="sp-log-tbody">${logRows}</tbody>
        </table>
      ` : '<p style="font-size:11px;color:#7a6b65;margin-bottom:4px">No contact log entries yet.</p>'}
      <button class="sp-add-log-btn" id="sp-add-log-btn">+ Add Entry</button>
    </div>

    <div class="sp-pro-section">
      <div class="sp-pro-section-header">&#9993; Email Draft</div>
      ${emailLink}
    </div>
  `;
}

function bindProDetailEvents(v) {
  // Quoted price
  const qp = document.getElementById('sp-detail-quoted-price');
  if (qp) {
    qp.addEventListener('change', () => {
      const val = qp.value.trim();
      saveDetailField('quotedPrice', val === '' ? null : parseFloat(val));
    });
  }

  // Availability
  const av = document.getElementById('sp-detail-availability');
  if (av) {
    av.addEventListener('input', () => {
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => saveDetailField('availabilityNotes', av.value), 600);
    });
  }

  // Add contact log entry
  document.getElementById('sp-add-log-btn')?.addEventListener('click', () => showAddLogForm(v));

  // Delete log entries
  document.querySelectorAll('.sp-delete-log-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.logIdx, 10);
      const vendor = allVendors.find(x => x.id === detailVendorId);
      if (!vendor) return;
      vendor.contactLog.splice(idx, 1);
      await sendMsg({ type: 'UPDATE_VENDOR', id: vendor.id, updates: { contactLog: vendor.contactLog } });
      openDetail(vendor.id);
    });
  });

  // Detail upgrade btn (not pro — shouldn't appear but safeguard)
  document.getElementById('sp-detail-upgrade-btn')?.addEventListener('click', showProModal);
}

function showAddLogForm(v) {
  const today = new Date().toISOString().slice(0, 10);
  const formHtml = `
    <div id="sp-log-form" style="background:#fff;border:1px solid #e8e0da;border-radius:8px;padding:10px;margin-top:8px">
      <div class="sp-detail-label" style="margin-bottom:6px">New Contact Entry</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <input class="sp-detail-input" type="date" id="sp-log-date" value="${today}" />
        <select class="sp-detail-select" id="sp-log-response">
          ${RESPONSE_VALUES.map(r => `<option value="${r}">${r}</option>`).join('')}
        </select>
        <input class="sp-detail-input" type="date" id="sp-log-followup" placeholder="Follow-up date (optional)" />
        <input class="sp-detail-input" type="text" id="sp-log-notes" placeholder="Notes (optional)" />
        <div style="display:flex;gap:6px">
          <button class="sp-add-log-btn" id="sp-log-save-btn">Save</button>
          <button class="sp-add-log-btn" style="background:#7a6b65" id="sp-log-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('sp-add-log-btn').insertAdjacentHTML('afterend', formHtml);
  document.getElementById('sp-add-log-btn').style.display = 'none';

  document.getElementById('sp-log-cancel-btn').addEventListener('click', () => openDetail(v.id));
  document.getElementById('sp-log-save-btn').addEventListener('click', async () => {
    const entry = {
      dateContacted: document.getElementById('sp-log-date').value || today,
      responseReceived: document.getElementById('sp-log-response').value,
      followUpDate: document.getElementById('sp-log-followup').value || '',
      notes: document.getElementById('sp-log-notes').value || '',
    };
    await sendMsg({ type: 'ADD_CONTACT_LOG_ENTRY', id: v.id, entry });
    await loadVendors();
    openDetail(v.id);
  });
}

async function saveDetailField(field, value) {
  const idx = document.getElementById('sp-save-indicator');
  await sendMsg({ type: 'UPDATE_VENDOR', id: detailVendorId, updates: { [field]: value } });
  // Update local state
  const v = allVendors.find(x => x.id === detailVendorId);
  if (v) v[field] = value;
  renderVendorList();
  if (idx) {
    idx.textContent = 'Saved ✓';
    setTimeout(() => { if (idx) idx.textContent = ''; }, 1500);
  }
}

// ── Compare view ──────────────────────────────────────────────────────────────

function renderCompareView() {
  const upsell = document.getElementById('sp-compare-upsell');
  const tableWrap = document.getElementById('sp-compare-table-wrap');

  if (!isPro) {
    upsell.style.display = '';
    tableWrap.innerHTML = '';
    return;
  }
  upsell.style.display = 'none';

  const cat = document.getElementById('sp-compare-category').value;
  if (!cat) {
    tableWrap.innerHTML = '<p style="font-size:12px;color:#7a6b65;padding:10px 0">Select a category to compare vendors.</p>';
    return;
  }

  const vendors = allVendors.filter(v => v.category === cat).slice(0, 4);
  if (vendors.length === 0) {
    tableWrap.innerHTML = '<p style="font-size:12px;color:#7a6b65;padding:10px 0">No vendors tracked in this category yet.</p>';
    return;
  }

  // Build comparison table
  const fields = [
    { label: 'Price Range', key: 'priceRange' },
    { label: 'Quoted Price', key: 'quotedPrice', format: v => v != null ? `$${Number(v).toLocaleString()}` : '—' },
    { label: 'Status', key: 'status' },
    { label: 'Availability', key: 'availabilityNotes' },
    { label: 'Notes', key: 'notes' },
  ];

  const headerCells = vendors.map(v => `<th><div class="sp-compare-vendor-name">${escHtml(v.name)}</div><div style="font-size:10px;color:#7a6b65;font-weight:400">${escHtml(v.site || '')}</div></th>`).join('');
  const rows = fields.map(f => {
    const cells = vendors.map(v => {
      const raw = f.format ? f.format(v[f.key]) : (v[f.key] || '—');
      return `<td>${escHtml(String(raw))}</td>`;
    }).join('');
    return `<tr><th>${escHtml(f.label)}</th>${cells}</tr>`;
  }).join('');

  tableWrap.innerHTML = `
    <table class="sp-compare-table">
      <thead><tr><th>Field</th>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${renderBudgetBar(cat, vendors)}
  `;
}

function renderBudgetBar(cat, vendors) {
  // Read budget from sync storage (async — best-effort with cached isPro check)
  chrome.storage.sync.get({ categoryBudgets: {} }, ({ categoryBudgets }) => {
    const budget = categoryBudgets[cat];
    if (!budget) return;

    const quotes = vendors.map(v => v.quotedPrice).filter(p => p != null);
    if (quotes.length === 0) return;

    const minQuote = Math.min(...quotes);
    const pct = Math.min((minQuote / budget) * 100, 100);
    const over = minQuote > budget;

    const wrap = document.getElementById('sp-budget-bar-dynamic');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="sp-budget-bar-row">
        <div class="sp-budget-bar-label">${escHtml(cat)}</div>
        <div class="sp-budget-bar-track">
          <div class="sp-budget-bar-fill${over ? ' sp-budget-bar-fill--over' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="sp-budget-bar-amount ${over ? 'sp-budget-over' : 'sp-budget-ok'}">
          Best: $${minQuote.toLocaleString()} / Budget: $${Number(budget).toLocaleString()}
        </div>
      </div>
    `;
  });

  return `<div class="sp-budget-bar-wrap" id="sp-budget-bar-dynamic" style="margin-top:12px"></div>`;
}

// ── CSV Export ────────────────────────────────────────────────────────────────

async function exportCsv() {
  const resp = await sendMsg({ type: 'EXPORT_CSV' });
  if (!resp?.csv) return;
  const blob = new Blob([resp.csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wedding-vendors-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Pro modal ─────────────────────────────────────────────────────────────────

function showProModal() {
  document.getElementById('sp-pro-modal').style.display = 'flex';
}

function hideProModal() {
  document.getElementById('sp-pro-modal').style.display = 'none';
}

// ── Events ────────────────────────────────────────────────────────────────────

function bindEvents() {
  // Tabs
  document.querySelectorAll('.sp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      if (tabId === 'compare' && !isPro) {
        showProModal();
        return;
      }
      currentView = tabId;
      document.querySelectorAll('.sp-tab').forEach(t => t.classList.remove('sp-tab--active'));
      tab.classList.add('sp-tab--active');
      document.getElementById('sp-view-list').style.display = tabId === 'list' ? '' : 'none';
      document.getElementById('sp-view-compare').style.display = tabId === 'compare' ? '' : 'none';
    });
  });

  // Filters
  document.getElementById('sp-filter-category').addEventListener('change', renderVendorList);
  document.getElementById('sp-filter-status').addEventListener('change', renderVendorList);

  // Compare category
  document.getElementById('sp-compare-category').addEventListener('change', renderCompareView);

  // Export
  document.getElementById('sp-export-btn').addEventListener('click', exportCsv);

  // Settings
  document.getElementById('sp-settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Back button (detail → list)
  document.getElementById('sp-back-btn').addEventListener('click', () => {
    detailVendorId = null;
    const detail = document.getElementById('sp-vendor-detail');
    detail.classList.remove('sp-detail-visible');
    detail.classList.add('sp-detail-hidden');
  });

  // Delete vendor
  document.getElementById('sp-delete-btn').addEventListener('click', async () => {
    if (!detailVendorId) return;
    if (!confirm('Remove this vendor from your list?')) return;
    await sendMsg({ type: 'DELETE_VENDOR', id: detailVendorId });
    detailVendorId = null;
    const detail = document.getElementById('sp-vendor-detail');
    detail.classList.remove('sp-detail-visible');
    detail.classList.add('sp-detail-hidden');
    await loadVendors();
    renderCategoryFilters();
  });

  // Pro modal close / upgrade
  document.getElementById('sp-modal-close').addEventListener('click', hideProModal);
  document.getElementById('sp-modal-upgrade-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
    hideProModal();
  });
  document.getElementById('sp-upgrade-compare-btn')?.addEventListener('click', showProModal);

  // Listen for vendor updates from service worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'VENDORS_UPDATED') {
      loadVendors().then(() => renderCategoryFilters());
    }
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
