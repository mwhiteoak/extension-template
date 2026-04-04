// Proposal Template Manager — Panel Injector
// Injects the sidebar panel iframe and toggle button into Upwork/Fiverr pages.

(function () {
  'use strict';

  // Avoid double-injection
  if (document.getElementById('ptm-panel-container')) return;

  const panelUrl = chrome.runtime.getURL('content/panel.html');

  // ── Toggle button ────────────────────────────────────────────────────────────
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'ptm-toggle-btn';
  toggleBtn.title = 'Proposal Template Manager';
  toggleBtn.textContent = 'PTM';
  document.body.appendChild(toggleBtn);

  // ── Panel container (iframe) ─────────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = 'ptm-panel-container';
  container.className = 'ptm-hidden';

  const iframe = document.createElement('iframe');
  iframe.id = 'ptm-panel-iframe';
  iframe.src = panelUrl;
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  iframe.allow = 'clipboard-write';
  container.appendChild(iframe);
  document.body.appendChild(container);

  // ── Toggle visibility ────────────────────────────────────────────────────────
  let panelOpen = false;

  toggleBtn.addEventListener('click', () => {
    panelOpen = !panelOpen;
    container.classList.toggle('ptm-hidden', !panelOpen);
    toggleBtn.style.right = panelOpen ? '385px' : '0';

    // On first open or every open, push current variables into the iframe
    if (panelOpen) {
      pushVariablesToPanel();
    }
  });

  // ── Push variables to panel iframe ──────────────────────────────────────────

  function pushVariablesToPanel() {
    const vars = window.__ptm_variables;
    if (!vars) return;
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'PTM_VARIABLES', vars }, '*');
    }
  }

  // Re-push whenever variables are updated by extractor
  document.addEventListener('ptm:variables', (e) => {
    window.__ptm_variables = e.detail;
    if (panelOpen) pushVariablesToPanel();
  });

  // Re-push when iframe loads
  iframe.addEventListener('load', () => {
    setTimeout(pushVariablesToPanel, 300);
  });

})();
