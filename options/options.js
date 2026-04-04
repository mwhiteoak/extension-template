// Auto-Context Time Tracker — Options Page

const FREE_MAPPING_LIMIT = 2;

let data = { mappings: [], clients: [], projects: [], settings: {} };

function generateId() {
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function msg(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load() {
  const resp = await msg('GET_OPTIONS');
  data = resp;
  renderClients();
  renderProjects();
  renderMappings();
  loadSettings();
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSettings() {
  const s = data.settings || {};
  document.getElementById('sync-target').value        = s.syncTarget || 'none';
  document.getElementById('toggl-token').value        = s.togglToken || '';
  document.getElementById('toggl-workspace').value    = s.togglWorkspaceId || '';
  document.getElementById('clockify-key').value       = s.clockifyApiKey || '';
  document.getElementById('clockify-workspace').value = s.clockifyWorkspaceId || '';
  document.getElementById('idle-threshold').value     = s.idleThresholdMinutes || 5;
  document.getElementById('daily-review-time').value  = s.dailyReviewTime || '18:00';
  updateSyncFields();
}

function updateSyncFields() {
  const target = document.getElementById('sync-target').value;
  document.getElementById('toggl-fields').style.display    = target === 'toggl'    ? '' : 'none';
  document.getElementById('clockify-fields').style.display = target === 'clockify' ? '' : 'none';
}

document.getElementById('sync-target').addEventListener('change', updateSyncFields);

// ─── Clients ──────────────────────────────────────────────────────────────────

function renderClients() {
  const tbody = document.getElementById('clients-body');
  tbody.innerHTML = '';
  data.clients.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="color-dot" style="background:${escHtml(c.color || '#ccc')}"></span></td>
      <td>${escHtml(c.name)}</td>
      <td><button class="btn-danger" data-id="${c.id}">Remove</button></td>
    `;
    tr.querySelector('.btn-danger').addEventListener('click', () => removeClient(c.id));
    tbody.appendChild(tr);
  });
  refreshClientSelects();
}

function removeClient(id) {
  data.clients = data.clients.filter(c => c.id !== id);
  data.projects = data.projects.filter(p => p.clientId !== id);
  data.mappings = data.mappings.filter(m => m.clientId !== id);
  renderClients();
  renderProjects();
  renderMappings();
}

document.getElementById('add-client-btn').addEventListener('click', () => {
  const name  = document.getElementById('new-client-name').value.trim();
  const color = document.getElementById('new-client-color').value;
  if (!name) return;
  data.clients.push({ id: generateId(), name, color });
  document.getElementById('new-client-name').value = '';
  renderClients();
});

// ─── Projects ─────────────────────────────────────────────────────────────────

function renderProjects() {
  const tbody = document.getElementById('projects-body');
  tbody.innerHTML = '';
  data.projects.forEach(p => {
    const client = data.clients.find(c => c.id === p.clientId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(client?.name || '—')}</td>
      <td>${escHtml(p.name)}</td>
      <td><button class="btn-danger" data-id="${p.id}">Remove</button></td>
    `;
    tr.querySelector('.btn-danger').addEventListener('click', () => removeProject(p.id));
    tbody.appendChild(tr);
  });
  refreshProjectSelects();
}

function removeProject(id) {
  data.projects = data.projects.filter(p => p.id !== id);
  data.mappings = data.mappings.filter(m => m.projectId !== id);
  renderProjects();
  renderMappings();
}

document.getElementById('add-project-btn').addEventListener('click', () => {
  const clientId = document.getElementById('new-project-client').value;
  const name     = document.getElementById('new-project-name').value.trim();
  if (!clientId || !name) return;
  data.projects.push({ id: generateId(), clientId, name });
  document.getElementById('new-project-name').value = '';
  renderProjects();
  renderMappings(); // refresh project dropdowns in mapping row
});

// ─── Mappings ─────────────────────────────────────────────────────────────────

function renderMappings() {
  const tbody = document.getElementById('mappings-body');
  tbody.innerHTML = '';

  data.mappings.forEach(m => {
    const client  = data.clients.find(c => c.id === m.clientId);
    const project = data.projects.find(p => p.id === m.projectId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code style="font-size:12px">${escHtml(m.pattern)}</code></td>
      <td>${escHtml(client?.name || '—')}</td>
      <td>${escHtml(project?.name || '—')}</td>
      <td><button class="btn-danger" data-id="${m.id}">Remove</button></td>
    `;
    tr.querySelector('.btn-danger').addEventListener('click', () => removeMapping(m.id));
    tbody.appendChild(tr);
  });

  const count = data.mappings.length;
  document.getElementById('mapping-count').textContent = `(${count})`;

  const atLimit = count >= FREE_MAPPING_LIMIT;
  document.getElementById('free-limit-notice').style.display = atLimit ? '' : 'none';
  document.getElementById('add-mapping-row').style.display   = atLimit ? 'none' : '';

  refreshMappingClientSelect();
}

function removeMapping(id) {
  data.mappings = data.mappings.filter(m => m.id !== id);
  renderMappings();
}

// Populate mapping client dropdown and wire project refresh
function refreshMappingClientSelect() {
  const cs = document.getElementById('new-mapping-client');
  const ps = document.getElementById('new-mapping-project');
  cs.innerHTML = '<option value="">Client…</option>';
  data.clients.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    cs.appendChild(o);
  });
  cs.onchange = () => {
    ps.innerHTML = '<option value="">Project…</option>';
    data.projects.filter(p => p.clientId === cs.value).forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      ps.appendChild(o);
    });
  };
}

document.getElementById('add-mapping-btn').addEventListener('click', () => {
  const pattern   = document.getElementById('new-mapping-pattern').value.trim();
  const clientId  = document.getElementById('new-mapping-client').value;
  const projectId = document.getElementById('new-mapping-project').value;
  if (!pattern || !clientId) return;
  if (data.mappings.length >= FREE_MAPPING_LIMIT) return; // enforce in UI too
  data.mappings.push({ id: generateId(), pattern, clientId, projectId: projectId || null });
  document.getElementById('new-mapping-pattern').value = '';
  renderMappings();
});

// ─── Shared select refreshers ─────────────────────────────────────────────────

function refreshClientSelects() {
  const sel = document.getElementById('new-project-client');
  sel.innerHTML = '<option value="">Client…</option>';
  data.clients.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    sel.appendChild(o);
  });
}

function refreshProjectSelects() {
  // Project select in mapping row re-rendered by refreshMappingClientSelect
}

// ─── Save ─────────────────────────────────────────────────────────────────────

document.getElementById('save-btn').addEventListener('click', async () => {
  const settings = {
    syncTarget:            document.getElementById('sync-target').value,
    togglToken:            document.getElementById('toggl-token').value.trim(),
    togglWorkspaceId:      document.getElementById('toggl-workspace').value.trim(),
    clockifyApiKey:        document.getElementById('clockify-key').value.trim(),
    clockifyWorkspaceId:   document.getElementById('clockify-workspace').value.trim(),
    idleThresholdMinutes:  parseInt(document.getElementById('idle-threshold').value, 10) || 5,
    dailyReviewTime:       document.getElementById('daily-review-time').value,
  };

  await msg('SAVE_OPTIONS', {
    mappings: data.mappings,
    clients:  data.clients,
    projects: data.projects,
    settings,
  });

  const savedMsg = document.getElementById('saved-msg');
  savedMsg.style.display = 'inline';
  setTimeout(() => { savedMsg.style.display = 'none'; }, 2500);
});

// ─── Upgrade ──────────────────────────────────────────────────────────────────

document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://your-stripe-checkout-url.example.com/checkout' });
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
