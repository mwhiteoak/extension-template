// BrickLink Price History — Options Script

document.addEventListener('DOMContentLoaded', () => {
  const fields = ['consumerKey', 'consumerSecret', 'accessToken', 'accessTokenSecret'];
  const toggles = ['showSparkline', 'showCoverage', 'showSellerStats', 'showColorAvailability'];

  const proBanner = document.getElementById('proBanner');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const saveBtn = document.getElementById('saveBtn');
  const successMsg = document.getElementById('successMsg');
  const alertsContent = document.getElementById('alertsContent');

  // ── Load options into form ──────────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, (opts) => {
    for (const f of fields) {
      const el = document.getElementById(f);
      if (el && opts[f]) el.value = opts[f];
    }
    for (const t of toggles) {
      const el = document.getElementById(t);
      if (el) el.checked = opts[t] !== false;
    }
    if (opts?.isPro && proBanner) {
      proBanner.classList.add('hidden');
    }
    if (opts?.isPro) {
      loadAlerts();
    }
  });

  // ── Save settings ────────────────────────────────────────────────────────
  saveBtn?.addEventListener('click', () => {
    const options = {};
    for (const f of fields) {
      const el = document.getElementById(f);
      if (el) options[f] = el.value.trim();
    }
    for (const t of toggles) {
      const el = document.getElementById(t);
      if (el) options[t] = el.checked;
    }
    chrome.runtime.sendMessage({ type: 'SAVE_OPTIONS', options }, () => {
      if (successMsg) {
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 2500);
      }
    });
  });

  // ── Upgrade button ───────────────────────────────────────────────────────
  upgradeBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  });

  // ── Price Alerts (Pro) ───────────────────────────────────────────────────
  function loadAlerts() {
    chrome.runtime.sendMessage({ type: 'GET_PRICE_ALERTS' }, (resp) => {
      if (!alertsContent) return;
      const alerts = resp?.alerts || [];
      if (!alerts.length) {
        alertsContent.innerHTML = '<p class="no-alerts">No price alerts set. Browse a BrickLink catalog page and click "Set Alert" to add one.</p>';
        return;
      }
      alertsContent.innerHTML = `
        <ul class="alerts-list">
          ${alerts.map(a => `
            <li class="alert-item" data-id="${a.id}">
              <span class="alert-name">${escapeHtml(a.itemName || a.item?.no || 'Unknown')}</span>
              <span class="alert-target">&#8594; $${parseFloat(a.targetPrice).toFixed(2)}</span>
              ${a.triggered
                ? `<span class="alert-triggered">&#10003; Triggered @ $${parseFloat(a.triggeredPrice || 0).toFixed(2)}</span>`
                : '<span style="font-size:11px;color:#9ca3af;">Active</span>'
              }
              <button class="alert-delete" data-id="${a.id}" title="Remove alert">&#10005;</button>
            </li>
          `).join('')}
        </ul>
      `;

      alertsContent.querySelectorAll('.alert-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          chrome.runtime.sendMessage({ type: 'DELETE_PRICE_ALERT', id }, () => loadAlerts());
        });
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
