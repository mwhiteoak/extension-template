# Seed Catalog Companion Planner

**Your seed catalog, personalized for your climate.**

When you're browsing Burpee, Johnny's Seeds, or Baker Creek, every listing looks the same — no matter where you garden. Seed Catalog Companion Planner injects personalized planting dates, a season suitability indicator, and companion plant suggestions directly on the product page, calculated for your USDA hardiness zone. Enter your ZIP code once and the extension handles the rest: no tab-switching to the Almanac, no re-entering your location, no guesswork.

---

## Free Features

### Inline Planting Date Badge
- **Start indoors**, **direct sow**, and **last chance to plant** dates computed for your zone and today's date — displayed right on the product page
- Supports Burpee, Johnny's Seeds, Baker Creek (Rare Seeds), Seedsavers, Park Seed, Territorial Seed, West Coast Seeds, and MiGardener
- Dates update automatically as the season progresses — no reconfiguration needed

### Season Suitability Indicator
- Color-coded chip tells you at a glance whether a variety is viable for your zone this season:
  - **Green** — ample growing season remaining for this variety's days-to-maturity
  - **Yellow** — marginal timing; check days-to-maturity against your frost window carefully
  - **Red** — too late this season for your zone; next planting window shown
- Based on your ZIP's USDA zone and bundled NOAA 30-year frost date normals — no API calls required

### Top 3 Companion Plants
- Compact inline chips showing the best companion plants to grow nearby and one "avoid" pairing
- Covers ~120 common crop types using a bundled, public-domain companion planting dataset
- Works offline — all data ships with the extension

### One-Time ZIP Code Setup
- Enter your ZIP on first install — zone and frost dates resolved automatically from a bundled ~950-entry ZIP prefix lookup
- Stored in `chrome.storage.sync` so your zone follows you across devices
- Takes under 60 seconds; your planting badges appear immediately

---

## Pro Features — $5/month

### Frost Date Countdown
- "X days until your first fall frost — this variety needs Y more days to mature" displayed with a progress bar
- Instant signal when a variety is cutting it close: plant now or wait until next season

### Succession Planting Calculator
- For cut-and-come-again crops (lettuce, basil, cilantro, radish), shows the optimal re-sow interval to maintain a continuous harvest through your frost-free window
- Tailored to your zone's specific frost-free day count

### Multi-Zone Support
- Save up to 3 zones — ideal for gardeners with a primary plot and a weekend property, or those who garden across different microclimates
- Toggle the active zone from the popup in one click

### Seed Shopping List with Zone Validation
- "Add to List" button on product pages accumulates your selections across tabs
- Before you check out, the list panel flags any variety that's incompatible with your active zone this season — no more buying seeds you can't grow this year

### Historical Frost Probability Overlay
- See 10%/50%/90% probability frost dates based on 30-year NOAA Climate Normals for your ZIP — not just average dates
- Understand the real risk: your last spring frost "average" of April 15 may carry a 30% chance of frost through May 1

---

## Privacy

All your data — ZIP code, zone, settings, shopping list — is stored locally in your browser using `chrome.storage`. Nothing is ever transmitted to external servers on the free tier. The only external call is the optional historical frost probability fetch for Pro subscribers (NOAA's public API), which contains no personally identifying information.

---

## Supported Sites

- **burpee.com**
- **johnnyseeds.com**
- **rareseeds.com** (Baker Creek)
- **seedsavers.org**
- **parkseed.com**
- **territorialseed.com**
- **westcoastseeds.com**
- **migardener.com**

---

## How It Works

1. Install → enter your ZIP code in the popup (takes under 60 seconds)
2. Browse to any product page on a supported seed site
3. The planting badge, season indicator, and companion chips appear inline — below the product title, in the page flow
4. Pro features (frost countdown, succession planner) are visible and unlock instantly with a $5/month subscription

---

*Built for home gardeners who want to make smarter planting decisions without leaving the page they're already on.*
