// FIRE Portfolio Overlay — Sidebar Content Script
// Injects a Shadow DOM sidebar on brokerage pages with FIRE metrics.

(function () {
  'use strict';

  if (document.getElementById('fire-overlay-host')) return;

  // ── FIRE Calculations ────────────────────────────────────────────────────────

  /**
   * Calculate FIRE date in months from now.
   * Uses compound interest: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
   * Solve for n iteratively.
   */
  function calcMonthsToFire(balance, target, monthlyContribution, annualReturn) {
    if (balance >= target) return 0;
    const r = annualReturn / 100 / 12; // monthly rate
    if (r <= 0) {
      if (monthlyContribution <= 0) return null;
      return Math.ceil((target - balance) / monthlyContribution);
    }
    // Binary search for n where FV >= target
    let lo = 0, hi = 600; // max 50 years
    let found = false;
    for (let iter = 0; iter < 60; iter++) {
      const mid = Math.floor((lo + hi) / 2);
      const fv = balance * Math.pow(1 + r, mid) + monthlyContribution * (Math.pow(1 + r, mid) - 1) / r;
      if (fv >= target) { hi = mid; found = true; }
      else lo = mid + 1;
      if (hi - lo <= 1) break;
    }
    if (!found && balance * Math.pow(1 + r, hi) + monthlyContribution * (Math.pow(1 + r, hi) - 1) / r < target) {
      return null; // can never reach target
    }
    return hi;
  }

  function calcFireDate(balance, settings) {
    const { annualExpenses, monthlyContribution, expectedReturn } = settings;
    const target = annualExpenses * 25;
    const months = calcMonthsToFire(balance, target, monthlyContribution, expectedReturn);
    if (months === null) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return { date: d, months };
  }

  function calcFireDateDelta(balance, dailyGainLoss, settings) {
    if (dailyGainLoss === null || dailyGainLoss === 0) return null;
    const yesterdayBalance = balance - dailyGainLoss;
    const today = calcFireDate(balance, settings);
    const yesterday = calcFireDate(yesterdayBalance, settings);
    if (!today || !yesterday) return null;
    const daysDelta = Math.round((yesterday.months - today.months) * 30.44);
    return daysDelta; // positive = closer, negative = further
  }

  function calcMilestones(balance, settings) {
    const { annualExpenses, monthlyContribution, expectedReturn } = settings;
    const fullTarget = annualExpenses * 25;
    return [25, 50, 75, 100].map(pct => {
      const milestoneTarget = fullTarget * (pct / 100);
      const reached = balance >= milestoneTarget;
      let dateStr = null;
      if (!reached) {
        const months = calcMonthsToFire(balance, milestoneTarget, monthlyContribution, expectedReturn);
        if (months !== null) {
          const d = new Date();
          d.setMonth(d.getMonth() + months);
          dateStr = d.getFullYear().toString();
        }
      }
      return { pct, reached, dateStr };
    });
  }

  function formatCurrency(n) {
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return '$' + Math.round(n).toLocaleString();
    return '$' + n.toFixed(0);
  }

  function formatDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  // ── Shadow DOM Setup ─────────────────────────────────────────────────────────

  const host = document.createElement('div');
  host.id = 'fire-overlay-host';
  host.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483647;font-family:inherit;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }

    #fire-toggle {
      position: fixed;
      top: 80px;
      right: 0;
      width: 36px;
      height: 80px;
      background: #1a6b3a;
      color: #fff;
      border: none;
      border-radius: 6px 0 0 6px;
      cursor: pointer;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 8px 4px;
      z-index: 2147483647;
      box-shadow: -2px 2px 8px rgba(0,0,0,.25);
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #fire-toggle:hover { background: #155430; }
    #fire-toggle.open { background: #155430; }

    #fire-sidebar {
      position: fixed;
      top: 60px;
      right: 0;
      width: 300px;
      max-height: calc(100vh - 80px);
      background: #fff;
      border-left: 3px solid #1a6b3a;
      border-radius: 8px 0 0 8px;
      box-shadow: -4px 0 20px rgba(0,0,0,.18);
      display: flex;
      flex-direction: column;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #222;
      overflow: hidden;
      transform: translateX(100%);
      transition: transform 0.25s ease;
    }
    #fire-sidebar.open { transform: translateX(0); }

    .fire-header {
      background: #1a6b3a;
      color: #fff;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .fire-header-title { font-size: 14px; font-weight: 700; letter-spacing: .3px; }
    .fire-header-sub { font-size: 10px; opacity: .8; margin-top: 1px; }
    .fire-close {
      background: none; border: none; color: #fff; font-size: 18px;
      cursor: pointer; padding: 0 2px; line-height: 1; opacity: .8;
    }
    .fire-close:hover { opacity: 1; }

    .fire-body {
      overflow-y: auto;
      flex: 1;
      padding: 12px;
    }

    /* Setup Wizard */
    .fire-wizard { padding: 4px 0; }
    .fire-wizard h3 { margin: 0 0 8px; font-size: 14px; color: #1a6b3a; }
    .fire-wizard p { margin: 0 0 10px; font-size: 12px; color: #555; line-height: 1.4; }
    .fire-field { margin-bottom: 10px; }
    .fire-field label { display: block; font-size: 11px; color: #444; margin-bottom: 3px; font-weight: 600; }
    .fire-field input {
      width: 100%; box-sizing: border-box;
      padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;
      font-size: 13px; outline: none;
    }
    .fire-field input:focus { border-color: #1a6b3a; }
    .fire-field .fire-hint { font-size: 10px; color: #888; margin-top: 2px; }
    .fire-btn-primary {
      display: block; width: 100%; padding: 9px;
      background: #1a6b3a; color: #fff;
      border: none; border-radius: 5px; cursor: pointer;
      font-size: 13px; font-weight: 700; margin-top: 4px;
    }
    .fire-btn-primary:hover { background: #155430; }

    /* Metrics */
    .fire-metric-card {
      background: #f7faf8; border-radius: 7px;
      padding: 10px 12px; margin-bottom: 8px;
      border: 1px solid #d4e8da;
    }
    .fire-metric-label { font-size: 10px; color: #5a8a6a; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .fire-metric-value { font-size: 22px; font-weight: 700; color: #1a6b3a; line-height: 1.1; }
    .fire-metric-sub { font-size: 11px; color: #666; margin-top: 2px; }

    /* Progress bar */
    .fire-progress-wrap { margin: 6px 0 10px; }
    .fire-progress-bar-bg {
      background: #ddf0e5; border-radius: 4px; height: 8px; overflow: hidden;
    }
    .fire-progress-bar {
      background: #1a6b3a; height: 100%; border-radius: 4px;
      transition: width 0.5s ease;
    }
    .fire-progress-labels {
      display: flex; justify-content: space-between;
      font-size: 10px; color: #888; margin-top: 3px;
    }

    /* FIRE date impact */
    .fire-impact-positive { color: #1a6b3a; font-weight: 700; }
    .fire-impact-negative { color: #c0392b; font-weight: 700; }

    /* Milestones */
    .fire-milestones { margin-top: 4px; }
    .fire-milestone-row {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 0; border-bottom: 1px solid #eef2ef;
      font-size: 12px;
    }
    .fire-milestone-row:last-child { border-bottom: none; }
    .fire-milestone-check { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
    .fire-milestone-check.done { background: #1a6b3a; color: #fff; }
    .fire-milestone-check.pending { background: #ddf0e5; color: #1a6b3a; border: 1.5px solid #8cc8a0; }
    .fire-milestone-label { flex: 1; color: #333; }
    .fire-milestone-date { font-size: 10px; color: #888; }

    /* Balance source */
    .fire-balance-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px; gap: 6px;
    }
    .fire-balance-display {
      font-size: 13px; font-weight: 700; color: #222;
    }
    .fire-balance-source { font-size: 10px; color: #888; }
    .fire-manual-wrap { flex: 1; }
    .fire-manual-input {
      width: 100%; box-sizing: border-box;
      padding: 5px 8px; border: 1px solid #ccc; border-radius: 4px;
      font-size: 12px;
    }

    /* Pro banner */
    .fire-pro-banner {
      background: linear-gradient(135deg, #1a6b3a, #0f4024);
      color: #fff; border-radius: 7px; padding: 12px;
      margin-top: 8px;
    }
    .fire-pro-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
    .fire-pro-desc { font-size: 11px; opacity: .85; margin-bottom: 8px; line-height: 1.4; }
    .fire-pro-btn {
      background: #fff; color: #1a6b3a;
      border: none; border-radius: 4px;
      padding: 7px 14px; font-size: 12px; font-weight: 700;
      cursor: pointer; width: 100%;
    }
    .fire-pro-btn:hover { background: #edf7f1; }

    /* Settings link */
    .fire-settings-link {
      text-align: center; margin-top: 10px;
      font-size: 10px; color: #888;
    }
    .fire-settings-link a { color: #1a6b3a; text-decoration: none; cursor: pointer; }
    .fire-settings-link a:hover { text-decoration: underline; }

    /* Privacy footer */
    .fire-privacy {
      background: #f0f0f0; padding: 7px 12px;
      font-size: 10px; color: #888; text-align: center;
      border-top: 1px solid #e0e0e0; flex-shrink: 0; line-height: 1.4;
    }

    /* No balance state */
    .fire-no-balance { text-align: center; padding: 16px 0; color: #888; font-size: 12px; }
    .fire-no-balance strong { display: block; font-size: 13px; color: #444; margin-bottom: 4px; }
  `;
  shadow.appendChild(style);

  // ── HTML structure ───────────────────────────────────────────────────────────

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'fire-toggle';
  toggleBtn.title = 'FIRE Portfolio Overlay';
  toggleBtn.textContent = 'FIRE';
  shadow.appendChild(toggleBtn);

  const sidebar = document.createElement('div');
  sidebar.id = 'fire-sidebar';
  sidebar.innerHTML = `
    <div class="fire-header">
      <div>
        <div class="fire-header-title">FIRE Portfolio Overlay</div>
        <div class="fire-header-sub">Financial Independence Tracker</div>
      </div>
      <button class="fire-close" id="fire-close" title="Close">&times;</button>
    </div>
    <div class="fire-body" id="fire-body">
      <div id="fire-wizard-view"></div>
      <div id="fire-metrics-view" style="display:none"></div>
    </div>
    <div class="fire-privacy">
      All calculations happen locally in your browser.<br>No financial data leaves your device.
    </div>
  `;
  shadow.appendChild(sidebar);

  const body = shadow.getElementById('fire-body');
  const wizardView = shadow.getElementById('fire-wizard-view');
  const metricsView = shadow.getElementById('fire-metrics-view');

  // ── State ────────────────────────────────────────────────────────────────────

  let isOpen = false;
  let detectedBalance = null;
  let dailyGainLoss = null;
  let settings = null;
  let manualBalance = null;

  function getEffectiveBalance() {
    return manualBalance !== null ? manualBalance : detectedBalance;
  }

  // ── Persist sidebar state ────────────────────────────────────────────────────

  const OPEN_KEY = 'fire_sidebar_open_' + window.location.hostname.replace(/\./g, '_');

  function setSidebarOpen(open) {
    isOpen = open;
    sidebar.classList.toggle('open', open);
    toggleBtn.classList.toggle('open', open);
    chrome.storage.local.set({ [OPEN_KEY]: open });
  }

  toggleBtn.addEventListener('click', () => setSidebarOpen(!isOpen));
  shadow.getElementById('fire-close').addEventListener('click', () => setSidebarOpen(false));

  // ── Wizard ───────────────────────────────────────────────────────────────────

  function renderWizard() {
    wizardView.style.display = '';
    metricsView.style.display = 'none';
    wizardView.innerHTML = `
      <div class="fire-wizard">
        <h3>Welcome to FIRE Portfolio Overlay</h3>
        <p>Enter your FIRE parameters once — they're saved locally in your browser and never shared.</p>
        <div class="fire-field">
          <label>Annual Expenses ($)</label>
          <input id="fw-expenses" type="number" min="0" placeholder="e.g. 60000" />
          <div class="fire-hint">Your estimated annual spending in retirement</div>
        </div>
        <div class="fire-field">
          <label>Monthly Contribution ($)</label>
          <input id="fw-contribution" type="number" min="0" placeholder="e.g. 3000" />
          <div class="fire-hint">How much you invest each month</div>
        </div>
        <div class="fire-field">
          <label>Expected Annual Return (%)</label>
          <input id="fw-return" type="number" min="0" max="30" placeholder="7" value="7" />
          <div class="fire-hint">Inflation-adjusted expected return (7% is a common estimate)</div>
        </div>
        <button class="fire-btn-primary" id="fw-save">Start Tracking My FIRE Date</button>
        <div id="fw-error" style="color:#c0392b;font-size:11px;margin-top:6px;display:none"></div>
      </div>
    `;
    shadow.getElementById('fw-save').addEventListener('click', () => {
      const expenses = parseFloat(shadow.getElementById('fw-expenses').value);
      const contribution = parseFloat(shadow.getElementById('fw-contribution').value);
      const ret = parseFloat(shadow.getElementById('fw-return').value);
      const errEl = shadow.getElementById('fw-error');
      if (!expenses || expenses <= 0) { errEl.textContent = 'Please enter your annual expenses.'; errEl.style.display = ''; return; }
      if (isNaN(contribution) || contribution < 0) { errEl.textContent = 'Please enter a valid monthly contribution.'; errEl.style.display = ''; return; }
      if (isNaN(ret) || ret < 0) { errEl.textContent = 'Please enter a valid expected return.'; errEl.style.display = ''; return; }
      errEl.style.display = 'none';
      const s = { annualExpenses: expenses, monthlyContribution: contribution, expectedReturn: ret };
      chrome.storage.local.set({ fire_settings: s }, () => {
        settings = s;
        renderMetrics();
      });
    });
  }

  // ── Metrics view ─────────────────────────────────────────────────────────────

  function renderMetrics() {
    if (!settings) { renderWizard(); return; }
    wizardView.style.display = 'none';
    metricsView.style.display = '';

    const balance = getEffectiveBalance();
    const target = settings.annualExpenses * 25;
    const fiRatio = balance !== null ? Math.min((balance / target) * 100, 999) : null;
    const fireResult = balance !== null ? calcFireDate(balance, settings) : null;
    const milestones = balance !== null ? calcMilestones(balance, settings) : null;
    const delta = (balance !== null && dailyGainLoss !== null) ? calcFireDateDelta(balance, dailyGainLoss, settings) : null;

    // Balance row
    let balanceHtml = '';
    if (detectedBalance !== null) {
      balanceHtml = `
        <div class="fire-balance-row">
          <div>
            <div class="fire-balance-display">${formatCurrency(detectedBalance)}</div>
            <div class="fire-balance-source">Auto-detected portfolio value</div>
          </div>
        </div>
      `;
    } else {
      balanceHtml = `
        <div class="fire-no-balance">
          <strong>Balance not detected</strong>
          Enter your portfolio balance manually:
        </div>
        <div class="fire-field" style="margin-bottom:12px">
          <input class="fire-manual-input" id="fire-manual-balance" type="number" min="0"
            placeholder="e.g. 450000" value="${manualBalance !== null ? manualBalance : ''}" />
        </div>
        <button class="fire-btn-primary" id="fire-manual-save" style="margin-bottom:12px">Update Balance</button>
      `;
    }

    // FI Ratio
    const ratioDisplay = fiRatio !== null ? fiRatio.toFixed(1) + '%' : '—';
    const progressPct = fiRatio !== null ? Math.min(fiRatio, 100) : 0;

    // FIRE date
    let fireDateDisplay = '—';
    let fireDateSub = '';
    if (fireResult) {
      fireDateDisplay = formatDate(fireResult.date);
      const yrs = Math.floor(fireResult.months / 12);
      const mos = fireResult.months % 12;
      fireDateSub = yrs > 0 ? `${yrs}y ${mos}m away` : `${mos} months away`;
      if (fireResult.months === 0) { fireDateDisplay = 'You\'re FI!'; fireDateSub = 'FIRE target reached'; }
    } else if (balance !== null) {
      fireDateDisplay = '> 50 yrs';
      fireDateSub = 'Increase contributions';
    }

    // Today's impact
    let impactHtml = '';
    if (delta !== null) {
      const abs = Math.abs(delta);
      const sign = delta >= 0 ? '+' : '-';
      const cls = delta >= 0 ? 'fire-impact-positive' : 'fire-impact-negative';
      const word = delta >= 0 ? 'closer' : 'further';
      impactHtml = `<div class="fire-metric-card">
        <div class="fire-metric-label">Today's FIRE Impact</div>
        <div class="fire-metric-value ${cls}">${sign}${abs} day${abs !== 1 ? 's' : ''}</div>
        <div class="fire-metric-sub">Today moved your FIRE date ${word}</div>
      </div>`;
    } else if (dailyGainLoss !== null && balance !== null) {
      const sign = dailyGainLoss >= 0 ? '+' : '';
      impactHtml = `<div class="fire-metric-card">
        <div class="fire-metric-label">Today's Change</div>
        <div class="fire-metric-value">${sign}${formatCurrency(dailyGainLoss)}</div>
        <div class="fire-metric-sub">Daily gain/loss detected</div>
      </div>`;
    }

    // Milestones
    let milestonesHtml = '';
    if (milestones) {
      milestonesHtml = '<div class="fire-milestones">' + milestones.map(m => {
        const checkCls = m.reached ? 'done' : 'pending';
        const checkIcon = m.reached ? '✓' : m.pct === 25 ? '¼' : m.pct === 50 ? '½' : m.pct === 75 ? '¾' : 'FI';
        const dateTxt = m.reached ? '<span style="color:#1a6b3a;font-weight:700">Reached!</span>' : (m.dateStr ? m.dateStr : '—');
        return `<div class="fire-milestone-row">
          <div class="fire-milestone-check ${checkCls}">${checkIcon}</div>
          <div class="fire-milestone-label">${m.pct}% FI — ${formatCurrency(target * m.pct / 100)}</div>
          <div class="fire-milestone-date">${dateTxt}</div>
        </div>`;
      }).join('') + '</div>';
    }

    metricsView.innerHTML = `
      ${balanceHtml}

      <div class="fire-metric-card">
        <div class="fire-metric-label">FI Ratio</div>
        <div class="fire-metric-value">${ratioDisplay}</div>
        <div class="fire-metric-sub">Target: ${formatCurrency(target)} (25× annual expenses)</div>
        <div class="fire-progress-wrap">
          <div class="fire-progress-bar-bg">
            <div class="fire-progress-bar" style="width:${progressPct}%"></div>
          </div>
          <div class="fire-progress-labels">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>
      </div>

      <div class="fire-metric-card">
        <div class="fire-metric-label">Projected FIRE Date</div>
        <div class="fire-metric-value">${fireDateDisplay}</div>
        <div class="fire-metric-sub">${fireDateSub}</div>
      </div>

      ${impactHtml}

      <div class="fire-metric-card">
        <div class="fire-metric-label">FI Milestones</div>
        ${milestonesHtml || '<div style="color:#888;font-size:12px">Enter balance to see milestones</div>'}
      </div>

      <div class="fire-pro-banner" id="fire-pro-banner">
        <div class="fire-pro-title">Upgrade to Pro — $9/mo</div>
        <div class="fire-pro-desc">Monte Carlo SWR analysis, Coast FIRE calculator, multi-account aggregation, and withdrawal strategy comparison.</div>
        <button class="fire-pro-btn" id="fire-pro-btn">Upgrade to Pro</button>
      </div>

      <div class="fire-settings-link">
        <a id="fire-edit-settings">Edit FIRE settings</a> &bull;
        <a id="fire-open-options">Extension options</a>
      </div>
    `;

    // Attach manual balance handler
    const manualSaveBtn = shadow.getElementById('fire-manual-save');
    if (manualSaveBtn) {
      manualSaveBtn.addEventListener('click', () => {
        const val = parseFloat(shadow.getElementById('fire-manual-balance').value);
        if (!isNaN(val) && val >= 0) {
          manualBalance = val;
          renderMetrics();
        }
      });
    }

    // Pro banner
    chrome.storage.sync.get({ isPro: true }, opts => {
      const banner = shadow.getElementById('fire-pro-banner');
      if (banner) banner.style.display = opts.isPro ? 'none' : '';
    });

    // Settings links
    shadow.getElementById('fire-edit-settings')?.addEventListener('click', () => {
      chrome.storage.local.remove('fire_settings', () => {
        settings = null;
        renderWizard();
      });
    });
    shadow.getElementById('fire-open-options')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    });
  }

  // ── Balance update listener ──────────────────────────────────────────────────

  window.addEventListener('fire:balance-update', (e) => {
    detectedBalance = e.detail.balance;
    dailyGainLoss = e.detail.dailyGainLoss;
    if (settings && isOpen) renderMetrics();
  });

  // ── Boot ─────────────────────────────────────────────────────────────────────

  chrome.storage.local.get(['fire_settings', OPEN_KEY], (stored) => {
    settings = stored.fire_settings || null;
    const shouldOpen = stored[OPEN_KEY] === true;

    if (settings) {
      renderMetrics();
    } else {
      renderWizard();
    }

    if (shouldOpen) setSidebarOpen(true);
  });
})();
