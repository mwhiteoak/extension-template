// D&D Beyond DM Companion — Popup

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onDnDB = tab?.url?.includes('dndbeyond.com');

  const statusEl = document.getElementById('site-status');
  statusEl.textContent = onDnDB ? '● Active on D&D Beyond' : '● Open D&D Beyond to use sidebar';
  if (onDnDB) statusEl.classList.add('on-site');

  const { isPro } = await chrome.storage.sync.get({ isPro: true });
  document.getElementById('free-row').style.display = isPro ? 'none' : 'block';
  document.getElementById('pro-active-row').style.display = isPro ? 'block' : 'none';

  document.getElementById('btn-open-sidebar').addEventListener('click', async () => {
    if (onDnDB && tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Find the DM Companion shadow host and toggle sidebar
          const host = document.getElementById('dmc-host');
          if (host?.shadowRoot) {
            const sidebar = host.shadowRoot.getElementById('dmc-sidebar');
            const toggle = host.shadowRoot.getElementById('dmc-toggle-btn');
            if (sidebar && toggle) {
              if (sidebar.style.display === 'none' || !sidebar.style.display) {
                sidebar.style.display = 'flex';
                toggle.style.display = 'none';
              } else {
                sidebar.style.display = 'none';
                toggle.style.display = 'block';
              }
            }
          }
        },
      }).catch(() => {});
    } else {
      chrome.tabs.create({ url: 'https://www.dndbeyond.com' });
    }
    window.close();
  });

  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

}

init();
