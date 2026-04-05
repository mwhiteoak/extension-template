/**
 * Tank Scout — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Proxy cross-origin fetch requests for species data from content scripts
 * - Manage IndexedDB species cache with 7-day TTL
 * - Forward TANK_UPDATED messages to active content script tabs
 */

const DB_NAME = 'TankScoutDB';
const DB_VERSION = 1;
const STORE_NAME = 'speciesCache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getCached(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = (e) => {
      const record = e.target.result;
      if (!record) return resolve(null);
      const age = Date.now() - record.timestamp;
      if (age > CACHE_TTL_MS) return resolve(null); // expired
      resolve(record.data);
    };
    req.onerror = () => resolve(null);
  });
}

async function setCached(key, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// ── Species data fetching ─────────────────────────────────────────────────────

/**
 * Fetch species data for a given scientific name.
 * Returns a normalized species object, or null if not found.
 *
 * In a production build this would scrape Seriously Fish / FishBase.
 * Here we use the bundled species.json dataset as the source of truth,
 * with IndexedDB caching on top for future remote-fetch expansion.
 */
async function fetchSpeciesData(scientificName) {
  const cacheKey = `species:${scientificName.toLowerCase()}`;

  // Check cache first
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // For MVP, return null — the content script will look up the bundled JSON.
  // A future version would fetch from seriouslyfish.com and fishbase.org here.
  return null;
}

// ── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH_SPECIES') {
    fetchSpeciesData(msg.scientificName).then(sendResponse);
    return true; // keep channel open for async response
  }

  if (msg.type === 'CACHE_SPECIES') {
    setCached(`species:${msg.scientificName.toLowerCase()}`, msg.data)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === 'TANK_UPDATED') {
    // Forward to all aquarium site tabs
    const targetHosts = ['liveaquaria.com', 'aquabid.com', 'ebay.com'];
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        try {
          const url = new URL(tab.url);
          if (targetHosts.some((h) => url.hostname.includes(h))) {
            chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
          }
        } catch {
          // ignore non-URL tabs
        }
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[Tank Scout] Installed. Click the popup to set up your tank profile.');
  }
});
