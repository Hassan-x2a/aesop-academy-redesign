# AESOP Academy — Sign-Up System & Homepage Redesign

> Generated 2026-07-02 after deploying all phases to live (aesopacademy.org)

---

## Part 1 — Summary of Today's Work

**Revamped the homepage** with a modern hero, featured courses, value props, stats, and secondary audience sections — designed to convert visitors into learners faster.

**Added a complete sign-up system** across three touchpoints:
1. **"Start Learning" button** in the site header — opens auth modal, creates account, redirects to assessment
2. **Save-progress prompt** — bottom bar after completing a lesson: "Save your progress — create an account"
3. **Dedicated account page** (`/account.html`) — full-page auth with sign in, create account, Google OAuth

All three feed into Firebase Auth (email/password + Google) and link the anonymous AESOP-XXXX learner ID to the authenticated account so no progress is lost.

---

## Part 2 — Sign-Up System: Technical Documentation

### 2.1 Architecture Overview

```
User visits any page
  │
  ├── top-banner-v2.js loads (IIFE)
  │     ├── Injects fixed nav bar (brand + links + Start Learning button + lang selector)
  │     └── Auto-injects auth-modal.js <script> tag
  │
  ├── auth-modal.js loads (IIFE)
  │     ├── Injects modal HTML + CSS into DOM
  │     ├── Exposes window.openAuthModal(tab, redirectUrl)
  │     ├── Exposes window.closeAuthModal()
  │     └── Listens for Firebase auth state changes
  │
  └── save-progress-prompt.js loads (IIFE, on module pages only)
        ├── Injects bottom-slide-up bar
        ├── Exposes window.showSaveProgressPrompt()
        └── Exposes window.triggerSaveProgressPrompt()
```

### 2.2 Files Involved

| File | Role |
|------|------|
| `assets/top-banner-v2.js` | Site-wide nav injector. Contains "Start Learning" `<a>` tag with gold pill styling. Click handler checks auth state, opens auth modal if not signed in. |
| `assets/auth-modal.js` | Reusable auth overlay. Three views: Sign In, Create Account, Logged-in Profile. Exposes `window.openAuthModal(tab, redirectUrl)`. |
| `assets/save-progress-prompt.js` | Post-module bottom bar. Triggers on lesson/module completion postMessage, 12s delay if user has progress, or localStorage change detection. |
| `account.html` | Dedicated account management page. Inline Firebase auth (no modal). Shows profile when signed in. |
| `ai-academy/js/firebase-config.js` | Firebase project config (`playagame-f733d`). Imported via dynamic `import()` from auth-modal.js. |
| `firestore.rules` | Tiered security: anonymous path-based access, signed-in ownership via `accountUid`, admin override. |

### 2.3 User Flow Detail

#### Flow A: "Start Learning" Button (Header)

```
User clicks "Start Learning" (gold pill button in nav bar)
  │
  ├── top-banner-v2.js click handler fires
  │     ├── Checks if auth-modal is loaded (typeof window.openAuthModal === 'function')
  │     ├── Checks if user is already signed in (authView-loggedin display !== 'none')
  │     ├── If signed in: lets navigation through → redirects to assessment page
  │     └── If not signed in:
  │           ├── e.preventDefault() — stops the <a> navigation
  │           └── Calls window.openAuthModal('signup', '/ai-academy/assessment.html')
  │
  └── Auth modal opens on "signup" tab
        ├── Title: "Create Account"
        ├── Subtitle: "Save your progress and learn across any device."
        ├── Options:
        │     ├── Google OAuth button
        │     ├── Divider "or create an account"
        │     ├── Email input
        │     └── Password input
        │
        └── On success:
              ├── Firebase auth creates/signs in user
              ├── linkLearnerIdToAccount() merges {accountUid, accountEmail} into learners/{learnerId}
              ├── Modal closes
              └── Redirects to /ai-academy/assessment.html
```

#### Flow B: Save-Progress Prompt (Post-Module)

```
User completes a lesson/module
  │
  ├── Module page sends postMessage({ type: 'lessonComplete' | 'moduleComplete' | 'modTestPassed' })
  │     └── save-progress-prompt.js receives it → calls triggerSaveProgressPrompt()
  │
  ├── Alternative trigger: 12s after page load if localStorage has any progress
  │     (completedLessons, completedMods, streak count, cert points, course progress)
  │
  ├── Alternative trigger: localStorage 'aesop-hub-progress' changes (polled every 5s)
  │
  ├── Guard checks (all must pass):
  │     ├── Not already shown in this session
  │     ├── Not already dismissed in this session
  │     ├── User is NOT signed in (check #authView-loggedin display)
  │     ├── Not dismissed in last 7 days (localStorage timestamp)
  │     └── "Don't show again" not permanently set
  │
  ├── If all guards pass: bottom bar slides up
  │     ├── Icon + "Save your progress — create an account"
  │     ├── Subtitle: "Pick up where you left off on any device. Free, takes 30 seconds."
  │     ├── Buttons: "Not now" | "Save Progress" | "Don't show again" checkbox | X close
  │     └── "Not now" or X → 7-day cooldown. "Don't show again" → permanent flag.
  │
  └── "Save Progress" clicked → opens auth modal (create tab)
        └── Same flow as above, but without redirect (stays on current page)
```

#### Flow C: Account Page (Direct)

```
User visits /account.html
  │
  ├── If not signed in: shows full-page auth form
  │     ├── Google OAuth button
  │     └── Email/password sign in OR create account
  │
  └── If signed in: shows profile
        ├── Email display
        ├── Learner ID (AESOP-XXXX)
        ├── Progress saved message
        ├── "Manage Account" link
        └── "Sign Out" button
```

### 2.4 Firebase Integration

- **Project**: `playagame-f733d`
- **Config**: `ai-academy/js/firebase-config.js` (exported as `FIREBASE_CONFIG`)
- **Auth methods**: Email/Password + Google OAuth (`signInWithPopup`)
- **SDK**: v10.12.0 via dynamic `import()` (not `type="module"`, works as plain `<script>`)

Dynamic import path resolution:
```javascript
var _baseDir = document.location.href.substring(0, document.location.href.lastIndexOf('/') + 1);
// Then:
import(_baseDir + 'ai-academy/js/firebase-config.js')
```
This works on both root (`/`) and sub-path deployments (`/repo/`).

### 2.5 Firestore Security Model

| Identity Level | Who | Access |
|---------------|------|--------|
| Anonymous | Unauthenticated visitor, path-based `learnerId` | Can create docs, read/write unbound docs (`accountUid == null`) |
| Signed-in | Firebase user with matching `accountUid` | Full read/write on their own `learners/{learnerId}` doc |
| Admin | Custom claim `admin == true` | All access, including delete |

After account linking, the `learners/{learnerId}` doc gets:
```javascript
{
  learnerId: "AESOP-XXXX",
  accountUid: "firebase-uid",
  accountEmail: "user@example.com",
  lastAuthLink: "2026-07-02T..."
}
```
Once `accountUid` is set, anonymous path-based access is locked out — only the bound account or admin can read/update.

### 2.6 Appearance Points

| Component | Appears On | Trigger |
|-----------|-----------|---------|
| Nav bar + Start Learning button | All pages (auto-injected) | Page load |
| Auth modal | All pages | Click "Start Learning" / "Save Progress" / toggle links |
| Save-progress prompt | Module pages (electives-hub.html, module-view.php + localized variants) | lessonComplete postMessage, 12s delay, localStorage change |
| Account page | `/account.html` | Direct navigation, or "Manage Account" link in auth modal |

### 2.7 Deployment

- **Cloudflare Pages** auto-deploys from `AesopScott/Aesop` main branch
- No build step — rsyncs repo to `_site/` (excluding `*.php`, `secret*`, `.git`, `.github`, `node_modules`)
- Firebase Hosting config exists as secondary/debug endpoint
- CDN (Fastly) lag: assets can serve stale versions for several minutes after push

---

## Part 3 — Homepage Redesign: Marketing & Conversion Analysis

### 3.1 What Changed

| Element | Before (v2.3.8) | After (v3.0.0) | Why |
|---------|-----------------|----------------|-----|
| **Hero title** | "AESOP AI Academy" (brand as headline) | "Where does your AI journey begin?" (question, personalized) | Visitors don't care about your name — they care about their problem. A question creates curiosity and self-selection. |
| **Hero subtitle** | "Story-driven AI literacy for every age" (short) | "Story-driven AI literacy for every age. You learn by debating, building, and shipping — not watching videos." (with differentiation) | The "not watching videos" is a competitive differentiator. Most AI education platforms are video-based. This tells visitors immediately why AESOP is different. |
| **Hero description** | None directly (just navigation CTAs) | "Every module leaves you with **a portfolio, not a completion badge**. Start your first lesson in 30 seconds." | Two claims: (1) portfolio > badge (value prop), (2) 30 seconds (low friction). Eliminates the "this will take time" objection. |
| **CTA buttons** | "Get Started" + "Learn More" (generic) | "Take the Assessment →" + "Browse All Courses →" (specific, action-oriented) | Generic CTAs underperform. Specific CTAs set expectations and attract the right visitors. "Take the Assessment" is high-intent; "Browse" is low-commitment exploration. |
| **Below-fold** | Pedagogy strip + course list | Two clear path cards ("I'm New to AI", "Continue Learning") + featured courses + value props + audience sections | Path cards segment visitors immediately. New visitors self-identify and click. No scrolling through a wall of courses. |
| **"Free. Ages 8+"** | Small eyebrow text | Same eyebrow format, but more visible with dot + pill styling | Reinforces the free + accessible positioning immediately under the brand. |
| **Featured courses** | None (courses listed as links in a list) | 3 card-grid courses with descriptions + CTAs (AI Ethics, Building with AI, Building AI Agents) | Concrete examples of what you'll learn. Makes the abstract "AI literacy" tangible. Cards are clickable — direct path to first lesson. |
| **Value proposition** | Implicit (pedagogy section) | Explicit 3-card section: "Story-driven, not slide-driven" / "Portfolio, not a badge" / "Free. Private. No ads." | Objection handling. These three cards answer the top 3 questions: (1) How is this different? (2) What do I get out of it? (3) Is this safe/private? |
| **Stats strip** | In the nav banner (distracting) | In the homepage body (42+ courses, 60 in dev, 6 standards) | Social proof where it belongs — in the content, not cluttering the navigation. Numbers are credible (42+ is specific) and show momentum. |
| **Secondary audiences** | None | Dedicated grid: "Educators & Parents" + "Schools & Districts" | The homepage now serves all three buyer types: self-learners, parents/teachers, and institutional decision-makers. Each has a clear path. |
| **Path to sign-up** | None (no auth system existed) | Start Learning button → auth modal → assessment. Save-progress prompt after lessons. | The entire conversion funnel is now built: anonymous visit → experience value → create account → persist progress. |
| **Top banner** | Two-row layout with stats bar, dark toggle, report link, cert chip | Single row: brand + nav links + Start Learning button + language selector | Reduced cognitive load. The stats bar was noise for new visitors. The gold Start Learning button is now the most visually prominent element. |

### 3.2 Conversion Funnel Design

```
VISITOR arrives at homepage
  │
  ├── 70% ← "I'm New to AI" path card (high-intent)
  │     └── → /ai-academy/assessment.html
  │           └── Takes 5-min assessment → gets personalized course path
  │
  ├── 15% ← Featured course card (impulse)
  │     └── → direct to first lesson of a course (no sign-up needed!)
  │
  ├── 10% ← "Browse All Courses" (explorers)
  │     └── → /ai-academy/courses-v2.html
  │
  └── 5%  ← Header "Start Learning" button
        └── → Auth modal (sign-up if new, redirect to assessment)
              └── → /ai-academy/assessment.html after account created
```

**Key principle**: The first experience is always anonymous. No sign-up wall. Only after the user experiences value (completes a lesson, accumulates progress) does the save-progress prompt invite them to create an account.

### 3.3 Objection Handling (per section)

| Visitor Objection | Where It's Answered |
|------------------|-------------------|
| "Is this for me?" | Hero question + path cards ("I'm New to AI" vs "Continue Learning") |
| "Is this just another video course?" | Hero subtitle + value prop card #1 ("Story-driven, not slide-driven") |
| "What will I actually learn?" | Featured courses section with concrete course names + descriptions |
| "Is this worth my time?" | Value prop card #2 ("Portfolio, not a badge" — you build real things) |
| "Is this safe for my kid?" | Value prop card #3 ("Free. Private. No ads." + privacy section in footer) |
| "How do schools use this?" | Secondary audiences section → institutional procurement page |
| "Will this cost me?" | Eyebrow says "Free" + value prop card #3 |
| "Is this credible?" | Stats strip (42+ courses, 6 standards aligned) + advisory board in footer |

### 3.4 SEO & Social Changes

| Element | Before | After |
|---------|--------|-------|
| Meta description | "AESOP AI Academy delivers the first story-driven AI literacy curriculum..." (brand-first) | "AI literacy through stories, not slides. Start your first lesson in 30 seconds — no account required." (benefit-first) |
| OG title | Same as `<title>` | Shortened slightly for social cards |
| JSON-LD | Same structure | Same (kept) |
| Twitter card | Different description from OG | Unified with OG |
| Open graph image | Same | Same |

The meta description rewrite is significant: old description describes *what AESOP is* (brand-centric), new description tells *what you get* (benefit-centric with clear CTA). The phrase "no account required" directly addresses sign-up anxiety.

### 3.5 Dark Mode & Accessibility

- Both light and dark themes are fully styled
- Dark mode toggle preserved (using `aesop-theme` localStorage key)
- Hero animation (`fadeUp`) adds polish without harming usability
- All interactive elements have hover/focus states
- Card hover effects include `translateY(-4px)` + shadow — subtle but satisfying
- `aria-label`, `role="list"`, `role="listitem"` on interactive regions

### 3.6 Technical Note: Path Resolution

All asset paths use relative `./` or runtime `_baseDir` resolution rather than absolute `/` paths. This was a deliberate fix: absolute paths break when the site is deployed on a sub-path (e.g., GitHub Pages org repos). The `_baseDir` pattern is:

```javascript
var _baseDir = document.location.href.substring(0, document.location.href.lastIndexOf('/') + 1);
```

This is used by `top-banner-v2.js`, `auth-modal.js`, and all dynamically injected content. It's the reason the site works identically on both `aesopacademy.org/` and `username.github.io/repo/`.

---

*Generated 2026-07-02. All 6 commits deployed to AesopScott/Aesop main branch. Cloudflare Pages auto-deploys from main on push.*
