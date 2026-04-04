# Spec: Wedding Vendor Comparison Overlay
**Extension #5 | Validated Score: 22/25 | Priority: High**

---

## Problem

Couples planning a wedding browse vendor listings on The Knot and WeddingWire across multiple categories (photographers, caterers, florists, venues, DJs, officiant, hair & makeup) but have no in-browser tooling to track, compare, or quote vendors. The Knot's native "Save vendor" feature is barebones — no price fields, no notes, no side-by-side comparison. Couples routinely manage 20+ vendor tabs and resort to personal spreadsheets.

r/weddingplanning (250k+ members) is filled with posts sharing Google Sheets templates for vendor tracking, confirming this is the community's #1 workflow pain. The only standalone solution (Tulle, $8/mo) requires tab-switching to a separate web app — not an inline browser overlay.

**No browser extension currently serves this market.**

---

## Core Features

### Free Tier
- **"Track Vendor" button** injected on every vendor listing card on theknot.com and weddingwire.com
- **Side panel** (toggleable, persistent across tabs) showing:
  - Saved vendor list with: name, category, price range, status badge (Contacted / Quoted / Booked / Rejected)
  - Notes field per vendor (free-text)
- **CSV export** of full vendor list (name, category, price range, status, notes)
- Storage via `chrome.storage.local` — no account required

### Pro Tier ($7/mo)
- **Side-by-side comparison table** — up to 4 vendors per category, all fields visible simultaneously
- **Price quote entry** — enter actual quoted price per vendor (vs. range shown on listing)
- **Budget-remaining tracker per category** — set a category budget, see remaining balance as quotes come in
- **Contact log** — per-vendor log of: date contacted, response received (yes/no/awaiting), follow-up date
- **Availability notes** — per-vendor availability field (date confirmed, waitlisted, unavailable)
- **Email draft shortcut** — pre-fills a draft email with vendor contact info from the listing page

---

## Tech Approach

| Component | Approach |
|---|---|
| **Injection** | Content script on `*://www.theknot.com/*` and `*://www.weddingwire.com/*` |
| **Vendor detection** | DOM scrape for listing cards; detect vendor name, category label, and price-range element on both sites |
| **"Track Vendor" button** | Injected adjacent to The Knot's existing "Save" button and WeddingWire's equivalent CTA |
| **Side panel** | Chrome Side Panel API (`chrome.sidePanel`) for persistent panel UI across navigation |
| **Storage** | `chrome.storage.local` for free tier; `chrome.storage.sync` for Pro cross-device sync |
| **Comparison table** | Pure HTML/CSS grid rendered in the side panel — no server call required |
| **Budget tracker** | Client-side arithmetic from quote entries stored in local storage |
| **Email draft** | `mailto:` link generated from scraped vendor contact fields |
| **Monetization** | Stripe Checkout popup for Pro upgrade; webhook sets `proUnlocked: true` in synced storage |

**Target Sites (v1.0):** theknot.com, weddingwire.com
**Phase 2 (post-launch):** zola.com (vendor marketplace), junebugweddings.com

---

## Stripe Stub

- **Free**: install with no account required; "Track Vendor" and basic side panel available immediately
- **Pro upgrade** triggered on first use of: comparison table, quote entry field, or contact log
- Stripe Checkout session (one-time popup); success webhook sets `proUnlocked: true` in `chrome.storage.sync`
- Monthly subscription, cancel anytime
- `billingCode`: `EXT-005-PRO`

---

## Success Criteria (v1.0)

| Metric | Target |
|---|---|
| Vendor detection accuracy (theknot.com listing cards) | >90% correct name + category extraction |
| Vendor detection accuracy (weddingwire.com listing cards) | >85% correct name + category extraction |
| Install → first "Track Vendor" click | <2 min median time |
| 30-day free → Pro conversion | ≥5% |
| Week-1 retention | ≥60% |
| 5-star Chrome Store reviews (90 days) | >50 |

---

## Out of Scope (v1.0)

- Real-time availability checking or calendar sync with vendor booking systems
- Mobile app or non-Chrome browsers
- Direct integration with The Knot or WeddingWire user accounts
- AI-generated vendor recommendations or sentiment analysis
- Guest list, seating chart, or general wedding planning features (scope creep risk)
- Support for non-US wedding sites

---

*Research basis: `output/idea_backlog_scan2.json` rank 1 (score 22/25) | Spec owner: Product Strategist | Date: 2026-04-05*
