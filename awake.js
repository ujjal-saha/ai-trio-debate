// ---------------------------------------------------------------------------
// awake.js  -  runs inside the page itself (not in the extension's private
// space). It makes the page believe its window is always visible and in focus.
//
// Why: when a window is covered by another window, Chrome tells the page it is
// "hidden". Some sites then pause or delay showing the AI's reply. Telling the
// page "I am visible" keeps the reply flowing. It changes nothing else.
//
// To turn this off, delete the "awake.js" block from manifest.json.
// ---------------------------------------------------------------------------
(() => {
  if (window.__tripleAwake) return;
  window.__tripleAwake = true;

  try {
    const fake = (name, value) => {
      try {
        Object.defineProperty(Document.prototype, name, { configurable: true, get: () => value });
      } catch (_) { /* ignore */ }
    };
    fake('hidden', false);
    fake('visibilityState', 'visible');
    fake('webkitHidden', false);
    fake('webkitVisibilityState', 'visible');

    try { Document.prototype.hasFocus = function () { return true; }; } catch (_) { /* ignore */ }

    // Do not let the page hear "the tab was hidden" or "the window lost focus".
    const stop = (e) => e.stopImmediatePropagation();
    document.addEventListener('visibilitychange', stop, true);
    document.addEventListener('webkitvisibilitychange', stop, true);
    window.addEventListener('visibilitychange', stop, true);
    // Only the window-level "blur", never a normal click-away inside the page.
    window.addEventListener('blur', (e) => {
      if (e.target === window || e.target === document) e.stopImmediatePropagation();
    }, true);
  } catch (_) { /* never break the page */ }
})();
