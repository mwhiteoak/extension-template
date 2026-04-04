// Vinyl Companion — Service Worker
// Handles price alert polling, Discogs lookups, messaging, and Stripe stub.

const DISCOGS_BASE = 'https://api.discogs.com';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ALERT_ALARM_NAME = 'vc-price-alerts';
const ALERT_POLL_HOURS = 6;

// ── Install / Alarm setup ────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
  await schedulePriceAlertAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALERT_ALARM_NAME) {
    await runPriceAlerts();
  }
});

async function schedulePriceAlertAlarm() {
  const existing = await chrome.alarms.get(ALERT_ALARM_NAME);
  if (!existing) {
    chrome.alarms.create(ALERT_ALARM_NAME, {
      delayInMinutes: ALERT_POLL_HOURS * 60,
      periodInMinutes: ALERT_POLL_HOURS * 60,
    });
  }
}

// ── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'GET_OPTIONS': {
        const opts = await getOptions();
        sendResponse(opts);
        break;
      }

      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      case 'DISCOGS_LOOKUP': {
        const result = await discogsLookup(msg.artist, msg.album);
        sendResponse(result);
        break;
      }

      case 'GET_PRICE': {
        const result = await getMarketplaceStats(msg.releaseId);
        sendResponse(result);
        break;
      }

      case 'ADD_TO_WANTLIST': {
        const opts = await getOptions();
        if (!opts.isPro) { sendResponse({ error: 'pro_required' }); break; }
        const result = await addToWantlist(opts.discogsUsername, opts.discogsToken, msg.releaseId);
        sendResponse(result);
        break;
      }

      case 'SET_PRICE_ALERT': {
        const opts = await getOptions();
        if (!opts.isPro) { sendResponse({ error: 'pro_required' }); break; }
        await setPriceAlert(msg.releaseId, msg.releaseTitle, msg.threshold, msg.currency);
        sendResponse({ ok: true });
        break;
      }

      case 'GET_COLLECTION_VALUE': {
        const opts = await getOptions();
        if (!opts.isPro) { sendResponse({ error: 'pro_required' }); break; }
        const result = await getCollectionValue(opts.discogsUsername, opts.discogsToken);
        sendResponse(result);
        break;
      }

      case 'OPEN_OPTIONS': {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        break;
      }

      case 'DISCOGS_OAUTH_START': {
        const result = await startDiscogsOAuth();
        sendResponse(result);
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async response
});

// ── Options helpers ──────────────────────────────────────────────────────────

async function getOptions() {
  return chrome.storage.sync.get({
    isPro: true,
    currency: 'USD',
    activeSites: ['spotify', 'youtube', 'pitchfork', 'allmusic'],
    discogsToken: null,
    discogsUsername: null,
  });
}

// ── Discogs search ───────────────────────────────────────────────────────────

async function discogsLookup(artist, album) {
  const cacheKey = `vc_cache_${artist}_${album}`.toLowerCase().replace(/\s+/g, '_');
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && Date.now() - cached[cacheKey].ts < CACHE_TTL_MS) {
    return cached[cacheKey].data;
  }

  const opts = await getOptions();
  const params = new URLSearchParams({
    release_title: album,
    artist: artist,
    type: 'release',
    format: 'vinyl',
    per_page: '5',
  });

  const headers = { 'User-Agent': 'VinylCompanionExtension/1.0' };
  if (opts.discogsToken) {
    headers['Authorization'] = `Discogs token=${opts.discogsToken}`;
  }

  try {
    const resp = await fetch(`${DISCOGS_BASE}/database/search?${params}`, { headers });
    if (!resp.ok) return { error: `Discogs search failed: ${resp.status}` };

    const json = await resp.json();
    const results = json.results || [];
    if (results.length === 0) return { error: 'no_results' };

    const top = results[0];
    const data = {
      releaseId: top.id,
      title: top.title,
      year: top.year,
      thumb: top.thumb,
      country: top.country,
      format: top.format,
      discogsUrl: `https://www.discogs.com${top.uri}`,
    };

    // Fetch community rating
    try {
      const ratingResp = await fetch(`${DISCOGS_BASE}/releases/${top.id}`, { headers });
      if (ratingResp.ok) {
        const rdata = await ratingResp.json();
        data.communityRating = rdata.community?.rating?.average || null;
        data.ratingCount = rdata.community?.rating?.count || 0;
        data.wantCount = rdata.community?.want || 0;
        data.haveCount = rdata.community?.have || 0;
      }
    } catch (_) {}

    await chrome.storage.local.set({ [cacheKey]: { ts: Date.now(), data } });
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

// ── Marketplace stats ────────────────────────────────────────────────────────

async function getMarketplaceStats(releaseId) {
  const cacheKey = `vc_mkt_${releaseId}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && Date.now() - cached[cacheKey].ts < CACHE_TTL_MS) {
    return cached[cacheKey].data;
  }

  const opts = await getOptions();
  const headers = { 'User-Agent': 'VinylCompanionExtension/1.0' };
  if (opts.discogsToken) {
    headers['Authorization'] = `Discogs token=${opts.discogsToken}`;
  }

  try {
    const resp = await fetch(`${DISCOGS_BASE}/marketplace/stats/${releaseId}?curr_abbr=${opts.currency}`, { headers });
    if (!resp.ok) return { error: `Marketplace fetch failed: ${resp.status}` };

    const json = await resp.json();
    const data = {
      lowestPrice: json.lowest_price?.value || null,
      currency: json.lowest_price?.currency || opts.currency,
      numForSale: json.num_for_sale || 0,
    };

    await chrome.storage.local.set({ [cacheKey]: { ts: Date.now(), data } });
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

// ── Wantlist (Pro) ───────────────────────────────────────────────────────────

async function addToWantlist(username, token, releaseId) {
  if (!username || !token) return { error: 'no_auth' };
  try {
    const resp = await fetch(`${DISCOGS_BASE}/users/${username}/wants/${releaseId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Discogs token=${token}`,
        'User-Agent': 'VinylCompanionExtension/1.0',
        'Content-Type': 'application/json',
      },
    });
    if (!resp.ok) return { error: `Wantlist add failed: ${resp.status}` };
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Price alerts (Pro) ───────────────────────────────────────────────────────

async function setPriceAlert(releaseId, releaseTitle, threshold, currency) {
  const stored = await chrome.storage.local.get('vc_alerts');
  const alerts = stored.vc_alerts || {};
  alerts[releaseId] = { releaseTitle, threshold, currency, setAt: Date.now() };
  await chrome.storage.local.set({ vc_alerts: alerts });
}

async function runPriceAlerts() {
  const opts = await getOptions();
  if (!opts.isPro) return;

  const stored = await chrome.storage.local.get('vc_alerts');
  const alerts = stored.vc_alerts || {};
  const ids = Object.keys(alerts);
  if (ids.length === 0) return;

  for (const releaseId of ids) {
    const alert = alerts[releaseId];
    try {
      const stats = await getMarketplaceStats(releaseId);
      if (stats.lowestPrice !== null && stats.lowestPrice <= alert.threshold) {
        chrome.notifications.create(`vc-alert-${releaseId}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
          title: 'Vinyl Companion: Price Alert',
          message: `"${alert.releaseTitle}" is now ${stats.currency} ${stats.lowestPrice} (your target: ${alert.threshold})`,
        });
      }
    } catch (_) {}
  }
}

// ── Collection value (Pro) ───────────────────────────────────────────────────

async function getCollectionValue(username, token) {
  if (!username || !token) return { error: 'no_auth' };
  const headers = {
    'Authorization': `Discogs token=${token}`,
    'User-Agent': 'VinylCompanionExtension/1.0',
  };
  try {
    const resp = await fetch(`${DISCOGS_BASE}/users/${username}/collection/folders/0/releases?per_page=50`, { headers });
    if (!resp.ok) return { error: `Collection fetch failed: ${resp.status}` };

    const json = await resp.json();
    const releases = json.releases || [];
    let total = 0;
    let counted = 0;

    for (const item of releases.slice(0, 20)) {
      const stats = await getMarketplaceStats(item.id);
      if (stats.lowestPrice) {
        total += stats.lowestPrice;
        counted++;
      }
    }

    return { total, counted, currency: 'USD', sampleSize: releases.length };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Discogs OAuth (Pro) ──────────────────────────────────────────────────────

async function startDiscogsOAuth() {
  // Discogs uses OAuth 1.0a — full flow requires a backend for token exchange.
  // This stub opens the Discogs personal token settings page for manual token entry.
  chrome.tabs.create({ url: 'https://www.discogs.com/settings/developers' });
  return { stub: true, message: 'Opened Discogs developer settings for token generation.' };
}
