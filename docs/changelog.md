# AESOP Academy — Change Log

> All changes made to the AesopScott/Aesop repository are logged here for traceability.
> If anything breaks, follow this log to identify and revert changes.

---

## 2026-07-02 — Homepage Redesign + Nav Update

### Summary
Replaced the live homepage (`index.html`) with a redesigned version based on the mock at `hassan-x2a.github.io/aesop-academy-redesign/`, updated the shared top banner nav to include richer navigation links, and preserved a backup of the original.

### Files Changed

| File | Action | Reason |
|------|--------|--------|
| `index.html` | **Replaced** | New homepage with modern hero, featured courses, value props, stats, secondary audiences. Old version backed up to `docs/backup/`. |
| `assets/top-banner-v2.js` | **Modified** | Added nav links (Courses, Find Your Path, How It Works) and "Start Learning" CTA button to the shared site-wide banner. |
| `docs/backup/index-legacy-v2.3.8.html` | **Created** | Backup of the original `index.html` (v2.3.8, 2026-06-03) for recovery. |
| `docs/changelog.md` | **Created** | This file — action log for traceability. |

### What Changed in Detail

#### `index.html`
- **Replaced** the old hero section with the mock's cleaner hero (eyebrow, title, subtitle, desc, CTA buttons)
- **Added** featured courses section ("Start in 30 seconds" with 3 course cards)
- **Added** value proposition section ("Why AESOP — Designed differently")
- **Added** stats strip with live counts (pulled from `stats.json`)
- **Added** secondary audiences section (Educators & Parents, Schools & Districts)
- **Kept** pedagogy insight strip and footer from original
- **Kept** `top-banner-v2.js` as the nav/banner system (no custom nav HTML)
- **Kept** `academy-theme.css` + `academy-dark-mode.css` for consistent design tokens
- **Kept** dark mode toggle integrated with `aesop-theme` localStorage key
- Used the same Design System tokens (navy/gold/violet) as the live site
- All links use relative paths matching existing site structure

#### `assets/top-banner-v2.js`
- Added "Courses" link (points to `/ai-academy/courses-v2.html`)
- Added "Find Your Path" link (points to `/ai-academy/assessment.html`)
- Added "How It Works" link (points to `/pedagogy.html`)
- Added "Start Learning" CTA button in the stats bar area
- Kept existing brand (logo + "AESOP AI Academy"), "About", "For Schools", stats, language selector, dark mode toggle, and report link

### Recovery Instructions
To revert the homepage:
```bash
git checkout HEAD~1 -- index.html
```
Or manually copy `docs/backup/index-legacy-v2.3.8.html` to `index.html`.

To revert the nav:
```bash
git checkout HEAD~1 -- assets/top-banner-v2.js
```

## 2026-07-02 — Phase 2: Auth Modal + Account Page

### Summary
Built a reusable sign-in/sign-up modal (`assets/auth-modal.js`) that can be opened from any page, plus a dedicated account management page (`account.html`). The modal supports email/password auth and Google OAuth, and it automatically links the Firebase auth UID to the anonymous AESOP-XXXX learner ID so progress is not lost.

### Files Changed

| File | Action | Reason |
|------|--------|--------|
| `assets/auth-modal.js` | **Created** | Site-wide auth modal injector (IIFE pattern matching `top-banner-v2.js`). Supports Sign In / Create Account / Google OAuth. Exposes `window.openAuthModal(tab, redirectUrl)` and `window.closeAuthModal()`. After auth, links Firebase UID to learner ID via `learners/{learnerId}.accountUid`. |
| `account.html` | **Created** | Dedicated account management page — full-page auth (sign in / create / Google OAuth) when logged out, profile view (email, learner ID, meta, sign out) when logged in. Links to `/theladder/authenticate.html` for certification identity settings. |
| `assets/top-banner-v2.js` | **Modified** | Auto-injects `<script src="/assets/auth-modal.js">` after banner mount. Start Learning button now opens auth modal (with redirect to assessment after sign-in) instead of linking directly. |

### Auth Flow

1. **Anonymous browsing** — works as before (AESOP-XXXX learner ID in localStorage)
2. **User clicks "Start Learning"** — auth modal opens. If already signed in, goes straight to assessment.
3. **Sign In / Create Account / Google OAuth** — all three paths work within the modal
4. **After auth** — modal closes, user is redirected to the original destination (e.g., assessment page)
5. **Progress linking** — `learners/{learnerId}` doc gets `accountUid` + `accountEmail` fields merged in (same pattern as `ladder-core.js::saveAccountProfile`)
6. **Subsequent visits** — auth state persists via Firebase, profile view shows linked learner ID and email

### Implementation Details

- Uses Firebase SDK v10.12.0 (matching existing codebase) via dynamic `import()` so the script works as a plain `<script>` tag (no `type="module"` needed)
- Modal follows the `.auth-overlay` pattern (backdrop-filter blur, centered card, z-index above top banner)
- Tabbed interface (Sign In / Create Account) within the same overlay
- Google OAuth via `signInWithPopup` + `GoogleAuthProvider`
- Start Learning button: checks `window.openAuthModal` availability — falls back gracefully if auth-modal.js hasn't loaded yet

### Recovery Instructions
```bash
# Revert nav + auth wiring
git checkout HEAD~1 -- assets/top-banner-v2.js
# Remove new files
git rm assets/auth-modal.js account.html
```

---

## 2026-07-02 — Phase 3: Save-Your-Progress Prompt

### Summary
Added a discreet post-module prompt on lesson/module pages that invites anonymous learners to create an account after experiencing value. Follows the value-first, friction-later strategy — never blocks the experience.

### Files Changed

| File | Action | Reason |
|------|--------|--------|
| `assets/save-progress-prompt.js` | **Created** | Lightweight IIFE that injects a bottom-slide-up bar with "Save your progress — create an account" messaging. Triggers after lesson completion, module completion, or 12s delay if the user has progress. Dismissible ("Not now" / X) with 7-day cooldown. "Don't show again" checkbox for permanent dismiss. Opens auth modal on "Save Progress". |
| `ai-academy/modules/electives-hub.html` | **Modified** | Added `<script src="/assets/save-progress-prompt.js" defer>` before `</body>` |
| `ai-academy/modules/module-view.php` | **Modified** | Same injection before `</body>` |
| `ai-academy/modules/ko/electives-hub.html` | **Modified** | Same for Korean hub |
| `ai-academy/modules/tr/electives-hub.html` | **Modified** | Same for Turkish hub |
| `ai-academy/modules/ur/electives-hub.html` | **Modified** | Same for Urdu hub |
| `ai-academy/modules/zh-TW/electives-hub.html` | **Modified** | Same for Traditional Chinese hub |

### Prompt Strategy

1. **When it shows**: After a `lessonComplete` or `moduleComplete` postMessage event, or after 12 seconds on a page if the user has any existing progress (completed lessons, streak, cert points, saved course progress)
2. **When it doesn't show**: If user is already signed in (via Firebase auth), or dismissed in the last 7 days, or "Don't show again" was checked
3. **Dismiss**: Click "Not now" or X — 7-day cooldown. "Don't show again" checkbox sets permanent flag
4. **CTA**: "Save Progress" opens auth modal (or redirects to `/account.html` if modal script isn't loaded)
5. **Edge cases**: Listens for `lessonComplete` / `modTestPassed` / `moduleComplete` postMessages. Also polls `aesop-hub-progress` localStorage every 5s for manual module completions. Re-checks auth state after 3s to hide if already signed in.

### Exposed API
- `window.showSaveProgressPrompt()` — force show the prompt
- `window.triggerSaveProgressPrompt()` — debounced variant (800ms), checks for progress before showing

---

## 2026-07-02 — Phase 4: Firestore Security Rules for User-Based Auth

### Summary
Tightened the `learners/{learnerId}` Firestore rules from wide open (`allow read, write: if true`) to tiered ownership-based access now that auth is wired. Signed-in users own docs matching their `accountUid`; anonymous learners can still read/write unbound docs. Once a learner links their account, path-based anonymous access is locked out.

### Files Changed

| File | Action | Reason |
|------|--------|--------|
| `firestore.rules` | **Modified** | `learners/{learnerId}`: tightened from `if true` to tiered rules using `ownsLearner()` + `isSignedIn()` checks. Updated file header and comments to reflect deployed (non-draft) status. |

### Rule Changes

Before:
```javascript
match /learners/{learnerId} {
  allow read, write: if true;      // wide open
  allow delete: if isAdmin();
}
```

After:
```javascript
match /learners/{learnerId} {
  allow create: if ownsLearner(learnerId, null);
  allow read:   if isAdmin()
                || (isSignedIn() && resource.data.accountUid == request.auth.uid)
                || (!isSignedIn() && (resource.data.accountUid == null || resource.data.accountUid == ''));
  allow update: if isAdmin()
                || (isSignedIn() && resource.data.accountUid == request.auth.uid)
                || (resource.data.accountUid == null || resource.data.accountUid == '');
  allow delete: if isAdmin();
}
```

### Identity Model

| Level | Who | How | Bound After |
|-------|-----|-----|-------------|
| 1 — Anonymous | Unauthenticated user | Path-based `learnerId` in URL | Always (default) |
| 2 — Signed-in | Firebase user | `request.auth.uid` matches `doc.accountUid` | After auth-modal.js links account |
| 3 — Admin | Custom claim `admin == true` | All access | Out-of-band |

Once a learner creates an account, the client merges `{accountUid, accountEmail}` into their existing `learners/{learnerId}` doc. After that, only the bound account or admin can access the doc — anonymous path-based access is locked out.

---

## 2026-07-02 — Post-Audit Fixes (Pre-Live)

### Summary
Simplified the top banner to a single row (nav + language selector only, removed stats bar). Fixed dynamic import path in auth-modal.js to use `_baseDir` runtime resolution (was using relative `./` path that resolved to wrong directory). Added missing backups for original files.

### Files Changed

| File | Action | Reason |
|------|--------|--------|
| `assets/top-banner-v2.js` | **Rewritten** | Removed stats bar (Live, stat counters, Report link, dark toggle, Start Learning button, cert chip). Single-row layout: brand + nav links + language selector. All paths use `_baseDir` runtime resolution. Reduced from ~387 to ~176 lines. |
| `assets/auth-modal.js` | **Modified** | Added `_baseDir` computation. Changed `import('./ai-academy/js/...')` to `import(_baseDir + 'ai-academy/js/...')` so Firebase config resolves correctly regardless of deployment sub-path. Changed Manage Account link from absolute `/account.html` to `_baseDir`-based. |
| `docs/backup/top-banner-v2.original.js` | **Created** | Backup of original top-banner-v2.js before any Phase 1 edits. |
| `docs/backup/firestore.rules.original` | **Created** | Backup of original firestore.rules before Phase 4 tightening. |
| `docs/backup/index-legacy-v2.3.8.html` | *(pre-existing)* | Homepage backup from Phase 1. |

### Known Issue
- GH Pages CDN (Fastly) lags behind pushes. The `Hassan-x2a/aesop-academy-redesign` staging URL may serve stale `top-banner-v2.js` for several minutes after a push. The local repo files are correct.

---

*For questions, contact the build agent that made these changes.*
