// Triathlon Race Day Pacing Planner — Overlay Injector Content Script
// Creates the floating toggle button and iframe panel.

(function () {
  if (document.getElementById('tri-overlay-container')) return; // Already injected

  const PANEL_WIDTH = 400;

  // ── Toggle button ─────────────────────────────────────────────────────────

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'tri-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Open Triathlon Pacing Planner');
  toggleBtn.innerHTML = '<span>TRI</span><span>PLAN</span>';
  document.body.appendChild(toggleBtn);

  // ── Overlay container (iframe) ────────────────────────────────────────────

  const container = document.createElement('div');
  container.id = 'tri-overlay-container';
  container.setAttribute('aria-hidden', 'true');

  const iframe = document.createElement('iframe');
  iframe.id = 'tri-overlay-iframe';
  iframe.src = chrome.runtime.getURL('content/overlay.html');
  iframe.title = 'Triathlon Pacing Planner';
  iframe.setAttribute('allowtransparency', 'false');

  container.appendChild(iframe);
  document.body.appendChild(container);

  // ── Toggle visibility ─────────────────────────────────────────────────────

  let isOpen = false;

  function openPanel() {
    isOpen = true;
    container.classList.add('tri-open');
    container.setAttribute('aria-hidden', 'false');
    toggleBtn.classList.add('tri-active');
    sendRaceData();
  }

  function closePanel() {
    isOpen = false;
    container.classList.remove('tri-open');
    container.setAttribute('aria-hidden', 'true');
    toggleBtn.classList.remove('tri-active');
  }

  toggleBtn.addEventListener('click', () => {
    if (isOpen) closePanel(); else openPanel();
  });

  // ── Race data relay ───────────────────────────────────────────────────────

  function sendRaceData() {
    const raceData = window.__tri_race || null;
    iframe.contentWindow.postMessage({ type: 'TRI_RACE_DATA', raceData }, '*');
  }

  // Listen for updates from race-detector.js
  window.addEventListener('tri:race-detected', (e) => {
    if (isOpen) {
      iframe.contentWindow.postMessage({ type: 'TRI_RACE_DATA', raceData: e.detail }, '*');
    }
  });

  // ── Messages from iframe ──────────────────────────────────────────────────

  window.addEventListener('message', (e) => {
    if (e.source !== iframe.contentWindow) return;
    if (e.data?.type === 'TRI_CLOSE') closePanel();
  });

})();
