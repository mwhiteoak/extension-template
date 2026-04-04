// BrickLink Price History & Set Completion Tracker — Content Script
// Detects page type, injects price sparklines, wanted list coverage bars,
// seller stats badges, and part color availability indicators.

(function () {
  'use strict';

  // ── Page Type Detection ───────────────────────────────────────────────────

  const PATH = location.pathname.toLowerCase();
  const SEARCH = location.search.toLowerCase();

  function isCatalogItemPage() {
    return (PATH.includes('catalogitem.page') || PATH.includes('/v2/catalog/catalogitem')) &&
      (SEARCH.includes('?p=') || SEARCH.includes('&p=') ||
       SEARCH.includes('?s=') || SEARCH.includes('&s=') ||
       SEARCH.includes('?m=') || SEARCH.includes('&m='));
  }

  function isStorePage() {
    return PATH.includes('store.asp') || PATH.includes('/store/') ||
      PATH.includes('v2/store') || SEARCH.includes('store');
  }

  // Extract item type + number from URL params
  function getItemInfo() {
    const params = new URLSearchParams(location.search);
    if (params.get('P') || params.get('p')) {
      return { type: 'PART', no: params.get('P') || params.get('p') };
    }
    if (params.get('S') || params.get('s')) {
      return { type: 'SET', no: params.get('S') || params.get('s') };
    }
    if (params.get('M') || params.get('m')) {
      return { type: 'MINIFIG', no: params.get('M') || params.get('m') };
    }
    return null;
  }

  function getStoreName() {
    const params = new URLSearchParams(location.search);
    return params.get('p') || params.get('username') ||
      document.querySelector('.store-header-username, .storeHeaderName, h1.store-name')?.textContent?.trim() || null;
  }

  // ── Sparkline Injection (catalog item pages) ──────────────────────────────

  const SPARKLINE_MARKER = 'data-blph-sparkline';

  function injectSparkline() {
    if (document.querySelector(`[${SPARKLINE_MARKER}]`)) return;

    const item = getItemInfo();
    if (!item) return;

    // Find a good anchor point in the BrickLink catalog page
    const anchors = [
      document.querySelector('#item-name-title'),
      document.querySelector('.catalog-item-main'),
      document.querySelector('#_idCatalogItem'),
      document.querySelector('td.catalog-item-module'),
      document.querySelector('#_idTabContainer'),
      document.querySelector('table.catalog-item-list'),
      // Fallback to first h1
      document.querySelector('h1'),
    ];
    const anchor = anchors.find(el => el !== null);
    if (!anchor) return;

    const container = document.createElement('div');
    container.className = 'blph-sparkline-container';
    container.setAttribute(SPARKLINE_MARKER, '1');
    container.innerHTML = `
      <div class="blph-panel">
        <div class="blph-panel-header">
          <span class="blph-panel-icon">&#128200;</span>
          <span class="blph-panel-title">Price History</span>
          <div class="blph-tab-group" id="blphTabGroup">
            <button class="blph-tab active" data-days="30">30d</button>
            <button class="blph-tab" data-days="90">90d</button>
            <button class="blph-tab" data-days="180">180d</button>
          </div>
        </div>
        <div class="blph-sparkline-wrap" id="blphSparklineWrap">
          <div class="blph-loading">Loading price history…</div>
        </div>
        <div class="blph-stats-row" id="blphStatsRow"></div>
        <div class="blph-color-section" id="blphColorSection" style="display:none">
          <div class="blph-color-title">Cheapest colors available</div>
          <div class="blph-color-list" id="blphColorList"></div>
        </div>
        <div class="blph-pro-row" id="blphProRow" style="display:none">
          <span>Pro: Set price alert for this ${item.type === 'SET' ? 'set' : 'part'}</span>
          <button class="blph-pro-btn" id="blphAlertBtn">Set Alert</button>
        </div>
        <div class="blph-alert-form" id="blphAlertForm" style="display:none">
          <input type="number" class="blph-alert-input" id="blphAlertPrice" placeholder="Target price ($)" min="0" step="0.01">
          <button class="blph-alert-save" id="blphAlertSave">Save Alert</button>
          <button class="blph-alert-cancel" id="blphAlertCancel">Cancel</button>
        </div>
      </div>
    `;

    // Insert after anchor element
    anchor.parentNode.insertBefore(container, anchor.nextSibling);

    // Wire up tab buttons
    let currentDays = 30;
    container.querySelectorAll('.blph-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.blph-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDays = parseInt(btn.dataset.days, 10);
        loadPriceHistory(item, currentDays, container);
      });
    });

    // Load initial data
    loadPriceHistory(item, 30, container);

    // Load color availability for parts
    if (item.type === 'PART') {
      loadColorAvailability(item, container);
    }

    // Check pro status and show alert row
    chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, opts => {
      if (opts?.isPro) {
        const proRow = container.querySelector('#blphProRow');
        if (proRow) proRow.style.display = 'flex';
        wireAlertForm(item, container);
      }
    });
  }

  function loadPriceHistory(item, days, container) {
    const wrap = container.querySelector('#blphSparklineWrap');
    const statsRow = container.querySelector('#blphStatsRow');
    if (!wrap) return;
    wrap.innerHTML = '<div class="blph-loading">Loading…</div>';
    if (statsRow) statsRow.innerHTML = '';

    chrome.runtime.sendMessage({ type: 'GET_PRICE_HISTORY', item, days }, resp => {
      if (chrome.runtime.lastError || !resp || resp.error) {
        wrap.innerHTML = '<div class="blph-error">Price data unavailable. Connect your BrickLink account in Settings.</div>';
        return;
      }
      renderSparkline(resp.points, resp.stats, wrap, statsRow);
    });
  }

  function renderSparkline(points, stats, wrap, statsRow) {
    if (!points || points.length === 0) {
      wrap.innerHTML = '<div class="blph-empty">No sold history found for this period.</div>';
      return;
    }

    const W = 280, H = 60, PAD = 6;
    const prices = points.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;

    const pts = points.map((p, i) => {
      const x = PAD + (i / Math.max(points.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - ((p.price - minP) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const svg = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="blph-svg">
        <polyline
          points="${pts.join(' ')}"
          fill="none"
          stroke="#e63946"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle cx="${pts[pts.length - 1].split(',')[0]}" cy="${pts[pts.length - 1].split(',')[1]}"
          r="3" fill="#e63946" />
      </svg>
    `;

    wrap.innerHTML = svg;

    if (statsRow && stats) {
      statsRow.innerHTML = `
        <span class="blph-stat"><span class="blph-stat-label">Avg</span> $${stats.avg.toFixed(2)}</span>
        <span class="blph-stat"><span class="blph-stat-label">Min</span> $${stats.min.toFixed(2)}</span>
        <span class="blph-stat"><span class="blph-stat-label">Max</span> $${stats.max.toFixed(2)}</span>
        <span class="blph-stat"><span class="blph-stat-label">Sales</span> ${stats.count}</span>
      `;
    }
  }

  function loadColorAvailability(item, container) {
    chrome.runtime.sendMessage({ type: 'GET_COLOR_AVAILABILITY', itemNo: item.no }, resp => {
      if (!resp || !resp.colors || resp.colors.length === 0) return;

      const section = container.querySelector('#blphColorSection');
      const list = container.querySelector('#blphColorList');
      if (!section || !list) return;

      section.style.display = 'block';
      list.innerHTML = resp.colors.slice(0, 6).map(c => `
        <div class="blph-color-item">
          <span class="blph-color-swatch" style="background:${c.hex || '#ccc'}"></span>
          <span class="blph-color-name">${c.name}</span>
          <span class="blph-color-price">$${c.minPrice.toFixed(2)}</span>
        </div>
      `).join('');
    });
  }

  function wireAlertForm(item, container) {
    const alertBtn = container.querySelector('#blphAlertBtn');
    const alertForm = container.querySelector('#blphAlertForm');
    const alertSave = container.querySelector('#blphAlertSave');
    const alertCancel = container.querySelector('#blphAlertCancel');
    const alertPrice = container.querySelector('#blphAlertPrice');

    if (!alertBtn) return;

    alertBtn.addEventListener('click', () => {
      alertForm.style.display = 'flex';
      alertBtn.closest('#blphProRow').style.display = 'none';
    });
    alertCancel.addEventListener('click', () => {
      alertForm.style.display = 'none';
      alertBtn.closest('#blphProRow').style.display = 'flex';
    });
    alertSave.addEventListener('click', () => {
      const targetPrice = parseFloat(alertPrice.value);
      if (!isNaN(targetPrice) && targetPrice > 0) {
        chrome.runtime.sendMessage({
          type: 'SET_PRICE_ALERT',
          alert: {
            item,
            targetPrice,
            itemName: document.querySelector('#item-name-title, h1')?.textContent?.trim() || item.no,
            url: location.href,
          },
        }, () => {
          alertForm.innerHTML = '<span class="blph-alert-saved">&#10003; Alert set! We\'ll notify you when the price drops below $' + targetPrice.toFixed(2) + '</span>';
        });
      }
    });
  }

  // ── Store Page Injections (wanted list coverage + seller stats) ───────────

  const STORE_MARKER = 'data-blph-store';

  function injectStoreOverlays() {
    if (document.querySelector(`[${STORE_MARKER}]`)) return;

    const storeName = getStoreName();

    // Find store header anchor
    const storeHeaderAnchors = [
      document.querySelector('.store-header'),
      document.querySelector('#_idStoreHeader'),
      document.querySelector('.storeHeaderContent'),
      document.querySelector('#store-header-info'),
      document.querySelector('table.store-top'),
      document.querySelector('h1'),
    ];
    const anchor = storeHeaderAnchors.find(el => el !== null);
    if (!anchor) return;

    const container = document.createElement('div');
    container.className = 'blph-store-overlay';
    container.setAttribute(STORE_MARKER, '1');
    container.innerHTML = `
      <div class="blph-panel blph-store-panel">
        <div class="blph-panel-header">
          <span class="blph-panel-icon">&#127981;</span>
          <span class="blph-panel-title">Store Insights</span>
        </div>

        <div class="blph-seller-stats" id="blphSellerStats">
          <div class="blph-loading">Loading seller stats…</div>
        </div>

        <div class="blph-coverage-section" id="blphCoverageSection">
          <div class="blph-loading">Checking wanted list coverage…</div>
        </div>

        <div class="blph-pro-optimizer" id="blphProOptimizer" style="display:none">
          <div class="blph-optimizer-header">
            <span>&#9889; Multi-Store Optimizer</span>
            <span class="blph-pro-badge">PRO</span>
          </div>
          <p class="blph-optimizer-desc">Find the cheapest combination of stores to complete your wanted list.</p>
          <button class="blph-optimizer-btn" id="blphOptimizerBtn">Find Best Deal</button>
          <div class="blph-optimizer-result" id="blphOptimizerResult"></div>
        </div>
      </div>
    `;

    anchor.parentNode.insertBefore(container, anchor.nextSibling);

    // Load seller stats
    if (storeName) {
      chrome.runtime.sendMessage({ type: 'GET_SELLER_STATS', username: storeName }, resp => {
        const statsEl = container.querySelector('#blphSellerStats');
        if (!statsEl) return;
        if (!resp || resp.error || !resp.stats) {
          statsEl.innerHTML = '<span class="blph-error">Seller stats unavailable.</span>';
          return;
        }
        const s = resp.stats;
        statsEl.innerHTML = `
          <div class="blph-stat-grid">
            <div class="blph-stat-cell">
              <div class="blph-stat-val">${s.totalFeedback.toLocaleString()}</div>
              <div class="blph-stat-label">Total Feedback</div>
            </div>
            <div class="blph-stat-cell">
              <div class="blph-stat-val blph-positive">${s.positivePercent}%</div>
              <div class="blph-stat-label">Positive</div>
            </div>
            <div class="blph-stat-cell">
              <div class="blph-stat-val">${s.neutralFeedback}</div>
              <div class="blph-stat-label">Neutral</div>
            </div>
            <div class="blph-stat-cell">
              <div class="blph-stat-val blph-negative">${s.negativeFeedback}</div>
              <div class="blph-stat-label">Negative</div>
            </div>
          </div>
        `;
      });
    } else {
      const statsEl = container.querySelector('#blphSellerStats');
      if (statsEl) statsEl.innerHTML = '<span class="blph-muted">Store name not detected.</span>';
    }

    // Load wanted list coverage
    chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, opts => {
      const coverageEl = container.querySelector('#blphCoverageSection');

      if (!opts?.accessToken) {
        if (coverageEl) {
          coverageEl.innerHTML = `
            <div class="blph-connect-prompt">
              <span>Connect BrickLink to see wanted list coverage</span>
              <a href="${chrome.runtime.getURL('options/options.html')}" target="_blank" class="blph-connect-btn">Connect</a>
            </div>
          `;
        }
        return;
      }

      chrome.runtime.sendMessage(
        { type: 'GET_WANTED_LIST_COVERAGE', storeName: storeName || '' },
        resp => {
          if (!coverageEl) return;
          if (!resp || resp.error) {
            coverageEl.innerHTML = '<span class="blph-error">Could not load wanted list data.</span>';
            return;
          }
          const { covered, total, topMatches } = resp;
          const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

          coverageEl.innerHTML = `
            <div class="blph-coverage-label">
              Wanted List: <strong>${covered} of ${total}</strong> parts available here (${pct}%)
            </div>
            <div class="blph-coverage-bar-track">
              <div class="blph-coverage-bar-fill" style="width:${pct}%"></div>
            </div>
            ${topMatches && topMatches.length > 0 ? `
              <div class="blph-top-matches">
                Top matches: ${topMatches.slice(0, 3).map(m => `<span class="blph-match-item">${m}</span>`).join('')}
              </div>
            ` : ''}
          `;

          // Show multi-store optimizer for Pro users
          if (opts.isPro) {
            const optimizerEl = container.querySelector('#blphProOptimizer');
            if (optimizerEl) {
              optimizerEl.style.display = 'block';
              wireOptimizer(container);
            }
          }
        }
      );
    });
  }

  function wireOptimizer(container) {
    const btn = container.querySelector('#blphOptimizerBtn');
    const result = container.querySelector('#blphOptimizerResult');
    if (!btn || !result) return;

    btn.addEventListener('click', () => {
      btn.textContent = 'Analyzing…';
      btn.disabled = true;
      chrome.runtime.sendMessage({ type: 'RUN_MULTI_STORE_OPTIMIZER' }, resp => {
        btn.disabled = false;
        btn.textContent = 'Find Best Deal';
        if (!resp || resp.error) {
          result.innerHTML = '<span class="blph-error">Optimizer failed. Check your BrickLink connection.</span>';
          return;
        }
        const { stores, totalCost, partsCovered, partsTotal } = resp;
        result.innerHTML = `
          <div class="blph-optimizer-summary">
            Buy from <strong>${stores.length} store${stores.length !== 1 ? 's' : ''}</strong>
            to get <strong>${partsCovered}/${partsTotal}</strong> wanted parts
            for <strong>$${totalCost.toFixed(2)}</strong> total
          </div>
          <ul class="blph-store-list">
            ${stores.map(s => `
              <li class="blph-store-item">
                <a href="${s.url}" target="_blank">${s.name}</a>
                — ${s.partCount} parts — $${s.cost.toFixed(2)}
              </li>
            `).join('')}
          </ul>
        `;
      });
    });
  }

  // ── Set Value Tracker (Pro, catalog set pages) ────────────────────────────

  const VALUE_MARKER = 'data-blph-value';

  function injectSetValueTracker() {
    if (document.querySelector(`[${VALUE_MARKER}]`)) return;

    const item = getItemInfo();
    if (!item || item.type !== 'SET') return;

    chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, opts => {
      if (!opts?.isPro) return;

      chrome.runtime.sendMessage({ type: 'GET_SET_VALUE_HISTORY', setNo: item.no }, resp => {
        if (!resp || !resp.history || resp.history.length === 0) return;

        const anchor = document.querySelector(`[${SPARKLINE_MARKER}]`);
        if (!anchor) return;

        const container = document.createElement('div');
        container.className = 'blph-value-tracker';
        container.setAttribute(VALUE_MARKER, '1');
        container.innerHTML = `
          <div class="blph-panel blph-pro-panel">
            <div class="blph-panel-header">
              <span class="blph-panel-icon">&#128176;</span>
              <span class="blph-panel-title">Set Value Tracker</span>
              <span class="blph-pro-badge">PRO</span>
            </div>
            <div class="blph-value-chart" id="blphValueChart"></div>
            <div class="blph-retiring-soon" id="blphRetiringSoon" style="display:none">
              <span class="blph-retiring-badge">&#128683; Retiring Soon</span>
              <span class="blph-retiring-note">This set is nearing end-of-life — sealed copies may appreciate.</span>
            </div>
          </div>
        `;
        anchor.parentNode.insertBefore(container, anchor.nextSibling);

        renderValueChart(resp.history, container.querySelector('#blphValueChart'));

        if (resp.retiringSoon) {
          const retirEl = container.querySelector('#blphRetiringSoon');
          if (retirEl) retirEl.style.display = 'flex';
        }
      });
    });
  }

  function renderValueChart(history, el) {
    if (!el || !history.length) return;

    const W = 280, H = 80, PAD = 8;
    const prices = history.map(h => h.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;

    const pts = history.map((h, i) => {
      const x = PAD + (i / Math.max(history.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - ((h.price - minP) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    el.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <defs>
          <linearGradient id="blphGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon
          points="${pts.join(' ')} ${pts[pts.length-1].split(',')[0]},${H} ${PAD},${H}"
          fill="url(#blphGrad)"
        />
        <polyline
          points="${pts.join(' ')}"
          fill="none"
          stroke="#2563eb"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
      <div class="blph-value-labels">
        <span>$${prices[0].toFixed(2)}</span>
        <span class="${prices[prices.length-1] >= prices[0] ? 'blph-up' : 'blph-down'}">
          $${prices[prices.length-1].toFixed(2)}
          ${prices[prices.length-1] >= prices[0] ? '&#9650;' : '&#9660;'}
        </span>
      </div>
    `;
  }

  // ── MutationObserver (SPA navigation) ────────────────────────────────────

  let debounce = null;

  function runInjectors() {
    if (isCatalogItemPage()) {
      injectSparkline();
      injectSetValueTracker();
    }
    if (isStorePage()) {
      injectStoreOverlays();
    }
  }

  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(runInjectors, 700);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run
  runInjectors();
})();
