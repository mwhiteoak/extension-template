// Espresso Community Intelligence — Panel Injector Content Script
// Injects the floating community intelligence panel on espresso product pages.

(function () {
  'use strict';

  if (document.getElementById('eci-panel-container')) return;

  let panelOpen = false;
  let currentProduct = null;

  // ── Toggle button ────────────────────────────────────────────────────────────
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'eci-toggle-btn';
  toggleBtn.title = 'r/espresso Community Intel';
  toggleBtn.innerHTML = '&#9749;'; // ☕
  toggleBtn.style.display = 'none'; // hidden until product detected
  document.body.appendChild(toggleBtn);

  // ── Panel container ──────────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = 'eci-panel-container';
  container.className = 'eci-hidden';
  document.body.appendChild(container);

  // Inline panel HTML (no iframe needed — simpler for a read-only panel)
  container.innerHTML = `
    <div class="eci-header">
      <div class="eci-header-title">
        <span class="eci-coffee-icon">&#9749;</span>
        <span>r/espresso Community Intel</span>
      </div>
      <button class="eci-close-btn" id="eci-close-btn" title="Close">&times;</button>
    </div>
    <div class="eci-body" id="eci-body">
      <div class="eci-loading" id="eci-loading">
        <div class="eci-spinner"></div>
        <p>Loading community data…</p>
      </div>
      <div id="eci-content" style="display:none">
        <div class="eci-product-name" id="eci-product-name"></div>

        <!-- Tier badge -->
        <div class="eci-section" id="eci-tier-section">
          <div class="eci-section-label">Community Tier</div>
          <div class="eci-tier-badge" id="eci-tier-badge"></div>
        </div>

        <!-- Sentiment / Reddit threads -->
        <div class="eci-section" id="eci-reddit-section">
          <div class="eci-section-label">Top Community Threads</div>
          <div id="eci-reddit-list"></div>
        </div>

        <!-- Upgrade path -->
        <div class="eci-section eci-upgrade-section" id="eci-upgrade-section" style="display:none">
          <div class="eci-section-label">Upgrade Path</div>
          <div class="eci-upgrade-text" id="eci-upgrade-text"></div>
        </div>

        <!-- Pro upgrade banner -->
        <div class="eci-pro-banner" id="eci-pro-banner" style="display:none">
          <div class="eci-pro-title">Upgrade to Pro — $6/mo</div>
          <div class="eci-pro-desc">Saved comparisons, price alerts, and personalized upgrade recommendations.</div>
          <button class="eci-pro-btn" id="eci-pro-btn">Upgrade to Pro</button>
        </div>

        <!-- No data state -->
        <div class="eci-no-data" id="eci-no-data" style="display:none">
          <p>No community data found for this product.</p>
          <p class="eci-no-data-sub">Try searching <a href="https://www.reddit.com/r/espresso/search/?q=" id="eci-reddit-search-link" target="_blank">r/espresso</a> directly.</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('eci-close-btn').addEventListener('click', closePanel);
  document.getElementById('eci-pro-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  });

  toggleBtn.addEventListener('click', () => {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  function openPanel() {
    panelOpen = true;
    container.classList.remove('eci-hidden');
    toggleBtn.classList.add('eci-btn-active');
    if (currentProduct) loadData(currentProduct.productName);
  }

  function closePanel() {
    panelOpen = false;
    container.classList.add('eci-hidden');
    toggleBtn.classList.remove('eci-btn-active');
  }

  function showLoading() {
    document.getElementById('eci-loading').style.display = '';
    document.getElementById('eci-content').style.display = 'none';
  }

  function showContent() {
    document.getElementById('eci-loading').style.display = 'none';
    document.getElementById('eci-content').style.display = '';
  }

  function loadData(productName) {
    showLoading();
    chrome.runtime.sendMessage({ type: 'GET_ESPRESSO_DATA', productName }, (resp) => {
      if (!resp) { showNoData(productName); return; }
      renderData(productName, resp);
    });
  }

  function renderData(productName, { tierInfo, upgradePath, redditData }) {
    document.getElementById('eci-product-name').textContent = productName;

    // Tier badge
    const tierBadge = document.getElementById('eci-tier-badge');
    if (tierInfo) {
      tierBadge.textContent = tierInfo.tier;
      tierBadge.style.background = tierInfo.color;
      document.getElementById('eci-tier-section').style.display = '';
    } else {
      document.getElementById('eci-tier-section').style.display = 'none';
    }

    // Reddit threads
    const redditList = document.getElementById('eci-reddit-list');
    redditList.innerHTML = '';
    const posts = redditData?.posts || [];
    if (posts.length > 0) {
      posts.slice(0, 3).forEach(post => {
        const item = document.createElement('a');
        item.className = 'eci-reddit-item';
        item.href = post.url;
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.innerHTML = `
          <div class="eci-reddit-title">${escapeHtml(post.title)}</div>
          <div class="eci-reddit-meta">${post.score} upvotes &bull; ${post.numComments} comments</div>
        `;
        redditList.appendChild(item);
      });
      document.getElementById('eci-reddit-section').style.display = '';
    } else {
      document.getElementById('eci-reddit-section').style.display = 'none';
    }

    // Update search link
    const searchLink = document.getElementById('eci-reddit-search-link');
    if (searchLink) searchLink.href = `https://www.reddit.com/r/espresso/search/?q=${encodeURIComponent(productName)}`;

    // Upgrade path
    if (upgradePath) {
      document.getElementById('eci-upgrade-text').textContent = upgradePath;
      document.getElementById('eci-upgrade-section').style.display = '';
    } else {
      document.getElementById('eci-upgrade-section').style.display = 'none';
    }

    // Show/hide no-data fallback
    const hasAnyData = tierInfo || posts.length > 0;
    document.getElementById('eci-no-data').style.display = hasAnyData ? 'none' : '';

    // Pro banner (show if not pro and has tier data)
    chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, opts => {
      document.getElementById('eci-pro-banner').style.display = (!opts?.isPro && tierInfo) ? '' : 'none';
    });

    showContent();
  }

  function showNoData(productName) {
    document.getElementById('eci-product-name').textContent = productName;
    document.getElementById('eci-tier-section').style.display = 'none';
    document.getElementById('eci-reddit-section').style.display = 'none';
    document.getElementById('eci-upgrade-section').style.display = 'none';
    document.getElementById('eci-pro-banner').style.display = 'none';
    document.getElementById('eci-no-data').style.display = '';
    const searchLink = document.getElementById('eci-reddit-search-link');
    if (searchLink) searchLink.href = `https://www.reddit.com/r/espresso/search/?q=${encodeURIComponent(productName)}`;
    showContent();
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── React to product detection ───────────────────────────────────────────────
  function onProductDetected(productData) {
    currentProduct = productData;
    toggleBtn.style.display = '';
    if (panelOpen) loadData(productData.productName);
  }

  function onProductCleared() {
    currentProduct = null;
    toggleBtn.style.display = 'none';
    closePanel();
  }

  window.addEventListener('eci:product-detected', (e) => onProductDetected(e.detail));
  window.addEventListener('eci:product-cleared', onProductCleared);

  // If product was already detected before this script ran
  if (window.__eci_product) onProductDetected(window.__eci_product);
})();
