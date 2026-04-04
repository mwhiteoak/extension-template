// Vinyl Companion — Album Detector Content Script
// Detects album/artist context from Spotify, YouTube, Pitchfork, and AllMusic pages.
// Dispatches 'vc:album-detected' or 'vc:album-cleared' custom events.

(function () {
  'use strict';

  let lastKey = null;
  let observerTimer = null;

  // ── Utility ──────────────────────────────────────────────────────────────────

  function dispatch(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function normalize(str) {
    return (str || '').toLowerCase()
      .replace(/\s*[\-–—:]\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function detectSite() {
    const h = location.hostname;
    if (h.includes('spotify.com')) return 'spotify';
    if (h.includes('youtube.com')) return 'youtube';
    if (h.includes('pitchfork.com')) return 'pitchfork';
    if (h.includes('allmusic.com')) return 'allmusic';
    return null;
  }

  // ── Open Graph / schema.org extraction ──────────────────────────────────────

  function getMetaContent(attr, value) {
    const el = document.querySelector(`meta[${attr}="${value}"]`);
    return el ? (el.getAttribute('content') || '').trim() : null;
  }

  function extractFromOpenGraph() {
    const title = getMetaContent('property', 'og:title') || getMetaContent('name', 'og:title');
    const desc = getMetaContent('property', 'og:description') || getMetaContent('name', 'og:description');
    const type = getMetaContent('property', 'og:type');
    return { title, desc, type };
  }

  function extractFromSchemaOrg() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const type = item['@type'] || '';
          if (type === 'MusicAlbum' || type === 'MusicRecording') {
            return {
              artist: item.byArtist?.name || null,
              album: item.name || null,
            };
          }
        }
      } catch (_) {}
    }
    return null;
  }

  // ── Site-specific extractors ─────────────────────────────────────────────────

  function extractSpotify() {
    // Spotify album pages: /album/:id
    if (!location.pathname.startsWith('/album/')) return null;

    // Try schema.org first
    const schema = extractFromSchemaOrg();
    if (schema?.album && schema?.artist) return schema;

    // Try Open Graph
    const og = extractFromOpenGraph();
    if (og.title) {
      // OG title format: "Album · Artist" or "Album, Artist"
      const parts = og.title.split(/\s*[·,]\s*/);
      if (parts.length >= 2) {
        return { album: parts[0].trim(), artist: parts[1].trim() };
      }
      // Fallback: try to extract artist from description
      if (og.desc) {
        const match = og.desc.match(/^(.+?)\s*(?:·|,|-)\s*(.+?)(?:\s*·|\s*,|$)/);
        if (match) return { album: og.title.trim(), artist: match[1].trim() };
      }
    }

    // Last resort: DOM selectors for Spotify's React UI
    const h1 = document.querySelector('h1[data-testid="entityTitle"]');
    const artistLink = document.querySelector('a[data-testid="creator-link"]');
    if (h1 && artistLink) {
      return { album: h1.textContent.trim(), artist: artistLink.textContent.trim() };
    }

    return null;
  }

  function extractYouTube() {
    // Only trigger on music videos / albums — check for music metadata
    const og = extractFromOpenGraph();
    const title = document.querySelector('#title h1, h1.title')?.textContent?.trim()
      || og.title || document.title;
    if (!title) return null;

    // Try schema.org
    const schema = extractFromSchemaOrg();
    if (schema?.album) return schema;

    // Heuristic: "Artist - Album [Full Album]" or "Artist - Song"
    const fullAlbumMatch = title.match(/^(.+?)\s*[-–]\s*(.+?)\s*(?:\[full album\]|\(full album\))/i);
    if (fullAlbumMatch) {
      return { artist: fullAlbumMatch[1].trim(), album: fullAlbumMatch[2].trim() };
    }

    // Check music category metadata (YouTube Music enriched pages)
    const channelName = document.querySelector(
      'ytd-video-owner-renderer a, #channel-name a, #owner-name a'
    )?.textContent?.trim();

    // Simple "Artist - Song" split — lower confidence, only use if OG type is music
    if (og.type && og.type.includes('music')) {
      const dashMatch = title.match(/^(.+?)\s*[-–]\s*(.+)$/);
      if (dashMatch) {
        const artist = channelName || dashMatch[1].trim();
        const album = dashMatch[2].trim();
        return { artist, album, confidence: 'low' };
      }
    }

    return null;
  }

  function extractPitchfork() {
    // Pitchfork review pages: /reviews/albums/...
    if (!location.pathname.includes('/reviews/')) return null;

    const schema = extractFromSchemaOrg();
    if (schema?.album) return schema;

    // Pitchfork uses structured HTML
    const artistEl = document.querySelector('.artist-links a, [class*="ArtistName"], h2.artist');
    const albumEl = document.querySelector('[class*="AlbumTitle"], h1.album-title, h2.title');

    if (artistEl && albumEl) {
      return {
        artist: artistEl.textContent.trim(),
        album: albumEl.textContent.trim(),
      };
    }

    // Fallback to OG
    const og = extractFromOpenGraph();
    if (og.title) {
      // Pitchfork OG title: "Album Review: Artist: Album Name | Pitchfork"
      const match = og.title.match(/review:\s*(.+?):\s*(.+?)(?:\s*\||\s*$)/i);
      if (match) return { artist: match[1].trim(), album: match[2].trim() };
    }
    return null;
  }

  function extractAllMusic() {
    // AllMusic album pages
    const schema = extractFromSchemaOrg();
    if (schema?.album) return schema;

    const artistEl = document.querySelector('.artist-name a, h2.artist-name, [itemprop="byArtist"]');
    const albumEl = document.querySelector('h1.album-title, h1[itemprop="name"], .title h1');

    if (artistEl && albumEl) {
      return {
        artist: artistEl.textContent.trim(),
        album: albumEl.textContent.trim(),
      };
    }

    const og = extractFromOpenGraph();
    if (og.title) {
      // AllMusic OG: "Album > Artist > AllMusic"
      const parts = og.title.split(/\s*[>|]\s*/);
      if (parts.length >= 2) return { album: parts[0].trim(), artist: parts[1].trim() };
    }
    return null;
  }

  // ── Main detection ───────────────────────────────────────────────────────────

  function detectAlbum() {
    const site = detectSite();
    if (!site) return;

    let result = null;
    switch (site) {
      case 'spotify':  result = extractSpotify(); break;
      case 'youtube':  result = extractYouTube(); break;
      case 'pitchfork': result = extractPitchfork(); break;
      case 'allmusic': result = extractAllMusic(); break;
    }

    if (!result || !result.artist || !result.album) {
      const key = null;
      if (lastKey !== key) {
        lastKey = key;
        dispatch('vc:album-cleared', {});
      }
      return;
    }

    const key = `${normalize(result.artist)}|${normalize(result.album)}`;
    if (key === lastKey) return; // no change

    lastKey = key;
    dispatch('vc:album-detected', {
      artist: result.artist,
      album: result.album,
      site,
      confidence: result.confidence || 'high',
    });
  }

  // ── SPA navigation observer ──────────────────────────────────────────────────

  function scheduleDetect(delay = 400) {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(detectAlbum, delay);
  }

  // Watch for URL changes (SPA navigation)
  let lastUrl = location.href;
  const navObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastKey = null; // reset on navigation
      scheduleDetect(600);
    }
  });
  navObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Initial run
  scheduleDetect(500);
  // Retry for slow SPA renders
  scheduleDetect(2000);
  scheduleDetect(4000);

})();
