// Proposal Template Manager — Fiverr Variable Extractor
// Extracts job/request variables from Fiverr request pages.

(function () {
  'use strict';

  const SELECTORS = {
    client_name: [
      '.username',
      '[data-testid="buyer-username"]',
      '.buyer-name',
      '.request-owner-name',
    ],
    job_title: [
      '.request-title',
      'h1.title',
      '[data-testid="request-title"]',
      'h1',
    ],
    budget: [
      '.request-budget',
      '[data-testid="budget"]',
      '.price-tag',
      '.budget-amount',
    ],
    key_skill: [
      '.tag-item',
      '.skill-tag',
      '[data-testid="tag"]',
      '.category-tag',
    ],
    deadline: [
      '.request-deadline',
      '[data-testid="delivery-time"]',
      '.delivery-time',
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
      platform: 'fiverr',
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

  broadcastVariables();

  const observer = new MutationObserver(() => {
    broadcastVariables();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_VARIABLES') {
      sendResponse(extractVariables());
    }
    return true;
  });
})();
