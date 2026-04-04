// Wedding Vendor Tracker — Service Worker
// Handles vendor storage, side panel management, and Pro gating.

// ── Defaults ─────────────────────────────────────────────────────────────────

const VENDOR_STATUS = ['Contacted', 'Quoted', 'Booked', 'Rejected'];

const DEFAULT_OPTIONS = {
  isPro: false,
  categoryBudgets: {},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function getVendors() {
  const { vendors = [] } = await chrome.storage.local.get('vendors');
  return vendors;
}

async function saveVendors(vendors) {
  await chrome.storage.local.set({ vendors });
}

async function getOptions() {
  return chrome.storage.sync.get(DEFAULT_OPTIONS);
}

// ── Install ───────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Initialise empty vendor list
    await chrome.storage.local.set({ vendors: [] });
    // Open welcome/options page
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// ── Side panel ────────────────────────────────────────────────────────────────

// Open side panel when the extension action icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      // ── TRACK_VENDOR ──────────────────────────────────────────────────────
      // Called by content script when user clicks "Track Vendor" on a card.
      case 'TRACK_VENDOR': {
        const vendors = await getVendors();
        // Deduplicate by URL (or name+category if no URL)
        const key = msg.vendor.url || `${msg.vendor.name}::${msg.vendor.category}`;
        const exists = vendors.some(v => (v.url || `${v.name}::${v.category}`) === key);
        if (!exists) {
          const newVendor = {
            id: generateId(),
            name: msg.vendor.name || 'Unknown Vendor',
            category: msg.vendor.category || 'Uncategorized',
            priceRange: msg.vendor.priceRange || '',
            status: 'Contacted',
            notes: '',
            site: msg.vendor.site || '',
            url: msg.vendor.url || '',
            savedAt: Date.now(),
            // Pro fields (always present, used only when isPro)
            quotedPrice: null,
            contactLog: [],
            availabilityNotes: '',
            contactEmail: msg.vendor.contactEmail || '',
          };
          vendors.push(newVendor);
          await saveVendors(vendors);
        }
        // Open side panel on the tab that triggered the track action
        if (sender.tab?.id) {
          chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
        }
        sendResponse({ ok: true, alreadyTracked: exists });
        break;
      }

      // ── GET_VENDORS ───────────────────────────────────────────────────────
      case 'GET_VENDORS': {
        const vendors = await getVendors();
        sendResponse({ vendors });
        break;
      }

      // ── UPDATE_VENDOR ─────────────────────────────────────────────────────
      case 'UPDATE_VENDOR': {
        const vendors = await getVendors();
        const idx = vendors.findIndex(v => v.id === msg.id);
        if (idx !== -1) {
          vendors[idx] = { ...vendors[idx], ...msg.updates };
          await saveVendors(vendors);
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'Vendor not found' });
        }
        break;
      }

      // ── DELETE_VENDOR ─────────────────────────────────────────────────────
      case 'DELETE_VENDOR': {
        let vendors = await getVendors();
        vendors = vendors.filter(v => v.id !== msg.id);
        await saveVendors(vendors);
        sendResponse({ ok: true });
        break;
      }

      // ── ADD_CONTACT_LOG_ENTRY ─────────────────────────────────────────────
      case 'ADD_CONTACT_LOG_ENTRY': {
        const vendors = await getVendors();
        const idx = vendors.findIndex(v => v.id === msg.id);
        if (idx !== -1) {
          vendors[idx].contactLog = vendors[idx].contactLog || [];
          vendors[idx].contactLog.push({
            id: generateId(),
            dateContacted: msg.entry.dateContacted || new Date().toISOString().slice(0, 10),
            responseReceived: msg.entry.responseReceived || 'Awaiting',
            followUpDate: msg.entry.followUpDate || '',
            notes: msg.entry.notes || '',
          });
          await saveVendors(vendors);
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false });
        }
        break;
      }

      // ── EXPORT_CSV ────────────────────────────────────────────────────────
      case 'EXPORT_CSV': {
        const vendors = await getVendors();
        const opts = await getOptions();
        const rows = [['Name', 'Category', 'Price Range', 'Status', 'Notes', 'Site', 'URL', 'Saved Date', ...(opts.isPro ? ['Quoted Price', 'Availability Notes', 'Contact Email'] : [])]];
        for (const v of vendors) {
          const row = [
            v.name, v.category, v.priceRange, v.status, v.notes, v.site, v.url,
            new Date(v.savedAt).toLocaleDateString(),
            ...(opts.isPro ? [v.quotedPrice ?? '', v.availabilityNotes || '', v.contactEmail || ''] : []),
          ];
          rows.push(row);
        }
        const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        sendResponse({ csv });
        break;
      }

      // ── GET_OPTIONS ───────────────────────────────────────────────────────
      case 'GET_OPTIONS': {
        const opts = await getOptions();
        sendResponse(opts);
        break;
      }

      // ── SAVE_OPTIONS ──────────────────────────────────────────────────────
      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      // ── OPEN_STRIPE_CHECKOUT ──────────────────────────────────────────────
      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace with real Stripe Payment Link before launch
        chrome.tabs.create({ url: 'https://buy.stripe.com/wedding_vendor_tracker_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      // ── SET_PRO ───────────────────────────────────────────────────────────
      case 'SET_PRO': {
        await chrome.storage.sync.set({ isPro: msg.isPro });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep message channel open for async response
});

// ── Storage change listener (notify side panel) ───────────────────────────────
// When vendors change, broadcast to all extension pages so the side panel
// can refresh without polling.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.vendors) {
    chrome.runtime.sendMessage({ type: 'VENDORS_UPDATED' }).catch(() => {});
  }
});
