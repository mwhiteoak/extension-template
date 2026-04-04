(() => {
  // src/content/extract.js
  function extractFromJsonLD() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "Product" && item.name) {
            const brand = extractBrandFromJsonLD(item);
            const inkName = cleanInkName(item.name, brand);
            if (inkName)
              return { brand, inkName };
          }
        }
      } catch (_) {
      }
    }
    return null;
  }
  function extractBrandFromJsonLD(item) {
    if (item.brand) {
      if (typeof item.brand === "string")
        return item.brand;
      if (item.brand.name)
        return item.brand.name;
    }
    return "";
  }
  function cleanInkName(title, brand) {
    let name = title;
    if (brand) {
      const re = new RegExp(`^${escapeRegex(brand)}\\s*[-\u2013\u2014]?\\s*`, "i");
      name = name.replace(re, "");
    }
    name = name.replace(/\b(fountain pen ink|ink cartridge|ink bottle|bottled ink|cartridge|bottle)\b/gi, "").replace(/\b\d+\s*ml\b/gi, "").replace(/\b\d+\s*oz\b/gi, "").replace(/\(.*?\)/g, "").replace(/\s{2,}/g, " ").trim();
    return name || title.trim();
  }
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function findAnchor(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el)
        return el;
    }
    return null;
  }

  // src/ui/overlay.js
  var OVERLAY_ID = "ink-scout-overlay-root";
  var CSS = `
  :host {
    all: initial;
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #222;
  }

  .is-panel {
    border: 1px solid #d1c4b0;
    border-radius: 8px;
    background: #faf9f7;
    padding: 14px 16px;
    margin: 16px 0;
    max-width: 420px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  .is-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .is-logo {
    font-size: 16px;
    font-weight: 700;
    color: #3b2a1a;
    letter-spacing: -0.3px;
  }

  .is-logo-icon {
    display: inline-block;
    width: 20px;
    height: 20px;
    background: #3b2a1a;
    border-radius: 50%;
    vertical-align: middle;
    margin-right: 4px;
    position: relative;
    overflow: hidden;
  }

  .is-logo-icon::after {
    content: '';
    position: absolute;
    top: 4px; left: 4px;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7ec8e3 0%, #1b4f72 100%);
  }

  .is-badge {
    font-size: 11px;
    background: #e8f4f8;
    color: #1b6ca8;
    padding: 2px 7px;
    border-radius: 10px;
    font-weight: 500;
    margin-left: auto;
  }

  .is-cache-badge {
    font-size: 10px;
    color: #888;
    margin-left: 4px;
  }

  /* Ratings */
  .is-ratings {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .is-rating-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .is-rating-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    font-weight: 600;
  }

  .is-rating-value {
    font-size: 13px;
    font-weight: 600;
    color: #3b2a1a;
  }

  .is-stars {
    color: #c0830a;
    letter-spacing: -1px;
  }

  .is-star-empty {
    color: #ddd;
  }

  /* Swatch carousel */
  .is-swatches-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .is-carousel {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
    scrollbar-color: #ccc transparent;
  }

  .is-carousel::-webkit-scrollbar {
    height: 4px;
  }

  .is-carousel::-webkit-scrollbar-track { background: transparent; }
  .is-carousel::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

  .is-swatch-thumb {
    flex-shrink: 0;
    width: 80px;
    height: 56px;
    border-radius: 5px;
    object-fit: cover;
    border: 1px solid #e0d9cf;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .is-swatch-thumb:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  /* Lightbox */
  .is-lightbox {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    z-index: 2147483647;
    align-items: center;
    justify-content: center;
  }

  .is-lightbox.open {
    display: flex;
  }

  .is-lightbox-img {
    max-width: 90vw;
    max-height: 85vh;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .is-lightbox-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255,255,255,0.9);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
  }

  /* Links */
  .is-links {
    margin-top: 10px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .is-link {
    font-size: 12px;
    color: #1b6ca8;
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid transparent;
    transition: border-color 0.1s;
  }

  .is-link:hover {
    border-bottom-color: #1b6ca8;
  }

  /* Fallback / no data */
  .is-fallback {
    color: #666;
    font-size: 13px;
    padding: 6px 0;
  }

  .is-fallback p { margin: 0 0 8px; }

  /* Loading state */
  .is-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #888;
    font-size: 13px;
    padding: 8px 0;
  }

  .is-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ddd;
    border-top-color: #3b2a1a;
    border-radius: 50%;
    animation: is-spin 0.7s linear infinite;
  }

  @keyframes is-spin {
    to { transform: rotate(360deg); }
  }

  /* Error */
  .is-error {
    color: #b33;
    font-size: 12px;
    padding: 4px 0;
  }
`;
  function renderStars(value) {
    if (!value)
      return '<span style="color:#bbb">\u2014</span>';
    const n = Math.round(value);
    let html = '<span class="is-stars">';
    for (let i = 1; i <= 5; i++) {
      html += i <= n ? "\u2605" : '<span class="is-star-empty">\u2605</span>';
    }
    return html + "</span>";
  }
  function capitalize(s) {
    if (!s)
      return "\u2014";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function buildPanelHTML(data, fromCache) {
    const cacheBadge = fromCache ? '<span class="is-cache-badge">(cached)</span>' : "";
    let inner = "";
    if (!data.found && (!data.swatches || data.swatches.length === 0)) {
      inner = `
      <div class="is-fallback">
        <p>No swatch data found for this ink.</p>
        ${data.fpnUrl ? `<a class="is-link" href="${escHtml(data.fpnUrl)}" target="_blank" rel="noopener">Search on Fountain Pen Network \u2192</a>` : ""}
      </div>
    `;
    } else {
      if (data.ratings) {
        const { waterResistance, shading, sheening } = data.ratings;
        inner += `
        <div class="is-ratings">
          <div class="is-rating-item">
            <span class="is-rating-label">Water Resistance</span>
            <span class="is-rating-value">${renderStars(waterResistance)}</span>
          </div>
          <div class="is-rating-item">
            <span class="is-rating-label">Shading</span>
            <span class="is-rating-value">${capitalize(shading)}</span>
          </div>
          <div class="is-rating-item">
            <span class="is-rating-label">Sheening</span>
            <span class="is-rating-value">${capitalize(sheening)}</span>
          </div>
        </div>
      `;
      }
      if (data.swatches && data.swatches.length > 0) {
        const thumbs = data.swatches.map((s, i) => {
          const url = typeof s === "string" ? s : s.url;
          const alt = typeof s === "object" && s.alt ? escHtml(s.alt) : `Swatch ${i + 1}`;
          return `<img class="is-swatch-thumb" src="${escHtml(url)}" alt="${alt}" data-full="${escHtml(url)}" loading="lazy">`;
        }).join("");
        inner += `
        <div class="is-swatches-label">Community Swatches</div>
        <div class="is-carousel">${thumbs}</div>
      `;
      }
      const links = [];
      if (data.inkPageUrl)
        links.push(`<a class="is-link" href="${escHtml(data.inkPageUrl)}" target="_blank" rel="noopener">View on InkSwatch.com \u2192</a>`);
      if (data.fpnUrl)
        links.push(`<a class="is-link" href="${escHtml(data.fpnUrl)}" target="_blank" rel="noopener">Fountain Pen Network \u2192</a>`);
      if (links.length)
        inner += `<div class="is-links">${links.join("")}</div>`;
    }
    return `
    <div class="is-panel">
      <div class="is-header">
        <span class="is-logo"><span class="is-logo-icon"></span>Ink Scout</span>
        <span class="is-badge">Community Data</span>
        ${cacheBadge}
      </div>
      ${inner}
    </div>
    <div class="is-lightbox" id="is-lightbox">
      <button class="is-lightbox-close" id="is-lightbox-close" aria-label="Close">\u2715</button>
      <img class="is-lightbox-img" id="is-lightbox-img" src="" alt="Swatch enlarged">
    </div>
  `;
  }
  function escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectOverlay(anchorEl, inkInfo) {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing)
      existing.remove();
    const host = document.createElement("div");
    host.id = OVERLAY_ID;
    anchorEl.insertAdjacentElement("afterend", host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
    <style>${CSS}</style>
    <div class="is-panel">
      <div class="is-header">
        <span class="is-logo"><span class="is-logo-icon"></span>Ink Scout</span>
        <span class="is-badge">Community Data</span>
      </div>
      <div class="is-loading"><div class="is-spinner"></div>Loading swatch data\u2026</div>
    </div>
  `;
    chrome.runtime.sendMessage(
      { type: "FETCH_INK_DATA", brand: inkInfo.brand, inkName: inkInfo.inkName },
      (response) => {
        if (chrome.runtime.lastError) {
          shadow.innerHTML = `
          <style>${CSS}</style>
          <div class="is-panel">
            <div class="is-header"><span class="is-logo"><span class="is-logo-icon"></span>Ink Scout</span></div>
            <div class="is-error">Could not load data. ${chrome.runtime.lastError.message}</div>
          </div>
        `;
          return;
        }
        if (!response || !response.ok) {
          shadow.innerHTML = `
          <style>${CSS}</style>
          <div class="is-panel">
            <div class="is-header"><span class="is-logo"><span class="is-logo-icon"></span>Ink Scout</span></div>
            <div class="is-error">Failed to retrieve ink data.</div>
          </div>
        `;
          return;
        }
        shadow.innerHTML = `<style>${CSS}</style>${buildPanelHTML(response.data, response.fromCache)}`;
        attachEventListeners(shadow);
      }
    );
  }
  function attachEventListeners(shadow) {
    shadow.querySelectorAll(".is-swatch-thumb").forEach((img) => {
      img.addEventListener("click", () => {
        const lightbox2 = shadow.getElementById("is-lightbox");
        const lbImg = shadow.getElementById("is-lightbox-img");
        if (lightbox2 && lbImg) {
          lbImg.src = img.dataset.full || img.src;
          lbImg.alt = img.alt;
          lightbox2.classList.add("open");
        }
      });
    });
    const closeBtn = shadow.getElementById("is-lightbox-close");
    const lightbox = shadow.getElementById("is-lightbox");
    if (closeBtn && lightbox) {
      closeBtn.addEventListener("click", () => lightbox.classList.remove("open"));
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox)
          lightbox.classList.remove("open");
      });
    }
  }

  // src/content/anderson.js
  products;
  function isInkPage() {
    const title = document.title.toLowerCase();
    if (title.includes("ink"))
      return true;
    const breadcrumb = document.querySelector('[class*="breadcrumb"], nav[aria-label*="read"]');
    if (breadcrumb && breadcrumb.textContent.toLowerCase().includes("ink"))
      return true;
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "Product") {
            const name = (item.name || "").toLowerCase();
            if (name.includes(" ink") || name.includes("fountain pen ink"))
              return true;
          }
        }
      } catch (_) {
      }
    }
    return false;
  }
  function extractInkInfo() {
    const jsonld = extractFromJsonLD();
    if (jsonld)
      return jsonld;
    const h1 = document.querySelector('h1.product__title, h1[class*="product"], h1');
    if (h1) {
      const raw = h1.textContent.trim();
      return { brand: "", inkName: cleanInkName(raw, "") };
    }
    return null;
  }
  function findAnchorElement() {
    return findAnchor([
      ".product__media-wrapper",
      ".product-single__photos",
      '[class*="product-media"]',
      '[class*="product-image"]',
      'form[action*="/cart"]',
      "h1"
    ]);
  }
  function init() {
    if (!isInkPage())
      return;
    const inkInfo = extractInkInfo();
    if (!inkInfo) {
      console.warn("[InkScout] Could not extract ink info from Anderson Pens page");
      return;
    }
    const anchor = findAnchorElement();
    if (!anchor) {
      console.warn("[InkScout] Could not find anchor on Anderson Pens page");
      return;
    }
    injectOverlay(anchor, inkInfo);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
