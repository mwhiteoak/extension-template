// Lightroom Web Keyboard Enhancer — Content Script
// Intercepts keydown events on lightroom.adobe.com and dispatches
// synthetic clicks on the Lightroom Web UI elements.

(function () {
  'use strict';

  // ─── Default key map ────────────────────────────────────────────────────────
  // Keys are lowercase. Values are action identifiers.
  const DEFAULT_KEY_MAP = {
    p: 'pick',
    x: 'reject',
    u: 'unflag',
    '1': 'star1',
    '2': 'star2',
    '3': 'star3',
    '4': 'star4',
    '5': 'star5',
    arrowleft: 'prev',
    arrowright: 'next',
  };

  const DEFAULT_CONFIG = {
    enabled: true,
    autoAdvance: true,
    shortcuts: {
      pick:    { key: 'p', enabled: true },
      reject:  { key: 'x', enabled: true },
      unflag:  { key: 'u', enabled: true },
      star1:   { key: '1', enabled: true },
      star2:   { key: '2', enabled: true },
      star3:   { key: '3', enabled: true },
      star4:   { key: '4', enabled: true },
      star5:   { key: '5', enabled: true },
      prev:    { key: 'arrowleft',  enabled: true },
      next:    { key: 'arrowright', enabled: true },
    },
  };

  let config = DEFAULT_CONFIG;

  // ─── Selector strategies ────────────────────────────────────────────────────
  // Lightroom Web uses a React-based UI. We try multiple selector patterns
  // because Adobe may change class names between releases. Aria-labels are
  // the most stable hook.

  const SELECTORS = {
    // Flag buttons (photo detail toolbar)
    pick: [
      '[aria-label="Pick"]',
      '[aria-label="Pick flag"]',
      '[data-testid="pick-flag"]',
      'button[title="Pick"]',
    ],
    reject: [
      '[aria-label="Reject"]',
      '[aria-label="Reject flag"]',
      '[data-testid="reject-flag"]',
      'button[title="Reject"]',
    ],
    unflag: [
      '[aria-label="Unflag"]',
      '[aria-label="Remove flag"]',
      '[data-testid="unflag"]',
      'button[title="Unflag"]',
    ],
    // Star rating buttons
    star1: [
      '[aria-label="1 star"]',
      '[aria-label="Set rating to 1"]',
      '[aria-label="1 Star"]',
      '[data-testid="star-rating-1"]',
      'button[title="1 star"]',
    ],
    star2: [
      '[aria-label="2 stars"]',
      '[aria-label="Set rating to 2"]',
      '[aria-label="2 Stars"]',
      '[data-testid="star-rating-2"]',
      'button[title="2 stars"]',
    ],
    star3: [
      '[aria-label="3 stars"]',
      '[aria-label="Set rating to 3"]',
      '[aria-label="3 Stars"]',
      '[data-testid="star-rating-3"]',
      'button[title="3 stars"]',
    ],
    star4: [
      '[aria-label="4 stars"]',
      '[aria-label="Set rating to 4"]',
      '[aria-label="4 Stars"]',
      '[data-testid="star-rating-4"]',
      'button[title="4 stars"]',
    ],
    star5: [
      '[aria-label="5 stars"]',
      '[aria-label="Set rating to 5"]',
      '[aria-label="5 Stars"]',
      '[data-testid="star-rating-5"]',
      'button[title="5 stars"]',
    ],
    // Navigation buttons
    prev: [
      '[aria-label="Previous"]',
      '[aria-label="Previous photo"]',
      '[aria-label="Go to previous photo"]',
      '[data-testid="prev-photo"]',
      'button[title="Previous"]',
    ],
    next: [
      '[aria-label="Next"]',
      '[aria-label="Next photo"]',
      '[aria-label="Go to next photo"]',
      '[data-testid="next-photo"]',
      'button[title="Next"]',
    ],
  };

  // ─── Find element ───────────────────────────────────────────────────────────

  function findElement(action) {
    const candidates = SELECTORS[action];
    if (!candidates) return null;
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ─── Perform action ─────────────────────────────────────────────────────────

  function performAction(action) {
    const el = findElement(action);
    if (!el) return false;

    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click',     { bubbles: true, cancelable: true }));
    return true;
  }

  // Auto-advance: navigate to next photo after applying a flag or rating.
  function maybeAutoAdvance(action) {
    if (!config.autoAdvance) return;
    const isRatingOrFlag = ['pick', 'reject', 'unflag', 'star1', 'star2', 'star3', 'star4', 'star5'].includes(action);
    if (!isRatingOrFlag) return;
    // Small delay so Lightroom can process the rating before we navigate
    setTimeout(() => performAction('next'), 120);
  }

  // ─── Build runtime key→action map ──────────────────────────────────────────

  function buildKeyMap() {
    const map = {};
    for (const [action, cfg] of Object.entries(config.shortcuts)) {
      if (cfg.enabled && cfg.key) {
        map[cfg.key.toLowerCase()] = action;
      }
    }
    return map;
  }

  // ─── keydown handler ────────────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!config.enabled) return;

    // Skip if focus is in a text field (user is typing)
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    // Skip if modifier keys are held (browser shortcuts, etc.)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.toLowerCase();
    const keyMap = buildKeyMap();
    const action = keyMap[key];
    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    const handled = performAction(action);
    if (handled) {
      maybeAutoAdvance(action);
    }
  }

  // Capture phase so we intercept before Lightroom's own handlers
  document.addEventListener('keydown', onKeyDown, true);

  // ─── Load config ────────────────────────────────────────────────────────────

  function loadConfig() {
    chrome.storage.sync.get('lrkb_config', (result) => {
      if (result.lrkb_config) {
        config = result.lrkb_config;
      }
    });
  }

  loadConfig();

  // Re-load config when it changes (e.g. user saves options page)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.lrkb_config) {
      config = changes.lrkb_config.newValue;
    }
  });

  // ─── Message bridge ─────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_STATUS') {
      sendResponse({ enabled: config.enabled, config });
    } else if (message.type === 'SET_ENABLED') {
      config.enabled = message.enabled;
      sendResponse({ ok: true });
    }
    return true;
  });

})();
