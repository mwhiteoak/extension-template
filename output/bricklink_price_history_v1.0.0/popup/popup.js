// BrickLink Price History — Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const connectStatus = document.getElementById('connectStatus');
  const planVal = document.getElementById('planVal');
  const alertCount = document.getElementById('alertCount');
  const settingsBtn = document.getElementById('settingsBtn');
  // Load options and update display
  chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, (opts) => {
    const isConnected = !!(opts?.consumerKey && opts?.accessToken);
    if (connectStatus) {
      connectStatus.textContent = isConnected ? 'Connected' : 'Not connected';
      connectStatus.className = 'status-val ' + (isConnected ? 'connected' : 'not-connected');
    }
    if (planVal) {
      planVal.textContent = opts?.isPro ? 'Pro' : 'Free';
    }
  });

  // Load alert count
  chrome.runtime.sendMessage({ type: 'GET_PRICE_ALERTS' }, (resp) => {
    if (alertCount && resp?.alerts) {
      const active = resp.alerts.filter(a => !a.triggered).length;
      alertCount.textContent = active === 0 ? '0 active' : `${active} active`;
    }
  });

  // Settings button
  settingsBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    window.close();
  });

});
