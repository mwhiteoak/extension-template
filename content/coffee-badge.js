// Specialty Coffee Cross-Site Companion — Coffee Badge Content Script
// Injects $/gram and freshness badges onto roastery product pages.

(function () {
  'use strict';

  const BADGE_ID = 'coffee-companion-badge';
  const ROASTERY_CONFIG_URL = chrome.runtime.getURL('data/roastery-config.json');

  let config = null;

  async function loadConfig() {
    if (config) return config;
    const res = await fetch(ROASTERY_CONFIG_URL);
    config = await res.json();
    return config;
  }

  function getRoasteryConfig(cfg, hostname) {
    const clean = hostname.replace(/^www\./, '');
    return cfg.roasteries.find(r => clean.endsWith(r.hostname));
  }

  function formatCostPerGram(cpg) {
    return `$${cpg.toFixed(3)}/g`;
  }

  function computeFreshnessWindow(roastery) {
    const today = new Date();
    const roastDate = new Date(today);
    roastDate.setDate(today.getDate() + (roastery.shipSLADays || 5));
    const optimalStart = new Date(roastDate);
    const optimalEnd = new Date(roastDate);
    optimalEnd.setDate(roastDate.getDate() + 42); // 6 weeks optimal window

    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      expectedDeliveryDays: roastery.shipSLADays,
      optimalStart: fmt(optimalStart),
      optimalEnd: fmt(optimalEnd),
    };
  }

  function buildBadgeHTML(pageData, roastery, freshness, avgCpg, isPro) {
    const cpg = pageData.price && pageData.weightGrams
      ? (pageData.price / pageData.weightGrams)
      : null;

    const tier = config.freshnessTiers[roastery.freshnessModel] || config.freshnessTiers['pre-stocks'];

    let html = `<div id="${BADGE_ID}" class="coffee-companion-badge">`;
    html += `<div class="ccb-header"><span class="ccb-logo">☕</span><span class="ccb-title">Coffee Companion</span></div>`;

    // $/gram section
    html += `<div class="ccb-section">`;
    if (cpg) {
      const cmp = cpg < avgCpg ? '▼ below avg' : cpg > avgCpg ? '▲ above avg' : '≈ avg';
      const cmpClass = cpg < avgCpg ? 'ccb-good' : cpg > avgCpg ? 'ccb-high' : '';
      html += `<div class="ccb-row">
        <span class="ccb-label">$/gram</span>
        <span class="ccb-value ccb-price">${formatCostPerGram(cpg)}</span>
        <span class="ccb-compare ${cmpClass}">${cmp} (${roastery.name} avg ${formatCostPerGram(avgCpg)})</span>
      </div>`;
    } else if (pageData.price && !pageData.weightGrams) {
      html += `<div class="ccb-row"><span class="ccb-label">$/gram</span><span class="ccb-value ccb-muted">Select size to calculate</span></div>`;
    } else {
      html += `<div class="ccb-row"><span class="ccb-label">$/gram</span><span class="ccb-value ccb-muted">Not detected</span></div>`;
    }
    html += `</div>`;

    // Freshness section
    html += `<div class="ccb-section">`;
    html += `<div class="ccb-row">
      <span class="ccb-label">Freshness</span>
      <span class="ccb-badge" style="background:${tier.color}">${tier.icon} ${tier.label}</span>
    </div>`;
    html += `<div class="ccb-subrow ccb-muted">Est. delivery +${freshness.expectedDeliveryDays}d · Optimal window: ${freshness.optimalStart}–${freshness.optimalEnd}</div>`;
    html += `</div>`;

    // Pro upsell / Pro features
    if (!isPro) {
      html += `<div class="ccb-section ccb-pro-section">
        <div class="ccb-pro-label">Pro features</div>
        <ul class="ccb-pro-list">
          <li>☕ Coffee Review scores &amp; tasting notes</li>
          <li>📔 Personal coffee memory</li>
          <li>💰 Subscription ROI calculator</li>
          <li>🔔 Freshness &amp; deal alerts</li>
        </ul>
        <button class="ccb-upgrade-btn" id="ccb-upgrade-btn">Upgrade to Pro — $6/mo</button>
      </div>`;
    } else {
      html += `<div class="ccb-section ccb-pro-section">
        <div class="ccb-pro-label ccb-pro-active">Pro ✓</div>
        <div class="ccb-subrow ccb-muted">Coffee Review scores, personal memory, and alerts are coming in a future update.</div>
      </div>`;
    }

    html += `<button class="ccb-close-btn" id="ccb-close-btn" title="Close">✕</button>`;
    html += `</div>`;
    return html;
  }

  function injectBadge(html) {
    const existing = document.getElementById(BADGE_ID);
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    document.getElementById('ccb-close-btn')?.addEventListener('click', () => {
      document.getElementById(BADGE_ID)?.remove();
    });

    document.getElementById('ccb-upgrade-btn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
    });
  }

  async function run() {
    if (!window.__coffeeDetector) return;

    const pageData = window.__coffeeDetector.getPageData();
    if (!pageData || !pageData.name) return;

    const [cfg, opts] = await Promise.all([
      loadConfig(),
      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }),
    ]);

    const roastery = getRoasteryConfig(cfg, pageData.hostname);
    if (!roastery) return;

    // Check if this site is enabled in options
    const disabledSites = opts.disabledSites || [];
    if (disabledSites.includes(roastery.key)) return;

    const freshness = computeFreshnessWindow(roastery);
    const avgCpg = roastery.avgPricePerGram;
    const isPro = opts.isPro || false;

    const html = buildBadgeHTML(pageData, roastery, freshness, avgCpg, isPro);
    injectBadge(html);

    // Watch for variant/size changes (SPA navigation or select changes)
    let debounce = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const updated = window.__coffeeDetector.getPageData();
        if (!updated) return;
        const optsNow = await chrome.runtime.sendMessage({ type: 'GET_OPTIONS' });
        const htmlNow = buildBadgeHTML(updated, roastery, freshness, avgCpg, optsNow.isPro || false);
        const badge = document.getElementById(BADGE_ID);
        if (badge) {
          const tmp = document.createElement('div');
          tmp.innerHTML = htmlNow;
          const newBadge = tmp.firstElementChild;
          badge.replaceWith(newBadge);
          document.getElementById('ccb-close-btn')?.addEventListener('click', () => {
            document.getElementById(BADGE_ID)?.remove();
          });
          document.getElementById('ccb-upgrade-btn')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
          });
        }
      }, 500);
    });

    const priceEls = document.querySelectorAll('[class*="price"], [class*="variant"], select');
    priceEls.forEach(el => observer.observe(el, { childList: true, subtree: true, characterData: true }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
