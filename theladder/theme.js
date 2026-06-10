// theladder-v0.2.0 | 2026-06-10
// Theme system for The Ladder (BRAND_GUIDE §3, handoff README "Interactions").
// Standalone ES module — no app dependencies. Loaded by every /theladder page.
// Persists {"theme","mode"} to localStorage["aesop_theme"]; mirrors mode to the
// legacy "aesop-theme" key so the rest of aesopacademy.org keeps respecting it.

const STORAGE_KEY = 'aesop_theme';
const LEGACY_KEY = 'aesop-theme';
const THEMES = [
  { id: 'indigo', name: 'Focus', sub: 'Professional · Schibsted' },
  { id: 'emerald', name: 'Scholar', sub: 'Classic green · Schibsted' },
  { id: 'spring', name: 'Explorer', sub: 'Playful · Bricolage' },
  { id: 'volt', name: 'Arcade', sub: 'High-energy · Space Grotesk' }
];
const VALID_THEMES = new Set(THEMES.map((t) => t.id));

let current = readStored();
let openPop = null;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        theme: VALID_THEMES.has(saved.theme) ? saved.theme : 'indigo',
        mode: saved.mode === 'dark' ? 'dark' : 'light'
      };
    }
    // Back-compat: seed from the legacy site-wide key on first load.
    if (localStorage.getItem(LEGACY_KEY) === 'dark') {
      return { theme: 'indigo', mode: 'dark' };
    }
  } catch (error) {
    console.warn('Could not read stored theme:', error);
  }
  return { theme: 'indigo', mode: 'light' };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    localStorage.setItem(LEGACY_KEY, current.mode === 'dark' ? 'dark' : 'light');
  } catch (error) {
    console.warn('Could not persist theme:', error);
  }
}

function apply() {
  document.documentElement.setAttribute('data-theme', current.theme);
  document.documentElement.setAttribute('data-mode', current.mode);
}

export function setTheme(theme) {
  if (!VALID_THEMES.has(theme)) return;
  current.theme = theme;
  apply();
  persist();
  renderAllPops();
}

export function setMode(mode) {
  current.mode = mode === 'dark' ? 'dark' : 'light';
  apply();
  persist();
  renderAllPops();
}

export function getTheme() {
  return { ...current };
}

function popMarkup() {
  const options = THEMES.map((t) => `
    <button type="button" class="theme-opt${t.id === current.theme ? ' active' : ''}" data-set-theme="${t.id}">
      <span class="sw"><i class="sw-${t.id}"></i><i class="sw-${t.id}-2"></i></span>
      <span class="meta"><span class="name theme-name-${t.id}">${t.name}</span><span class="sub">${t.sub}</span></span>
      ${t.id === current.theme ? '<span class="dot"></span>' : ''}
    </button>`).join('');
  return `
    <div class="theme-pop-label">Theme</div>
    <div class="theme-opts">${options}</div>
    <div class="theme-hr"></div>
    <div class="theme-pop-label">Appearance</div>
    <div class="theme-seg">
      <button type="button" data-set-mode="light" class="${current.mode === 'light' ? 'active' : ''}">Light</button>
      <button type="button" data-set-mode="dark" class="${current.mode === 'dark' ? 'active' : ''}">Dark</button>
    </div>`;
}

function renderAllPops() {
  document.querySelectorAll('.theme-pop').forEach((pop) => {
    pop.innerHTML = popMarkup();
  });
}

function mountSwitchers() {
  document.querySelectorAll('[data-theme-mount]').forEach((mount) => {
    mount.classList.add('theme-ctl');
    mount.innerHTML = `
      <button type="button" class="theme-btn" aria-haspopup="true" aria-expanded="false">
        <span class="sw"><i></i><i></i></span>
        <span class="lbl">Theme</span>
      </button>
      <div class="theme-pop" hidden></div>`;
    const btn = mount.querySelector('.theme-btn');
    const pop = mount.querySelector('.theme-pop');
    pop.innerHTML = popMarkup();
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = pop.hidden;
      closePop();
      if (willOpen) {
        pop.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        openPop = { pop, btn };
      }
    });
    pop.addEventListener('click', (event) => {
      const themeBtn = event.target.closest('[data-set-theme]');
      if (themeBtn) setTheme(themeBtn.dataset.setTheme);
      const modeBtn = event.target.closest('[data-set-mode]');
      if (modeBtn) setMode(modeBtn.dataset.setMode);
    });
  });
  document.addEventListener('click', (event) => {
    // Selecting a theme re-renders the popover and detaches the clicked
    // button; a detached target is not an outside click — keep the pop open.
    if (openPop && event.target.isConnected && !openPop.pop.contains(event.target)) closePop();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePop();
  });
}

function closePop() {
  if (!openPop) return;
  openPop.pop.hidden = true;
  openPop.btn.setAttribute('aria-expanded', 'false');
  openPop = null;
}

// Scroll reveals (BRAND_GUIDE §8 — IntersectionObserver variant, one-shot).
// The html.js class gates the hidden initial state, so content stays visible
// when scripts fail; prefers-reduced-motion is handled in ladder-brand.css.
function mountReveals() {
  document.documentElement.classList.add('js');
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((node) => node.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach((node) => observer.observe(node));
}

apply();
persist();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mountSwitchers();
    mountReveals();
  });
} else {
  mountSwitchers();
  mountReveals();
}
