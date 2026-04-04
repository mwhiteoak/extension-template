// Proposal Template Manager — Upwork Variable Extractor
// Extracts job listing variables from Upwork job pages.
// Uses MutationObserver to handle SPA navigation.

(function () {
  'use strict';

  // Selector strategies — Upwork DOM drifts; try multiple patterns per variable.
  const SELECTORS = {
    client_name: [
      '[data-test="client-name"]',
      '.client-name',
      '.company-name',
      '[data-qa="client-name"]',
      '.air3-truncation',
    ],
    job_title: [
      'h1[data-test="job-title"]',
      'h1.job-title',
      '[data-test="job-title"]',
      'h1',
    ],
    budget: [
      '[data-test="budget"]',
      '.budget-amount',
      '[data-qa="budget"]',
      '[data-test="price-type"]',
      '.air3-badge',
    ],
    key_skill: [
      '[data-test="skill-tag"]',
      '.skill-badge',
      '[data-qa="skill"]',
      '.air3-badge--skill',
    ],
    deadline: [
      '[data-test="duration"]',
      '.project-duration',
      '[data-qa="duration"]',
      '[data-test="contract-date-end"]',
    ],
  };

  function trySelectors(selectors, multi = false) {
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        if (multi) return Array.from(els).map(e => e.textContent.trim()).filter(Boolean);
        return els[0].textContent.trim() || null;
      }
    }
    return multi ? [] : null;
  }

  function extractVariables() {
    const skills = trySelectors(SELECTORS.key_skill, true);
    return {
      platform: 'upwork',
      job_title: trySelectors(SELECTORS.job_title) || '',
      client_name: trySelectors(SELECTORS.client_name) || '',
      budget: trySelectors(SELECTORS.budget) || '',
      key_skill: skills.length > 0 ? skills[0] : '',
      skills_list: skills,
      deadline: trySelectors(SELECTORS.deadline) || '',
      job_url: window.location.href,
    };
  }

  function broadcastVariables() {
    const vars = extractVariables();
    window.__ptm_variables = vars;
    document.dispatchEvent(new CustomEvent('ptm:variables', { detail: vars }));
  }

  // Run once on load
  broadcastVariables();

  // Re-run when Upwork SPA updates the DOM
  const observer = new MutationObserver(() => {
    broadcastVariables();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Respond to panel requests for variables
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_VARIABLES') {
      sendResponse(extractVariables());
    }
    return true;
  });
})();
