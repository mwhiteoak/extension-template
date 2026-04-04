# extension-template

A Manifest V3 Chrome extension scaffold from [EXTFACTORY](https://github.com/extfactory).

## Quick Start

```bash
# Clone this template
gh repo clone extfactory/extension-template my-extension
cd my-extension

# Rename and customise
# 1. Update manifest.json: name, description, permissions
# 2. Update _locales/en/messages.json: extensionName, extensionDescription
# 3. Replace assets/icons/ with your own 16/32/48/128px PNGs
# 4. Implement your logic in popup/, content/, background/
```

## Load in Chrome (Developer Mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select this folder
4. The extension appears in your toolbar

## Structure

```
extension-template/
├── manifest.json              # MV3 manifest
├── popup/
│   ├── popup.html             # Popup UI
│   ├── popup.js               # Popup logic
│   └── popup.css              # Popup styles
├── background/
│   └── service-worker.js      # MV3 service worker (no DOM access)
├── content/
│   └── content.js             # Injected into web pages
├── options/
│   ├── options.html           # Options page UI
│   └── options.js             # Options page logic
├── assets/
│   └── icons/                 # 16/32/48/128px PNG icons
├── stripe/
│   └── stripe-handler.js      # Stripe Checkout stub
├── store/
│   ├── description.md         # Chrome Web Store full description
│   └── short-description.txt  # Chrome Web Store short description (≤132 chars)
└── _locales/
    └── en/
        └── messages.json      # Internationalisation strings
```

## Key Notes

- **MV3 service worker**: no persistent background pages, no `window`/`document` access
- **Messaging**: use `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`
- **Storage**: prefer `chrome.storage.sync` (small user prefs) or `chrome.storage.local` (larger data)
- **Stripe**: implement payment session creation server-side; update `stripe/stripe-handler.js`
- **Icons**: replace placeholder PNGs before submitting to the Chrome Web Store
