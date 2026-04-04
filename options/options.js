// Proposal Template Manager — Options Page

const FREE_TEMPLATE_LIMIT = 5;

let templates = [];
let proposals = [];
let settings = { reminderEnabled: true, reminderHours: 48, isPro: false };
let editingId = null;

// ── Utils ─────────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function genId() {
  return 'tmpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

// ── Storage ───────────────────────────────────────────────────────────────────

function loadAll(cb) {
  chrome.storage.local.get(['ptm_templates', 'ptm_proposals', 'ptm_settings'], (result) => {
    templates = result.ptm_templates || [];
    proposals = result.ptm_proposals || [];
    settings = Object.assign({ reminderEnabled: true, reminderHours: 48, isPro: false }, result.ptm_settings || {});
    cb && cb();
  });
}

function saveTemplates(cb) {
  chrome.storage.local.set({ ptm_templates: templates }, cb);
}

function saveProposals(cb) {
  chrome.storage.local.set({ ptm_proposals: proposals }, cb);
}

function saveSettings(cb) {
  chrome.storage.local.set({ ptm_settings: settings }, cb);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function activateTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tabName));
  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'proposals') renderProposals();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// ── Templates ─────────────────────────────────────────────────────────────────

function renderTemplates() {
  const list = document.getElementById('templates-list');
  const limitNotice = document.getElementById('template-limit-notice');

  if (!settings.isPro && templates.length >= FREE_TEMPLATE_LIMIT) {
    limitNotice.style.display = 'block';
  } else {
    limitNotice.style.display = 'none';
  }

  if (templates.length === 0) {
    list.innerHTML = '<div class="empty-msg">No templates yet. Click "New Template" to create one.</div>';
    return;
  }

  list.innerHTML = '';
  templates.forEach(t => {
    const div = document.createElement('div');
    div.className = 'template-item';
    const preview = (t.body || '').replace(/\n/g, ' ').substring(0, 80) + ((t.body || '').length > 80 ? '…' : '');
    div.innerHTML = `
      <div class="template-item-body">
        <div class="template-item-name">${escHtml(t.name)}</div>
        <div class="template-item-preview">${escHtml(preview)}</div>
      </div>
      <div class="template-item-actions">
        <button class="btn-outline btn-sm" data-edit="${t.id}">Edit</button>
        <button class="btn-danger btn-sm" data-delete="${t.id}">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEditor(btn.dataset.edit));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteTemplate(btn.dataset.delete));
  });
}

function openEditor(id) {
  const editor = document.getElementById('template-editor');
  editor.style.display = 'block';

  if (id) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    editingId = id;
    document.getElementById('editor-title').textContent = 'Edit Template';
    document.getElementById('editor-id').value = id;
    document.getElementById('editor-name').value = t.name;
    document.getElementById('editor-body').value = t.body;
  } else {
    editingId = null;
    document.getElementById('editor-title').textContent = 'New Template';
    document.getElementById('editor-id').value = '';
    document.getElementById('editor-name').value = '';
    document.getElementById('editor-body').value = '';
  }

  editor.scrollIntoView({ behavior: 'smooth' });
}

function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  templates = templates.filter(t => t.id !== id);
  saveTemplates(() => renderTemplates());
}

document.getElementById('new-template-btn').addEventListener('click', () => {
  if (!settings.isPro && templates.length >= FREE_TEMPLATE_LIMIT) {
    alert('Free plan is limited to 5 templates. Upgrade to Pro for unlimited templates.');
    return;
  }
  openEditor(null);
});

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('template-editor').style.display = 'none';
  editingId = null;
});

document.getElementById('save-template-btn').addEventListener('click', () => {
  const name = document.getElementById('editor-name').value.trim();
  const body = document.getElementById('editor-body').value.trim();
  if (!name) { alert('Please enter a template name.'); return; }
  if (!body) { alert('Please enter a template body.'); return; }

  if (editingId) {
    const t = templates.find(x => x.id === editingId);
    if (t) { t.name = name; t.body = body; t.updatedAt = new Date().toISOString(); }
  } else {
    templates.push({ id: genId(), name, body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  saveTemplates(() => {
    renderTemplates();
    const msg = document.getElementById('template-saved-msg');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
    document.getElementById('template-editor').style.display = 'none';
    editingId = null;
  });
});

// ── Import / Export ───────────────────────────────────────────────────────────

document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ templates, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ptm-templates-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      const imported = (data.templates || data).filter(t => t.id && t.name && t.body);
      if (imported.length === 0) { alert('No valid templates found in file.'); return; }
      // Merge: skip duplicates by id
      const existingIds = new Set(templates.map(t => t.id));
      const newOnes = imported.filter(t => !existingIds.has(t.id));
      templates = templates.concat(newOnes);
      saveTemplates(() => {
        renderTemplates();
        alert(`Imported ${newOnes.length} template(s).`);
      });
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Proposals ─────────────────────────────────────────────────────────────────

const OUTCOMES = [
  { value: 'pending',    label: 'Pending' },
  { value: 'viewed',     label: 'Viewed' },
  { value: 'responded',  label: 'Responded' },
  { value: 'interview',  label: 'Interview' },
  { value: 'hired',      label: 'Hired' },
  { value: 'rejected',   label: 'Rejected' },
];

const OUTCOME_CLASSES = {
  hired: 'outcome-hired', responded: 'outcome-responded',
  interview: 'outcome-interview', pending: 'outcome-pending',
  viewed: 'outcome-viewed', rejected: 'outcome-rejected',
};

function renderProposals() {
  const container = document.getElementById('proposals-container');
  if (proposals.length === 0) {
    container.innerHTML = '<div class="empty-msg">No proposals logged yet. Use the panel on Upwork or Fiverr to log proposals.</div>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>Job</th><th>Template</th><th>Sent</th><th>Platform</th><th>Outcome</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  proposals.forEach(p => {
    const tr = document.createElement('tr');
    const sentDate = new Date(p.sentAt).toLocaleDateString();
    tr.innerHTML = `
      <td><a href="${escHtml(p.jobUrl || '#')}" target="_blank" style="color:#14a800;text-decoration:none">${escHtml(p.jobTitle || 'Untitled')}</a></td>
      <td>${escHtml(p.templateName || '')}</td>
      <td style="white-space:nowrap">${sentDate}</td>
      <td style="text-transform:capitalize">${escHtml(p.platform || '')}</td>
      <td>
        <select class="outcome-select" data-proposal-id="${p.id}">
          ${OUTCOMES.map(o => `<option value="${o.value}"${p.outcome === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);

  container.querySelectorAll('.outcome-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const id = e.target.dataset.proposalId;
      const p = proposals.find(x => x.id === id);
      if (p) { p.outcome = e.target.value; p.updatedAt = new Date().toISOString(); saveProposals(); }
    });
  });
}

// Export proposals to CSV
document.getElementById('export-proposals-btn').addEventListener('click', () => {
  if (proposals.length === 0) { alert('No proposals to export.'); return; }
  const headers = ['Job Title', 'Job URL', 'Template', 'Platform', 'Sent At', 'Outcome'];
  const rows = proposals.map(p => [
    p.jobTitle || '', p.jobUrl || '', p.templateName || '',
    p.platform || '', p.sentAt || '', p.outcome || '',
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ptm-proposals-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  const gate = document.getElementById('dashboard-pro-gate');
  const content = document.getElementById('dashboard-content');

  if (!settings.isPro) {
    gate.style.display = 'block';
    content.style.display = 'none';
    return;
  }

  gate.style.display = 'none';
  content.style.display = 'block';

  const totalSent = proposals.length;
  const responded = proposals.filter(p => ['responded','interview','hired'].includes(p.outcome)).length;
  const hired = proposals.filter(p => p.outcome === 'hired').length;

  document.getElementById('dash-sent').textContent = totalSent;
  document.getElementById('dash-response-rate').textContent = totalSent > 0 ? Math.round(responded / totalSent * 100) + '%' : '0%';
  document.getElementById('dash-hire-rate').textContent = totalSent > 0 ? Math.round(hired / totalSent * 100) + '%' : '0%';

  // Per-template breakdown
  const barsContainer = document.getElementById('template-bars');
  const stats = {};
  proposals.forEach(p => {
    if (!stats[p.templateId]) stats[p.templateId] = { name: p.templateName || 'Unknown', sent: 0, won: 0 };
    stats[p.templateId].sent++;
    if (['responded','interview','hired'].includes(p.outcome)) stats[p.templateId].won++;
  });

  const sorted = Object.values(stats).sort((a, b) => (b.won / (b.sent || 1)) - (a.won / (a.sent || 1)));
  if (sorted.length === 0) {
    barsContainer.innerHTML = '<div class="empty-msg">No data yet.</div>';
    return;
  }

  const maxRate = Math.max(...sorted.map(s => s.sent > 0 ? s.won / s.sent : 0), 0.01);
  barsContainer.innerHTML = '';
  sorted.forEach(s => {
    const rate = s.sent > 0 ? s.won / s.sent : 0;
    const pct = Math.round(rate / maxRate * 100);
    const div = document.createElement('div');
    div.className = 'tmpl-bar';
    div.innerHTML = `
      <div class="tmpl-bar-label">
        <span>${escHtml(s.name)}</span>
        <span>${s.won}/${s.sent} responses (${Math.round(rate * 100)}%)</span>
      </div>
      <div class="tmpl-bar-track"><div class="tmpl-bar-fill" style="width:${pct}%"></div></div>
    `;
    barsContainer.appendChild(div);
  });
}

// Upgrade buttons
['dashboard-upgrade-btn', 'settings-upgrade-btn'].forEach(id => {
  document.getElementById(id) && document.getElementById(id).addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  });
});

document.getElementById('limit-upgrade-link') && document.getElementById('limit-upgrade-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

// ── Settings ──────────────────────────────────────────────────────────────────

function renderSettings() {
  document.getElementById('reminder-toggle').checked = settings.reminderEnabled !== false;
  document.getElementById('reminder-hours').value = settings.reminderHours || 48;
  if (settings.isPro) document.getElementById('pro-badge').style.display = 'inline';
}

document.getElementById('save-settings-btn').addEventListener('click', () => {
  settings.reminderEnabled = document.getElementById('reminder-toggle').checked;
  settings.reminderHours = parseInt(document.getElementById('reminder-hours').value, 10) || 48;
  saveSettings(() => {
    const msg = document.getElementById('saved-msg');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadAll(() => {
    renderTemplates();
    renderSettings();

    // Check for ?tab= in URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) activateTab(tab);
  });
});

// Live sync on storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.ptm_templates) { templates = changes.ptm_templates.newValue || []; renderTemplates(); }
  if (changes.ptm_proposals) { proposals = changes.ptm_proposals.newValue || []; }
  if (changes.ptm_settings)  { settings = Object.assign(settings, changes.ptm_settings.newValue || {}); renderSettings(); }
});
