# ADR 0001 — Firestore as the database of record for The Ladder

- **Status:** PROPOSED (draft — Scott can veto before any implementation)
- **Date:** 2026-06-09
- **Deciders:** Scott (final), data-layer worktree (author)
- **Related docs:** Obsidian `15-The-Ladder-Architecture.md`, `16-Ladder-Certification-Architecture.md`, `18-The-Ladder-Products-Architecture.md`, `19-The-Ladder-Use-Cases-Architecture.md`
- **Related deliverables:** `docs/ladder-data-model.md`, `theladder-shared/data-layer.js`, `theladder-shared/standards-evidence.js`, `firestore.rules.draft`

## Context

The Ladder spans three learner pathways, and today they persist progress in two
incompatible ways:

1. **Concepts ladder** (`theladder/ladder-app.js`) already uses Firestore. It
   imports the Firebase web SDK directly from the gstatic CDN, reads
   `FIREBASE_CONFIG` from `ai-academy/js/firebase-config.js`, and writes to
   `learners/{learnerId}` with `setDoc(..., { merge: true })`. It stores
   `ladderProgress`, `ladderCertifications`, `certificationValidations`,
   `standardsReviews`, `studentTranscript`, and `transcriptEvents`. It is
   localStorage-first (keys `aesop-learner-id`, `aesop-ladder-state`,
   `aesop-theme`) and Firestore-synced.

2. **Products ladder** (`theladder-products/products-app.js`) and
   **Use-Cases ladder** (`theladder-use-cases/use-cases-app.js`) persist
   completions in **localStorage only** — keys `aesop-ladder-products-state-v1`
   and `aesop-ladder-use-cases-state-v1`, under `courseStarts` / `courseChats`.
   Their only Firestore touch today is fire-and-forget request queues
   (`productCourseRequests`, `useCaseTrainingRequests`) written with `addDoc`.

This split means a learner who earns progress in Products or Use-Cases has no
durable, cross-device, certifiable record. The certification architecture
(doc 16) and the standards-evidence model (doc 15) both assume a single durable
learner profile that can carry certifications, evidence packets, and advisory
standards evidence across all three pathways.

Doc 15 also flags an open question under "Integrations To Build":

> Firestore durable learner profile — *possibly Mojo backend if it is the right
> production data layer.*

So the choice of database of record is genuinely open and must be decided before
the Products/Use-Cases pathways are wired to durable persistence.

## Decision

**Adopt Firestore (`playagame-f733d`) as the single database of record for all
three Ladder pathways**, unifying on the existing `learners/{learnerId}`
document that the Concepts ladder already writes.

Concrete commitments:

- All three pathways read and write the same `learners/{learnerId}` document.
- Per-pathway progress lives under distinct keys on that document
  (`ladderProgress`, `productProgress`, `useCaseProgress`) so the pathways do
  not collide. See `docs/ladder-data-model.md` for the exact shapes.
- Certifications, evidence packets, second-model validations, and advisory
  standards evidence live in dedicated subcollections/collections keyed by
  `learnerId`, matching the doc-16 field list exactly.
- Pathways keep their existing localStorage keys, but localStorage becomes an
  **offline cache that syncs up to Firestore**, not the system of record.
- The Firebase SDK is consumed exactly as the Concepts ladder consumes it: ES
  module imports from the gstatic CDN, config from
  `ai-academy/js/firebase-config.js`. A shared helper
  (`theladder-shared/data-layer.js`) centralizes this so Products and Use-Cases
  do not each reinvent the sync path.

## Alternatives considered

### A. Keep localStorage-only for Products/Use-Cases (status quo)
Rejected. No cross-device continuity, no certifiable record, and certifications
(doc 16) cannot attach to a durable identity. Loses data on cache clear.

### B. Mojo backend as the database of record (the doc-15 "possibly Mojo" note)
Deferred, not chosen now. A bespoke backend may eventually be the right
production data layer for heavy resource/mapping catalogs and research runs, but:
- It does not exist yet; choosing it now blocks the Products/Use-Cases
  persistence work indefinitely.
- The Concepts ladder is already on Firestore in production, so Firestore is the
  lowest-friction unification point.
- Firestore security rules already gate the public request queues.
This ADR explicitly leaves room for a future Mojo (or other) read/aggregation
layer *in front of or beside* Firestore. The repository pattern in
`data-layer.js` means the database of record can be swapped later without
rewriting page apps. Treat Mojo as a possible future ADR, not a blocker now.

### C. A separate relational database (e.g. Postgres via an API)
Rejected for now. Adds an operational tier and a network dependency the static
pages do not currently have. The pages are static HTML + vanilla JS served
without an app server; Firestore's client SDK fits that model directly.

### D. One document per pathway (`learners/{id}/products`, etc.) with no unified root
Rejected. Fragments the learner identity and complicates certification, which
must reason over the whole learner across pathways. We use one root document
with per-pathway keys plus dedicated certification/evidence collections.

## Consequences

**Positive**
- Single durable learner identity across all three pathways.
- Certifications and evidence packets attach to one record (doc 16 ready).
- Cross-device continuity; localStorage clear no longer loses progress.
- Reuses the exact stack, config, and import style already in production.
- Repository-pattern helper keeps the door open to a future Mojo/aggregation
  layer without touching page apps.

**Negative / costs**
- Products/Use-Cases apps must gain a Firebase sync path (delivered as an opt-in
  shared helper so it can degrade to localStorage-only when Firebase is absent).
- Firestore security rules must be written and reviewed before deploy (drafted
  in `firestore.rules.draft`; **not** deployed by this worktree).
- The `learners/{learnerId}` document grows more fields; we keep pathway data
  namespaced to avoid write contention and use `{ merge: true }` everywhere.

**Neutral**
- Anonymous `learnerId` pattern from the Concepts ladder is preserved; an
  authenticated account UID can be bound later for stronger identity assurance
  (see `identityAssurance` in doc 16).

## Migration

1. **localStorage becomes an offline cache.** On load, the shared helper reads
   localStorage first (fast paint), then reads `learners/{learnerId}` from
   Firestore and reconciles. On write, it writes localStorage immediately and
   `setDoc(..., { merge: true })` to Firestore best-effort.
2. **One-time backfill.** The first time a Products/Use-Cases page loads with a
   known `learnerId` and Firebase available, it pushes any existing
   `courseStarts` / `courseChats` from localStorage up into
   `productProgress` / `useCaseProgress` on the learner document.
3. **No destructive change to page apps in this worktree.** This worktree only
   authors the schema, the shared helper, the standards engine, and a draft
   rules file. Wiring the existing page apps to the helper is a separate task
   for a sibling worktree, gated on Scott approving this ADR.
4. **Reversibility.** Because the helper exposes a small repository-style API,
   switching the database of record (e.g. to Mojo) later means reimplementing
   the helper's internals, not the call sites.

## Open questions for Scott

- Approve Firestore as the database of record, or hold for a Mojo decision?
- Should an authenticated account be **required** for Products/Use-Cases
  certifications, or is the anonymous `learnerId` acceptable at first
  (matching the Concepts ladder's `account_bound` default in doc 16)?
- Confirm the Firebase project `playagame-f733d` is the intended production
  project for all three pathways.
