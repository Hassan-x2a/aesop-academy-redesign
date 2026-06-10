# BUILD — Pathways Redesign: Products & Use Cases (Phase 2)

**For:** CeCe (Claude Code)
**Branch:** `morgan-dev` (continue on the same branch — Phase 1 + Phase 2 ship as one PR)
**Companion docs:** `AUDIT-PATHWAYS-REDESIGN.md` (run after build), `BUILD-LADDER-REDESIGN.md`
(Phase 1 — read §0 hard constraints; they all apply here), `design-handoff-ladder/BRAND_GUIDE.md`
**Prepared by:** Morgan + Fable, 2026-06-10

---

## 0. What this is

Phase 2 of the Ladder redesign: bring `/theladder-products/` and `/theladder-use-cases/`
(including both `admin.html` review queues) into the brand system Phase 1 established.

**This is a re-skin, not a restructure.** Unlike Phase 1, these pages keep their
single-page architecture — no page splitting, no JS extraction. The marketing-homepage
requirement applied only to The Ladder. Scope of change per file: markup structure +
class names + CSS; **zero changes to logic, state, data flow, or engine usage.**

There are **no design prototypes** for catalog pages. The source of truth is
`design-handoff-ladder/BRAND_GUIDE.md` plus the components you already built in
`theladder/ladder-brand.css` and the patterns on the Phase 1 pages. Where a catalog
needs a component the system doesn't have, compose it from existing primitives
(§4 gives the mapping) — don't invent a new visual language.

### Hard constraints (Phase 1 §0 applies in full; additions here)
- **Don't touch:** `theladder-shared/`, `/docs/theladder-products-catalog.md`,
  `/docs/theladder-use-cases-catalog.md`, `aesop-api/`, `firestore.rules`, Phase 1
  pages (except the one nav edit in §5), `ai-academy/`.
- **All localStorage keys, Firestore collections, and endpoints unchanged.** Known
  keys: `aesop-ladder-products-state-v1`, `aesop-ladder-products-lang-v1`,
  `aesop-product-course-requests-v1`, `aesop-products-identity-gate-v1`,
  `aesop-ladder-use-cases-state-v1`, `aesop-use-case-training-requests-v1`.
  Endpoints: `/aesop-api/proxy.php`, `/aesop-api/product-request-email.php`,
  `/aesop-api/use-case-request-email.php`. Collections: `productCourseRequests`,
  `useCaseTrainingRequests`. **Grep each app file for `localStorage` and `fetch(`
  before starting and treat the full list as frozen.**
- **JS-rendered markup is in scope for restyle.** Most catalog UI (cards, category
  rows, chat messages, identity gate, detail workspaces, admin queue entries) is
  emitted from template strings inside `products-app.js`, `use-cases-app.js`,
  `use-cases-identity.js`, and the two `*-admin.js` files. Updating class names and
  structure inside those strings is allowed and required — **changing any logic,
  handler, or data those functions touch is not.**

---

## 1. Current state (inventory)

| File | Lines | Role |
|---|---|---|
| `theladder-products/index.html` | 251 | Catalog page: hero, category rail, placement panel, identity gate, cert workspace, guided conversation, search/filters, request form, product grid |
| `theladder-products/products-app.js` | 1,459 | All UI rendering + state + engine wiring |
| `theladder-products/products-ladder.js` | 349 | Descriptor/blueprint builders for shared engines (**don't touch**) |
| `theladder-products/products-i18n.js` | 1,117 | Languages + UI translations (extend keys only) |
| `theladder-products/products.css` | 1,964 | Old navy/gold token system — **superseded; leave file in place, unreference it** |
| `theladder-products/admin.html` + `products-admin.js` | 88 + 288 | Request review queue (Firebase admin sign-in) |
| `theladder-use-cases/index.html` | 176 | Same architecture, no placement panel, no track filter |
| `theladder-use-cases/use-cases-app.js` | 1,335 | UI + state + engines |
| `theladder-use-cases/use-cases-identity.js` | 218 | Identity-assurance gate, **injected dynamically** (no static HTML) |
| `theladder-use-cases/use-cases-i18n.js` | 908 | Languages + translations |
| `theladder-use-cases/use-cases.css` | 97 | Thin overrides on products.css |
| `theladder-use-cases/admin.html` + `use-cases-admin.js` | 89 + 288 | Review queue |

Catalogs are fetched at runtime (500 products / 300 use cases) and parsed from markdown.
Both pages currently load `/academy-theme.css` + `/academy-dark-mode.css` + the old
`themeToggle` dark-mode button keyed on legacy `aesop-theme`.

---

## 2. Functionality contract — nothing here may break

### Products (`/theladder-products/`)
| # | Feature (DOM ids) | Notes |
|---|---|---|
| PP1 | Language select (`languageSelect`, `data-i18n` / `data-i18n-placeholder` bindings) | 11 languages, persisted |
| PP2 | Theme: replace old `themeToggle` with the Phase 1 switcher (`theme.js`) | §3 |
| PP3 | Education focus select (`educationFocusSelect`) routes Concepts/Products/Use-Cases | |
| PP4 | Hero stats (`totalProducts`, `advancedCount`, static "3 certification options") | counts computed from catalog after load |
| PP5 | Category rail (`categoryList`, `visibleCount`) — JS-rendered rows, active state, counts | |
| PP6 | Collapsible placement assessment (`assessmentToggle`, `assessmentPanel`, `assessmentLog`, `assessmentForm`, `assessmentInput`, `assessmentResult`) — real engine conversation | |
| PP7 | Identity gate (`identityGate`, `identityGateTitle`, `identityGateBody`, `identityGateCancel`) — gates certification | |
| PP8 | Certification workspace (`certWorkspace`, `certTitle`, `certClose`, `certLog`, `certForm`, `certInput`, `certOutcomePanel`) — examiner + validator flow | |
| PP9 | Guided conversation (`productCourseWorkspace`, `productConversationTitle`, `productChatLog`, `productChatForm`, `productChatInput`) | |
| PP10 | Search + filters (`productSearch`, `trackFilter`, `depthFilter`) | |
| PP11 | Request-training form (`productRequestForm`, `requestProductName`, `requestProductType`, `requestProductReason`, `requesterEmail`, `submitProductRequest`, `productRequestMessage`) → email endpoint + Firestore + local key | |
| PP12 | Product grid + detail (`productGrid`, `productDetail`, `productDetailWorkspace`) — JS-rendered cards, start/completed states | |
| PP13 | Nav cross-links: home, The Ladder, Use Cases, Student Hub, Transcript, admin queue link | retarget per §5 |
| PP14 | State persistence + Firestore sync (keys in §0) | |

### Use Cases (`/theladder-use-cases/`)
| # | Feature (DOM ids) | Notes |
|---|---|---|
| UC1–UC3 | Language select / theme / education focus — same as PP1–PP3 | |
| UC4 | Hero stats (`totalUseCases`, `advancedCount`) | computed |
| UC5 | Topic rail (`categoryList`, `visibleCount`) | |
| UC6 | Guided conversation (`useCaseCourseWorkspace`, `useCaseConversationTitle`, `useCaseChatLog`, `useCaseChatForm`, `useCaseChatInput`) | |
| UC7 | **Dynamically-injected identity gate** (`use-cases-identity.js`) + certification flow | restyle the injected markup too |
| UC8 | Search + depth filter (`useCaseSearch`, `depthFilter`) | |
| UC9 | Request form (`useCaseRequestForm` + fields, `useCaseRequestMessage`) → endpoint/collection/key per §0 | |
| UC10 | Grid + detail (`useCaseGrid`, `useCaseDetail`, `useCaseDetailWorkspace`) | |
| UC11 | Nav cross-links | per §5 |
| UC12 | State persistence + Firestore sync | |

### Admin queues (both folders — identical id sets)
| # | Feature (DOM ids) | Notes |
|---|---|---|
| AD1 | Firebase admin sign-in/out (`authPanel`, `adminEmail`, `adminPassword`, `adminSignIn`, `adminSignOut`, `adminAuthError`, `adminUserLabel`) | logic untouched |
| AD2 | Queue (`adminQueue`, `requestList`, `pendingRequestCount`) + approve/deny actions in `*-admin.js` | JS-rendered entries restyled |
| AD3 | `noindex,nofollow` meta and admin-queue links from the public pages | keep |

---

## 3. Theme & chrome migration (both pathways + both admins)

- Drop `/academy-theme.css`, `/academy-dark-mode.css`, and the `themeToggle` button.
  Load `/theladder/ladder-brand.css` + `/theladder/theme.js` (with the same pre-paint
  inline head snippet Phase 1 pages use — no theme flash).
- Top bar = the Phase 1 functional chrome: mark + "Aesop" wordmark, nav links, language
  select, Theme button. Admin pages: same bar minus marketing links, plus the
  signed-in admin label.
- Page-specific styles go in a rewritten `theladder-products/products-pathway.css` and
  `theladder-use-cases/use-cases-pathway.css` (new files; thin — layout only). Reusable
  primitives (catalog card, rail row, filter controls) belong in `ladder-brand.css` if
  Phase 1 doesn't already provide them. Old `products.css` / `use-cases.css` stay on
  disk, unreferenced.

## 4. Component mapping (brand-system equivalents)

| Current element | Rebuild as (BRAND_GUIDE §7 / Phase 1 pattern) |
|---|---|
| Hero (title + text + stats) | Eyebrow + accent square; H1 "Products" / "Use Cases" in display 400 (~88px); muted body; 3-col stat strip with hairline dividers |
| Category/topic rail | Hairline-divided list rows; active row weight 600 `--primary`; count as small meta; top of list capped with 1px `--ink` rule |
| Product/use-case cards (`product-grid`) | Flat `--surface` cards, 1px `--border`, square; title in display; started/completed via status pills; hover `border-color: var(--ink)` |
| Search + filter selects | Square inputs, 1px `--border`, focus ring `--ring`; 15px body type |
| Collapsible placement panel | Accordion row + expanded panel on `--surface2` (tier-row pattern) |
| Guided conversation / cert workspace / assessment log | The climb.html conversation panel styling — same chat bubbles, exam treatment (3px `--accent` top border + eyebrow) for certification mode |
| Identity gate | Emphasis card (1px border + 3px `--accent` top border), ghost cancel button |
| Request form | Standard fields; primary submit; success/error message as quiet meta text, not a toast |
| Admin queue entries | Hairline-divided list rows with flush paired action buttons (approve = primary, deny = ghost) |
| Admin auth panel | Centered emphasis card, ~420px |

Voice stays per BRAND_GUIDE §9; keep existing copy unless a string is purely stylistic.

## 5. Navigation unification (the one edit allowed on Phase 1 pages)

Functional-page nav becomes, on **all** functional pages (ladder, assessment†, climb,
transcript, products, use-cases): **The Ladder · Products · Use Cases · Transcripts**,
active item weight 600 `--primary`. († assessment.html keeps its minimal standalone
bar per the design — no change there.)

- Marketing `index.html` nav is **unchanged** (it follows the Home design).
- Pathway pages keep their links to `/ai-academy/students.html` (Student Hub) in the
  footer; admin-queue links stay on the public pathway pages.
- `educationFocusSelect` stays as-is everywhere it exists (redundant with the nav but
  it's a tested contract row — F4/PP3/UC3).

## 6. i18n policy — same as Phase 1 §8

Existing `data-i18n` / `data-i18n-placeholder` keys reattach to restyled elements; new
strings get keys with English fallback in `products-i18n.js` / `use-cases-i18n.js`
(warning, not blocker).

## 7. Hygiene

- Add page version comments (`<!-- theladder-products-v0.2.0 | date -->` /
  `<!-- theladder-use-cases-v0.2.0 | date -->`) — these pages have none today; adopt
  the theladder convention.
- Bump cache busters on every changed JS reference (`products-app.js?v=20` → `?v=21`,
  `use-cases-app.js?v=12` → `?v=13`, admin js `?v=1` → `?v=2`); new CSS starts `?v=1`.
- Conventional commits, at least one per surface (products page, use-cases page,
  admins, nav unification). Working tree clean at the end.
- **Scope check:** `git diff main --stat` adds only: `theladder-products/*`,
  `theladder-use-cases/*`, the Phase 1 nav edits (`theladder/ladder.html`,
  `climb.html`, `transcript.html` — nav block only), possibly `ladder-brand.css`
  additions, this file, `AUDIT-PATHWAYS-REDESIGN.md`, results file, and
  `PR-BODY-LADDER-REDESIGN.md`.
- When done: run `AUDIT-PATHWAYS-REDESIGN.md`, write
  `AUDIT-RESULTS-PATHWAYS-REDESIGN.md`, then **complete the Phase 2 section of
  `PR-BODY-LADDER-REDESIGN.md`** from the results.

## Out of scope

- Catalog content, engine logic, placement/certification behavior, request-email
  backend, admin approval logic.
- Training/Certification pages, authenticate.html restyle, i18n translation pass,
  mobile-specific design (all remain Phase 1 follow-ups).
- Deleting `products.css` / `use-cases.css` / old academy CSS references elsewhere.
