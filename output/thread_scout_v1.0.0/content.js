/**
 * Thread Scout — Content Script
 * Detects DMC color codes on pattern pages and injects Owned/Need badges.
 */

(function () {
  'use strict';

  // Avoid double-injection if script runs twice
  if (window.__threadScoutRunning) return;
  window.__threadScoutRunning = true;

  const EXT_ID = chrome.runtime.id;

  // Regex: matches "DMC 310", "DMC #310", "DMC310", "dmc 3371", etc.
  // Also matches bare numbers that look like DMC codes (3+ digits or named "White"/"Ecru")
  const DMC_PATTERN = /\bDMC\s*#?\s*(\w+)\b/gi;
  const SPECIAL_CODES = new Set(['White', 'Ecru', 'B5200']);

  let dmcColors = null;
  let equivalents = null;
  let stash = new Set();

  // ── Load data ──────────────────────────────────────────────────────────────

  async function loadData() {
    const [colorsResp, equivResp] = await Promise.all([
      fetch(chrome.runtime.getURL('data/dmc-colors.json')),
      fetch(chrome.runtime.getURL('data/equivalents.json')),
    ]);
    const colorsData = await colorsResp.json();
    const equivData = await equivResp.json();
    dmcColors = colorsData.colors;
    equivalents = equivData.equivalents;
  }

  function loadStash() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['stash'], (result) => {
        stash = new Set(result.stash || []);
        resolve();
      });
    });
  }

  // Listen for stash updates from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STASH_UPDATED') {
      stash = new Set(msg.stash);
      refreshBadges();
    }
  });

  // ── Badge creation ─────────────────────────────────────────────────────────

  function buildTooltip(code) {
    const color = dmcColors[code];
    const equiv = equivalents[code] || {};

    const tooltip = document.createElement('span');
    tooltip.className = 'ts-tooltip';

    if (color) {
      const colorRow = document.createElement('div');
      colorRow.className = 'ts-tooltip-color-row';

      const swatch = document.createElement('span');
      swatch.className = 'ts-tooltip-swatch';
      swatch.style.background = color.hex;

      const nameEl = document.createElement('span');
      nameEl.className = 'ts-tooltip-name';
      nameEl.textContent = `DMC ${code} — ${color.name}`;

      colorRow.appendChild(swatch);
      colorRow.appendChild(nameEl);
      tooltip.appendChild(colorRow);
    } else {
      const nameEl = document.createElement('div');
      nameEl.className = 'ts-tooltip-name';
      nameEl.textContent = `DMC ${code}`;
      tooltip.appendChild(nameEl);
    }

    const hr = document.createElement('hr');
    hr.className = 'ts-tooltip-divider';
    tooltip.appendChild(hr);

    const anchorRow = document.createElement('div');
    anchorRow.className = 'ts-tooltip-equiv-row';
    const anchorLabel = document.createElement('span');
    anchorLabel.textContent = 'Anchor:';
    const anchorVal = document.createElement('span');
    anchorVal.textContent = equiv.anchor || '—';
    anchorRow.appendChild(anchorLabel);
    anchorRow.appendChild(anchorVal);
    tooltip.appendChild(anchorRow);

    const madeiraRow = document.createElement('div');
    madeiraRow.className = 'ts-tooltip-equiv-row';
    const madeiraLabel = document.createElement('span');
    madeiraLabel.textContent = 'Madeira:';
    const madeiraVal = document.createElement('span');
    madeiraVal.textContent = equiv.madeira || '—';
    madeiraRow.appendChild(madeiraLabel);
    madeiraRow.appendChild(madeiraVal);
    tooltip.appendChild(madeiraRow);

    return tooltip;
  }

  function createBadge(code) {
    const owned = stash.has(code);
    const badge = document.createElement('span');
    badge.className = `ts-badge ${owned ? 'ts-owned' : 'ts-need'}`;
    badge.dataset.tsCode = code;

    const dot = document.createElement('span');
    dot.className = 'ts-badge-dot';
    badge.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = owned ? 'Owned' : 'Need';
    badge.appendChild(label);

    badge.appendChild(buildTooltip(code));
    return badge;
  }

  // ── DOM scanning ───────────────────────────────────────────────────────────

  const processedNodes = new WeakSet();

  function scanNode(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip already-processed badge wrappers
          if (parent.dataset && parent.dataset.tsProcessed) {
            return NodeFilter.FILTER_REJECT;
          }
          if (DMC_PATTERN.test(node.nodeValue)) {
            DMC_PATTERN.lastIndex = 0;
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!processedNodes.has(node)) {
        nodes.push(node);
        processedNodes.add(node);
      }
    }

    for (const textNode of nodes) {
      injectBadges(textNode);
    }
  }

  function injectBadges(textNode) {
    const text = textNode.nodeValue;
    const parent = textNode.parentElement;
    if (!parent) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    DMC_PATTERN.lastIndex = 0;
    let match;

    while ((match = DMC_PATTERN.exec(text)) !== null) {
      const code = match[1];
      // Only badge codes that exist in our DB
      if (!dmcColors[code]) continue;

      // Text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      // The original match text
      const matchSpan = document.createElement('span');
      matchSpan.dataset.tsProcessed = '1';
      matchSpan.textContent = match[0];
      fragment.appendChild(matchSpan);

      // The badge
      fragment.appendChild(createBadge(code));
      lastIndex = DMC_PATTERN.lastIndex;
    }

    if (lastIndex === 0) return; // No matches

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(fragment, textNode);
  }

  // ── Badge refresh (stash updated) ─────────────────────────────────────────

  function refreshBadges() {
    document.querySelectorAll('.ts-badge[data-ts-code]').forEach((badge) => {
      const code = badge.dataset.tsCode;
      const owned = stash.has(code);
      badge.className = `ts-badge ${owned ? 'ts-owned' : 'ts-need'}`;
      const label = badge.querySelector('span:not(.ts-badge-dot):not(.ts-tooltip)');
      if (label) label.textContent = owned ? 'Owned' : 'Need';
    });
    injectEtsyBar();
  }

  // ── Etsy Quick-Add Bar ─────────────────────────────────────────────────────

  function injectEtsyBar() {
    const existing = document.getElementById('ts-etsy-bar');

    // Only on Etsy listing pages
    if (!location.hostname.includes('etsy.com')) {
      if (existing) existing.remove();
      return;
    }

    const needed = [...document.querySelectorAll('.ts-badge.ts-need[data-ts-code]')]
      .map((b) => b.dataset.tsCode)
      .filter((v, i, a) => a.indexOf(v) === i); // unique

    if (existing) existing.remove();
    if (needed.length === 0) return;

    const bar = document.createElement('div');
    bar.id = 'ts-etsy-bar';
    bar.className = 'ts-etsy-bar';

    const text = document.createElement('div');
    text.className = 'ts-etsy-bar-text';
    text.innerHTML = `<strong>${needed.length}</strong> thread${needed.length === 1 ? '' : 's'} needed from your stash list`;
    bar.appendChild(text);

    const btn = document.createElement('button');
    btn.className = 'ts-etsy-btn';
    btn.textContent = `Add ${needed.length} to Cart`;
    btn.title = 'Searches Etsy for each missing DMC thread number';
    btn.addEventListener('click', () => handleEtsyQuickAdd(needed));
    bar.appendChild(btn);

    // Insert after the listing title area, or at top of main content
    const insertTarget =
      document.querySelector('[data-buy-box-listing-id]') ||
      document.querySelector('main') ||
      document.querySelector('#content') ||
      document.body;

    insertTarget.insertAdjacentElement('afterbegin', bar);
  }

  function handleEtsyQuickAdd(codes) {
    // Open Etsy search for each missing DMC thread in a new tab
    // (Cart add requires authentication; search is the next best thing)
    codes.forEach((code, i) => {
      setTimeout(() => {
        const url = `https://www.etsy.com/search?q=DMC+${encodeURIComponent(code)}+embroidery+floss`;
        window.open(url, '_blank', 'noopener');
      }, i * 150); // stagger to avoid popup blocker
    });
  }

  // ── MutationObserver for dynamic pages ────────────────────────────────────

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanNode(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Entry point ────────────────────────────────────────────────────────────

  async function init() {
    try {
      await Promise.all([loadData(), loadStash()]);
      scanNode(document.body);
      injectEtsyBar();
      startObserver();
    } catch (err) {
      console.warn('[Thread Scout] init error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
