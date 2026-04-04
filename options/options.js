// options.js - Extension options page logic
document.addEventListener('DOMContentLoaded', () => {
  const setting1Input = document.getElementById('setting1');
  const saveBtn = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved');

  // Load saved settings
  chrome.storage.sync.get(['setting1'], (result) => {
    if (result.setting1) {
      setting1Input.value = result.setting1;
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set({ setting1: setting1Input.value }, () => {
      savedMsg.style.display = 'inline';
      setTimeout(() => { savedMsg.style.display = 'none'; }, 2000);
    });
  });
});
