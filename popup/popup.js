// popup.js - Extension popup logic
document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('action-btn');
  const status = document.getElementById('status');

  actionBtn.addEventListener('click', async () => {
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { type: 'ACTION' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      status.textContent = response?.message || 'Done';
    });
  });
});
