# BrickLink Price History & Set Completion Tracker

**Stop tab-switching. Stop guessing. See price history and wanted list coverage right on BrickLink.**

If you buy LEGO parts and sets on BrickLink.com, you already know the pain: no inline price history, no quick way to see if a store covers your wanted list, and seller stats buried three clicks away. This extension fixes all of it without leaving the page.

---

## Free Features

### Price History Sparkline
- **30 / 90 / 180-day price trend** injected on every catalog item page (parts, sets, minifigs)
- Average, min, max, and last-sold price at a glance
- Number of sales in the selected window
- SVG sparkline with no external dependencies — loads fast, stays inline

### Wanted List Coverage Bar
- Injected on every store page: **"This store has 67 of your 120 wanted parts"**
- Color-coded progress bar so you can compare stores at a glance
- Estimated order total for your wanted parts at that store

### Seller Stats Badge
- Injected on every store page alongside the native BrickLink header
- Total feedback score, % positive, average order completion rate, average reply time
- No more scrolling through the member profile page

### Part Color Availability
- On any part listing, see the cheapest alternative colors available right now
- Helps you substitute colors when your target color is out of stock or overpriced

---

## Pro Features — $7/month

### Multi-Store Optimizer
- "Buy from these 3 stores to complete your wanted list for $47 total"
- Greedy set-cover algorithm runs client-side — no data sent to any server
- The BrickStore replacement you've been waiting for, built directly into your browser

### Price Alerts
- Set a target price for any part or set
- Background service worker polls BrickLink on a schedule and sends a Chrome notification when the price drops
- Unlimited alerts in Pro tier

### Set Value Tracker
- Monitor sealed set prices over time as investment assets
- Track acquisition price vs. current market value
- Historical trend chart per set

### Order History Analytics
- Total spent across all orders, broken down by store and time period
- Parts acquired over time, most-used stores, average order size

### LEGO Retiring Soon Overlay
- Flag sets nearing retirement on BrickLink catalog and LEGO.com pages
- Never miss the window to buy a set before it's gone

---

## Privacy & Security

- **No account required for free tier** — price history and store stats are read-only
- Pro features (Wanted List, price alerts) require your own BrickLink OAuth 1.0a credentials
- Your BrickLink API keys are stored locally in your browser (`chrome.storage.local`) — never sent to our servers
- No analytics, no tracking, no third-party scripts

---

## Setup (Pro / Wanted List features)

1. Create a BrickLink API consumer at bricklink.com/v2/api/register_consumer.page
2. Generate an access token under My BL → API Settings
3. Paste your Consumer Key, Consumer Secret, Token, and Token Secret in the extension settings
4. Your Wanted Lists will sync automatically

---

## Supported Pages

- `bricklink.com/v2/catalog/catalogitem.page` — price sparkline injection
- `bricklink.com/store.asp` — wanted list coverage + seller stats
- All BrickLink store pages — coverage bar and seller badges

---

*Built for the LEGO community — r/lego, r/legomarket, BrickLink power buyers*
