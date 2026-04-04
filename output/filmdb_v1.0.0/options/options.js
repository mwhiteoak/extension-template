const STORAGE_KEY_EBAY_APP_ID = 'filmdb_ebay_app_id';

const input = document.getElementById('ebay-app-id');
const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const statusMsg = document.getElementById('status-msg');

function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = `status ${type}`;
  statusMsg.style.display = 'block';
  setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
}

// Load existing value
chrome.storage.local.get([STORAGE_KEY_EBAY_APP_ID], (result) => {
  if (result[STORAGE_KEY_EBAY_APP_ID]) {
    input.value = result[STORAGE_KEY_EBAY_APP_ID];
  }
});

saveBtn.addEventListener('click', () => {
  const token = input.value.trim();
  if (!token) {
    showStatus('Please enter a token before saving.', 'error');
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY_EBAY_APP_ID]: token }, () => {
    showStatus('Settings saved.', 'success');
  });
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  chrome.storage.local.remove([STORAGE_KEY_EBAY_APP_ID], () => {
    showStatus('Token cleared.', 'success');
  });
});
