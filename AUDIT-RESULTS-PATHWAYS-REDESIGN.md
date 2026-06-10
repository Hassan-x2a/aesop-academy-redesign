# AUDIT RESULTS — Pathways Redesign (Phase 2) — 2026-06-10

Build commits: `d5b86580..20c4d8fe` on `morgan-dev` (brand primitives → products → use-cases →
admins → nav unification → audit fix). Re-skin only, per BUILD-PATHWAYS-REDESIGN §0: markup,
class names, and CSS changed; **zero changes to logic, state, data flow, or engine usage** —
the full `git diff main` on the four app JS files is: i18n-import cache-buster bumps, retired
`themeToggle` handlers (theme is owned by `/theladder/theme.js`), status pills added to the
card templates (reading existing `state.courseStarts`, per BUILD §4 mapping), inline styles in
templates replaced with classes, and the one audit fix below. Request submit handlers,
engines, catalogs, endpoints, and collections are byte-unchanged.

**Test setup:** served from repo root with the repo's existing static launch config (no PHP —
`/aesop-api/proxy.php` and the request-email endpoints return raw PHP source, so all AI
round-trips are **N-T** per the AUDIT setup; every graceful-fallback path was exercised
instead). Profiles: fresh (cleared localStorage) and seeded (products: started + completed
courses, identity-gate level, placement payload; use-cases: started + completed courses,
placement with one granted topic + two assigned use cases). Firebase/Firestore ran live
(learner-doc Write channels 200; the `productCourseRequests` write was rejected by security
rules from this origin — which exercised the local-fallback path end to end).

**Test-server artifacts (not app bugs):**
1. Clean-URL 301s on `*.html` (same as Phase 1) — redirect targets all land 200.
2. The preview harness freezes CSS animation clocks (transitions stick at `currentTime 0`),
   so the .4s theme cross-fade and the scroll reveals were verified by force-finishing the
   animations — tokens land exactly on the target palette (volt-dark body `#0D130E`, primary
   `#AEF24E`, on-primary ink). In a real browser the clock runs normally.

**Found + fixed during audit (commit `20c4d8fe`):** the products identity gate never
rendered — `renderIdentityGate()` early-returned on `!state.identityGateBody`, which is
always `undefined` (the element lives on `elements.identityGateBody`). **Pre-existing on
main**, meaning every certification attempt on the products page was unreachable. One-word
guard fix; no other logic touched. (The use-cases page has its own injected gate, which was
unaffected.)

| Item | Result | Notes |
|------|--------|-------|
| A1   | PASS   | Spanish re-labels both pages incl. JS-rendered strings (`Curso de producto`, `Exámenes de certificación`, the rendered `Eximido` placed-out badge, chat speaker `Examinador`); H1s use the existing translated nav keys (`Productos`/`Casos de uso`); reverts cleanly; use-cases still updates `<html lang/dir>`. New Phase 2 strings (`navTranscripts`, status pills) are English-fallback per BUILD §6 (known-acceptable #2). Category/topic row labels remain canonical-English data, same as on main. |
| A2   | PASS   | Phase 1 switcher on both pathway pages **and both admins** (popover stays open after selection — the Phase 1 `ed508eee` behavior); `#themeToggle` and its handlers removed from all four pages + 3 JS files; stylesheet list on every page is exactly `ladder-brand.css?v=2` (+ thin pathway CSS) — no `academy-theme.css`/`academy-dark-mode.css`/old `products.css`/`use-cases.css`. |
| A3   | PASS   | `educationFocusSelect` present on both pages with all three options; change navigated products → `/theladder-use-cases/` (verified live). |
| A4   | PASS   | 500 products / 227 advanced, 300 use cases / 116 advanced computed after catalog load. Probe: trimmed the local catalog md → hero showed 429 / 181 with 429 cards → restored byte-identical (git-clean, md5 verified). The static "3 certification options" is the one allowed literal. |
| A5   | PASS   | 23 category rows / 21 topic rows with live counts; clicking filters the grid (Coding tools → 26 shown); `visibleCount` updates; active row weight 600 in `--primary`. Use-cases "Placed out" badge renders on granted topics from seeded state. |
| A6   | PASS (shell+result) / N-T (AI) | Accordion expands/collapses with relabeled toggle; conversation opens with the real engine opener ("Let us place you across the AI product catalog…"); send appends and the no-proxy fallback message rendered. Result panel verified from a seeded placement payload: emphasis card (3px accent), three scores, granted categories, assigned ids resolved to real catalog names (NotebookLM, Pinecone, ChatGPT Advanced Data Analysis), reasoning line. |
| A7   | PASS (found+fixed) | Products gate (after the `20c4d8fe` fix): three levels render (account-bound disabled when signed out), resolved-level line, cancel hides + aborts, 18+ error path, level persists to `aesop-products-identity-gate-v1` (`{"levelId":"self_attested"}`). Use-cases injected gate: levels/desc, account block hidden for self-attested, attestation error, cancel aborts, level persists to `aesop-use-cases-identity-assurance`. |
| A8   | PASS (shell) / N-T (outcome) | After gate confirm the workspace opens titled "Google Gemini — Expert certification"; examiner turns carry the 3px `--accent` exam rule; send appends; close clears and hides. The outcome panel needs a live examiner determination (N-T); its renderer is byte-unchanged from main — only its CSS is new. |
| A9   | PASS   | Start from a card on both pages: title swaps to "{item} - Guided Conversation", real first message posts, fallback reply renders, send appends; chat uses the same `.message` voice as climb.html (assistant on `--surface2`, user 1px border, label treatment identical). |
| A10  | PASS   | Products: search × track × depth combine (github × B/I/A → 2; Workforce track narrows rail to its 3 categories + All); use-cases: search × depth; empty-state messages render on both. |
| A11  | PASS (note) | Validation error renders as quiet meta text (`data-tone="error"`). Live submit: Firestore write attempted and **rejected by security rules from this origin** ("Missing or insufficient permissions" — identical behavior on main, rules untouched) → local fallback wrote the full record to `aesop-product-course-requests-v1` with the unchanged payload shape (name/type/reason/email/sourcePath/sourceProductId/history), warning message shown, submit button re-enabled. Email endpoint POST attempted (N-T round-trip on static server). All field ids unchanged. One clearly-labeled test record remains in this browser's local queue only. |
| A12  | PASS   | Seeded state → "Started" pill (accent border) and "Completed" pill (`--fill`/`--on-primary`) on the right cards on both pages, square corners; detail launch button restores "Continue course"; the 3-option certification stack renders per item with working Start buttons. |
| A13  | PASS   | Unified nav (The Ladder · Products · Use Cases · Transcripts) on ladder, climb, transcript, products, use-cases with correct active item on every page; assessment.html minimal bar untouched; Student Hub + academy-transcript links in pathway footers; admin-queue links still on both public pathway pages; every nav/footer href resolves (301s are the test server's clean-URL redirect). |
| A14  | PASS   | Key grep before/after: the only delta vs main is the removed legacy `aesop-theme` *writes* from the retired toggles — `theme.js` still mirrors that key on every mode change (verified live: legacy key = `dark` after switching). All data keys byte-identical: products state/lang/requests/gate, use-cases state/language/requests/assurance. Pre-redesign-shaped blobs loaded with nothing dropped (courseStarts incl. completed, placement, granted/assigned). Firestore learner sync live (Write channels 200). |
| A15  | PASS (error path) / N-T (live) | Bad credentials → real `identitytoolkit` 400 → "Invalid email or password." rendered, button restored; auth panel gates the queue (queue stays hidden); sign-out button present and wired. No admin credentials available (known-acceptable #3). |
| A16  | PASS (render) / N-T (Firestore actions) | The real `renderRequests` path rendered the live local-fallback request from the A11 test: "Requested" status pill, Type/Requested by/Reason/Submitted-from fields, local-fallback note, pending count 1. Approve/deny buttons are intentionally absent on local-only records (unchanged design); the advance/reject handler wiring is byte-unchanged from main (diff-verified). |
| A17  | PASS   | `noindex,nofollow` on both admin pages. |
| B1   | PASS   | Hex grep clean across both pathway folders (`*.js` + `*.html`, including all template strings) and both new CSS files; unreferenced legacy `products.css`/`use-cases.css` exempt per AUDIT. |
| B2   | PASS   | Only the global `border-radius: 0` reset matches; pills, cards, inputs, chat bubbles all square (computed-verified `0px` on pills). |
| B3   | PASS   | H1 computed: display font weight 400 (Schibsted in indigo, Space Grotesk in volt — switches with theme on both pages); no 700+ weights in any new/changed CSS. |
| B4   | PASS   | Component mapping honored: rail rows (1px ink cap, hairline dividers, count meta, active 600 `--primary`), flat `--surface` cards with hover `--ink` border + status pills, placement accordion expanding onto `--surface2`, conversation panels in the climb.html voice with 3px-accent exam treatment, identity gates as emphasis cards (1px border + 3px `--accent` top), request form with quiet meta messages, admin queue as hairline rows with flush paired actions (advance = primary, reject = ghost, `border-left: none`), 420px centered auth card. |
| B5   | PASS   | Scripted coverage check: every class emitted by `products-app.js`, `use-cases-app.js`, `use-cases-identity.js`, and both `*-admin.js` has a rule in `ladder-brand.css` §11 or the pathway CSS (old names like `.product-card`/`.category-button` deliberately kept and restyled under the new system — smaller JS diff, no unstyled leftovers). |
| B6   | PASS (note) | Same Phase 1 reveal machinery (`theme.js` IntersectionObserver one-shot `is-in`, `html.js` gate so no-JS content stays visible, `prefers-reduced-motion` rule). The preview harness freezes animation clocks (test-server artifact #2), so reveals were verified by force-finishing — final state correct. |
| C1   | PASS   | volt-dark set on products persisted across use-cases → both admins → hub → transcript and back; `aesop_theme` JSON correct; legacy `aesop-theme` mirror updated; pre-paint head snippet on all four new pages → no theme flash (page paints the stored palette immediately, verified `#121022`/`#0D130E` body on load). |
| C2   | PASS   | Full loop via nav only: home → ladder → products → use-cases → transcript → back; every link lands (curl-verified 200s, incl. followed redirects); active states correct on every page. |
| C3   | PASS (note) | The only console errors all session are the **pre-existing** proxy-failure handlers (`Placement assessment error` / `Chat error` / `Examiner error` — `console.error` in catch blocks present on main) fired by intentionally exercising N-T AI round-trips on the static server (known-acceptable #1); they do not occur on a PHP host. Zero other errors across both pathways + both admins, fresh and seeded, through catalog load, filtering, conversations, gates, request submit, admin auth error path, and language + theme switches. Firestore rule rejection surfaces as a handled `console.warn`. |
| D1   | PASS   | `git diff main -- docs/theladder-products-catalog.md docs/theladder-use-cases-catalog.md` → empty (A4 probe restored byte-identical). |
| D2   | PASS   | `git diff main -- theladder-shared/ theladder-products/products-ladder.js` → empty; `use-cases-identity.js` also untouched (restyled purely via CSS, so its `?v=1` reference is correct). |
| D3   | PASS   | All product/use-case names, categories, and counts come from the parsed catalogs (proven by the A4 trim probe and the seeded-placement name resolution); the static "3" is the allowed literal. |
| D4   | PASS   | `handleProductRequestSubmit` / `handleUseCaseRequestSubmit` / `notify*Request` / collection + endpoint constants byte-unchanged (diff-verified); the live local record confirms the payload shape in practice. |
| E1   | PASS   | Hub after the nav edit: 4-item nav with The Ladder active, theme switcher works, 15 tier rows render, summary card computes from state (fresh profile → 0/270); transcript shows Transcripts active. Marketing home network trace: page assets + Google Fonts + `theme.js` only — no app JS, no Firebase. |
| E2   | PASS   | Root `/` renders as before (own theme/assets, stats.json loads); `/ai-academy/students.html` loads with its own stack; Student Hub + academy-transcript links from the pathway footers land. |
| E3   | PASS   | Phase 2 incremental diff (`33f19e9d..HEAD`) touches exactly: `theladder-products/*`, `theladder-use-cases/*`, `theladder/ladder-brand.css` (append-only §11), the three Phase 1 nav blocks (`ladder.html`, `climb.html`, `transcript.html` — nav only), and the Phase 2 docs. No engines, catalogs, `aesop-api/`, `firestore.rules`, or `ai-academy/` changes. |
| F1   | PASS   | Conventional commits, one per surface: `d5b86580` (brand primitives), `0605ca5c` (products), `aa33d78a` (use-cases), `e677319f` (admins), `b5c56f27` (nav unification), `20c4d8fe` (audit fix); working tree clean. |
| F2   | PASS (note) | `products-app.js?v=20→21`, `use-cases-app.js?v=12→13`, both admin js `?v=1→2`, i18n imports `?v=1→2`, new pathway CSS `?v=1`, and the four pathway pages reference `ladder-brand.css?v=2` (network-verified fetches). Phase 1 pages keep `?v=1` deliberately: the brand-CSS change is append-only (no Phase 1 rule modified), and their files are otherwise untouched beyond the nav block — a stale cached v=1 renders Phase 1 pages identically. No page references `products.css` / `use-cases.css` / academy CSS (files remain on disk). |
| F3   | PASS   | `<!-- theladder-products-v0.2.0 | 2026-06-10 -->` / `<!-- theladder-use-cases-v0.2.0 | 2026-06-10 -->` on all four pages. |
| F4   | PASS   | PR-BODY-LADDER-REDESIGN.md Phase 2 section completed from these results (same change set). |

Screenshots: captured live in the preview browser during this audit — products in indigo-light
(1440px + 390px) and volt-dark with the theme popover open; use-cases in indigo-dark (1440px);
products admin in volt-dark (auth card + rendered queue entry). The preview harness does not
persist screenshot files into the repo — re-capture manually if archival copies are needed.

Open issues / follow-ups:
1. **i18n pass** — Phase 2 strings (`navTranscripts`, card status pills) render in English in
   all 11 languages (known-acceptable #2); existing keys reattached everywhere.
2. **AI round-trips untested locally** (placement/conversation/certification completions,
   request-email endpoints) — fallbacks exercised; verify once on a PHP host before merge
   (same as Phase 1 follow-up #3).
3. **Admin live sign-in + Firestore queue actions** untested without admin credentials —
   error path, gating, and entry rendering verified; advance/reject code unchanged.
4. **Firestore `productCourseRequests` write rejected from localhost** ("Missing or
   insufficient permissions") — pre-existing rules behavior, not a redesign change; the
   local-fallback path covers it. Worth a one-time check on the PHP host that learner request
   submissions still reach Firestore in production.
5. **Mobile** — clean single-column collapse at 390px; the functional-page topbar has a
   ~100px horizontal overflow at 390px that **also exists on the Phase 1 pages** (chrome
   min-content width; measured 492px on ladder.html vs 489px on products) — pre-existing,
   covered by the dedicated mobile/responsive follow-up (known-acceptable #4 lineage).
6. **Identity-gate bug fixed during audit** (`20c4d8fe`) was pre-existing on main — products
   certifications were unreachable before this branch. Called out in the PR body.
7. One clearly-labeled audit test request ("Phase 2 audit test request — safe to reject")
   exists only in this browser's local fallback queue (Firestore rejected the write); nothing
   was persisted server-side.
