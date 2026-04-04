// GB Watch — Popup Script

const STATUS_META = {
  'Interest Check': { label: 'Interest Check', color: 'blue' },
  'GB Open':        { label: 'GB Open',        color: 'green' },
  'GB Closed':      { label: 'GB Closed',       color: 'amber' },
  'Shipping':       { label: 'Shipping',        color: 'purple' },
  'Delivered':      { label: 'Delivered',       color: 'grey' },
  'Unknown':        { label: 'Unknown',         color: 'light-grey' }
};

function getDomainFaviconUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=16`;
  } catch {
    return '';
  }
}

function formatLastChecked(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

function renderStatusBadge(status) {
  const meta = STATUS_META[status] || STATUS_META['Unknown'];
  return `<span class="badge badge-${meta.color}">${meta.label}</span>`;
}

function renderCard(item) {
  const favicon = getDomainFaviconUrl(item.url);
  const lastChecked = formatLastChecked(item.lastChecked);
  const badgeHtml = renderStatusBadge(item.lastStatus || 'Unknown');

  return `
    <div class="card" data-id="${item.id}" data-url="${item.url}">
      <div class="card-main" role="button" tabindex="0" title="Open in new tab">
        <img class="favicon" src="${favicon}" alt="" onerror="this.style.display='none'" />
        <div class="card-info">
          <div class="card-name">${escapeHtml(item.name)}</div>
          <div class="card-meta">${badgeHtml} <span class="last-checked">${lastChecked}</span></div>
        </div>
      </div>
      <button class="btn-remove icon-btn" data-id="${item.id}" title="Remove">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path><path d="M14 11v6"></path>
          <path d="M9 6V4h6v2"></path>
        </svg>
      </button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderList(watchList) {
  const container = document.getElementById('watch-list');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');

  itemCount.textContent = `${watchList.length} item${watchList.length !== 1 ? 's' : ''} watched`;

  if (!watchList.length) {
    container.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  container.innerHTML = watchList.map(renderCard).join('');

  // Attach click handlers
  container.querySelectorAll('.card-main').forEach((el) => {
    el.addEventListener('click', () => {
      const url = el.closest('.card').dataset.url;
      chrome.tabs.create({ url });
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const url = el.closest('.card').dataset.url;
        chrome.tabs.create({ url });
      }
    });
  });

  container.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(btn.dataset.id);
    });
  });
}

function showAddError(msg) {
  const el = document.getElementById('add-error');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}

function setAddLoading(loading) {
  const btn = document.getElementById('btn-add');
  const input = document.getElementById('input-url');
  btn.disabled = loading;
  input.disabled = loading;
  btn.textContent = loading ? '…' : 'Watch';
}

async function addItem() {
  const input = document.getElementById('input-url');
  const url = input.value.trim();
  if (!url) return;

  setAddLoading(true);
  document.getElementById('add-error').hidden = true;

  chrome.runtime.sendMessage({ type: 'ADD_ITEM', url }, (response) => {
    setAddLoading(false);
    if (chrome.runtime.lastError) {
      showAddError('Extension error. Try reloading.');
      return;
    }
    if (!response.ok) {
      showAddError(response.error);
      return;
    }
    input.value = '';
    loadAndRender();
  });
}

function removeItem(id) {
  chrome.runtime.sendMessage({ type: 'REMOVE_ITEM', id }, () => {
    loadAndRender();
  });
}

function loadAndRender() {
  chrome.runtime.sendMessage({ type: 'GET_WATCH_LIST' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    renderList(response.watchList || []);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadAndRender();

  document.getElementById('btn-add').addEventListener('click', addItem);

  document.getElementById('input-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
  });

  document.getElementById('btn-refresh').addEventListener('click', () => {
    const btn = document.getElementById('btn-refresh');
    btn.disabled = true;
    chrome.runtime.sendMessage({ type: 'POLL_NOW' }, () => {
      btn.disabled = false;
      loadAndRender();
    });
  });
});
