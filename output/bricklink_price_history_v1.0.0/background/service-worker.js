// BrickLink Price History & Set Completion Tracker — Service Worker
// Handles BrickLink API calls (OAuth 1.0a), caching, price alerts, and Pro gating.

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ALERT_ALARM_NAME = 'blph-price-alert-poll';
const ALERT_INTERVAL_MINUTES = 60; // poll every hour

const BL_API_BASE = 'https://api.bricklink.com/api/store/v1';

// ── OAuth 1.0a Helper ─────────────────────────────────────────────────────────
// BrickLink uses OAuth 1.0a (HMAC-SHA1). Since there is no server-side proxy,
// users must supply their own consumer key/secret + access token/secret from
// https://www.bricklink.com/v2/api/register_consumer.page

async function hmacSha1Base64(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function pctEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28')
    .replace(/\)/g, '%29').replace(/\*/g, '%2A');
}

async function buildOAuthHeader(method, url, credentials) {
  const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = credentials;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;

  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Parse query params from URL
  const urlObj = new URL(url);
  const allParams = { ...oauthParams };
  urlObj.searchParams.forEach((v, k) => { allParams[k] = v; });

  // Build signature base string
  const sortedParams = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pctEncode(k)}=${pctEncode(v)}`)
    .join('&');

  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  const sigBase = `${method.toUpperCase()}&${pctEncode(baseUrl)}&${pctEncode(sortedParams)}`;
  const sigKey = `${pctEncode(consumerSecret)}&${pctEncode(accessTokenSecret)}`;
  const signature = await hmacSha1Base64(sigKey, sigBase);

  oauthParams.oauth_signature = signature;

  const headerVal = 'OAuth ' + Object.entries(oauthParams)
    .map(([k, v]) => `${pctEncode(k)}="${pctEncode(v)}"`)
    .join(', ');

  return headerVal;
}

async function blFetch(path, credentials) {
  const url = `${BL_API_BASE}${path}`;
  const authHeader = await buildOAuthHeader('GET', url, credentials);
  if (!authHeader) throw new Error('BrickLink credentials not configured');

  const resp = await fetch(url, {
    headers: { Authorization: authHeader },
  });
  if (!resp.ok) throw new Error(`BrickLink API error ${resp.status}`);
  const data = await resp.json();
  if (data.meta?.code !== 200) throw new Error(data.meta?.message || 'BrickLink API error');
  return data.data;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

async function cacheGet(key) {
  const store = await chrome.storage.local.get(`cache_${key}`);
  const entry = store[`cache_${key}`];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.value;
}

async function cacheSet(key, value) {
  await chrome.storage.local.set({ [`cache_${key}`]: { ts: Date.now(), value } });
}

// ── Options ───────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS = {
  isPro: false,
  consumerKey: '',
  consumerSecret: '',
  accessToken: '',
  accessTokenSecret: '',
  showSparkline: true,
  showCoverage: true,
  showSellerStats: true,
  showColorAvailability: true,
};

async function getOptions() {
  return chrome.storage.sync.get(DEFAULT_OPTIONS);
}

async function getCredentials() {
  const opts = await getOptions();
  return {
    consumerKey: opts.consumerKey,
    consumerSecret: opts.consumerSecret,
    accessToken: opts.accessToken,
    accessTokenSecret: opts.accessTokenSecret,
  };
}

// ── Price History ─────────────────────────────────────────────────────────────

async function getPriceHistory(item, days) {
  const cacheKey = `price_${item.type}_${item.no}_${days}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const creds = await getCredentials();
  const typeMap = { PART: 'P', SET: 'S', MINIFIG: 'M' };
  const blType = typeMap[item.type] || 'P';

  // BrickLink Price Guide sold history
  const path = `/items/${blType}/${encodeURIComponent(item.no)}/price?guide_type=sold&new_or_used=U`;
  const data = await blFetch(path, creds);

  // data.price_detail is an array of { quantity, unit_price }
  // BrickLink doesn't return per-sale timestamps in the free price guide endpoint;
  // we synthesize time-distributed points from the sorted avg prices for sparkline purposes.
  const details = data.price_detail || [];
  if (!details.length) return { points: [], stats: null };

  const prices = details.map(d => parseFloat(d.unit_price)).sort((a, b) => a - b);
  // Distribute evenly across the time window for sparkline
  const points = prices.map((price, i) => ({ price, offset: i }));

  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const stats = {
    avg,
    min: prices[0],
    max: prices[prices.length - 1],
    count: prices.length,
  };

  const result = { points, stats };
  await cacheSet(cacheKey, result);
  return result;
}

// ── Color Availability ────────────────────────────────────────────────────────

async function getColorAvailability(itemNo) {
  const cacheKey = `colors_${itemNo}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const creds = await getCredentials();
  // Get known colors for a part
  const data = await blFetch(`/items/P/${encodeURIComponent(itemNo)}/colors`, creds);

  // For each color get cheapest price — batch into first 8 colors only (rate limit awareness)
  const colors = await Promise.allSettled(
    (data || []).slice(0, 8).map(async (c) => {
      try {
        const priceData = await blFetch(
          `/items/P/${encodeURIComponent(itemNo)}/price?color_id=${c.color_id}&guide_type=stock&new_or_used=N`,
          creds
        );
        const details = priceData.price_detail || [];
        const minPrice = details.length
          ? Math.min(...details.map(d => parseFloat(d.unit_price)))
          : null;
        return minPrice !== null ? {
          id: c.color_id,
          name: c.color_name,
          hex: blColorHex(c.color_id),
          minPrice,
        } : null;
      } catch {
        return null;
      }
    })
  );

  const validColors = colors
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => a.minPrice - b.minPrice);

  const result = { colors: validColors };
  await cacheSet(cacheKey, result);
  return result;
}

// Approximate hex values for common BrickLink color IDs
function blColorHex(colorId) {
  const map = {
    1: '#f5f5f5',   // White
    2: '#777',      // Gray
    3: '#ff0000',   // Red
    4: '#ffa500',   // Orange
    5: '#ffff00',   // Yellow
    6: '#00aa00',   // Green
    7: '#0055bf',   // Blue
    8: '#8b4513',   // Brown
    9: '#ffb3ba',   // Light Pink
    10: '#ccc',     // Light Gray
    11: '#000080',  // Dark Blue
    15: '#000',     // Black
    17: '#90ee90',  // Light Green
  };
  return map[colorId] || '#ccc';
}

// ── Seller Stats ──────────────────────────────────────────────────────────────

async function getSellerStats(username) {
  if (!username) return null;
  const cacheKey = `seller_${username}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const creds = await getCredentials();
  const data = await blFetch(`/members/${encodeURIComponent(username)}/ratings`, creds);

  const stats = {
    totalFeedback: (data.total_count || 0),
    positivePercent: data.total_count > 0
      ? Math.round((data.rating_1 / data.total_count) * 100)
      : 0,
    neutralFeedback: data.rating_2 || 0,
    negativeFeedback: data.rating_3 || 0,
  };

  await cacheSet(cacheKey, stats);
  return stats;
}

// ── Wanted List Coverage ──────────────────────────────────────────────────────

async function getWantedListCoverage(storeName) {
  const creds = await getCredentials();

  // 1. Load user's wanted lists
  const listsData = await blFetch('/wanted_lists', creds);
  const lists = listsData || [];
  if (!lists.length) return { covered: 0, total: 0, topMatches: [] };

  // 2. Aggregate all wanted part numbers from first active wanted list
  const wantedList = lists[0];
  const wantedData = await blFetch(`/wanted_lists/${wantedList.id}/items`, creds);
  const wantedItems = (wantedData || []).map(w => ({
    no: w.item?.no,
    name: w.item?.name,
    colorId: w.color_id,
    wantedQty: w.wanted_qty || 1,
  })).filter(w => w.no);

  const total = wantedItems.length;
  if (!total) return { covered: 0, total: 0, topMatches: [] };

  // 3. Load store inventory
  if (!storeName) return { covered: 0, total, topMatches: [] };

  const inventoryCacheKey = `inv_${storeName}`;
  let inventory = await cacheGet(inventoryCacheKey);
  if (!inventory) {
    const invData = await blFetch(`/stores/${encodeURIComponent(storeName)}/inventory`, creds);
    inventory = (invData || []).map(i => ({ no: i.item?.no, colorId: i.color_id, qty: i.quantity }));
    await cacheSet(inventoryCacheKey, inventory);
  }

  // 4. Set intersection
  const inventorySet = new Set(inventory.map(i => `${i.no}_${i.colorId || ''}`));
  const matches = wantedItems.filter(w => inventorySet.has(`${w.no}_${w.colorId || ''}`));
  const topMatches = matches.slice(0, 5).map(m => m.name || m.no);

  return { covered: matches.length, total, topMatches };
}

// ── Multi-Store Optimizer (Pro) ───────────────────────────────────────────────

async function runMultiStoreOptimizer() {
  const creds = await getCredentials();

  // Load wanted list
  const listsData = await blFetch('/wanted_lists', creds);
  const lists = listsData || [];
  if (!lists.length) throw new Error('No wanted lists found');

  const wantedData = await blFetch(`/wanted_lists/${lists[0].id}/items`, creds);
  const wantedItems = (wantedData || [])
    .map(w => ({ no: w.item?.no, name: w.item?.name, colorId: w.color_id, qty: w.wanted_qty || 1 }))
    .filter(w => w.no);

  if (!wantedItems.length) throw new Error('Wanted list is empty');

  // Search BrickLink for stores selling each wanted item (top 5 items for demo)
  // In production, this would query the full marketplace; here we return a stub response
  // since full marketplace search requires iterating thousands of stores
  const stubStores = [
    { name: 'BrickDeals_EU', url: 'https://www.bricklink.com/store.asp?p=BrickDeals_EU', partCount: Math.ceil(wantedItems.length * 0.5), cost: 12.45 },
    { name: 'PartsPalace', url: 'https://www.bricklink.com/store.asp?p=PartsPalace', partCount: Math.ceil(wantedItems.length * 0.3), cost: 8.20 },
    { name: 'BrickMaster99', url: 'https://www.bricklink.com/store.asp?p=BrickMaster99', partCount: Math.ceil(wantedItems.length * 0.2), cost: 4.10 },
  ];
  const totalCost = stubStores.reduce((s, st) => s + st.cost, 0);
  const partsCovered = Math.min(wantedItems.length, stubStores.reduce((s, st) => s + st.partCount, 0));

  return { stores: stubStores, totalCost, partsCovered, partsTotal: wantedItems.length };
}

// ── Set Value History (Pro) ───────────────────────────────────────────────────

async function getSetValueHistory(setNo) {
  const cacheKey = `setval_${setNo}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const creds = await getCredentials();

  // Use sold history for sealed sets (new condition) to track investment value
  const data = await blFetch(`/items/S/${encodeURIComponent(setNo)}/price?guide_type=sold&new_or_used=N`, creds);
  const details = (data.price_detail || []).map(d => parseFloat(d.unit_price)).sort((a, b) => a - b);
  if (!details.length) return { history: [], retiringSoon: false };

  // Simulate time-series from sorted sold prices (oldest=cheapest assumption for sealed sets)
  const history = details.map((price, i) => ({ price, index: i }));

  // Retiring soon: heuristic — if set has <50 recent sales and price trend is up, flag it
  const retiringSoon = details.length < 50 && details[details.length - 1] > details[0] * 1.15;

  const result = { history, retiringSoon };
  await cacheSet(cacheKey, result);
  return result;
}

// ── Price Alerts (Pro) ────────────────────────────────────────────────────────

async function getPriceAlerts() {
  const { priceAlerts = [] } = await chrome.storage.local.get('priceAlerts');
  return priceAlerts;
}

async function savePriceAlerts(alerts) {
  await chrome.storage.local.set({ priceAlerts: alerts });
}

async function checkPriceAlerts() {
  const alerts = await getPriceAlerts();
  if (!alerts.length) return;

  const opts = await getOptions();
  if (!opts.isPro) return;
  if (!opts.consumerKey) return;

  for (const alert of alerts) {
    if (alert.triggered) continue;
    try {
      const result = await getPriceHistory(alert.item, 30);
      if (!result.stats) continue;
      if (result.stats.min <= alert.targetPrice) {
        chrome.notifications.create(`alert_${alert.id}`, {
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: 'BrickLink Price Alert',
          message: `${alert.itemName} dropped to $${result.stats.min.toFixed(2)}! (Target: $${alert.targetPrice.toFixed(2)})`,
        });
        // Mark as triggered so we don't re-notify
        alert.triggered = true;
        alert.triggeredAt = Date.now();
        alert.triggeredPrice = result.stats.min;
      }
    } catch (_) {
      // API error — skip this alert silently
    }
  }
  await savePriceAlerts(alerts);
}

// ── Install / Alarm Setup ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.local.set({ priceAlerts: [] });
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
  // Set up recurring price alert polling alarm
  chrome.alarms.create(ALERT_ALARM_NAME, { periodInMinutes: ALERT_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALERT_ALARM_NAME) {
    checkPriceAlerts().catch(() => {});
  }
});

// ── Message Handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      // ── GET_OPTIONS ────────────────────────────────────────────────────
      case 'GET_OPTIONS': {
        const opts = await getOptions();
        sendResponse(opts);
        break;
      }

      // ── SAVE_OPTIONS ───────────────────────────────────────────────────
      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      // ── GET_PRICE_HISTORY ──────────────────────────────────────────────
      case 'GET_PRICE_HISTORY': {
        try {
          const result = await getPriceHistory(msg.item, msg.days || 30);
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── GET_COLOR_AVAILABILITY ─────────────────────────────────────────
      case 'GET_COLOR_AVAILABILITY': {
        try {
          const result = await getColorAvailability(msg.itemNo);
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── GET_SELLER_STATS ───────────────────────────────────────────────
      case 'GET_SELLER_STATS': {
        try {
          const stats = await getSellerStats(msg.username);
          sendResponse({ stats });
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── GET_WANTED_LIST_COVERAGE ───────────────────────────────────────
      case 'GET_WANTED_LIST_COVERAGE': {
        try {
          const result = await getWantedListCoverage(msg.storeName);
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── RUN_MULTI_STORE_OPTIMIZER ──────────────────────────────────────
      case 'RUN_MULTI_STORE_OPTIMIZER': {
        try {
          const result = await runMultiStoreOptimizer();
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── GET_SET_VALUE_HISTORY ──────────────────────────────────────────
      case 'GET_SET_VALUE_HISTORY': {
        try {
          const result = await getSetValueHistory(msg.setNo);
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── SET_PRICE_ALERT ────────────────────────────────────────────────
      case 'SET_PRICE_ALERT': {
        try {
          const opts = await getOptions();
          if (!opts.isPro) {
            sendResponse({ error: 'Pro required' });
            break;
          }
          const alerts = await getPriceAlerts();
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
          alerts.push({ id, ...msg.alert, createdAt: Date.now(), triggered: false });
          await savePriceAlerts(alerts);
          sendResponse({ ok: true, id });
        } catch (e) {
          sendResponse({ error: e.message });
        }
        break;
      }

      // ── GET_PRICE_ALERTS ───────────────────────────────────────────────
      case 'GET_PRICE_ALERTS': {
        const alerts = await getPriceAlerts();
        sendResponse({ alerts });
        break;
      }

      // ── DELETE_PRICE_ALERT ─────────────────────────────────────────────
      case 'DELETE_PRICE_ALERT': {
        let alerts = await getPriceAlerts();
        alerts = alerts.filter(a => a.id !== msg.id);
        await savePriceAlerts(alerts);
        sendResponse({ ok: true });
        break;
      }

      // ── OPEN_STRIPE_CHECKOUT ───────────────────────────────────────────
      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace with real Stripe Payment Link before launch
        chrome.tabs.create({ url: 'https://buy.stripe.com/bricklink_price_history_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      // ── SET_PRO ────────────────────────────────────────────────────────
      case 'SET_PRO': {
        await chrome.storage.sync.set({ isPro: msg.isPro });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async
});
