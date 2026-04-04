// Espresso Community Intelligence — Service Worker
// Handles Reddit API calls, 24h caching, and tier data

const REDDIT_SEARCH_URL = 'https://www.reddit.com/r/espresso/search.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Static tier mapping seeded from r/espresso wiki
// Keys are lowercase product name fragments; values are tier info
const TIER_MAP = [
  // Commercial
  { key: 'la marzocco gs3', tier: 'Commercial', color: '#b55a3a' },
  { key: 'gs/3', tier: 'Commercial', color: '#b55a3a' },
  { key: 'synesso', tier: 'Commercial', color: '#b55a3a' },
  { key: 'slayer', tier: 'Commercial', color: '#b55a3a' },
  { key: 'kees van der westen', tier: 'Commercial', color: '#b55a3a' },
  { key: 'victoria arduino', tier: 'Commercial', color: '#b55a3a' },
  { key: 'mazzer super jolly', tier: 'Commercial', color: '#b55a3a' },
  // Prosumer
  { key: 'la marzocco linea mini', tier: 'Prosumer', color: '#b5963a' },
  { key: 'linea mini', tier: 'Prosumer', color: '#b5963a' },
  { key: 'lelit bianca', tier: 'Prosumer', color: '#b5963a' },
  { key: 'profitec pro 600', tier: 'Prosumer', color: '#b5963a' },
  { key: 'profitec pro 700', tier: 'Prosumer', color: '#b5963a' },
  { key: 'profitec pro 500', tier: 'Prosumer', color: '#b5963a' },
  { key: 'profitec pro 400', tier: 'Prosumer', color: '#b5963a' },
  { key: 'ecm synchronika', tier: 'Prosumer', color: '#b5963a' },
  { key: 'ecm technika', tier: 'Prosumer', color: '#b5963a' },
  { key: 'rocket giotto', tier: 'Prosumer', color: '#b5963a' },
  { key: 'rocket r58', tier: 'Prosumer', color: '#b5963a' },
  { key: 'breville dual boiler', tier: 'Prosumer', color: '#b5963a' },
  { key: 'sage dual boiler', tier: 'Prosumer', color: '#b5963a' },
  { key: 'oracle', tier: 'Prosumer', color: '#b5963a' },
  { key: 'lagom p64', tier: 'Prosumer', color: '#b5963a' },
  { key: 'weber key', tier: 'Prosumer', color: '#b5963a' },
  { key: 'weber eg-1', tier: 'Prosumer', color: '#b5963a' },
  { key: 'rancilio silvia pro', tier: 'Prosumer', color: '#b5963a' },
  // Enthusiast
  { key: 'gaggia classic pro', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'gaggia classic', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'rancilio silvia', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'lelit elizabeth', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'lelit mara', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'profitec pro 300', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'ecm classika', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'ecm mechanika', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'rocket appartamento', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'breville barista express', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'barista express', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'barista pro', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'barista touch', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'niche zero', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'df64', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'df83', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'eureka mignon', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'baratza sette', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'fellow opus', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'comandante', tier: 'Enthusiast', color: '#7a8bb5' },
  { key: 'mazzer mini', tier: 'Enthusiast', color: '#7a8bb5' },
  // Beginner
  { key: 'bambino plus', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'bambino', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'dedica arte', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'dedica', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'baratza encore', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'delonghi dedica', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'magnifica', tier: 'Beginner', color: '#6b8e6b' },
  { key: 'stilosa', tier: 'Beginner', color: '#6b8e6b' },
];

const UPGRADE_PATHS = {
  Beginner: 'Many Beginner users upgrade to Gaggia Classic Pro or Rancilio Silvia within 12–18 months for better temperature stability and steam power.',
  Enthusiast: 'Enthusiast users often move to Lelit Bianca or Profitec Pro 600 for dual-boiler convenience and simultaneous brew + steam.',
  Prosumer: 'Prosumer users seeking commercial-grade reliability look at La Marzocco Linea Mini or ECM Synchronika.',
  Commercial: "You're at the top tier — commercial-grade equipment trusted by professional baristas.",
};

function lookupTier(productName) {
  const lower = productName.toLowerCase();
  for (const entry of TIER_MAP) {
    if (lower.includes(entry.key)) {
      return { tier: entry.tier, color: entry.color };
    }
  }
  return null;
}

async function fetchRedditData(productName) {
  const cacheKey = 'reddit_' + productName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const stored = await chrome.storage.local.get(cacheKey);
  if (stored[cacheKey] && Date.now() - stored[cacheKey].fetchedAt < CACHE_TTL_MS) {
    return stored[cacheKey].data;
  }

  const params = new URLSearchParams({
    q: productName,
    restrict_sr: 'true',
    sort: 'relevance',
    t: 'year',
    limit: '5',
    type: 'link',
  });

  try {
    const res = await fetch(`${REDDIT_SEARCH_URL}?${params}`, {
      headers: { 'User-Agent': 'EspressoCommunityIntelligence/1.0 (Chrome Extension)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const posts = (json?.data?.children || []).map(c => ({
      title: c.data.title,
      url: 'https://www.reddit.com' + c.data.permalink,
      score: c.data.score,
      numComments: c.data.num_comments,
    }));
    const data = { posts, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [cacheKey]: { data, fetchedAt: Date.now() } });
    return data;
  } catch (_) {
    return null;
  }
}

// ── Install ───────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'GET_ESPRESSO_DATA': {
        const { productName } = msg;
        const tierInfo = lookupTier(productName);
        const upgradePath = tierInfo ? UPGRADE_PATHS[tierInfo.tier] : null;
        const redditData = await fetchRedditData(productName);
        sendResponse({ tierInfo, upgradePath, redditData });
        break;
      }

      case 'GET_OPTIONS': {
        const opts = await chrome.storage.sync.get({
          enabledSites: ['seattlecoffeegear.com', 'prima-coffee.com', 'clivecoffee.com'],
          showTier: true,
          showSentiment: true,
          showRedditLink: true,
          showUpgrade: true,
          isPro: false,
        });
        sendResponse(opts);
        break;
      }

      case 'SAVE_OPTIONS': {
        await chrome.storage.sync.set(msg.options);
        sendResponse({ ok: true });
        break;
      }

      case 'OPEN_STRIPE_CHECKOUT': {
        // Stripe stub — replace with real Stripe Payment Link before launch
        chrome.tabs.create({ url: 'https://buy.stripe.com/espresso_community_pro_placeholder' });
        sendResponse({ ok: true });
        break;
      }

      case 'SET_PRO': {
        await chrome.storage.sync.set({ isPro: msg.isPro });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true;
});
