// GB Watch — Options page logic

const DEFAULTS = {
  notificationsEnabled: true,
  pollIntervalMinutes: 30
};

function loadOptions() {
  chrome.storage.sync.get('gbwatchOptions', (data) => {
    const opts = { ...DEFAULTS, ...(data.gbwatchOptions || {}) };
    document.getElementById('notificationsEnabled').checked = opts.notificationsEnabled;
    document.getElementById('pollInterval').value = String(opts.pollIntervalMinutes);
  });
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const opts = {
    notificationsEnabled: document.getElementById('notificationsEnabled').checked,
    pollIntervalMinutes: parseInt(document.getElementById('pollInterval').value, 10)
  };
  chrome.storage.sync.set({ gbwatchOptions: opts }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Saved.';
    setTimeout(() => { status.textContent = ''; }, 2000);
    // Notify service worker to reschedule the alarm
    chrome.runtime.sendMessage({ type: 'OPTIONS_UPDATED', options: opts });
  });
});

document.addEventListener('DOMContentLoaded', loadOptions);
