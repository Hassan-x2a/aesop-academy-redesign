/* ─────────────────────────────────────────────────────────────
 * AESOP AI Academy — Save-Your-Progress Prompt
 * ─────────────────────────────────────────────────────────────
 * Lightweight toast / bar that invites anonymous learners to
 * create an account after they've experienced value (completed a
 * lesson, spent meaningful time, etc.).
 *
 * Value-first, friction-later — never blocks the experience.
 *
 * Strategy:
 *   - Shown after: lesson/page navigation, time-on-page, or
 *     explicit trigger (window.showSaveProgressPrompt())
 *   - Dismissed: click X or "Not now".  Re-appears in 7 days
 *     unless "Don't show again" checked.
 *   - If user is already signed in (Firebase auth), never shows.
 *
 * Usage:
 *   <script src="/assets/save-progress-prompt.js" defer></script>
 *
 *   // Trigger from any page:
 *   window.showSaveProgressPrompt();
 *   window.triggerSaveProgressPrompt(); // debounced variant
 * ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (document.getElementById('sppOverlay')) return;

  var LS_KEY = 'aesop-spp-dismiss';
  var DISMISS_DAYS = 7;
  var TRIGGER_DELAY = 12000; // 12s after page load if content present
  var _shown = false;
  var _dismissed = false;

  /* ─── Check auth state (lazy via auth-modal) ──────────── */
  function isSignedIn() {
    try {
      return !!document.querySelector('#authView-loggedin') &&
        document.getElementById('authView-loggedin').style.display !== 'none';
    } catch (_) { return false; }
  }

  function wasDismissedRecently() {
    try {
      var val = localStorage.getItem(LS_KEY);
      if (!val) return false;
      return Date.now() - parseInt(val, 10) < DISMISS_DAYS * 86400000;
    } catch (_) { return false; }
  }

  function markDismissed(dontShowAgain) {
    try {
      localStorage.setItem(LS_KEY, String(Date.now()));
      if (dontShowAgain) localStorage.setItem(LS_KEY + '-permanent', '1');
    } catch (_) {}
  }

  function hasProgress() {
    try {
      // Check for completed lessons, hub progress, or streak
      var hub = localStorage.getItem('aesop-hub-progress');
      if (hub) {
        var p = JSON.parse(hub);
        if (p.completedLessons && p.completedLessons.length > 0) return true;
        if (p.completedMods && p.completedMods.length > 0) return true;
      }
      var streak = localStorage.getItem('aesop-streak');
      if (streak) {
        var s = JSON.parse(streak);
        if (s.count && s.count > 0) return true;
      }
      var certPts = parseInt(localStorage.getItem('aesop-cert-mpts') || '0', 10);
      if (certPts > 0) return true;
      // Fallback: any course progress
      var courseProg = localStorage.getItem('aesop-course-progress');
      if (courseProg && courseProg !== '{}') return true;
    } catch (_) {}
    return false;
  }

  /* ─── CSS ──────────────────────────────────────────────── */
  var CSS = '' +
    '#sppOverlay {' +
    '  position: fixed; bottom: 0; left: 0; right: 0;' +
    '  z-index: 9998;' +
    '  background: linear-gradient(135deg, var(--navy, #0d1b2a) 0%, var(--navy-mid, #16293d) 100%);' +
    '  color: #fff;' +
    '  box-shadow: 0 -4px 24px rgba(0,0,0,0.25);' +
    '  transform: translateY(100%);' +
    '  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);' +
    '  font-family: var(--font-sans), system-ui, sans-serif;' +
    '}' +
    '#sppOverlay.spp-open { transform: translateY(0); }' +
    '.spp-inner {' +
    '  display: flex; align-items: center; gap: 1rem;' +
    '  padding: 0.85rem 1.25rem;' +
    '  max-width: var(--max-w, 1400px); margin: 0 auto;' +
    '  flex-wrap: wrap;' +
    '}' +
    '.spp-icon {' +
    '  flex-shrink: 0; width: 36px; height: 36px;' +
    '  background: var(--gold, #c9a05a);' +
    '  border-radius: 50%;' +
    '  display: flex; align-items: center; justify-content: center;' +
    '  font-size: 1rem;' +
    '}' +
    '.spp-text { flex: 1; min-width: 200px; }' +
    '.spp-text strong {' +
    '  font-size: 0.92rem; display: block;' +
    '  color: var(--gold, #c9a05a);' +
    '}' +
    '.spp-text span {' +
    '  font-size: 0.78rem; color: rgba(255,255,255,0.7);' +
    '  display: block; margin-top: 0.15rem;' +
    '}' +
    '.spp-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }' +
    '.spp-btn {' +
    '  padding: 0.45rem 1rem; border-radius: 2rem;' +
    '  font-size: 0.78rem; font-weight: 700;' +
    '  border: none; cursor: pointer;' +
    '  white-space: nowrap;' +
    '  transition: background 0.15s, transform 0.12s;' +
    '}' +
    '.spp-btn-primary {' +
    '  background: var(--gold, #c9a05a); color: var(--navy, #0d1b2a);' +
    '}' +
    '.spp-btn-primary:hover { background: var(--gold-light, #dbb87a); }' +
    '.spp-btn-secondary {' +
    '  background: transparent; color: rgba(255,255,255,0.65);' +
    '  border: 1px solid rgba(255,255,255,0.15);' +
    '}' +
    '.spp-btn-secondary:hover {' +
    '  background: rgba(255,255,255,0.06); color: #fff;' +
    '}' +
    '.spp-close {' +
    '  background: none; border: none; color: rgba(255,255,255,0.35);' +
    '  font-size: 1.2rem; cursor: pointer; padding: 0.25rem;' +
    '  line-height: 1; transition: color 0.15s;' +
    '}' +
    '.spp-close:hover { color: #fff; }' +
    '.spp-check {' +
    '  display: flex; align-items: center; gap: 0.35rem;' +
    '  font-size: 0.7rem; color: rgba(255,255,255,0.45);' +
    '  cursor: pointer; white-space: nowrap;' +
    '}' +
    '.spp-check input { accent-color: var(--gold, #c9a05a); }' +
    '@media (max-width: 600px) {' +
    '  .spp-inner { flex-direction: column; align-items: flex-start; gap: 0.5rem; }' +
    '  .spp-actions { width: 100%; justify-content: flex-end; }' +
    '}';

  /* ─── HTML ─────────────────────────────────────────────── */
  var HTML = '' +
    '<div id="sppOverlay">' +
    '  <div class="spp-inner">' +
    '    <div class="spp-icon" aria-hidden="true">&#x1F512;</div>' +
    '    <div class="spp-text">' +
    '      <strong>Save your progress \u2014 create an account</strong>' +
    '      <span>Pick up where you left off on any device. Free, takes 30 seconds.</span>' +
    '    </div>' +
    '    <div class="spp-actions">' +
    '      <button class="spp-btn spp-btn-secondary" id="sppLater">Not now</button>' +
    '      <button class="spp-btn spp-btn-primary" id="sppSave">Save Progress</button>' +
    '      <label class="spp-check"><input type="checkbox" id="sppDontShow"> Don\u2019t show again</label>' +
    '      <button class="spp-close" id="sppClose" aria-label="Close">&times;</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  /* ─── INJECT ───────────────────────────────────────────── */
  function mount() {
    if (document.getElementById('sppOverlay')) return;
    var style = document.createElement('style');
    style.id = 'sppStyles';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
    var el = document.createElement('div');
    el.innerHTML = HTML;
    document.body.appendChild(el.firstElementChild);
    wire();
  }

  /* ─── WIRE BEHAVIORS ───────────────────────────────────── */
  function wire() {
    var overlay = document.getElementById('sppOverlay');
    if (!overlay) return;

    function show() {
      if (_shown || _dismissed) return;
      if (isSignedIn()) return;
      if (wasDismissedRecently()) return;
      try {
        if (localStorage.getItem(LS_KEY + '-permanent')) return;
      } catch (_) {}
      _shown = true;
      overlay.classList.add('spp-open');
    }

    function hide() {
      _dismissed = true;
      overlay.classList.remove('spp-open');
    }

    /* Dismiss handlers */
    document.getElementById('sppClose').addEventListener('click', function () {
      markDismissed(false);
      hide();
    });
    document.getElementById('sppLater').addEventListener('click', function () {
      var dontShow = document.getElementById('sppDontShow').checked;
      markDismissed(dontShow);
      hide();
    });

    /* Save Progress — opens auth modal */
    function onSave() {
      var dontShow = document.getElementById('sppDontShow').checked;
      markDismissed(dontShow);
      hide();
      if (typeof window.openAuthModal === 'function') {
        window.openAuthModal('create');
      } else {
        window.location.href = '/account.html';
      }
    }
    document.getElementById('sppSave').addEventListener('click', onSave);

    /* ─── Expose trigger API ──────────────────────────────── */
    window.showSaveProgressPrompt = show;
    window.triggerSaveProgressPrompt = (function () {
      var timer = null;
      return function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          if (hasProgress() && !_shown && !_dismissed) show();
          timer = null;
        }, 800);
      };
    })();

    /* ─── Auto-trigger after delay if user has progress ──── */
    if (hasProgress()) {
      setTimeout(show, TRIGGER_DELAY);
    }

    /* ─── Listen for lesson/module completion messages ───── */
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'lessonComplete') {
        window.triggerSaveProgressPrompt();
      }
      if (e.data && (e.data.type === 'modTestPassed' || e.data.type === 'moduleComplete')) {
        window.triggerSaveProgressPrompt();
      }
    });

    /* ─── Manual trigger from page-level code ────────────── */
    // Some modules call window.parent.postMessage directly.
    // We also check for localStorage changes every few seconds.
    var _lastHubState = localStorage.getItem('aesop-hub-progress');
    setInterval(function () {
      var cur = localStorage.getItem('aesop-hub-progress');
      if (cur && cur !== _lastHubState && cur !== '{}') {
        _lastHubState = cur;
        window.triggerSaveProgressPrompt();
      }
    }, 5000);

    /* ─── Re-check auth modal state periodically ──────────── */
    // If auth modal loads later (deferred script), we won't miss it.
    setTimeout(function () {
      if (isSignedIn()) { _dismissed = true; hide(); }
    }, 3000);
  }

  /* ─── BOOT ──────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
