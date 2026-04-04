// BGG Everywhere — Panel Injector Content Script
// Injects the floating BGG data panel and responds to game detection events.

(function () {
  'use strict';

  if (document.getElementById('bgg-panel')) return;

  let panelOpen = false;
  let currentGame = null;
  let loadedGameKey = null;

  // ── Toggle button ────────────────────────────────────────────────────────

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'bgg-toggle-btn';
  toggleBtn.title = 'BGG Everywhere — BoardGameGeek Data';
  toggleBtn.innerHTML = '<span class="bgg-toggle-icon">&#127922;</span>';
  toggleBtn.style.display = 'none';
  document.body.appendChild(toggleBtn);

  // ── Panel ────────────────────────────────────────────────────────────────

  const panel = document.createElement('div');
  panel.id = 'bgg-panel';
  panel.className = 'bgg-panel-hidden';
  panel.innerHTML = `
    <div class="bgg-header">
      <div class="bgg-header-left">
        <span class="bgg-header-icon">&#127922;</span>
        <span class="bgg-header-title">BGG Everywhere</span>
        <span class="bgg-site-badge" id="bgg-site-badge"></span>
      </div>
      <button class="bgg-close-btn" id="bgg-close-btn" title="Close">&times;</button>
    </div>
    <div class="bgg-body" id="bgg-body">
      <div class="bgg-loading" id="bgg-loading">
        <div class="bgg-spinner"></div>
        <p>Looking up on BoardGameGeek&hellip;</p>
      </div>
      <div id="bgg-content" style="display:none">
        <div class="bgg-game-title" id="bgg-game-title"></div>
        <div class="bgg-year" id="bgg-year"></div>

        <div class="bgg-stats-grid">
          <div class="bgg-stat-card">
            <div class="bgg-stat-label">BGG Rating</div>
            <div class="bgg-stat-value" id="bgg-rating">—</div>
            <div class="bgg-stat-sub" id="bgg-rating-votes"></div>
          </div>
          <div class="bgg-stat-card">
            <div class="bgg-stat-label">Overall Rank</div>
            <div class="bgg-stat-value" id="bgg-rank">—</div>
            <div class="bgg-stat-sub" id="bgg-category-rank"></div>
          </div>
          <div class="bgg-stat-card">
            <div class="bgg-stat-label">Players</div>
            <div class="bgg-stat-value" id="bgg-players">—</div>
            <div class="bgg-stat-sub" id="bgg-best-players"></div>
          </div>
          <div class="bgg-stat-card">
            <div class="bgg-stat-label">Play Time</div>
            <div class="bgg-stat-value" id="bgg-playtime">—</div>
            <div class="bgg-stat-sub" id="bgg-playtime-sub"></div>
          </div>
          <div class="bgg-stat-card bgg-stat-full">
            <div class="bgg-stat-label">Complexity</div>
            <div class="bgg-complexity-row">
              <div class="bgg-stat-value" id="bgg-weight">—</div>
              <div class="bgg-weight-bar-wrap">
                <div class="bgg-weight-bar" id="bgg-weight-bar"></div>
              </div>
              <div class="bgg-stat-sub" id="bgg-weight-label"></div>
            </div>
          </div>
        </div>

        <div class="bgg-actions">
          <a class="bgg-btn bgg-btn-primary" id="bgg-link" href="#" target="_blank" rel="noopener noreferrer">
            View on BGG
          </a>
          <button class="bgg-btn bgg-btn-secondary" id="bgg-wantlist-btn">
            + Want to Buy
          </button>
        </div>
        <div class="bgg-feedback" id="bgg-feedback" style="display:none"></div>
        <div class="bgg-footer">
          <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">Powered by BoardGameGeek</a>
        </div>
      </div>
      <div id="bgg-error" style="display:none">
        <div class="bgg-error-block">
          <p id="bgg-error-msg"></p>
          <p><a href="#" id="bgg-search-link" target="_blank" rel="noopener noreferrer">Search BGG manually &rarr;</a></p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Listeners ────────────────────────────────────────────────────────────

  document.getElementById('bgg-close-btn').addEventListener('click', closePanel);
  toggleBtn.addEventListener('click', () => { panelOpen ? closePanel() : openPanel(); });
  document.getElementById('bgg-wantlist-btn').addEventListener('click', onWantlist);

  // ── Panel state ──────────────────────────────────────────────────────────

  function openPanel() {
    panelOpen = true;
    panel.classList.remove('bgg-panel-hidden');
    toggleBtn.classList.add('bgg-active');
    if (currentGame && loadedGameKey !== currentGame.title) {
      loadBGGData(currentGame);
    }
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.add('bgg-panel-hidden');
    toggleBtn.classList.remove('bgg-active');
  }

  function showLoading() {
    document.getElementById('bgg-loading').style.display = '';
    document.getElementById('bgg-content').style.display = 'none';
    document.getElementById('bgg-error').style.display = 'none';
  }

  function showContent() {
    document.getElementById('bgg-loading').style.display = 'none';
    document.getElementById('bgg-content').style.display = '';
    document.getElementById('bgg-error').style.display = 'none';
  }

  function showError(msg, title) {
    document.getElementById('bgg-loading').style.display = 'none';
    document.getElementById('bgg-content').style.display = 'none';
    document.getElementById('bgg-error').style.display = '';
    document.getElementById('bgg-error-msg').textContent = msg;
    const q = encodeURIComponent(title || '');
    document.getElementById('bgg-search-link').href =
      `https://boardgamegeek.com/search/boardgame/?q=${q}&nosession=1`;
  }

  // ── BGG data load ─────────────────────────────────────────────────────────

  async function loadBGGData(gameData) {
    showLoading();
    loadedGameKey = gameData.title;

    const result = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'BGG_LOOKUP', title: gameData.title }, resolve);
    });

    if (!result || result.error) {
      const msg = result?.error === 'no_results'
        ? `"${gameData.title}" not found on BGG`
        : 'Could not reach BoardGameGeek. Check your connection.';
      showError(msg, gameData.title);
      return;
    }

    // Game title + year
    document.getElementById('bgg-game-title').textContent = result.name || gameData.title;
    document.getElementById('bgg-year').textContent = result.year ? `(${result.year})` : '';

    // BGG link
    document.getElementById('bgg-link').href =
      `https://boardgamegeek.com/boardgame/${result.id}`;

    // Rating
    const ratingEl = document.getElementById('bgg-rating');
    const votesEl = document.getElementById('bgg-rating-votes');
    if (result.rating) {
      ratingEl.textContent = parseFloat(result.rating).toFixed(1);
      votesEl.textContent = result.ratingCount
        ? `${Number(result.ratingCount).toLocaleString()} ratings`
        : '';
    } else {
      ratingEl.textContent = '—';
      votesEl.textContent = '';
    }

    // Rank
    const rankEl = document.getElementById('bgg-rank');
    const catRankEl = document.getElementById('bgg-category-rank');
    if (result.rank && result.rank !== '0') {
      rankEl.textContent = `#${Number(result.rank).toLocaleString()}`;
    } else {
      rankEl.textContent = 'Unranked';
    }
    catRankEl.textContent = result.categoryRank || '';

    // Players
    const playersEl = document.getElementById('bgg-players');
    const bestEl = document.getElementById('bgg-best-players');
    if (result.minPlayers && result.maxPlayers) {
      playersEl.textContent = result.minPlayers === result.maxPlayers
        ? `${result.minPlayers}`
        : `${result.minPlayers}–${result.maxPlayers}`;
    } else {
      playersEl.textContent = '—';
    }
    bestEl.textContent = result.bestPlayers ? `Best: ${result.bestPlayers}` : '';

    // Play time
    const ptEl = document.getElementById('bgg-playtime');
    const ptSubEl = document.getElementById('bgg-playtime-sub');
    if (result.minTime && result.maxTime) {
      ptEl.textContent = result.minTime === result.maxTime
        ? `${result.minTime}m`
        : `${result.minTime}–${result.maxTime}m`;
    } else if (result.playTime) {
      ptEl.textContent = `${result.playTime}m`;
    } else {
      ptEl.textContent = '—';
    }
    ptSubEl.textContent = '';

    // Complexity weight
    const weightEl = document.getElementById('bgg-weight');
    const weightBarEl = document.getElementById('bgg-weight-bar');
    const weightLabelEl = document.getElementById('bgg-weight-label');
    if (result.weight) {
      const w = parseFloat(result.weight);
      weightEl.textContent = w.toFixed(2);
      weightBarEl.style.width = `${(w / 5) * 100}%`;
      weightLabelEl.textContent = weightLabel(w);
    } else {
      weightEl.textContent = '—';
      weightBarEl.style.width = '0%';
      weightLabelEl.textContent = '';
    }

    // Site badge
    document.getElementById('bgg-site-badge').textContent =
      gameData.site ? capitalize(gameData.site) : '';

    showContent();
    panel.dataset.bggId = result.id;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function weightLabel(w) {
    if (w < 1.5) return 'Light';
    if (w < 2.5) return 'Medium-Light';
    if (w < 3.5) return 'Medium';
    if (w < 4.5) return 'Medium-Heavy';
    return 'Heavy';
  }

  // ── Want to Buy (Pro) ─────────────────────────────────────────────────────

  async function onWantlist() {
    const bggId = panel.dataset.bggId;
    if (!bggId) return;

    const feedbackEl = document.getElementById('bgg-feedback');
    feedbackEl.style.display = '';
    feedbackEl.className = 'bgg-feedback';
    feedbackEl.textContent = 'Adding…';

    const result = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'BGG_WANTLIST_ADD', bggId }, resolve);
    });

    if (result?.error === 'pro_required') {
      feedbackEl.textContent = 'Pro required — upgrade in settings';
      feedbackEl.classList.add('bgg-feedback-error');
    } else if (result?.error === 'no_auth') {
      feedbackEl.textContent = 'Set your BGG username in Options first';
      feedbackEl.classList.add('bgg-feedback-error');
    } else if (result?.ok) {
      feedbackEl.textContent = '✓ Added to Want to Buy list!';
      feedbackEl.classList.add('bgg-feedback-success');
      setTimeout(() => { feedbackEl.style.display = 'none'; }, 3000);
    } else {
      feedbackEl.textContent = 'Failed — BGG want-list writes require authentication';
      feedbackEl.classList.add('bgg-feedback-error');
    }
  }

  // ── Game detection events ────────────────────────────────────────────────

  function onGameDetected(data) {
    currentGame = data;
    toggleBtn.style.display = 'flex';
    if (panelOpen) {
      loadBGGData(data);
    } else {
      loadedGameKey = null;
    }
  }

  function onGameCleared() {
    currentGame = null;
    loadedGameKey = null;
    toggleBtn.style.display = 'none';
    closePanel();
  }

  window.addEventListener('bgg:game-detected', (e) => onGameDetected(e.detail));
  window.addEventListener('bgg:game-cleared', onGameCleared);

})();
