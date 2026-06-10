# PR: The Ladder redesign — new brand system + page restructure (morgan-dev → main)

> Draft PR body. CeCe: complete the **Phase 2** section from
> `AUDIT-RESULTS-PATHWAYS-REDESIGN.md` before Morgan opens the PR, then delete this note.

## Summary

Applies the new Aesop AI Academy design system (Claude Design handoff, committed under
`design-handoff-ladder/`) to The Ladder and its pathways, and restructures The Ladder so
the homepage is a **marketing landing page** with all product functionality on dedicated
pages — per Scott's requirement.

**No functional changes.** Every live feature was inventoried into a contract table
before building (BUILD docs §2) and audited row-by-row after (AUDIT-RESULTS docs).
localStorage keys, Firestore shapes, the certification result schema
(`LADDER-ARCHITECTURE-UPDATE-2026-06-10.md`), shared engines, catalogs, and
`aesop-api/` are untouched.

## Phase 1 — The Ladder (commits `3cf3f73c..0dec25f9`)

- **New page architecture:** `/theladder/` is marketing-only (zero app JS);
  `ladder.html` (climb hub with 15-tier accordion), `assessment.html` (the real AI
  placement conversation in the new three-phase shell), `climb.html` (rung workspace:
  guided conversation, certification, vocab, resources, deep-linkable
  `?tier=&rung=`), `transcript.html` (verifiable record).
- **Brand system:** `ladder-brand.css` (4 themes × light/dark, exact BRAND_GUIDE
  palettes, square corners, light editorial type) + `theme.js` (runtime switcher,
  persists `aesop_theme`, mirrors legacy `aesop-theme` so the rest of the site keeps
  respecting dark mode).
- **JS:** `ladder-app.js` → `ladder-core.js` (engine moved verbatim; the four
  certification-schema functions are md5-identical) + four page entry modules.
  Old `ladder-app.js` retired in place.
- **Audit:** full pass, no blockers (`AUDIT-RESULTS-LADDER-REDESIGN.md`). Three bugs
  found and fixed during audit (`ed508eee`). Verified live against Firebase/Firestore
  with fresh + seeded learners.

## Phase 2 — Products & Use Cases pathways

> _CeCe: fill in after the Phase 2 audit — commit range, what was built per surface
> (products / use-cases / both admin queues / nav unification), audit outcome, bugs
> found+fixed, N-T items._

## Needs verification on a PHP host (couldn't run locally)

AI round-trips were **N-T** on the static test server (no PHP for
`/aesop-api/proxy.php`): placement completion signal, guided-conversation completion,
certification result + validator, vocab ask, request-email endpoints. Engine code moved
verbatim (md5-verified where applicable) and all fallback paths were exercised — but
please run one live pass (place, converse, certify, submit a training request) before
or right after merge.

## Known/intentional

- **DESIGN.md superseded for `/theladder*` pages** (2-line note added): the new
  emerald/spring themes use greens/teals that DESIGN.md bans — intentional, per the
  brand handoff. The impeccable-audit scripts may flag them.
- Transcript export button says "Export transcript" (it produces the existing JSON,
  not a PDF).
- Depth dropdown shows 3 levels, matching the current implementation (standalone
  "Certification" depth was removed on main in `51331637`).

## Follow-ups (not in this PR)

1. i18n pass — new redesign strings render in English in all 11 languages.
2. Training + Certification pages (nav placeholders are HTML comments until designed).
3. `authenticate.html` restyle (works unchanged on the old theme).
4. Dedicated mobile/responsive design pass (clean single-column collapse shipped).
5. Marketing hero keeps an inline copy of the 15 tier names (deliberate — no app JS on
   that page); a tier rename in `ladder-data.js` must be mirrored there.
6. Pre-existing, untouched: `CERTIFICATION_COOLDOWN_MS = 0` TODO;
   `state.educationTierId` defaults to `'college'` which isn't in `EDUCATION_TIERS`.
