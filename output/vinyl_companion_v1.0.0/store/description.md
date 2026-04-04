# Vinyl Companion — Discogs Everywhere

**Discogs prices and ratings, right where you're already listening.**

You're browsing Spotify, watching a YouTube album stream, reading a Pitchfork review — and you want to know: *Is this on vinyl? What does it cost? Is it any good?* Without Vinyl Companion, that's three tab-switches and two searches. With it, the answer is already on the page.

Vinyl Companion injects a live Discogs panel wherever you discover music: lowest marketplace price for the standard vinyl pressing, community rating, and a one-click link to the Discogs listing — automatically matched from the album and artist on the page.

---

## Free Features

### Discogs Price Badge
- Lowest marketplace price for the standard vinyl pressing, fetched from Discogs on page load
- Updates automatically as you navigate to new albums and artists
- Currency display configurable to USD, EUR, GBP, CAD, AUD, JPY, SEK, or NZD

### Community Rating Chip
- Discogs community score (e.g. 4.12 / 5) and review count, inline with the price badge
- Sourced directly from the Discogs Database — the same scores collectors trust

### One-Click Discogs Link
- Deep link to the Discogs marketplace listing for the detected release
- Opens in a new tab with `rel="noopener noreferrer"` — no tracking, no popups

### Smart Album Detection
- Fuzzy-matches album title and artist from page metadata: Open Graph tags, schema.org `MusicAlbum`, and page title fallback
- Works across Spotify album pages, YouTube music videos, Pitchfork reviews, and AllMusic entries
- 30-minute local cache prevents redundant API calls and keeps browsing fast

---

## Pro Features — $5/month

### Wantlist Sync
- "Add to Wantlist" button directly in the panel
- Connects to your Discogs account via personal access token — no separate OAuth flow needed
- Add releases without leaving Spotify, YouTube, Pitchfork, or AllMusic

### Price Alerts
- Set a price threshold for any vinyl you're watching
- Background service worker checks Discogs Marketplace every 6 hours
- Chrome notification fires when a pressing drops below your target price

### Collection Value Tracker
- Pulls your Discogs collection and calculates current estimated market value from live Marketplace stats
- Run on demand — see your collection's worth at any moment without opening Discogs

### Pressing Variant Selector
- View multiple pressings in-panel: original, reissue, colored vinyl, and more
- Each variant shows its current marketplace price, so you can compare before you click

---

## Privacy First

All data stays in your browser. Vinyl Companion calls the Discogs API directly — your browsing data is never routed through any intermediary server.

- No account required for free tier
- No analytics or tracking pixels
- Settings page includes "Clear all data" to wipe preferences and cached results instantly
- Your Discogs personal access token (Pro) is stored only in `chrome.storage.local` — never transmitted anywhere except directly to api.discogs.com

---

## Supported Sites

- **Spotify** — album pages and artist pages
- **YouTube** — music videos, album streams, and artist channels
- **Pitchfork** — album reviews and artist pages
- **AllMusic** — album detail pages

---

## Setup

1. Install the extension
2. Visit any Spotify album page, YouTube music video, Pitchfork review, or AllMusic page
3. The Vinyl Companion panel appears in the bottom-right corner automatically
4. Click the Discogs link to explore marketplace listings
5. *(Pro)* Add your Discogs personal access token in Options to enable wantlist sync and price alerts

---

*Built for vinyl collectors, Discogs regulars, and anyone who discovers records online and wants to know what they cost before pulling out their wallet.*
