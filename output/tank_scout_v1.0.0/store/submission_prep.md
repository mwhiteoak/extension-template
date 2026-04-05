# Chrome Web Store Submission Prep
## Tank Scout — Fish Compatibility Checker v1.0.0

**Status: Ready for submission — QA passed (EXT-118), clean ZIP at `output/tank_scout_v1.0.0.zip`**

---

## Submission Checklist

- [x] ZIP clean — no Stripe placeholder URLs (QA verified EXT-118)
- [x] Manifest V3 — `service_worker` background, host_permissions separated from permissions
- [x] 3 screenshot specs written (1280×800)
- [x] Short description written (116 chars, < 132 limit)
- [x] Full store description written
- [ ] **Screenshots** — must be captured from live unpacked extension (see `screenshots/SCREENSHOTS_NEEDED.md`)

---

## Store Listing Details

**Extension name:** Tank Scout — Fish Compatibility Checker

**Short description (132 chars max):**
```
Instantly check aquarium fish compatibility on LiveAquaria, Aquabid & eBay. Powered by FishBase and Seriously Fish.
```
*(116 characters)*

**Category:** Productivity

**Language:** English (en)

**Version:** 1.0.0

**Permissions declared in manifest:**
- `storage` — saves tank profile in chrome.storage.local (stays on device)
- Host permissions: liveaquaria.com, aquabid.com, ebay.com, seriouslyfish.com, fishbase.org

---

## Files

| File | Location |
|------|----------|
| Extension ZIP (clean) | `output/tank_scout_v1.0.0.zip` |
| Screenshot specs | `output/tank_scout_v1.0.0/store/screenshots/SCREENSHOTS_NEEDED.md` |
| Short description | `output/tank_scout_v1.0.0/store/short-description.txt` |
| Full description | `output/tank_scout_v1.0.0/store/description.md` |

---

## Submission Steps for Board

1. Log into [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"** → upload `output/tank_scout_v1.0.0.zip`
3. Fill in store listing:
   - **Name:** Tank Scout — Fish Compatibility Checker
   - **Short description:** copy from `store/short-description.txt`
   - **Full description:** copy from `store/description.md`
   - **Category:** Productivity
   - **Language:** English
4. Upload screenshots (see `store/screenshots/SCREENSHOTS_NEEDED.md` for capture instructions)
5. Set privacy practices — single purpose: fish compatibility; data: none collected
6. Submit for review

---

## Extension Details

- **52 species bundled** (freshwater + saltwater, FishBase/Seriously Fish sources)
- **3 host sites:** liveaquaria.com, aquabid.com, ebay.com
- **Storage only:** chrome.storage.local for tank profile, IndexedDB for species cache
- **No external auth, no user accounts, no data exfiltration**

---

## Source Issues

- Spec: [EXT-109](/EXT/issues/EXT-109#document-spec)
- Build: [EXT-112](/EXT/issues/EXT-112)
- QA: [EXT-118](/EXT/issues/EXT-118)
- Store Submit: [EXT-125](/EXT/issues/EXT-125)
