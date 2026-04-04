// Triathlon Race Day Pacing Planner — Race Detector Content Script
// Scrapes the page DOM for race distance keywords and broadcasts the result.

const RACE_PATTERNS = {
  full:    /\b(140[\.\s]?6|full\s+iron\w*|ironman(?!\s*70))\b/i,
  half:    /\b(70[\.\s]?3|half\s+iron\w*|half\s+distance)\b/i,
  olympic: /\bolympic(?:\s+distance)?\b/i,
  sprint:  /\bsprint(?:\s+distance)?\b/i,
};

// Distances in meters
const RACE_DISTANCES = {
  sprint:  { swim: 750,  bike: 20000,  run: 5000 },
  olympic: { swim: 1500, bike: 40000,  run: 10000 },
  half:    { swim: 1900, bike: 90000,  run: 21097 },
  full:    { swim: 3800, bike: 180000, run: 42195 },
};

function detectRaceDistance() {
  // Prioritize structured elements: headings, titles, og:title, meta description
  const candidates = [
    document.title,
    document.querySelector('h1')?.textContent,
    document.querySelector('h2')?.textContent,
    document.querySelector('meta[property="og:title"]')?.content,
    document.querySelector('meta[name="description"]')?.content,
    document.querySelector('.event-title, .race-title, .event-name, .page-title')?.textContent,
    // ironman.com specific selectors
    document.querySelector('[class*="race-distance"], [class*="event-distance"], [data-distance]')?.textContent,
    // Broader body text fallback
    document.body?.innerText?.slice(0, 2000),
  ].filter(Boolean).join(' ');

  // Check in priority order: full > half > olympic > sprint
  for (const [type, pattern] of Object.entries(RACE_PATTERNS)) {
    if (pattern.test(candidates)) {
      return { type, distances: RACE_DISTANCES[type] };
    }
  }

  return null;
}

function broadcast(raceData) {
  window.__tri_race = raceData;
  window.dispatchEvent(new CustomEvent('tri:race-detected', { detail: raceData }));
}

// Initial detection
let detected = detectRaceDistance();
if (detected) broadcast(detected);

// Re-detect on SPA navigation (MutationObserver on title + main content)
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const fresh = detectRaceDistance();
    if (fresh && (!detected || fresh.type !== detected?.type)) {
      detected = fresh;
      broadcast(fresh);
    }
  }, 600);
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
  characterData: false,
  attributes: false,
});

// Respond to requests from the overlay iframe (via service worker relay is not needed —
// the injector asks directly via window.postMessage)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_RACE_DATA') {
    sendResponse(detected || null);
  }
  return false;
});
