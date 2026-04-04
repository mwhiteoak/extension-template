// Vinyl Companion — Panel Injector Content Script
// Injects the floating Discogs panel and responds to album detection events.

(function () {
  'use strict';

  if (document.getElementById('vc-panel')) return;

  let panelOpen = false;
  let currentAlbum = null;
  let loadedReleaseId = null;

  // ── Toggle button ────────────────────────────────────────────────────────────

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'vc-toggle-btn';
  toggleBtn.title = 'Vinyl Companion — Discogs Price & Rating';
  toggleBtn.textContent = '\uD83D\uDCC0'; // 💿
  toggleBtn.style.display = 'none';
  document.body.appendChild(toggleBtn);

  // ── Panel ────────────────────────────────────────────────────────────────────

  const panel = document.createElement('div');
  panel.id = 'vc-panel';
  panel.className = 'vc-panel-hidden';
  panel.innerHTML = `
    <div class="vc-header">
      <div class="vc-header-left">
        <span class="vc-vinyl-icon">&#128192;</span>
        <span class="vc-header-title">Vinyl Companion</span>
        <span class="vc-site-badge" id="vc-site-badge"></span>
      </div>
      <button class="vc-close-btn" id="vc-close-btn" title="Close">&times;</button>
    </div>
    <div class="vc-body" id="vc-body">
      <div class="vc-loading" id="vc-loading">
        <div class="vc-spinner"></div>
        <p>Looking up on Discogs…</p>
      </div>
      <div id="vc-content" style="display:none">
        <div class="vc-low-confidence" id="vc-confidence-warn" style="display:none">
          Low confidence match — results may not be accurate
        </div>
        <div class="vc-album-info">
          <div class="vc-album-title" id="vc-album-title"></div>
          <div class="vc-artist-name" id="vc-artist-name"></div>
        </div>
        <div class="vc-stats-row">
          <div class="vc-stat-card">
            <div class="vc-stat-label">Lowest Price</div>
            <div class="vc-stat-value" id="vc-price">—</div>
            <div class="vc-stat-sub" id="vc-for-sale"></div>
          </div>
          <div class="vc-stat-card">
            <div class="vc-stat-label">Rating</div>
            <div class="vc-stat-value" id="vc-rating">—</div>
            <div class="vc-rating-stars" id="vc-rating-stars"></div>
            <div class="vc-stat-sub" id="vc-rating-count"></div>
          </div>
        </div>
        <div class="vc-actions">
          <a class="vc-btn vc-btn-primary" id="vc-discogs-link" href="#" target="_blank" rel="noopener noreferrer">
            &#128279; View on Discogs
          </a>
          <button class="vc-btn vc-btn-secondary" id="vc-wantlist-btn">
            &#10084; Add to Wantlist
          </button>
        </div>
        <div class="vc-feedback" id="vc-feedback" style="display:none"></div>
        <div class="vc-pro-banner" id="vc-pro-banner" style="display:none">
          <div class="vc-pro-banner-title">Pro — $5/mo</div>
          <div class="vc-pro-banner-desc">Wantlist sync, price alerts &amp; collection tracker</div>
          <button class="vc-btn vc-btn-pro" id="vc-upgrade-btn" style="width:100%">Upgrade to Pro</button>
        </div>
        <div class="vc-footer">
          <a href="https://www.discogs.com" target="_blank" rel="noopener noreferrer">Powered by Discogs</a>
        </div>
      </div>
      <div id="vc-error" style="display:none">
        <div class="vc-error">
          <p id="vc-error-msg"></p>
          <p><a href="#" id="vc-discogs-search-link" target="_blank" rel="noopener noreferrer">Search Discogs manually</a></p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Event listeners ──────────────────────────────────────────────────────────

  document.getElementById('vc-close-btn').addEventListener('click', closePanel);

  toggleBtn.addEventListener('click', () => {
    panelOpen ? closePanel() : openPanel();
  });

  document.getElementById('vc-wantlist-btn').addEventListener('click', onWantlist);
  document.getElementById('vc-upgrade-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STRIPE_CHECKOUT' });
  });

  // ── Panel open/close ─────────────────────────────────────────────────────────

  function openPanel() {
    panelOpen = true;
    panel.classList.remove('vc-panel-hidden');
    toggleBtn.classList.add('vc-active');
    if (currentAlbum && loadedReleaseId !== albumKey(currentAlbum)) {
      loadDiscogsData(currentAlbum);
    }
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.add('vc-panel-hidden');
    toggleBtn.classList.remove('vc-active');
  }

  function albumKey(a) { return `${a.artist}|${a.album}`; }

  // ── State helpers ────────────────────────────────────────────────────────────

  function showLoading() {
    document.getElementById('vc-loading').style.display = '';
    document.getElementById('vc-content').style.display = 'none';
    document.getElementById('vc-error').style.display = 'none';
  }

  function showContent() {
    document.getElementById('vc-loading').style.display = 'none';
    document.getElementById('vc-content').style.display = '';
    document.getElementById('vc-error').style.display = 'none';
  }

  function showError(msg, artist, album) {
    document.getElementById('vc-loading').style.display = 'none';
    document.getElementById('vc-content').style.display = 'none';
    document.getElementById('vc-error').style.display = '';
    document.getElementById('vc-error-msg').textContent = msg;
    const q = encodeURIComponent(`${artist} ${album}`);
    document.getElementById('vc-discogs-search-link').href =
      `https://www.discogs.com/search/?q=${q}&type=release&format=vinyl`;
  }

  function formatRatingStars(rating) {
    if (!rating) return '';
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
  }

  // ── Discogs data load ────────────────────────────────────────────────────────

  async function loadDiscogsData(albumData) {
    showLoading();
    loadedReleaseId = albumKey(albumData);

    const lookup = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'DISCOGS_LOOKUP',
        artist: albumData.artist,
        album: albumData.album,
      }, resolve);
    });

    if (!lookup || lookup.error) {
      const msg = lookup?.error === 'no_results'
        ? `No vinyl found for "${albumData.album}" by ${albumData.artist}`
        : 'Could not reach Discogs. Check your connection.';
      showError(msg, albumData.artist, albumData.album);
      return;
    }

    // Populate album info
    document.getElementById('vc-album-title').textContent = albumData.album;
    document.getElementById('vc-artist-name').textContent = albumData.artist;
    document.getElementById('vc-confidence-warn').style.display =
      albumData.confidence === 'low' ? '' : 'none';

    // Discogs link
    const discogsLink = document.getElementById('vc-discogs-link');
    discogsLink.href = lookup.discogsUrl || `https://www.discogs.com/release/${lookup.releaseId}`;

    // Rating
    const ratingEl = document.getElementById('vc-rating');
    const ratingStarsEl = document.getElementById('vc-rating-stars');
    const ratingCountEl = document.getElementById('vc-rating-count');
    if (lookup.communityRating) {
      ratingEl.textContent = lookup.communityRating.toFixed(2);
      ratingStarsEl.textContent = formatRatingStars(lookup.communityRating);
      ratingCountEl.textContent = lookup.ratingCount
        ? `${lookup.ratingCount.toLocaleString()} reviews`
        : '';
    } else {
      ratingEl.textContent = '—';
      ratingStarsEl.textContent = '';
      ratingCountEl.textContent = 'No ratings yet';
    }

    showContent();

    // Fetch price separately
    const stats = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_PRICE', releaseId: lookup.releaseId }, resolve);
    });

    const priceEl = document.getElementById('vc-price');
    const forSaleEl = document.getElementById('vc-for-sale');
    if (stats && stats.lowestPrice !== null && !stats.error) {
      priceEl.textContent = `${stats.currency} ${stats.lowestPrice.toFixed(2)}`;
      forSaleEl.textContent = stats.numForSale ? `${stats.numForSale} for sale` : '';
    } else {
      priceEl.textContent = 'N/A';
      forSaleEl.textContent = 'No listings';
    }

    // Store release ID for wantlist
    panel.dataset.releaseId = lookup.releaseId;
    panel.dataset.releaseTitle = lookup.title || albumData.album;

    // Show pro banner for non-pro users
    const opts = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, resolve);
    });
    document.getElementById('vc-pro-banner').style.display = opts?.isPro ? 'none' : '';
    document.getElementById('vc-wantlist-btn').disabled = false;
  }

  // ── Wantlist ─────────────────────────────────────────────────────────────────

  async function onWantlist() {
    const releaseId = panel.dataset.releaseId;
    if (!releaseId) return;

    const feedbackEl = document.getElementById('vc-feedback');
    feedbackEl.style.display = '';
    feedbackEl.className = 'vc-feedback';
    feedbackEl.textContent = 'Adding…';

    const result = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'ADD_TO_WANTLIST', releaseId }, resolve);
    });

    if (result?.error === 'pro_required') {
      feedbackEl.textContent = 'Pro required — upgrade below';
      feedbackEl.classList.add('error');
    } else if (result?.error === 'no_auth') {
      feedbackEl.textContent = 'Connect your Discogs account in Options';
      feedbackEl.classList.add('error');
    } else if (result?.ok) {
      feedbackEl.textContent = '✓ Added to your wantlist!';
      feedbackEl.classList.add('success');
      setTimeout(() => { feedbackEl.style.display = 'none'; }, 3000);
    } else {
      feedbackEl.textContent = 'Failed — try again';
      feedbackEl.classList.add('error');
    }
  }

  // ── Album detection events ───────────────────────────────────────────────────

  function onAlbumDetected(data) {
    currentAlbum = data;

    // Update site badge
    const badge = document.getElementById('vc-site-badge');
    badge.textContent = data.site.charAt(0).toUpperCase() + data.site.slice(1);

    toggleBtn.style.display = 'flex';

    if (panelOpen) {
      loadDiscogsData(data);
    } else {
      // Reset loaded state so it refreshes on next open
      loadedReleaseId = null;
    }
  }

  function onAlbumCleared() {
    currentAlbum = null;
    loadedReleaseId = null;
    toggleBtn.style.display = 'none';
    closePanel();
  }

  window.addEventListener('vc:album-detected', (e) => onAlbumDetected(e.detail));
  window.addEventListener('vc:album-cleared', onAlbumCleared);

  // If detector already ran
  if (window.__vc_album) onAlbumDetected(window.__vc_album);

})();
