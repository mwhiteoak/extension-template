# Screenshot Specs — GB Watch v1.0.0

All screenshots: 1280×800px, PNG, captured from live unpacked extension loaded in Chrome.

## Screenshot 1 — Popup Dashboard with Active Watch List
**Setup:** Load the unpacked extension in Chrome. Paste 3–4 URLs from GeekHack, Drop, or NovelKeys into the watch input bar to populate the list.
**Show:** The GB Watch popup open, with at least 3 watched items displayed — each showing item name, source site badge (GeekHack / Drop / NovelKeys), status badge (e.g. "IC", "Live", "Shipped"), and a last-checked timestamp. The footer should show the item count.
**Annotation:** Arrow to a status badge with label "Instant status — GB live, closed, or shipped"

## Screenshot 2 — Chrome Notification for Status Change
**Setup:** Using the DevTools service worker console, manually trigger a status-change notification for one of the watched items (call the notify function directly or mock a status update).
**Show:** A Chrome desktop notification in the bottom-right corner reading something like "GB Watch: [Item Name] is now Live — group buy is open!" with the extension icon visible in the notification.
**Annotation:** Highlight the notification with "Push notifications the moment status changes"

## Screenshot 3 — Add Item Flow (URL Paste)
**Setup:** Open the popup with an empty or partially populated watch list.
**Show:** The popup with a GeekHack or NovelKeys URL typed/pasted into the URL input bar, before clicking Watch — or show the moment after adding with the new item appearing at the top of the list.
**Annotation:** "Paste any GeekHack, Drop, NovelKeys, or CannonKeys URL to start watching"
