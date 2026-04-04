// Proposal Template Manager — Panel UI Script
// Runs inside the injected panel iframe.

(function () {
  'use strict';

  const FREE_TEMPLATE_LIMIT = 5;

  let templates = [];
  let proposals = [];
  let settings = { reminderEnabled: true, reminderHours: 48, isPro: true };
  let currentVars = {};
  let selectedTemplateId = null;
  let hasCopied = false;

  // ── Storage helpers ──────────────────────────────────────────────────────────

  function loadData(cb) {
    chrome.storage.local.get(['ptm_templates', 'ptm_proposals', 'ptm_settings'], (result) => {
      templates = result.ptm_templates || [];
      proposals = result.ptm_proposals || [];
      settings = Object.assign({ reminderEnabled: true, reminderHours: 48, isPro: true }, result.ptm_settings || {});
      cb && cb();
    });
  }

  function saveTemplates(cb) {
    chrome.storage.local.set({ ptm_templates: templates }, cb);
  }

  function saveProposals(cb) {
    chrome.storage.local.set({ ptm_proposals: proposals }, cb);
  }

  // ── Variable substitution ────────────────────────────────────────────────────

  function substituteVars(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const val = vars[key];
      return (val && val.trim()) ? val.trim() : match;
    });
  }

  function highlightUnfilled(text) {
    // Returns HTML with unfilled variables highlighted
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\{\{(\w+)\}\}/g, '<mark style="background:#ffe0b2;padding:1px 3px;border-radius:3px">{{$1}}</mark>');
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  document.querySelectorAll('.ptm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ptm-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ptm-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('ptm-tab-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'proposals') renderProposals();
    });
  });

  // ── Variables strip ──────────────────────────────────────────────────────────

  function updateVarsStrip(vars) {
    currentVars = vars;
    const keys = ['job_title', 'client_name', 'budget', 'key_skill', 'deadline'];
    keys.forEach(key => {
      const el = document.getElementById('var-' + key);
      if (!el) return;
      const val = vars[key];
      if (val && val.trim()) {
        el.textContent = val.length > 30 ? val.substring(0, 28) + '…' : val;
        el.classList.remove('ptm-missing');
      } else {
        el.textContent = 'not found';
        el.classList.add('ptm-missing');
      }
    });

    const badge = document.getElementById('ptm-platform');
    if (badge && vars.platform) badge.textContent = vars.platform.charAt(0).toUpperCase() + vars.platform.slice(1);
  }

  // ── Template selector ────────────────────────────────────────────────────────

  function populateTemplateSelect() {
    const sel = document.getElementById('ptm-template-select');
    sel.innerHTML = '<option value="">— Select a template —</option>';
    templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });
    if (templates.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = 'No templates yet — create one in Options';
      sel.appendChild(opt);
    }
  }

  document.getElementById('ptm-template-select').addEventListener('change', (e) => {
    selectedTemplateId = e.target.value || null;
    if (!selectedTemplateId) return;
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    if (!tmpl) return;
    const composed = substituteVars(tmpl.body, currentVars);
    document.getElementById('ptm-composer').value = composed;
    hasCopied = false;
    document.getElementById('ptm-log-bar').style.display = 'none';
    document.getElementById('ptm-copy-feedback').style.display = 'none';
  });

  // ── Copy to clipboard ────────────────────────────────────────────────────────

  document.getElementById('ptm-copy-btn').addEventListener('click', () => {
    const text = document.getElementById('ptm-composer').value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      hasCopied = true;
      document.getElementById('ptm-copy-feedback').style.display = 'block';
      document.getElementById('ptm-log-bar').style.display = 'flex';
      setTimeout(() => {
        document.getElementById('ptm-copy-feedback').style.display = 'none';
      }, 2500);
    });
  });

  // ── Log as Sent ──────────────────────────────────────────────────────────────

  document.getElementById('ptm-log-btn').addEventListener('click', () => {
    if (!selectedTemplateId) return;
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    const proposal = {
      id: 'pr-' + Date.now(),
      templateId: selectedTemplateId,
      templateName: tmpl ? tmpl.name : 'Unknown',
      jobTitle: currentVars.job_title || document.title || 'Untitled Job',
      jobUrl: currentVars.job_url || window.location.href,
      platform: currentVars.platform || 'unknown',
      sentAt: new Date().toISOString(),
      outcome: 'pending',
      updatedAt: new Date().toISOString(),
    };
    proposals.unshift(proposal);
    saveProposals();

    // Schedule reminder alarm
    if (settings.reminderEnabled) {
      chrome.runtime.sendMessage({
        type: 'SCHEDULE_REMINDER',
        proposalId: proposal.id,
        jobTitle: proposal.jobTitle,
        delayHours: settings.reminderHours || 48,
      });
    }

    document.getElementById('ptm-log-bar').style.display = 'none';
    // Switch to proposals tab
    document.querySelectorAll('.ptm-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ptm-section').forEach(s => s.classList.remove('active'));
    document.querySelector('[data-tab="proposals"]').classList.add('active');
    document.getElementById('ptm-tab-proposals').classList.add('active');
    renderProposals();
  });

  // ── Proposals list ───────────────────────────────────────────────────────────

  const OUTCOMES = [
    { value: 'pending',    label: 'Pending' },
    { value: 'viewed',     label: 'Viewed' },
    { value: 'responded',  label: 'Responded' },
    { value: 'interview',  label: 'Interview' },
    { value: 'hired',      label: 'Hired' },
    { value: 'rejected',   label: 'Rejected' },
  ];

  function renderProposals() {
    const container = document.getElementById('ptm-proposals-list');
    if (proposals.length === 0) {
      container.innerHTML = '<div class="ptm-empty"><p>No proposals logged yet.</p><p>Submit a proposal and click "Log as Sent" to track outcomes.</p></div>';
      return;
    }
    container.innerHTML = '';
    proposals.slice(0, 30).forEach(p => {
      const div = document.createElement('div');
      div.className = 'ptm-proposal-item';
      const sentDate = new Date(p.sentAt).toLocaleDateString();
      div.innerHTML = `
        <h4>${escHtml(p.jobTitle)}</h4>
        <div class="ptm-meta">
          Sent ${sentDate} &bull; ${escHtml(p.platform || '')} &bull; Template: ${escHtml(p.templateName || '')}
        </div>
        <select class="ptm-outcome-select" data-proposal-id="${p.id}">
          ${OUTCOMES.map(o => `<option value="${o.value}"${p.outcome === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll('.ptm-outcome-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.proposalId;
        const proposal = proposals.find(p => p.id === id);
        if (proposal) {
          proposal.outcome = e.target.value;
          proposal.updatedAt = new Date().toISOString();
          saveProposals();
        }
      });
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Request variables from parent page ──────────────────────────────────────

  function requestVariables() {
    chrome.runtime.sendMessage({ type: 'GET_VARIABLES' }, (vars) => {
      if (vars) updateVarsStrip(vars);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  loadData(() => {
    populateTemplateSelect();
    requestVariables();
    // Retry variable extraction after SPA may have rendered
    setTimeout(requestVariables, 1500);
    setTimeout(requestVariables, 3500);
  });

  // Listen for variable updates broadcast from parent
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PTM_VARIABLES') {
      updateVarsStrip(e.data.vars);
    }
  });

  // Reload on storage change (e.g. user edits templates in options)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.ptm_templates) {
      templates = changes.ptm_templates.newValue || [];
      populateTemplateSelect();
    }
    if (changes.ptm_proposals) {
      proposals = changes.ptm_proposals.newValue || [];
    }
    if (changes.ptm_settings) {
      settings = Object.assign(settings, changes.ptm_settings.newValue || {});
    }
  });

})();
