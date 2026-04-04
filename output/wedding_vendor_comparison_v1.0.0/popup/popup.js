// Wedding Vendor Tracker — Popup

'use strict';

async function init() {
  const [vendorResp, opts] = await Promise.all([
    sendMsg({ type: 'GET_VENDORS' }),
    sendMsg({ type: 'GET_OPTIONS' }),
  ]);

  const vendors = vendorResp?.vendors || [];
  const isPro = opts?.isPro === true;

  document.getElementById('pu-vendor-count').textContent = vendors.length;
  document.getElementById('pu-plan').textContent = isPro ? 'Pro ★' : 'Free';

  document.getElementById('pu-open-panel-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
    window.close();
  });

  document.getElementById('pu-settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

function sendMsg(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

document.addEventListener('DOMContentLoaded', init);
