/* ─────────────────────────────────────────────────────────────
 * AESOP AI Academy — Shared Top Banner
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for the site-wide top banner (pill
 * nav + live stats + language / dark-mode / report utilities).
 *
 * To use on a page:
 *   1. Include <link rel="stylesheet" href="/academy-theme.css"> in <head>
 *      (so CSS variables like --navy and --gold resolve)
 *   2. Include this script somewhere in <body>:
 *        <script src="/assets/top-banner.js"></script>
 *   3. That's it. The script injects its own <style>, prepends the
 *      #topBanner element to <body>, and wires up stats + lang + dismiss.
 *
 * Edit this file to change the banner on every page at once.
 * ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // Avoid double-mount if the script gets included twice.
  if (document.getElementById('topBanner')) return;

  /* ─── CSS ─────────────────────────────────────────────── */
  var CSS = '' +
    /* Reserve space for the fixed banner on every page, and add scroll
       padding so #anchor links don't land hidden underneath it. */
    'html { scroll-padding-top: 140px; }' +
    'body { padding-top: 118px; overflow-x: hidden; }' +
    'body.banner-dismissed { padding-top: 0; }' +
    /* Hide any page-local <nav class="nav"> (the old per-page top nav)
       since the shared top banner above already provides brand, lang
       selector, dark-mode toggle, and forums/report pills. Selector is
       scoped to direct-child nav so it never hits in-content navs. */
    'body > nav.nav { display: none !important; }' +
    /* Also hide the legacy floating #siteLangSwitch pill on pages where
       the shared banner already provides a language selector. */
    'body > #siteLangSwitch { display: none !important; }' +
    '.top-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9999;' +
    '  background: var(--navy-mid, #16293d); color: #fff;' +
    '  box-shadow: 0 2px 16px rgba(13,27,42,0.45);' +
    '  font-family: var(--font-sans), system-ui, sans-serif; }' +
    '.tb-pills { display: flex; gap: 0.5rem; padding: 0.55rem 1.25rem;' +
    '  overflow-x: auto; -webkit-overflow-scrolling: touch;' +
    '  scrollbar-width: none; border-bottom: 1px solid rgba(201,160,90,0.20);' +
    '  align-items: center; }' +
    '.tb-pills::-webkit-scrollbar { display: none; }' +
    '.tb-brand { flex-shrink: 0; display: inline-flex; align-items: center;' +
    '  color: #fff !important; text-decoration: none;' +
    '  background: none !important; border: none !important; border-radius: 0 !important;' +
    '  font-family: var(--font-display), Georgia, serif; font-weight: 800;' +
    '  font-size: 1.05rem; letter-spacing: 0.02em;' +
    '  padding: 0.1rem 0.9rem 0.1rem 0; margin-right: 0.35rem;' +
    '  border-right: 1px solid rgba(255,255,255,0.14) !important;' +
    '  transition: color 0.15s; white-space: nowrap; }' +
    '.tb-brand em { font-style: italic; color: var(--gold, #c9a05a);' +
    '  font-weight: 700; margin-left: 0.3rem; }' +
    '.tb-brand:hover, .tb-brand:focus-visible {' +
    '  color: var(--gold, #c9a05a) !important; background: none !important;' +
    '  border-color: transparent !important; outline: none; }' +
    '.tb-brand:hover { border-right-color: rgba(255,255,255,0.14) !important; }' +
    '.tb-pills a { display: inline-flex; align-items: center; gap: 0.4rem;' +
    '  flex-shrink: 0; background: rgba(255,255,255,0.08);' +
    '  color: #fff !important; padding: 0.4rem 0.9rem; border-radius: 2rem;' +
    '  text-decoration: none; font-size: 0.85rem; font-weight: 600;' +
    '  border: 1px solid rgba(255,255,255,0.12);' +
    '  transition: background 0.15s, color 0.15s, border-color 0.15s;' +
    '  white-space: nowrap; }' +
    '.tb-pills a:hover, .tb-pills a:focus-visible {' +
    '  background: var(--gold, #c9a05a); color: var(--navy, #0f1923) !important;' +
    '  border-color: var(--gold, #c9a05a); outline: none; }' +
    '.tb-pills a.is-active { background: var(--gold, #c9a05a);' +
    '  color: var(--navy, #0f1923) !important; border-color: var(--gold, #c9a05a); }' +
    '.tb-pills .ico { font-size: 0.95rem; line-height: 1; }' +
    '.tb-pills .tb-pill-right-start { margin-left: auto; }' +
    '.tb-stats { display: flex; align-items: center; gap: 1rem;' +
    '  padding: 0.5rem 1.25rem; flex-wrap: wrap; }' +
    '.tb-live { display: inline-flex; align-items: center; gap: 0.35rem;' +
    '  font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em;' +
    '  color: var(--teal, #2ba898); font-weight: 700; flex-shrink: 0; }' +
    '.tb-live-dot { width: 7px; height: 7px; border-radius: 50%;' +
    '  background: var(--teal, #2ba898); animation: tbPulse 1.8s infinite;' +
    '  box-shadow: 0 0 0 0 rgba(43,168,152,0.7); }' +
    '@keyframes tbPulse {' +
    '  0% { box-shadow: 0 0 0 0 rgba(43,168,152,0.6); }' +
    '  70% { box-shadow: 0 0 0 8px rgba(43,168,152,0); }' +
    '  100% { box-shadow: 0 0 0 0 rgba(43,168,152,0); }' +
    '}' +
    '.tb-stat-row { display: flex; gap: 1.5rem; align-items: baseline;' +
    '  flex-wrap: wrap; flex: 1 1 auto; }' +
    '.tb-stat { display: inline-flex; align-items: baseline; gap: 0.35rem; }' +
    '.tb-stat-num { font-family: var(--font-display), Georgia, serif;' +
    '  font-weight: 700; font-size: 1.25rem; color: var(--gold, #c9a05a);' +
    '  letter-spacing: -0.02em; line-height: 1; }' +
    '.tb-stat-lbl { font-size: 0.7rem; text-transform: uppercase;' +
    '  letter-spacing: 0.1em; color: rgba(255,255,255,0.62); }' +
    '.tb-utilities { display: inline-flex; align-items: center; gap: 0.55rem;' +
    '  flex-shrink: 0; margin-left: auto; }' +
    '.tb-lang { display: inline-flex; align-items: stretch;' +
    '  background: rgba(255,255,255,0.06);' +
    '  border: 1px solid rgba(255,255,255,0.12); border-radius: 2rem;' +
    '  overflow: hidden; padding: 0; }' +
    '.tb-lang .lang-btn { background: transparent; color: #fff !important;' +
    '  border: none; padding: 0.3rem 0.55rem; font-size: 0.72rem;' +
    '  font-weight: 600; letter-spacing: 0.03em; cursor: pointer;' +
    '  display: inline-flex; align-items: center; gap: 0.3rem;' +
    '  transition: background 0.15s, color 0.15s; }' +
    '.tb-lang .lang-btn:hover { background: rgba(255,255,255,0.08); }' +
    '.tb-lang .lang-btn.lang-active {' +
    '  background: var(--gold, #c9a05a); color: var(--navy, #0f1923) !important; }' +
    '.tb-lang .lang-flag { line-height: 1; font-size: 0.85rem; }' +
    '.tb-lang .lang-btn .fi { display: inline-block; width: 1.1rem; height: 0.8rem; vertical-align: -1px; margin-right: 0.25rem; border-radius: 1px; background-size: cover; background-position: center; box-shadow: 0 0 0 1px rgba(255,255,255,0.12); }' +
    '.tb-lang .lang-divider { width: 1px; background: rgba(255,255,255,0.12); }' +
    /* Report pill — sits in tb-stats row, not tb-pills. */
    'a.tb-report { display: inline-flex; align-items: center; gap: 0.4rem;' +
    '  flex-shrink: 0; background: rgba(239,68,68,0.12);' +
    '  color: #fca5a5 !important; border: 1px solid rgba(239,68,68,0.3);' +
    '  padding: 0.3rem 0.8rem; border-radius: 2rem;' +
    '  font-size: 0.8rem; font-weight: 600;' +
    '  text-decoration: none; white-space: nowrap;' +
    '  transition: background 0.15s, color 0.15s, border-color 0.15s; }' +
    'a.tb-report:hover, a.tb-report:focus-visible {' +
    '  background: var(--red, #dc2626); color: #fff !important;' +
    '  border-color: var(--red, #dc2626); outline: none; }' +
    '.tb-darktoggle { flex-shrink: 0; background: rgba(255,255,255,0.06);' +
    '  border: 1px solid rgba(255,255,255,0.12); color: #fff;' +
    '  border-radius: 2rem; padding: 0.25rem 0.5rem;' +
    '  display: inline-flex; align-items: center; gap: 0.35rem;' +
    '  cursor: pointer; transition: background 0.15s; }' +
    '.tb-darktoggle:hover { background: rgba(255,255,255,0.1); }' +
    '.tb-darktoggle .dark-mode-toggle__icon { font-size: 0.85rem; }' +
    '.tb-darktoggle .dark-mode-toggle__track { position: relative;' +
    '  width: 26px; height: 14px; background: rgba(255,255,255,0.18);' +
    '  border-radius: 2rem; border: none; display: inline-block; }' +
    '.tb-darktoggle .dark-mode-toggle__thumb { position: absolute;' +
    '  left: 2px; top: 2px; width: 10px; height: 10px; background: #fff;' +
    '  border-radius: 50%; transition: transform 0.18s; }' +
    '[data-theme="dark"] .tb-darktoggle .dark-mode-toggle__track { background: #c9a05a; }' +
    '[data-theme="dark"] .tb-darktoggle .dark-mode-toggle__thumb {' +
    '  transform: translateX(12px); background: #0f1923; }' +
    '[data-theme="dark"] .top-banner { background: #16293d; }' +
    '[data-theme="dark"] .tb-pills a {' +
    '  background: rgba(255,255,255,0.05); color: #fff !important;' +
    '  border-color: rgba(255,255,255,0.1); }' +
    '[data-theme="dark"] .tb-stat-lbl { color: rgba(255,255,255,0.55); }' +
    '@media (max-width: 760px) {' +
    '  html { scroll-padding-top: 160px; }' +
    '  body { padding-top: 140px; }' +
    '  .tb-stats { gap: 0.6rem; padding: 0.5rem 1rem; }' +
    '  .tb-stat-row { gap: 1rem; }' +
    '  .tb-stat-num { font-size: 1.1rem; }' +
    '}' +
    '@media (max-width: 520px) {' +
    '  html { scroll-padding-top: 184px; }' +
    '  body { padding-top: 164px; }' +
    '  .tb-pills { padding: 0.45rem 0.9rem; }' +
    '  .tb-pills a { padding: 0.35rem 0.75rem; font-size: 0.8rem; }' +
    '  .tb-stats { flex-direction: column; align-items: flex-start; }' +
    '}' +
    /* Cert chip — earned state gets a gold ring + gold text */
    '.tb-pills a#tbCertChip.cert-earned {' +
    '  border-color: rgba(255,215,0,0.55);' +
    '  background: rgba(255,215,0,0.1);' +
    '  color: #ffd700 !important;' +
    '  font-weight: 700;' +
    '}' +
    '.tb-pills a#tbCertChip.cert-earned:hover,' +
    '.tb-pills a#tbCertChip.cert-earned:focus-visible {' +
    '  background: #ffd700;' +
    '  color: #0f1923 !important;' +
    '  border-color: #ffd700;' +
    '}';

  /* ─── HTML ────────────────────────────────────────────── */
  var HTML = '' +
    '<div id="topBanner" class="top-banner" role="complementary" aria-label="Quick navigation and site stats">' +
    '  <nav class="tb-pills" aria-label="Primary navigation">' +
    '    <a class="tb-brand" href="/" aria-label="AESOP AI Academy home">AESOP<em>AI Academy</em></a>' +
    '    <a href="/ai-academy/courses.html#courses"><span class="ico" aria-hidden="true">\uD83D\uDCDA</span>Courses</a>' +
    '    <a href="/ai-news/"><span class="ico" aria-hidden="true">\uD83D\uDCF0</span>AI News</a>' +
    '    <a href="/ai-academy/students.html"><span class="ico" aria-hidden="true">\uD83C\uDF93</span>Students</a>' +
    '    <a href="/ai-academy/dashboard.html"><span class="ico" aria-hidden="true">\uD83C\uDF4E</span>Teachers / Parents</a>' +
    '    <a href="/seniors.html"><span class="ico" aria-hidden="true">🌟</span>Seniors</a>' +
    '    <a href="/ai-academy/certifications.html" id="tbCertChip"><span class="ico" aria-hidden="true">🏅</span>Certifications</a>' +
    '    <a class="tb-pill-right-start" href="/about/mission.html"><span class="ico" aria-hidden="true">\u2726</span>Our Mission</a>' +
    '    <a href="/about/advisory-board-about.html"><span class="ico" aria-hidden="true">\uD83C\uDF93</span>Advisory Board</a>' +
    '    <a href="https://discord.gg/pKDa5ryX" target="_blank" rel="noopener"><span class="ico" aria-hidden="true">\uD83D\uDCAC</span>Forums \u00B7 Discord</a>' +
    '  </nav>' +
    '  <div class="tb-stats">' +
    '    <span class="tb-live"><span class="tb-live-dot" aria-hidden="true"></span>Live</span>' +
    '    <div class="tb-stat-row" id="tbStatRow">' +
    '      <span class="tb-stat" data-stat="learners" hidden><span class="tb-stat-num" data-stat-num>\u2014</span><span class="tb-stat-lbl">Learners this week</span></span>' +
    '      <span class="tb-stat" data-stat="courses"><span class="tb-stat-num" data-stat-num>41</span><span class="tb-stat-lbl">Courses live</span></span>' +
    '      <span class="tb-stat" data-stat="coursesInDev"><span class="tb-stat-num" data-stat-num>42</span><span class="tb-stat-lbl">In development</span></span>' +
    '      <span class="tb-stat" data-stat="languages"><span class="tb-stat-num" data-stat-num>8</span><span class="tb-stat-lbl">Languages</span></span>' +
    '    </div>' +
    '    <a href="/report.html" class="tb-report" title="Report an issue"><span class="ico" aria-hidden="true">⚑</span>Report</a>' +
    '    <div class="tb-utilities">' +
    '      <div class="tb-lang lang-selector" id="langSelector" aria-label="Select language">' +
    '        <button class="lang-btn" data-lang="en" title="English"><span class="fi fi-us"></span> EN</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="es" title="Espa\u00F1ol"><span class="fi fi-mx"></span> ES</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="hi" title="\u0939\u093F\u0928\u094D\u0926\u0940"><span class="fi fi-in"></span> \u0939\u093F</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="ar" title="\u0627\u0644\u0639\u0631\u0628\u064A\u0629"><span class="fi fi-sa"></span> AR</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="zh-TW" title="\u7e41\u9ad4\u4e2d\u6587"><span class="fi fi-tw"></span> TW</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="ko" title="\ud55c\uad6d\uc5b4"><span class="fi fi-kr"></span> KO</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="ur" title="\u0627\u0631\u062f\u0648"><span class="fi fi-pk"></span> UR</button>' +
    '        <div class="lang-divider"></div>' +
    '        <button class="lang-btn" data-lang="tr" title="T\u00fcrk\u00e7e"><span class="fi fi-tr"></span> TR</button>' +
    '      </div>' +
    '      <button class="tb-darktoggle dark-mode-toggle" id="darkToggle" type="button" aria-label="Toggle dark mode" title="Toggle dark mode">' +
    '        <span class="dark-mode-toggle__icon">\u2600\uFE0F</span>' +
    '        <span class="dark-mode-toggle__track"><span class="dark-mode-toggle__thumb"></span></span>' +
    '        <span class="dark-mode-toggle__icon">\uD83C\uDF19</span>' +
    '      </button>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  /* ─── INJECT flag-icons CSS (for .fi fi-xx language flags) ─── */
  if (!document.querySelector('link[href*="flag-icons"]')) {
    var flagLink = document.createElement('link');
    flagLink.rel  = 'stylesheet';
    flagLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/6.6.6/css/flag-icons.min.css';
    (document.head || document.documentElement).appendChild(flagLink);
  }

  /* ─── INJECT CSS ─────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.id = 'topBannerStyles';
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ─── INJECT HTML ────────────────────────────────────── */
  // Prefer an explicit mount point; otherwise prepend to body.
  function mount() {
    var target = document.getElementById('topBanner-mount');
    if (target) {
      target.outerHTML = HTML;
    } else if (document.body) {
      document.body.insertAdjacentHTML('afterbegin', HTML);
    } else {
      // <body> not parsed yet — wait for it.
      document.addEventListener('DOMContentLoaded', mount, { once: true });
      return;
    }
    wireBehaviors();
  }

  /* ─── BEHAVIORS (stats fetch + lang selector) ─────────── */
  function wireBehaviors() {
    // Live stats: fetch /stats.json and update ticker numbers.
    try {
      var cacheBust = Math.floor(Date.now() / (1000 * 60 * 5));
      fetch('/stats.json?v=' + cacheBust, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('stats ' + r.status); return r.json(); })
        .then(function (stats) {
          var row = document.getElementById('tbStatRow');
          if (!row) return;
          function setStat(key, value) {
            var el = row.querySelector('[data-stat="' + key + '"]');
            if (!el) return;
            var num = el.querySelector('[data-stat-num]');
            if (value === null || value === undefined) { el.hidden = true; return; }
            if (num) num.textContent = Number(value).toLocaleString();
            el.hidden = false;
          }
          setStat('learners',    stats.learnersThisWeek);
          setStat('courses',     stats.coursesLive);
          setStat('coursesInDev', stats.coursesInDev);
          setStat('languages',   stats.languages);
        })
        .catch(function () { /* keep fallback numbers */ });
    } catch (_) {}

    // Language selector: clicking a pill navigates to the locale root.
    // Falls back gracefully if the route doesn't exist.
    var sel = document.getElementById('langSelector');
    if (sel) {
      var path = location.pathname;
      // Active-highlight the language matching the current URL.
      var current = 'en';
      var m = path.match(/\/ai-academy\/modules\/([a-zA-Z-]+)\//);
      if (m) current = m[1];
      sel.querySelectorAll('.lang-btn').forEach(function (btn) {
        var code = btn.dataset.lang;
        btn.classList.toggle('lang-active', code === current);
        btn.addEventListener('click', function () {
          location.href = (code === 'en') ? '/' : '/ai-academy/modules/' + code + '/courses.html';
        });
      });
    }

    // Mark the active nav pill based on current URL pathname.
    (function () {
      var cur = location.pathname;
      document.querySelectorAll('.tb-pills a:not(.tb-brand):not(.tb-report)').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        if (/^https?:\/\//.test(href)) return;       // skip external links
        var linkPath = href.split('#')[0];            // strip hash fragment
        var isDir = linkPath.slice(-1) === '/';
        var active = isDir
          ? cur.indexOf(linkPath) === 0              // prefix match for /ai-news/
          : cur === linkPath;                        // exact match for /page.html
        if (active) a.classList.add('is-active');
      });
    })();

    // Cert chip — update label/style based on localStorage level
    (function initCertChip() {
      try {
        var CERT_NAMES   = ['','Spark','Seeker','Scholar','Analyst','Navigator','Specialist','Strategist','Visionary','Master','Architect'];
        var CERT_EMOJIS  = ['','🌱','⚡','🔍','🎓','🧩','🛠️','🎯','🔮','🦅','👑'];
        var CERT_PTS     = [0,0,10,25,50,80,100,150,200,250,400];
        var CERT_FDN     = [0,1,1,1,1,1,2,2,2,3,3];
        var fdn  = parseInt(localStorage.getItem('aesop-cert-fdn')  || '0');
        var pts  = parseInt(localStorage.getItem('aesop-cert-mpts') || '0');
        var level = 0;
        for (var i = 1; i <= 10; i++) {
          if (fdn >= CERT_FDN[i] && pts >= CERT_PTS[i]) level = i; else break;
        }
        var chip = document.getElementById('tbCertChip');
        if (!chip) return;
        if (level > 0) {
          chip.classList.add('cert-earned');
          chip.innerHTML = '<span class="ico" aria-hidden="true">' + CERT_EMOJIS[level] + '</span>L' + level + ' ' + CERT_NAMES[level];
          chip.title = 'Your certification: Level ' + level + ' — ' + CERT_NAMES[level];
        }
      } catch (_) {}
    })();
  }

  // Run now if DOM is already interactive, else after it parses.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
