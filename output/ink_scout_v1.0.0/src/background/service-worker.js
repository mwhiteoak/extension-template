// src/background/service-worker.js
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var INKSWATCH_BASE = "https://www.inkswatches.com";
var FPN_SEARCH_BASE = "https://www.fountainpennetwork.com/forum/index.php?app=core&module=search&search_index=forums&search_in=titles";
function normalizeInkName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}
function cacheKey(brand, inkName) {
  return `ink_scout:${normalizeInkName(brand)}:${normalizeInkName(inkName)}`;
}
async function getCached(key) {
  const result = await chrome.storage.local.get(key);
  if (!result[key])
    return null;
  const { data, cachedAt } = result[key];
  if (Date.now() - cachedAt > CACHE_TTL_MS) {
    await chrome.storage.local.remove(key);
    return null;
  }
  return data;
}
async function setCached(key, data) {
  await chrome.storage.local.set({ [key]: { data, cachedAt: Date.now() } });
}
async function fetchInkSwatchData(brand, inkName) {
  const query = encodeURIComponent(`${brand} ${inkName}`);
  const searchUrl = `${INKSWATCH_BASE}/inks?search=${query}`;
  let resp;
  try {
    resp = await fetch(searchUrl, {
      headers: { "Accept": "text/html", "User-Agent": "InkScout/1.0 (browser extension)" }
    });
  } catch (err) {
    console.warn("[InkScout] InkSwatch fetch failed:", err);
    return null;
  }
  if (!resp.ok)
    return null;
  const html = await resp.text();
  return parseInkSwatchSearchPage(html, brand, inkName, searchUrl);
}
function parseInkSwatchSearchPage(html, brand, inkName, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const jsonldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonldScripts) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"] === "ItemList") {
          const structured = extractFromJsonLD(item, brand, inkName);
          if (structured)
            return structured;
        }
      }
    } catch (_) {
    }
  }
  const cards = doc.querySelectorAll(
    '.ink-card, .ink-result, [class*="ink"], article[data-ink], .product-card'
  );
  for (const card of cards) {
    const titleEl = card.querySelector('h2, h3, .ink-name, .title, [class*="name"]');
    const title = titleEl ? titleEl.textContent.trim() : "";
    if (!isMatch(title, brand, inkName))
      continue;
    const swatches = extractSwatchImages(card);
    const ratings = extractRatings(card);
    const inkPageUrl = extractLinkHref(card, sourceUrl);
    if (swatches.length > 0 || ratings) {
      return { swatches, ratings, inkPageUrl, sourceUrl, found: true };
    }
  }
  return { swatches: [], ratings: null, inkPageUrl: null, sourceUrl, found: false };
}
function extractFromJsonLD(item, brand, inkName) {
  const name = item.name || "";
  if (!isMatch(name, brand, inkName))
    return null;
  const swatches = [];
  if (item.image) {
    const images = Array.isArray(item.image) ? item.image : [item.image];
    swatches.push(...images.map((img) => typeof img === "string" ? img : img.url).filter(Boolean));
  }
  return { swatches, ratings: extractJsonLDRatings(item), inkPageUrl: item.url || null, found: swatches.length > 0 };
}
function extractJsonLDRatings(item) {
  if (!item.aggregateRating && !item.additionalProperty)
    return null;
  const ratings = {};
  if (item.aggregateRating) {
    ratings.overallRating = parseFloat(item.aggregateRating.ratingValue) || null;
  }
  if (Array.isArray(item.additionalProperty)) {
    for (const prop of item.additionalProperty) {
      switch ((prop.name || "").toLowerCase()) {
        case "water resistance":
          ratings.waterResistance = normalizeStarRating(prop.value);
          break;
        case "shading":
          ratings.shading = normalizeTextRating(prop.value);
          break;
        case "sheening":
          ratings.sheening = normalizeTextRating(prop.value);
          break;
      }
    }
  }
  return Object.keys(ratings).length > 0 ? ratings : null;
}
function extractSwatchImages(card) {
  const imgs = card.querySelectorAll('img[src*="swatch"], img[alt*="swatch"], img[alt*="paper"], img[class*="swatch"], img');
  const urls = [];
  for (const img of imgs) {
    const src = img.src || img.dataset.src;
    if (src && !src.includes("placeholder") && !src.includes("blank")) {
      urls.push({ url: src, alt: img.alt || "" });
    }
  }
  return urls.slice(0, 6);
}
function extractRatings(card) {
  const ratings = {};
  const wrEl = card.querySelector('[class*="water"], [data-rating="water"], [title*="water"]');
  if (wrEl)
    ratings.waterResistance = normalizeStarRating(wrEl.textContent || wrEl.getAttribute("data-value") || "");
  const shadingEl = card.querySelector('[class*="shad"], [data-rating="shading"]');
  if (shadingEl)
    ratings.shading = normalizeTextRating(shadingEl.textContent || "");
  const sheeningEl = card.querySelector('[class*="sheen"], [data-rating="sheening"]');
  if (sheeningEl)
    ratings.sheening = normalizeTextRating(sheeningEl.textContent || "");
  return Object.keys(ratings).length > 0 ? ratings : null;
}
function extractLinkHref(card, base) {
  const a = card.querySelector("a[href]");
  if (!a)
    return null;
  try {
    return new URL(a.getAttribute("href"), base).href;
  } catch (_) {
    return null;
  }
}
function isMatch(title, brand, inkName) {
  const t = title.toLowerCase();
  const b = brand.toLowerCase();
  const n = inkName.toLowerCase();
  return t.includes(n) || b && t.includes(b) && t.includes(n.split(" ")[0]);
}
function normalizeStarRating(value) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (isNaN(num))
    return null;
  return Math.min(5, Math.max(1, Math.round(num)));
}
function normalizeTextRating(value) {
  const v = String(value).toLowerCase().trim();
  if (["low", "none", "minimal"].some((s) => v.includes(s)))
    return "low";
  if (["med", "moderate", "medium"].some((s) => v.includes(s)))
    return "medium";
  if (["high", "strong", "heavy", "intense"].some((s) => v.includes(s)))
    return "high";
  if (["subtle", "slight", "soft"].some((s) => v.includes(s)))
    return "subtle";
  return v || null;
}
function fpnSearchUrl(brand, inkName) {
  const query = encodeURIComponent(`${brand} ${inkName}`.trim());
  return `${FPN_SEARCH_BASE}&search_term=${query}`;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_INK_DATA") {
    const { brand, inkName } = message;
    const key = cacheKey(brand, inkName);
    (async () => {
      const cached = await getCached(key);
      if (cached) {
        sendResponse({ ok: true, data: cached, fromCache: true });
        return;
      }
      const data = await fetchInkSwatchData(brand, inkName);
      const fpnUrl = fpnSearchUrl(brand, inkName);
      const result = {
        ...data || { swatches: [], ratings: null, inkPageUrl: null, found: false },
        fpnUrl
      };
      await setCached(key, result);
      sendResponse({ ok: true, data: result, fromCache: false });
    })().catch((err) => {
      console.error("[InkScout] service worker error:", err);
      sendResponse({ ok: false, error: String(err) });
    });
    return true;
  }
  if (message.type === "CLEAR_CACHE") {
    chrome.storage.local.clear().then(() => sendResponse({ ok: true }));
    return true;
  }
});
