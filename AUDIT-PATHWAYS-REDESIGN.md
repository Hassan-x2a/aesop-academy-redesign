# AUDIT — Pathways Redesign: Products & Use Cases (Phase 2)

**Run after `BUILD-PATHWAYS-REDESIGN.md`.** Record results in
`AUDIT-RESULTS-PATHWAYS-REDESIGN.md` (same format as Phase 1 results). PASS / FAIL /
N-T per item; any FAIL in sections A, C, D, or E blocks the PR.

## Setup

Same as Phase 1 audit: static server (AI round-trips N-T, exercise fallbacks), fresh +
seeded profiles. Seed both pathway states (`aesop-ladder-products-state-v1` with started
+ completed courses and a certification; `aesop-ladder-use-cases-state-v1` likewise).
Screenshots: both pathway pages + one admin page, indigo-light/dark at ~1440px and ~390px,
plus one alternate theme (volt-dark) on the products page.

## A. Functionality preservation (contract tables, BUILD §2)

- [ ] **A1 (PP1/UC1)** Language select works on both pages; Spanish re-labels incl. a
      JS-rendered string (a catalog card or category row); reverts cleanly.
- [ ] **A2 (PP2/UC2)** Theme switcher present on both pathway pages **and both admin
      pages**; old `themeToggle` gone; no `academy-theme.css`/`academy-dark-mode.css`
      loaded on any of the four pages.
- [ ] **A3 (PP3/UC3)** Education focus select routes between all three pathways from
      both pages.
- [ ] **A4 (PP4/UC4)** Hero stats populate after catalog load (≈500 products / ≈300 use
      cases / advanced counts) — values come from the parsed catalog, not hardcoded
      (temporarily trim the local catalog md → counts change → revert).
- [ ] **A5 (PP5/UC5)** Category/topic rail renders all groups with counts; clicking
      filters the grid; `visibleCount` updates; active row styled.
- [ ] **A6 (PP6)** Products placement panel: toggle expands/collapses, conversation
      starts with the real engine opener, send works, result panel renders (N-T for AI
      completion; exercise fallback).
- [ ] **A7 (PP7/UC7)** Identity gate appears before certification on **both** pages
      (products: static section; use-cases: dynamically injected) — levels render,
      cancel works, gating state persists (`aesop-products-identity-gate-v1` /
      use-cases equivalent).
- [ ] **A8 (PP8)** Certification workspace: opens for a selected product + depth, log
      renders, close works, outcome panel renders from a seeded/stubbed result (N-T live).
- [ ] **A9 (PP9/UC6)** Guided conversation: start from a card, real first message,
      send appends, completion fallback path exercised; conversation styling matches
      climb.html's panel.
- [ ] **A10 (PP10/UC8)** Search + filters combine correctly (search × track × depth on
      products; search × depth on use-cases); empty-state message renders.
- [ ] **A11 (PP11/UC9)** Request forms: validation, submit attempts endpoint +
      Firestore + local key write (N-T for email round-trip on static server; verify
      the local request record and the UI message), field ids unchanged.
- [ ] **A12 (PP12/UC10)** Grid cards show correct started/completed states from seeded
      state; detail workspace opens; "3 certification options" per item reachable.
- [ ] **A13 (PP13/UC11/§5)** Unified nav on all functional pages: The Ladder ·
      Products · Use Cases · Transcripts with correct active item; Student Hub +
      admin-queue links still present where they were; assessment.html bar unchanged.
- [ ] **A14 (PP14/UC12)** All localStorage keys byte-identical to the frozen list
      (grep before/after); pre-redesign state blobs load with nothing dropped;
      Firestore sync still writes.
- [ ] **A15 (AD1)** Admin sign-in UI works (error path renders with bad credentials;
      live sign-in N-T without admin creds); sign-out button; auth panel gates queue.
- [ ] **A16 (AD2)** Queue renders seeded/mock requests, pending count correct,
      approve/deny handlers fire (Firestore write N-T — verify handler + UI state).
- [ ] **A17 (AD3)** `noindex,nofollow` intact on both admin pages.

## B. Design fidelity

- [ ] **B1** No hex outside `ladder-brand.css` token definitions — including inside
      the **template strings** of `products-app.js`, `use-cases-app.js`,
      `use-cases-identity.js`, `products-admin.js`, `use-cases-admin.js`:
      `grep -rn "#[0-9a-fA-F]\{3,8\}" theladder-products theladder-use-cases --include=*.js --include=*.html`
      (unreferenced legacy `products.css`/`use-cases.css` exempt).
- [ ] **B2** No `border-radius` other than 0 in new/changed CSS; square corners across
      cards, inputs, pills, chat bubbles on all four pages.
- [ ] **B3** Display headings weight 400 (500 max for wordmark); display font switches
      with theme on both pathway pages.
- [ ] **B4** Component mapping honored (BUILD §4): rail rows, cards + status pills,
      accordion placement panel, conversation panels match climb.html, identity gate
      emphasis card, flush paired admin action buttons.
- [ ] **B5** JS-rendered markup (cards, rail rows, chat messages, gate, queue entries)
      visually consistent with static markup — no unstyled "old class" leftovers:
      grep rendered class names from the old CSS (e.g. `.product-card`, old
      `course-chat-*` styles) and confirm every emitted class has a rule in the new
      system or was renamed.
- [ ] **B6** Scroll reveals + reduced-motion + no-JS visibility behave as on Phase 1
      pages.

## C. Cross-page behavior

- [ ] **C1** Theme set on a Phase 1 page persists onto both pathways and both admins
      (and back); legacy `aesop-theme` mirror still updated; no flash on load.
- [ ] **C2** Full navigation loop: marketing home → ladder → products → use-cases →
      transcript → back, via nav only — every link lands, active states correct.
- [ ] **C3** Zero console errors on all four pages, fresh + seeded, through catalog
      load, filtering, conversation open, identity gate, request submit, admin auth
      error path, language + theme switches.

## D. Data integrity

- [ ] **D1** Catalogs untouched: `git diff main -- docs/theladder-products-catalog.md
      docs/theladder-use-cases-catalog.md` → empty.
- [ ] **D2** Engines untouched: `git diff main -- theladder-shared/ theladder-products/products-ladder.js` → empty.
- [ ] **D3** No invented content: product/use-case names, category names, and counts
      all come from the catalogs; no copy hardcodes a count that the catalog should
      drive (the static "3 certification options" is the one allowed literal).
- [ ] **D4** Request payload shapes unchanged (diff the submit handlers against main —
      class/markup changes only).

## E. Regression

- [ ] **E1** Phase 1 pages: re-run Phase 1 audit items A2 (theme switcher), A5 (hub
      summary), C1 (persistence), C4 (console) — the nav edit must not have broken
      anything; marketing home still loads zero app JS.
- [ ] **E2** Root site + `ai-academy/` pages render as before; Student Hub links from
      pathways still work.
- [ ] **E3** Scope: `git diff main --stat` matches BUILD §7's allowed list exactly.

## F. Hygiene

- [ ] **F1** Conventional commits per surface; clean tree.
- [ ] **F2** Cache busters bumped per BUILD §7; no page references `products.css` /
      `use-cases.css` / `academy-theme.css` anymore (the files remain on disk).
- [ ] **F3** Version comments present on all four pages (`*-v0.2.0`).
- [ ] **F4** `PR-BODY-LADDER-REDESIGN.md` Phase 2 section completed from the results.

## Known acceptable findings (report as PASS-WITH-NOTE)

1. AI round-trips (placement/conversation/certification completion, request email) N-T
   on a static server — same as Phase 1; Scott verifies on a PHP host.
2. New strings English-only across the 11 languages pending the i18n pass.
3. Admin live sign-in untestable without admin credentials — error path + gating
   verified instead.
4. Green/teal in emerald/spring themes — DESIGN.md superseded (Phase 1 known-acceptable #1).
