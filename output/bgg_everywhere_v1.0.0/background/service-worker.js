// BGG Everywhere — Service Worker
// Handles BGG XML API2 lookups, caching, messaging, and Stripe stub.

const BGG_API = 'https://boardgamegeek.com/xmlapi2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Install ──────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

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

      case 'BGG_LOOKUP': {
        const result = await bggLookup(msg.title);
        sendResponse(result);
        break;
      }

      case 'BGG_WANTLIST_ADD': {
        const opts = await getOptions();
        if (!opts.isPro) { sendResponse({ error: 'pro_required' }); break; }
        if (!opts.bggUsername) { sendResponse({ error: 'no_auth' }); break; }
        const result = await bggWantlistAdd(opts.bggUsername, msg.bggId);
        sendResponse(result);
        break;
      }

      case 'OPEN_OPTIONS': {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'unknown_message_type' });
    }
  })();
  return true;
});

// ── Options ──────────────────────────────────────────────────────────────────

async function getOptions() {
  return chrome.storage.sync.get({
    isPro: true,
    displayMode: 'expanded',
    activeSites: ['amazon', 'target', 'walmart', 'miniaturemarket', 'coolstuffinc', 'gamenerdz', 'funagain'],
    bggUsername: null,
  });
}

// ── BGG XML API2 lookup ──────────────────────────────────────────────────────

async function bggLookup(title) {
  const cacheKey = `bgg_cache_${title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;

  // Check cache first
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && Date.now() - cached[cacheKey].ts < CACHE_TTL_MS) {
    return cached[cacheKey].data;
  }

  try {
    // Step 1: Search for the game
    const searchUrl = `${BGG_API}/search?query=${encodeURIComponent(title)}&type=boardgame&exact=1`;
    let resp = await fetch(searchUrl);
    if (!resp.ok) throw new Error(`Search HTTP ${resp.status}`);
    let xml = await resp.text();
    let gameId = extractFirstSearchResult(xml);

    // If exact match fails, try non-exact
    if (!gameId) {
      const searchUrl2 = `${BGG_API}/search?query=${encodeURIComponent(title)}&type=boardgame`;
      resp = await fetch(searchUrl2);
      if (!resp.ok) throw new Error(`Search HTTP ${resp.status}`);
      xml = await resp.text();
      gameId = extractFirstSearchResult(xml);
    }

    if (!gameId) return { error: 'no_results' };

    // Step 2: Fetch details
    const detailUrl = `${BGG_API}/thing?id=${gameId}&stats=1`;
    resp = await fetch(detailUrl);

    // BGG API may return 202 (queued) — retry once after delay
    if (resp.status === 202) {
      await new Promise(r => setTimeout(r, 1500));
      resp = await fetch(detailUrl);
    }

    if (!resp.ok) throw new Error(`Thing HTTP ${resp.status}`);
    xml = await resp.text();

    const data = parseThingXml(xml, gameId);
    if (!data) return { error: 'parse_error' };

    await chrome.storage.local.set({ [cacheKey]: { ts: Date.now(), data } });
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

// ── XML parsers ──────────────────────────────────────────────────────────────

function extractFirstSearchResult(xml) {
  // <item type="boardgame" id="XXXX">
  const match = xml.match(/<item[^>]+type="boardgame"[^>]+id="(\d+)"/);
  return match ? match[1] : null;
}

function parseThingXml(xml, gameId) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const item = doc.querySelector('item');
    if (!item) return null;

    // Primary name
    const nameEl = item.querySelector('name[type="primary"]');
    const name = nameEl ? nameEl.getAttribute('value') : null;

    // Year
    const yearEl = item.querySelector('yearpublished');
    const year = yearEl ? yearEl.getAttribute('value') : null;

    // Min/max players
    const minPlayersEl = item.querySelector('minplayers');
    const maxPlayersEl = item.querySelector('maxplayers');
    const minPlayers = minPlayersEl ? minPlayersEl.getAttribute('value') : null;
    const maxPlayers = maxPlayersEl ? maxPlayersEl.getAttribute('value') : null;

    // Best players (from poll)
    const bestPlayers = extractBestPlayers(item);

    // Play time
    const minTimeEl = item.querySelector('minplaytime');
    const maxTimeEl = item.querySelector('maxplaytime');
    const playTimeEl = item.querySelector('playingtime');
    const minTime = minTimeEl ? minTimeEl.getAttribute('value') : null;
    const maxTime = maxTimeEl ? maxTimeEl.getAttribute('value') : null;
    const playTime = playTimeEl ? playTimeEl.getAttribute('value') : null;

    // Stats
    const statsEl = item.querySelector('statistics ratings');
    let rating = null, ratingCount = null, rank = null, categoryRank = null, weight = null;

    if (statsEl) {
      const avgEl = statsEl.querySelector('average');
      rating = avgEl ? avgEl.getAttribute('value') : null;

      const usersRatedEl = statsEl.querySelector('usersrated');
      ratingCount = usersRatedEl ? usersRatedEl.getAttribute('value') : null;

      // Ranks
      const ranksEl = statsEl.querySelectorAll('ranks rank');
      for (const r of ranksEl) {
        const type = r.getAttribute('type');
        const val = r.getAttribute('value');
        if (type === 'subtype' && r.getAttribute('name') === 'boardgame') {
          rank = val !== 'Not Ranked' ? val : null;
        } else if (type === 'family' && !categoryRank) {
          const friendlyName = r.getAttribute('friendlyname') || '';
          if (val && val !== 'Not Ranked') {
            categoryRank = `#${val} ${friendlyName.replace(' Rank', '')}`;
          }
        }
      }

      // Complexity weight
      const weightEl = statsEl.querySelector('averageweight');
      weight = weightEl ? weightEl.getAttribute('value') : null;
      if (weight === '0') weight = null;
    }

    return {
      id: gameId,
      name,
      year,
      minPlayers,
      maxPlayers,
      bestPlayers,
      minTime: minTime === '0' ? null : minTime,
      maxTime: maxTime === '0' ? null : maxTime,
      playTime: playTime === '0' ? null : playTime,
      rating: rating && parseFloat(rating) > 0 ? rating : null,
      ratingCount,
      rank,
      categoryRank,
      weight: weight && parseFloat(weight) > 0 ? weight : null,
    };
  } catch (_) {
    return null;
  }
}

function extractBestPlayers(item) {
  // Poll: suggested_numplayers
  const poll = item.querySelector('poll[name="suggested_numplayers"]');
  if (!poll) return null;

  let bestCount = null;
  let bestVotes = 0;

  const results = poll.querySelectorAll('results');
  for (const result of results) {
    const numPlayers = result.getAttribute('numplayers');
    if (!numPlayers || numPlayers.includes('+')) continue;

    const bestEl = result.querySelector('result[value="Best"]');
    const votes = bestEl ? parseInt(bestEl.getAttribute('numvotes') || '0', 10) : 0;
    if (votes > bestVotes) {
      bestVotes = votes;
      bestCount = numPlayers;
    }
  }

  return bestCount && bestVotes > 0 ? bestCount : null;
}

// ── BGG Want-list (Pro stub) ─────────────────────────────────────────────────
// BGG's XML API2 supports want-list writes but requires OAuth 1.0a (username + password).
// This stub opens BGG for manual addition. Full implementation requires a backend
// to handle the credential exchange securely.

async function bggWantlistAdd(username, bggId) {
  // Open BGG want-list page as a stub — real BGG API write requires OAuth
  chrome.tabs.create({
    url: `https://boardgamegeek.com/boardgame/${bggId}`,
  });
  return { ok: true, stub: true };
}

// ── Stripe stub ──────────────────────────────────────────────────────────────
// Pro billing at $5/mo. Full Stripe integration requires a backend.
// Stub: sets isPro=true for local testing.

async function stripeUpgrade() {
  await chrome.storage.sync.set({ isPro: true });
  return { ok: true, stub: true };
}
