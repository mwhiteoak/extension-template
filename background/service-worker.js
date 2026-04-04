// Proposal Template Manager — Background Service Worker
// Handles install, reminder alarms, Stripe stub, and variable relay.

const DEFAULT_SETTINGS = {
  reminderEnabled: true,
  reminderHours: 48,
  isPro: false,
};

// ── Install ───────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const existing = await chrome.storage.local.get('ptm_settings');
  if (!existing.ptm_settings) {
    await chrome.storage.local.set({ ptm_settings: DEFAULT_SETTINGS });
  }
  if (reason === 'install') {
    // Seed a starter template
    const starterTemplates = [
      {
        id: 'tmpl-' + Date.now(),
        name: 'Developer — Short & Direct',
        body: 'Hi {{client_name}},\n\nI\'ve reviewed your listing for "{{job_title}}" and I\'m confident I can deliver exactly what you need.\n\nI specialize in {{key_skill}} and have shipped similar projects on time and on budget. My rate aligns well with your {{budget}} budget.\n\nI\'d love to chat briefly about your timeline ({{deadline}}) and scope. Ready to get started this week.\n\nBest,\n[Your Name]',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tmpl-' + (Date.now() + 1),
        name: 'Value-First Opener',
        body: 'Hi {{client_name}},\n\nYour project "{{job_title}}" stood out to me because I\'ve solved this exact problem before.\n\n[Describe a specific relevant result here]\n\nGiven your budget of {{budget}} and the {{deadline}} timeline, here\'s how I\'d approach this:\n\n1. [Phase 1]\n2. [Phase 2]\n3. Delivery + revisions\n\nWant a quick 15-min call to align on requirements?\n\n[Your Name]',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await chrome.storage.local.set({ ptm_templates: starterTemplates });
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      case 'GET_VARIABLES': {
        // Relay to the active tab's content script
        if (sender.tab) {
          // Already in content script context — shouldn't reach here
          sendResponse({});
        } else {
          // From iframe panel — query the active tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]) {
            try {
              const vars = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_VARIABLES' });
              sendResponse(vars || {});
            } catch {
              sendResponse({});
            }
          } else {
            sendResponse({});
          }
        }
        break;
      }

      case 'SCHEDULE_REMINDER': {
        const { proposalId, jobTitle, delayHours } = message;
        const alarmName = 'ptm-reminder-' + proposalId;
        const delayMinutes = (delayHours || 48) * 60;
        chrome.alarms.create(alarmName, { delayInMinutes: delayMinutes });
        // Store alarm metadata
        const meta = await chrome.storage.local.get('ptm_alarm_meta') || {};
        const alarmMeta = meta.ptm_alarm_meta || {};
        alarmMeta[alarmName] = { proposalId, jobTitle };
        await chrome.storage.local.set({ ptm_alarm_meta: alarmMeta });
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — opens checkout URL
        chrome.tabs.create({ url: 'https://buy.stripe.com/ptm_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      case 'GET_SETTINGS': {
        const result = await chrome.storage.local.get('ptm_settings');
        sendResponse(result.ptm_settings || DEFAULT_SETTINGS);
        break;
      }

      case 'SAVE_SETTINGS': {
        await chrome.storage.local.set({ ptm_settings: message.settings });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // Keep channel open for async response
});

// ── Alarm handler (outcome reminders) ────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('ptm-reminder-')) return;

  const meta = await chrome.storage.local.get('ptm_alarm_meta');
  const alarmMeta = (meta.ptm_alarm_meta || {})[alarm.name];
  if (!alarmMeta) return;

  const { jobTitle } = alarmMeta;

  chrome.notifications.create(alarm.name, {
    type: 'basic',
    iconUrl: 'assets/icons/icon48.png',
    title: 'Proposal Template Manager',
    message: `Did ${jobTitle ? '"' + jobTitle + '"' : 'your recent proposal'} get a response? Tap to update the outcome.`,
    buttons: [{ title: 'Update outcome' }],
    requireInteraction: true,
  });
});

chrome.notifications.onButtonClicked.addListener((notificationId) => {
  if (notificationId.startsWith('ptm-reminder-')) {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') + '?tab=proposals' });
    chrome.notifications.clear(notificationId);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('ptm-reminder-')) {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') + '?tab=proposals' });
    chrome.notifications.clear(notificationId);
  }
});
