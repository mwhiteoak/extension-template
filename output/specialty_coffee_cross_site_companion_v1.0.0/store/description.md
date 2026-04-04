# Specialty Coffee Cross-Site Companion

**Stop doing the math. Start buying better coffee.**

Browsing Trade Coffee, Blue Bottle, or Onyx Coffee Lab shouldn't require a spreadsheet. Specialty Coffee Cross-Site Companion injects purchase intelligence directly onto every roastery product page — price-per-gram comparison, freshness estimates, and roastery freshness tiers — so you can make a smarter buy without leaving the page.

---

## Free Features

### $/gram Normalizer
- Auto-detects bag weight and price on any supported roastery page and displays the standardized cost-per-gram inline — e.g., **$0.31/g — compare: Onyx avg $0.29/g**
- Works across all bag formats: 8oz, 10oz, 12oz, 250g, 340g, 1lb, 2lb
- Comparison anchors drawn from bundled community-sourced roastery pricing baselines — no API calls, works offline

### Freshness Estimate Badge
- Each supported roastery has a community-contributed ship SLA profile. The extension calculates your expected roast-to-delivery window and displays it inline: "Expected roast-to-delivery: ~8 days | Optimal window: Apr 18–May 2"
- Freshness window is based on the 2–6 week specialty coffee peak-flavor standard
- SLA profiles are bundled in `data/roastery-config.json` — no registration required

### Roastery Freshness Tier Badge
- Community-contributed roastery classification displayed as an inline chip:
  - **Roasts to order** — highest freshness, bags ship within days of roast
  - **Small-batch stock** — good freshness, typically 1–3 weeks post-roast
  - **Pre-stocked inventory** — buyer beware; verify roast date before ordering
- Covers all 10 supported roasteries out of the box

### Popup Price Comparison Panel
- Click the extension popup to see same-origin coffees (e.g., "Ethiopian Yirgacheffe naturals under $0.35/g") from other supported roasters — no tab-switching required
- Filter by origin, process, or roast level

---

## Privacy

All data — settings, preferences, and the roastery config — is bundled locally with the extension or stored in `chrome.storage.sync`. Nothing is transmitted to external servers. The extension makes no network requests; all calculations are performed client-side from the bundled dataset.

---

## Supported Sites

- **tradecoffeeco.com**
- **bluebottlecoffee.com**
- **onyxcoffeelab.com**
- **counterculture.com**
- **intelligentsia.com**
- **stumptown.com**
- **atlascoffeeclub.com**
- **beanbox.com**
- **vervecoffee.com**
- **chromecoffee.com**

---

## How It Works

1. Install the extension — no account or sign-up required
2. Browse to any product page on a supported roastery site
3. The $/gram badge, freshness estimate, and freshness tier chip appear inline below the product title
4. Open the popup to compare prices across roasteries for similar origins and processes

---

*Built for the r/coffee, r/espresso, and r/pourover communities — precision purchase intelligence without leaving the page.*
