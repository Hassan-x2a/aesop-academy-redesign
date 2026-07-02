/* ─────────────────────────────────────────────────────────────
 * AESOP AI Academy — Shared Auth Modal
 * ─────────────────────────────────────────────────────────────
 * Injects a site-wide sign-in / create-account / Google OAuth
 * modal that can be opened from any page.  After a successful
 * auth it links the Firebase account UID to the anonymous
 * AESOP-XXXX learner ID in Firestore (merging progress).
 *
 * Exposes:  window.openAuthModal(tab), window.closeAuthModal()
 *
 * Usage on any page (placed before </body> or after top-banner):
 *   <script src="/assets/auth-modal.js" defer></script>
 * ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (document.getElementById('authModalOverlay')) return;

  var _pageUrl = document.location.href;
  var _baseDir = _pageUrl.substring(0, _pageUrl.lastIndexOf('/') + 1);

  /* ─── FIREBASE LAZY LOADER ─────────────────────────────── */
  var _firebaseCache = null;

  function loadFirebase() {
    if (_firebaseCache) return _firebaseCache;
    _firebaseCache = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
      import(_baseDir + 'ai-academy/js/firebase-config.js')
    ]).then(function (mods) {
      var firebaseApp = mods[0];
      var firebaseAuth = mods[1];
      var firebaseFirestore = mods[2];
      var config = mods[3].FIREBASE_CONFIG;
      var app = firebaseApp.initializeApp(config);
      var auth = firebaseAuth.getAuth(app);
      var db = firebaseFirestore.getFirestore(app);
      return {
        auth: auth,
        db: db,
        createUserWithEmailAndPassword: firebaseAuth.createUserWithEmailAndPassword,
        signInWithEmailAndPassword: firebaseAuth.signInWithEmailAndPassword,
        signInWithPopup: firebaseAuth.signInWithPopup,
        GoogleAuthProvider: firebaseAuth.GoogleAuthProvider,
        signOut: firebaseAuth.signOut,
        onAuthStateChanged: firebaseAuth.onAuthStateChanged,
        setDoc: firebaseFirestore.setDoc,
        doc: firebaseFirestore.doc
      };
    });
    return _firebaseCache;
  }

  /* ─── CSS ──────────────────────────────────────────────── */
  var CSS = '' +
    '#authModalOverlay {' +
    '  position: fixed; inset: 0;' +
    '  background: rgba(13, 27, 42, 0.7);' +
    '  backdrop-filter: blur(6px);' +
    '  -webkit-backdrop-filter: blur(6px);' +
    '  display: none; align-items: center; justify-content: center;' +
    '  z-index: 10000;' +
    '  padding: 1rem;' +
    '  animation: authFadeIn 0.2s ease-out;' +
    '}' +
    '#authModalOverlay.open { display: flex; }' +
    '@keyframes authFadeIn {' +
    '  from { opacity: 0; }' +
    '  to   { opacity: 1; }' +
    '}' +
    '#authModal {' +
    '  background: var(--cream, #faf8f4);' +
    '  color: var(--ink, #1a1a2e);' +
    '  border-radius: var(--radius-lg, 20px);' +
    '  width: 420px; max-width: 100%;' +
    '  box-shadow: 0 24px 60px rgba(0,0,0,0.35);' +
    '  position: relative;' +
    '  animation: authSlideIn 0.25s ease-out;' +
    '  overflow: hidden;' +
    '}' +
    '[data-theme="dark"] #authModal {' +
    '  background: var(--navy-mid, #16293d);' +
    '  color: #e2e8f0;' +
    '}' +
    '@keyframes authSlideIn {' +
    '  from { opacity: 0; transform: translateY(24px) scale(0.96); }' +
    '  to   { opacity: 1; transform: translateY(0) scale(1); }' +
    '}' +
    '#authModal-close {' +
    '  position: absolute; top: 12px; right: 14px;' +
    '  background: none; border: none;' +
    '  font-size: 1.5rem; line-height: 1;' +
    '  color: var(--ink-muted, #718096);' +
    '  cursor: pointer; padding: 4px; z-index: 1;' +
    '  transition: color 0.15s;' +
    '}' +
    '#authModal-close:hover { color: var(--ink, #1a1a2e); }' +
    '[data-theme="dark"] #authModal-close:hover { color: #fff; }' +
    '#authModal-header {' +
    '  padding: 2rem 2rem 0; text-align: center;' +
    '}' +
    '#authModal-header h2 {' +
    '  font-family: var(--font-display, "Playfair Display", Georgia, serif);' +
    '  font-size: 1.5rem; font-weight: 700;' +
    '  color: var(--navy, #0d1b2a);' +
    '  margin: 0 0 0.35rem;' +
    '}' +
    '[data-theme="dark"] #authModal-header h2 { color: var(--gold, #c9a05a); }' +
    '#authModal-header p {' +
    '  font-size: 0.85rem; color: var(--ink-muted, #718096);' +
    '  margin: 0 0 1.25rem;' +
    '}' +
    '#authModal-body { padding: 0 2rem 2rem; }' +
    '.auth-divider {' +
    '  display: flex; align-items: center; gap: 0.75rem;' +
    '  margin: 1.25rem 0; color: var(--ink-muted, #718096);' +
    '  font-size: 0.75rem; text-transform: uppercase;' +
    '  letter-spacing: 0.08em;' +
    '}' +
    '.auth-divider::before,' +
    '.auth-divider::after {' +
    '  content: ""; flex: 1; height: 1px;' +
    '  background: var(--border, #e2d9cc);' +
    '}' +
    '[data-theme="dark"] .auth-divider::before,' +
    '[data-theme="dark"] .auth-divider::after {' +
    '  background: rgba(255,255,255,0.12);' +
    '}' +
    '.auth-google-btn {' +
    '  display: flex; align-items: center; justify-content: center; gap: 0.6rem;' +
    '  width: 100%; padding: 0.7rem 1rem;' +
    '  background: var(--white, #fff); color: var(--ink, #1a1a2e);' +
    '  border: 1px solid var(--border, #e2d9cc);' +
    '  border-radius: var(--radius-md, 12px);' +
    '  font-size: 0.9rem; font-weight: 600;' +
    '  cursor: pointer; transition: background 0.15s, border-color 0.15s;' +
    '}' +
    '.auth-google-btn:hover {' +
    '  background: var(--cream, #faf8f4);' +
    '  border-color: var(--gold, #c9a05a);' +
    '}' +
    '[data-theme="dark"] .auth-google-btn {' +
    '  background: rgba(255,255,255,0.06);' +
    '  color: #e2e8f0;' +
    '  border-color: rgba(255,255,255,0.12);' +
    '}' +
    '[data-theme="dark"] .auth-google-btn:hover {' +
    '  background: rgba(255,255,255,0.1);' +
    '  border-color: var(--gold, #c9a05a);' +
    '}' +
    '.auth-google-btn svg { width: 18px; height: 18px; flex-shrink: 0; }' +
    '.auth-field {' +
    '  margin-bottom: 0.85rem;' +
    '}' +
    '.auth-field label {' +
    '  display: block; font-size: 0.78rem; font-weight: 600;' +
    '  color: var(--ink-mid, #2c3e50);' +
    '  margin-bottom: 0.3rem;' +
    '}' +
    '[data-theme="dark"] .auth-field label { color: #b0bed0; }' +
    '.auth-field input {' +
    '  width: 100%; padding: 0.65rem 0.85rem;' +
    '  background: var(--white, #fff);' +
    '  color: var(--ink, #1a1a2e);' +
    '  border: 1px solid var(--border, #e2d9cc);' +
    '  border-radius: var(--radius-sm, 6px);' +
    '  font-size: 0.9rem; font-family: inherit;' +
    '  transition: border-color 0.15s;' +
    '}' +
    '.auth-field input:focus {' +
    '  outline: none; border-color: var(--gold, #c9a05a);' +
    '  box-shadow: 0 0 0 3px rgba(201,160,90,0.15);' +
    '}' +
    '[data-theme="dark"] .auth-field input {' +
    '  background: rgba(15,23,42,0.6);' +
    '  color: #e2e8f0;' +
    '  border-color: rgba(255,255,255,0.12);' +
    '}' +
    '[data-theme="dark"] .auth-field input:focus {' +
    '  border-color: var(--gold, #c9a05a);' +
    '  box-shadow: 0 0 0 3px rgba(201,160,90,0.2);' +
    '}' +
    '.auth-submit-btn {' +
    '  width: 100%; padding: 0.7rem; margin-top: 0.25rem;' +
    '  background: var(--gold, #c9a05a); color: var(--navy, #0d1b2a);' +
    '  border: none; border-radius: var(--radius-sm, 6px);' +
    '  font-size: 0.9rem; font-weight: 700;' +
    '  cursor: pointer; transition: background 0.15s, transform 0.12s;' +
    '}' +
    '.auth-submit-btn:hover { background: var(--gold-light, #dbb87a); }' +
    '.auth-submit-btn:active { transform: scale(0.98); }' +
    '.auth-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }' +
    '.auth-error {' +
    '  font-size: 0.8rem; color: var(--red, #e05c5c);' +
    '  margin: 0.5rem 0 0; min-height: 1.2em;' +
    '}' +
    '.auth-success {' +
    '  font-size: 0.8rem; color: var(--green, #4caf82);' +
    '  margin: 0.5rem 0 0; min-height: 1.2em;' +
    '}' +
    '.auth-toggle {' +
    '  text-align: center; margin-top: 1rem;' +
    '  font-size: 0.82rem; color: var(--ink-muted, #718096);' +
    '}' +
    '.auth-toggle a {' +
    '  color: var(--gold, #c9a05a); cursor: pointer;' +
    '  font-weight: 600; text-decoration: none;' +
    '}' +
    '.auth-toggle a:hover { text-decoration: underline; }' +
    '[data-theme="dark"] .auth-toggle a { color: var(--gold-light, #dbb87a); }' +
    '.auth-logged-in {' +
    '  text-align: center; padding: 2rem 0 0.5rem;' +
    '}' +
    '.auth-logged-in .auth-avatar {' +
    '  width: 56px; height: 56px; border-radius: 50%;' +
    '  background: var(--gold, #c9a05a);' +
    '  display: flex; align-items: center; justify-content: center;' +
    '  margin: 0 auto 0.75rem;' +
    '  font-size: 1.4rem; font-weight: 700;' +
    '  color: var(--navy, #0d1b2a);' +
    '}' +
    '.auth-email-display {' +
    '  font-weight: 600; font-size: 0.95rem;' +
    '  margin-bottom: 0.25rem;' +
    '}' +
    '.auth-learner-id {' +
    '  font-size: 0.82rem; color: var(--ink-muted, #718096);' +
    '  margin-bottom: 0.25rem;' +
    '}' +
    '.auth-learner-id strong { color: var(--gold, #c9a05a); }' +
    '.auth-progress-msg {' +
    '  font-size: 0.78rem; color: var(--green, #4caf82);' +
    '  margin-bottom: 1.25rem;' +
    '}' +
    '.auth-logout-btn {' +
    '  display: inline-block; padding: 0.5rem 1.5rem;' +
    '  background: transparent; color: var(--ink-muted, #718096);' +
    '  border: 1px solid var(--border, #e2d9cc);' +
    '  border-radius: 2rem; font-size: 0.82rem; font-weight: 600;' +
    '  cursor: pointer; transition: all 0.15s;' +
    '}' +
    '.auth-logout-btn:hover {' +
    '  color: var(--red, #e05c5c);' +
    '  border-color: var(--red, #e05c5c);' +
    '}' +
    '[data-theme="dark"] .auth-logout-btn {' +
    '  color: #b0bed0; border-color: rgba(255,255,255,0.12);' +
    '}' +
    '[data-theme="dark"] .auth-logout-btn:hover {' +
    '  color: var(--red, #e05c5c);' +
    '  border-color: var(--red, #e05c5c);' +
    '}' +
    '.auth-spinner {' +
    '  display: inline-block; width: 18px; height: 18px;' +
    '  border: 2px solid var(--navy, #0d1b2a);' +
    '  border-top-color: transparent; border-radius: 50%;' +
    '  animation: authSpin 0.6s linear infinite;' +
    '  vertical-align: -4px; margin-right: 0.3rem;' +
    '}' +
    '[data-theme="dark"] .auth-spinner {' +
    '  border-color: var(--gold, #c9a05a);' +
    '  border-top-color: transparent;' +
    '}' +
    '@keyframes authSpin { to { transform: rotate(360deg); } }';

  /* ─── HTML ─────────────────────────────────────────────── */
  var HTML = '' +
    '<div id="authModalOverlay">' +
    '  <div id="authModal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">' +
    '    <button id="authModal-close" aria-label="Close">&times;</button>' +
    '    <div id="authModal-header">' +
    '      <h2 id="authModalTitle">Sign In</h2>' +
    '      <p id="authModalSubtitle">Save your progress and pick up where you left off.</p>' +
    '    </div>' +
    '    <div id="authModal-body">' +
    '      <div id="authView-signin">' +
    '        <button class="auth-google-btn" id="authGoogleBtn">' +
    '          <svg viewBox="0 0 48 48"><path fill="#fbc02d" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#e53935" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4caf50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1565c0" d="M43.611 20.083 43.595 20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>' +
    '          Sign in with Google' +
    '        </button>' +
    '        <div class="auth-divider">or sign in with email</div>' +
    '        <div class="auth-field">' +
    '          <label for="authEmail">Email</label>' +
    '          <input id="authEmail" type="email" placeholder="name@example.com" autocomplete="email">' +
    '        </div>' +
    '        <div class="auth-field">' +
    '          <label for="authPassword">Password</label>' +
    '          <input id="authPassword" type="password" placeholder="Your password" autocomplete="current-password">' +
    '        </div>' +
    '        <button class="auth-submit-btn" id="authSignInBtn">Sign In</button>' +
    '        <div class="auth-error" id="authError"></div>' +
    '        <div class="auth-toggle">Don\'t have an account? <a id="authToggle-create">Create one</a></div>' +
    '      </div>' +
    '      <div id="authView-create" style="display:none">' +
    '        <button class="auth-google-btn" id="authGoogleBtn2">' +
    '          <svg viewBox="0 0 48 48"><path fill="#fbc02d" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#e53935" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4caf50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1565c0" d="M43.611 20.083 43.595 20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>' +
    '          Sign up with Google' +
    '        </button>' +
    '        <div class="auth-divider">or create an account</div>' +
    '        <div class="auth-field">' +
    '          <label for="authCreateEmail">Email</label>' +
    '          <input id="authCreateEmail" type="email" placeholder="name@example.com" autocomplete="email">' +
    '        </div>' +
    '        <div class="auth-field">' +
    '          <label for="authCreatePassword">Password</label>' +
    '          <input id="authCreatePassword" type="password" placeholder="At least 6 characters" autocomplete="new-password">' +
    '        </div>' +
    '        <button class="auth-submit-btn" id="authCreateBtn">Create Account</button>' +
    '        <div class="auth-error" id="authCreateError"></div>' +
    '        <div class="auth-toggle">Already have an account? <a id="authToggle-signin">Sign in</a></div>' +
    '      </div>' +
    '      <div id="authView-loggedin" style="display:none">' +
    '        <div class="auth-logged-in">' +
    '          <div class="auth-avatar" id="authAvatar">&#x1f464;</div>' +
    '          <div class="auth-email-display" id="authEmailDisplay"></div>' +
    '          <div class="auth-learner-id" id="authLearnerIdDisplay">Learner ID: <strong id="authLearnerIdValue"></strong></div>' +
    '          <div class="auth-progress-msg" id="authProgressMsg">Your progress has been saved to your account.</div>' +
    '        </div>' +
    '        <div style="text-align:center;margin-top:1.25rem">' +
    '          <a href="' + _baseDir + 'account.html" class="auth-submit-btn" style="display:inline-block;width:auto;padding:0.55rem 1.5rem;text-decoration:none">Manage Account</a>' +
    '        </div>' +
    '        <div style="text-align:center;margin-top:0.75rem">' +
    '          <button class="auth-logout-btn" id="authLogoutBtn">Sign Out</button>' +
    '        </div>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  /* ─── INJECT CSS ───────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.id = 'authModalStyles';
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ─── INJECT HTML ──────────────────────────────────────── */
  function mount() {
    if (document.getElementById('authModalOverlay')) return;
    var el = document.createElement('div');
    el.id = 'authModalMount';
    el.innerHTML = HTML;
    document.body.appendChild(el.firstElementChild);
    wireBehaviors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  /* ─── STATE ────────────────────────────────────────────── */
  var _currentTab = 'signin';
  var _pendingRedirect = null;

  function _modal() { return document.getElementById('authModalOverlay'); }
  function _view(id) { return document.getElementById('authView-' + id); }
  function _get(id)  { return document.getElementById(id); }

  /* ─── OPEN / CLOSE ─────────────────────────────────────── */
  window.openAuthModal = function (tab, redirectUrl) {
    tab = tab || 'signin';
    _currentTab = tab;
    _pendingRedirect = redirectUrl || null;

    var overlay = _modal();
    if (!overlay) return;

    var loggedIn = _view('loggedin');
    if (loggedIn && loggedIn.style.display !== 'none') {
      overlay.classList.add('open');
      return;
    }

    _get('authView-signin').style.display = tab === 'signin' ? '' : 'none';
    _get('authView-create').style.display = tab === 'create' ? '' : 'none';
    overlay.classList.add('open');

    var title = _get('authModalTitle');
    var sub = _get('authModalSubtitle');
    if (tab === 'create') {
      title.textContent = 'Create Account';
      sub.textContent = 'Save your progress and learn across any device.';
      setTimeout(function () { var el = _get('authCreateEmail'); if (el) el.focus(); }, 100);
    } else {
      title.textContent = 'Sign In';
      sub.textContent = 'Save your progress and pick up where you left off.';
      setTimeout(function () { var el = _get('authEmail'); if (el) el.focus(); }, 100);
    }
  };

  window.closeAuthModal = function () {
    var overlay = _modal();
    if (!overlay) return;
    overlay.classList.remove('open');
    _clearErrors();
  };

  function _clearErrors() {
    var e1 = _get('authError');
    var e2 = _get('authCreateError');
    if (e1) e1.textContent = '';
    if (e2) e2.textContent = '';
  }

  function _setError(id, msg) {
    var el = _get(id);
    if (el) el.textContent = msg;
  }

  function _setLoading(btnId, loading) {
    var btn = _get(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.innerHTML = '<span class="auth-spinner"></span> Processing\u2026';
    } else {
      btn.innerHTML = btn.dataset.label || btn.innerHTML;
    }
  }

  /* ─── LINK LEARNER ID TO AUTH ACCOUNT ──────────────────── */
  function linkLearnerIdToAccount(fb) {
    var learnerId = localStorage.getItem('aesop-learner-id');
    if (!learnerId) return Promise.resolve();
    return fb.setDoc(fb.doc(fb.db, 'learners', learnerId), {
      learnerId: learnerId,
      accountUid: fb.auth.currentUser.uid,
      accountEmail: fb.auth.currentUser.email || '',
      lastAuthLink: new Date().toISOString()
    }, { merge: true }).catch(function (err) {
      console.warn('[AUTH] Could not link learner ID:', err);
    });
  }

  /* ─── WIRE BEHAVIORS ───────────────────────────────────── */
  function wireBehaviors() {
    if (!_modal()) return;

    /* ─── Close handlers ─────────────────────────────────── */
    _get('authModal-close').addEventListener('click', window.closeAuthModal);
    _modal().addEventListener('click', function (e) {
      if (e.target === _modal()) window.closeAuthModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _modal().classList.contains('open')) window.closeAuthModal();
    });

    /* ─── Tab toggle ─────────────────────────────────────── */
    _get('authToggle-create').addEventListener('click', function () {
      window.openAuthModal('create', _pendingRedirect);
    });
    _get('authToggle-signin').addEventListener('click', function () {
      window.openAuthModal('signin', _pendingRedirect);
    });

    /* ─── Enter key to submit ──────────────────────────── */
    function enterSubmit(e, btnId) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var btn = _get(btnId);
        if (btn) btn.click();
      }
    }
    _get('authEmail').addEventListener('keydown', function (e) { enterSubmit(e, 'authSignInBtn'); });
    _get('authPassword').addEventListener('keydown', function (e) { enterSubmit(e, 'authSignInBtn'); });
    _get('authCreateEmail').addEventListener('keydown', function (e) { enterSubmit(e, 'authCreateBtn'); });
    _get('authCreatePassword').addEventListener('keydown', function (e) { enterSubmit(e, 'authCreateBtn'); });

    /* ─── Sign In ────────────────────────────────────────── */
    _get('authSignInBtn').addEventListener('click', function () {
      var email = _get('authEmail').value.trim();
      var password = _get('authPassword').value;
      if (!email || !password) {
        _setError('authError', 'Please enter your email and password.');
        return;
      }
      _setLoading('authSignInBtn', true);
      loadFirebase().then(function (fb) {
        return fb.signInWithEmailAndPassword(fb.auth, email, password);
      }).then(function () {
        return loadFirebase().then(function (fb) { return linkLearnerIdToAccount(fb); });
      }).then(function () {
        _setLoading('authSignInBtn', false);
        window.closeAuthModal();
        if (_pendingRedirect) window.location.href = _pendingRedirect;
      }).catch(function (err) {
        _setLoading('authSignInBtn', false);
        _setError('authError', err.message);
      });
    });

    /* ─── Create Account ─────────────────────────────────── */
    _get('authCreateBtn').addEventListener('click', function () {
      var email = _get('authCreateEmail').value.trim();
      var password = _get('authCreatePassword').value;
      if (!email || !password) {
        _setError('authCreateError', 'Please enter your email and password.');
        return;
      }
      if (password.length < 6) {
        _setError('authCreateError', 'Password must be at least 6 characters.');
        return;
      }
      _setLoading('authCreateBtn', true);
      loadFirebase().then(function (fb) {
        return fb.createUserWithEmailAndPassword(fb.auth, email, password);
      }).then(function () {
        return loadFirebase().then(function (fb) { return linkLearnerIdToAccount(fb); });
      }).then(function () {
        _setLoading('authCreateBtn', false);
        window.closeAuthModal();
        if (_pendingRedirect) window.location.href = _pendingRedirect;
      }).catch(function (err) {
        _setLoading('authCreateBtn', false);
        _setError('authCreateError', err.message);
      });
    });

    /* ─── Google OAuth ───────────────────────────────────── */
    function handleGoogleSignIn() {
      _setLoading('authGoogleBtn', true);
      loadFirebase().then(function (fb) {
        var provider = new fb.GoogleAuthProvider();
        return fb.signInWithPopup(fb.auth, provider);
      }).then(function () {
        return loadFirebase().then(function (fb) { return linkLearnerIdToAccount(fb); });
      }).then(function () {
        _setLoading('authGoogleBtn', false);
        window.closeAuthModal();
        if (_pendingRedirect) window.location.href = _pendingRedirect;
      }).catch(function (err) {
        _setLoading('authGoogleBtn', false);
        _setError('authError', err.message);
      });
    }
    _get('authGoogleBtn').addEventListener('click', handleGoogleSignIn);
    _get('authGoogleBtn2').addEventListener('click', handleGoogleSignIn);

    /* ─── Sign Out ───────────────────────────────────────── */
    _get('authLogoutBtn').addEventListener('click', function () {
      loadFirebase().then(function (fb) {
        return fb.signOut(fb.auth);
      }).then(function () {
        window.closeAuthModal();
      }).catch(function (err) {
        console.warn('[AUTH] Sign out error:', err);
      });
    });

    /* ─── Auth State Monitor ─────────────────────────────── */
    loadFirebase().then(function (fb) {
      fb.onAuthStateChanged(fb.auth, function (user) {
        var signinView = _get('authView-signin');
        var createView = _get('authView-create');
        var loggedInView = _get('authView-loggedin');
        if (!signinView || !createView || !loggedInView) return;

        if (user) {
          signinView.style.display = 'none';
          createView.style.display = 'none';
          loggedInView.style.display = '';
          var display = _get('authEmailDisplay');
          if (display) display.textContent = user.email;
          var learnerId = localStorage.getItem('aesop-learner-id');
          var idDisplay = _get('authLearnerIdValue');
          if (idDisplay && learnerId) idDisplay.textContent = learnerId;
        } else {
          signinView.style.display = '';
          createView.style.display = 'none';
          loggedInView.style.display = 'none';
        }
      });
    });

    /* ─── Wire Start Learning button in top banner ───────── */
    function wireStartBtn() {
      var btn = document.querySelector('.tb-start-btn');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        loadFirebase().then(function (fb) {
          if (fb.auth.currentUser) return;
          e.preventDefault();
          window.openAuthModal('signin', btn.getAttribute('href') || '/ai-academy/assessment.html');
        });
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wireStartBtn, { once: true });
    } else {
      wireStartBtn();
    }
  }
})();
