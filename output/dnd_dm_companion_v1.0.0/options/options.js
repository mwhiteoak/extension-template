// D&D Beyond DM Companion — Options Page

async function load() {
  const opts = await chrome.storage.sync.get({
    isPro: true,
    dmcPartySize: 4,
    dmcPartyLevel: 5,
    hotkey: 'D',
  });

  document.getElementById('party-size').value = opts.dmcPartySize;
  document.getElementById('party-level').value = opts.dmcPartyLevel;
  document.getElementById('hotkey-select').value = opts.hotkey || 'D';

  document.getElementById('upgrade-box').style.display = opts.isPro ? 'none' : 'flex';
  document.getElementById('pro-status-box').style.display = opts.isPro ? 'flex' : 'none';
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const opts = {
    dmcPartySize: parseInt(document.getElementById('party-size').value) || 4,
    dmcPartyLevel: parseInt(document.getElementById('party-level').value) || 5,
    hotkey: document.getElementById('hotkey-select').value,
  };
  await chrome.storage.sync.set(opts);
  const msg = document.getElementById('status-msg');
  msg.classList.add('visible');
  setTimeout(() => msg.classList.remove('visible'), 2000);
});

document.getElementById('revoke-pro-btn').addEventListener('click', async () => {
  await chrome.storage.sync.set({ isPro: false });
  load();
});

load();
