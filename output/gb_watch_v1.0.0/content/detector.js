// GB Watch — Content Script (detector.js)
// Injects a "Watch This GB" button on supported GB/IC pages

(function () {
  'use strict';

  const BUTTON_ID = 'gbwatch-inject-btn';
  const hostname = location.hostname.replace(/^www\./, '');

  // ─── Domain Detectors ──────────────────────────────────────────────────────

  const detectors = {
    'geekhack.org': {
      isGBPage() {
        // Only thread pages
        return /index\.php\?topic=/.test(location.href);
      },
      getInsertTarget() {
        // Insert near the thread title
        return (
          document.querySelector('#subject_header') ||
          document.querySelector('.titlebg') ||
          document.querySelector('h1') ||
          null
        );
      },
      insertButton(target, btn) {
        target.insertAdjacentElement('afterend', btn);
      }
    },

    'drop.com': {
      isGBPage() {
        return /\/buy\/|\/sell\//.test(location.pathname);
      },
      getInsertTarget() {
        // Insert near the main product add-to-cart or join-GB button
        return (
          document.querySelector('[data-testid="add-to-cart"]') ||
          document.querySelector('button[class*="join"]') ||
          document.querySelector('button[class*="cart"]') ||
          document.querySelector('h1') ||
          null
        );
      },
      insertButton(target, btn) {
        target.insertAdjacentElement('afterend', btn);
      }
    },

    'novelkeys.com': {
      isGBPage() {
        return /\/products\//.test(location.pathname);
      },
      getInsertTarget() {
        return (
          document.querySelector('.product-form__submit') ||
          document.querySelector('button[name="add"]') ||
          document.querySelector('h1') ||
          null
        );
      },
      insertButton(target, btn) {
        target.insertAdjacentElement('afterend', btn);
      }
    },

    'cannonkeys.com': {
      isGBPage() {
        return /\/products\//.test(location.pathname);
      },
      getInsertTarget() {
        return (
          document.querySelector('.product-form__submit') ||
          document.querySelector('button[name="add"]') ||
          document.querySelector('h1') ||
          null
        );
      },
      insertButton(target, btn) {
        target.insertAdjacentElement('afterend', btn);
      }
    }
  };

  const detector = detectors[hostname];
  if (!detector) return;
  if (!detector.isGBPage()) return;

  // ─── Button Injection ──────────────────────────────────────────────────────

  function createButton() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.textContent = '⌨️ Watch This GB';
    btn.style.cssText = [
      'display: inline-flex',
      'align-items: center',
      'gap: 6px',
      'margin: 8px 0',
      'padding: 8px 14px',
      'background: #2563eb',
      'color: #fff',
      'border: none',
      'border-radius: 6px',
      'font-size: 13px',
      'font-weight: 600',
      'cursor: pointer',
      'font-family: system-ui, sans-serif',
      'line-height: 1.4',
      'z-index: 9999'
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#1d4ed8';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#2563eb';
    });

    return btn;
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return; // already injected

    const target = detector.getInsertTarget();
    if (!target) return;

    const btn = createButton();
    detector.insertButton(target, btn);

    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = '⌨️ Adding…';

      const url = location.href;
      const name = document.title
        .replace(/\s*[-–|]\s*(GeekHack|Drop|NovelKeys|CannonKeys).*$/i, '')
        .trim();

      chrome.runtime.sendMessage({ type: 'ADD_ITEM', url, name }, (response) => {
        if (chrome.runtime.lastError) {
          btn.textContent = '⌨️ Error — reload and try again';
          btn.disabled = false;
          return;
        }
        if (response?.ok) {
          btn.textContent = '✓ Watching!';
          btn.style.background = '#16a34a';
        } else {
          btn.textContent = `⌨️ ${response?.error || 'Could not add'}`;
          btn.disabled = false;
        }
      });
    });
  }

  // Try immediately, then watch for DOM settling (SPAs / lazy-loaded product pages)
  injectButton();

  let attempts = 0;
  const maxAttempts = 20;
  const observer = new MutationObserver(() => {
    if (document.getElementById(BUTTON_ID)) {
      observer.disconnect();
      return;
    }
    if (++attempts > maxAttempts) {
      observer.disconnect();
      return;
    }
    injectButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
