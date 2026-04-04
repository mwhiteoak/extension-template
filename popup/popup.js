// Proposal Template Manager — Popup JS

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const OUTCOME_CLASSES = {
  hired: 'outcome-hired',
  responded: 'outcome-responded',
  interview: 'outcome-interview',
  pending: 'outcome-pending',
  viewed: 'outcome-viewed',
  rejected: 'outcome-rejected',
};

const OUTCOME_LABELS = {
  hired: 'Hired',
  responded: 'Responded',
  interview: 'Interview',
  pending: 'Pending',
  viewed: 'Viewed',
  rejected: 'Rejected',
};

async function render() {
  const result = await new Promise(resolve =>
    chrome.storage.local.get(['ptm_templates', 'ptm_proposals', 'ptm_settings'], resolve)
  );

  const templates = result.ptm_templates || [];
  const proposals = result.ptm_proposals || [];
  const settings = result.ptm_settings || {};
  const isPro = settings.isPro || false;

  // Stats
  document.getElementById('stat-templates').textContent = templates.length;
  document.getElementById('stat-sent').textContent = proposals.length;
  document.getElementById('stat-hired').textContent = proposals.filter(p => p.outcome === 'hired').length;

  // Recent proposals (last 5)
  const recentList = document.getElementById('recent-list');
  if (proposals.length === 0) {
    recentList.innerHTML = '<div class="empty-msg">No proposals logged yet.</div>';
  } else {
    recentList.innerHTML = '';
    proposals.slice(0, 5).forEach(p => {
      const div = document.createElement('div');
      div.className = 'proposal-row';
      const cls = OUTCOME_CLASSES[p.outcome] || 'outcome-pending';
      const label = OUTCOME_LABELS[p.outcome] || 'Pending';
      div.innerHTML = `
        <span class="proposal-title" title="${escHtml(p.jobTitle || '')}">${escHtml(p.jobTitle || 'Untitled')}</span>
        <span class="outcome-chip ${cls}">${label}</span>
      `;
      recentList.appendChild(div);
    });
  }

  // Upgrade banner for free users
  if (!isPro) {
    document.getElementById('upgrade-banner').style.display = 'flex';
  }
}

document.getElementById('upgrade-btn') && document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
});

document.addEventListener('DOMContentLoaded', render);
