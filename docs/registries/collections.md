# Firestore Collections Registry

Every Firestore collection used in this project. For each: producers, consumers, document shape, and status. Update whenever a collection is added, removed, or its shape changes.

No Firestore security rules file exists in this repo — access controls are managed in the Firebase Console.

---

## `learners`

Per-student record. Stores learner ID, course progress, assessment results, recommended pathway, and QR recovery token.

**Schema / shape:**

```
{
  learnerId:          string,
  createdAt:          ISO 8601 string,
  lastActiveAt:       ISO 8601 string,         // set by firebase-helpers.js; absent in legacy records
  courseProgress:     { [courseId]: {...} },   // set by students.html / transcript.html writers
  assessmentResults:  {                        // set by firebase-helpers.js only
    completed:            boolean,
    completedAt:          string | null,
    conversationHistory:  [{role, content, timestamp}],
    aptitudeScore:        number (0–100),
    aptitudeBand:         string,
    interestTags:         string[],
    completionFlag:       boolean,
    reasoning:            string
  },
  recommendedPathway: {
    generatedAt:      string | null,
    aptitudeBand:     string,
    primaryCourse:    CourseObject | null,
    followUpCourses:  CourseObject[],
    reasoningBrief:   string
  },
  qrRecoveryToken:    {
    token:        string,
    generatedAt:  string | null,
    qrCodeSvg:    string,
    expiresAt:    null
  },
  progressData:       {                        // initialized by firebase-helpers.js only
    coursesStarted:         string[],
    coursesCompleted:       string[],
    lastAccessedCourse:     string | null,
    currentlyViewingCourse: string | null
  },
  ladderProgress:     {                        // set by theladder/ladder-app.js only
    version:          string,
    language:         string,
    customLanguage:   string,
    activeTierId:     string,
    activeTopicId:    string,
    completedTopics:  { [topicKey]: {status, completedAt, language, evidence?} },
                       // status: "completed" | "placed_out" | "verified" | "self_reported"
    completedLabs:    { [topicKey]: {status, completedAt, evidence} },
                       // status/evidence use the same transcript vocabulary above
    vocabulary:       { [termKey]: boolean },
    placement: {
      completedAt:       ISO 8601 string,
      capabilityScore:   number,
      technicalScore:    number,
      governanceScore:   number,
      interestTags:      string[],
      grantedTierIds:    string[],
      assignedTopicIds:  string[],
      reasoning:         string,
      evidence:          string
    } | null,
    assessmentMessages: Array<{role: "user"|"assistant", content: string}>,
    transcriptEvents: Array<{eventType, status, title, detail, topicId, topicTitle, tierTitle, timestamp, evidence}>
                       // status/evidence: "completed" | "placed_out" | "verified" | "self_reported"
  }
}
```

**Producers**
- `ai-academy/students.html:102` — `setDoc` on new account creation; writes slim record `{learnerId, createdAt, courseProgress:{}}`
- `ai-academy/transcript.html:70` — `setDoc` on new account creation; writes slim record `{learnerId, createdAt, courseProgress:{}}`
- `ai-academy/transcript.html:309` — `setDoc` with `{merge:true}` on transcript import
- `ai-academy/dashboard.html:184` — `setDoc` from guardian dashboard; writes `{...guardianData, courseProgress:{}}`
- `ai-academy/js/firebase-helpers.js:94` — `setDoc` from `initializeLearnerRecord()`; writes full schema including all sub-objects
- `ai-academy/js/firebase-helpers.js:172` — `updateDoc` from `updateAssessmentResults()`
- `ai-academy/js/firebase-helpers.js:209` — `updateDoc` from `updateRecommendedPathway()`
- `ai-academy/js/firebase-helpers.js:245` — `updateDoc` from `updateQRRecoveryToken()`
- `ai-academy/js/firebase-helpers.js:287` — `updateDoc` from `addAssessmentMessage()` (appends to conversationHistory)
- `ai-academy/index.html:3285` — `setDoc` from exam result (progress write on exam completion)

- `theladder/ladder-app.js:214` - `setDoc` with `{merge:true}` from `saveRemote()`; writes `ladderProgress`
- `theladder/ladder-app.js:245` - `setDoc` when an existing learner ID does not exist; initializes slim learner record plus `ladderProgress`
- `theladder/ladder-app.js:365` - `setDoc` when placement assessment creates a learner ID; initializes slim learner record

**Consumers**
- `ai-academy/students.html:120` — `getDoc` on ID lookup
- `ai-academy/students.html:150` — `getDoc` to load `recommendedPathway`
- `ai-academy/students.html:170` — `getDoc` to load `courseProgress`
- `ai-academy/transcript.html:94` — `getDoc` on ID lookup
- `ai-academy/transcript.html:119` — `getDoc` to load learner data
- `ai-academy/transcript.html:264` — `getDoc` to display transcript
- `ai-academy/dashboard.html:223` — `getDoc` to load guardian's student
- `ai-academy/dashboard.html:262` — `getDoc` on student ID lookup
- `ai-academy/dashboard.html:393` — `getDoc` to refresh student progress
- `ai-academy/js/firebase-helpers.js:49` — `getDoc` in `initializeLearnerRecord()` (existence check)
- `ai-academy/js/firebase-helpers.js:123` — `getDoc` in `getLearnerRecord()`
- `ai-academy/js/firebase-helpers.js:275` — `getDoc` in `addAssessmentMessage()` (to read current history)
- `ai-academy/js/qr-recovery.js:38` — `collection` + `query` by `qrRecoveryToken.token`

- `theladder/ladder-app.js:243` - `getDoc` in `loadRemote()` to load `ladderProgress`

**Shape mismatch note:** `students.html`, `transcript.html`, and `dashboard.html` create records with only `{learnerId, createdAt, courseProgress:{}}`. `initializeLearnerRecord()` returns early when the document already exists (line 51) and does not backfill the assessment sub-objects. Existing students who enrolled before taking the assessment will have `assessmentResults`, `recommendedPathway`, `qrRecoveryToken`, and `progressData` absent until `updateDoc` calls create them. `updateDoc` will succeed (Firestore creates missing nested fields), but reads of missing paths will return `undefined`.

**Firestore rule:** No rules file in repo. Access controlled via Firebase Console.

**Status:** ⚠ shape mismatch (slim writers vs full schema) — functional but inconsistent initialization path

---

## `examResults`

Stores per-student exam attempt records from the AI Foundations tier-based exams in `index.html`.

**Schema / shape:**
```
{
  uid:     string (Firebase Auth UID),
  tier:    number,
  groupId: number,
  score:   number,
  total:   number,
  pct:     number,
  passed:  boolean
}
```
Document ID: `{uid}_{tier}_{timestamp}`

**Producers**
- `ai-academy/index.html:2843` — `setDoc` after exam completion; writes full record

**Consumers**
- None found in code. Read presumably done in Firebase Console or a future analytics layer.

**Firestore rule:** No rules file in repo.

**Status:** ⚠ orphan producer — written but not read by any current page

---

## `boardUpdateRequests`

Board approval request queue for admin panel.

**Schema / shape:** Fields read from Firestore snapshot via spread — exact shape set by the form in `board-approvals.html`. Includes at minimum `submittedAt` (for `orderBy`).

**Producers**
- `ai-academy/admin/board-approvals.html` — form submission (writer not grepped in detail; uses `addDoc` pattern implied by `onSnapshot` consumer)

**Consumers**
- `ai-academy/admin/board-approvals.html:194` — `collection` + `query` with `orderBy('submittedAt', 'desc')` via `onSnapshot`
- `ai-academy/admin/board-approvals.html:287` — `updateDoc` on approval action

**Firestore rule:** No rules file in repo.

**Status:** ✓ producer and consumer in same file

---

## `config`

Admin configuration document store.

**Schema / shape:** At minimum `{ apiKeys: {...} }` (inferred from `doc(db, 'config', 'api-keys')`).

**Producers**
- `ai-academy/admin/panel-review.html:936` — `setDoc` (writes API keys from admin UI)

**Consumers**
- `ai-academy/admin/panel-review.html:895` — `getDoc` (reads API keys for admin review panel)

**Firestore rule:** No rules file in repo. This collection should be admin-only.

**Status:** ✓ producer and consumer in same admin file — but no Firestore rule guards it

---

## `productCourseRequests`

Product training request queue for `/theladder-products/`. Learners can request missing products. Admins approve requests, then move them through research, draft build, review, and publication.

**Schema / shape:**
```
{
  productName:        string,
  productType:        string,
  reason:             string,
  requesterEmail:     string,
  sourcePath:         string,
  sourceProductId:    number | null,
  sourceProductName:  string,
  status:             "requested" | "approved" | "researching" | "built" | "reviewed" | "published" | "rejected",
  createdAt:          Firestore server timestamp,
  updatedAt:          Firestore server timestamp,
  createdAtIso:       ISO 8601 string,
  updatedAtIso:       ISO 8601 string,
  history:            Array<{status, at, actor, note}>
}
```

**Producers**
- `theladder-products/products-app.js` - `addDoc` from the learner request form on `/theladder-products/`
- `theladder-products/products-admin.js` - `updateDoc` for approval, research, build, review, publication, and rejection status changes

**Consumers**
- `theladder-products/products-admin.js` - `collection` + `query` with `orderBy('createdAt', 'desc')` via `onSnapshot`

**Firestore rule:** No rules file in repo. This collection should allow public creates with validation, and admin-only reads/updates.

**Status:** ✓ producer and consumer in product request flow; requires Firebase Console rules for production access control

---

## `useCaseTrainingRequests`

Use-case training request queue for `/theladder-use-cases/`. Learners can request missing use cases. Admins approve requests, then move them through research, draft build, review, and publication.

**Schema / shape:**
```
{
  useCaseName:        string,
  topic:              string,
  reason:             string,
  requesterEmail:     string,
  sourcePath:         string,
  sourceUseCaseId:    number | null,
  sourceUseCaseName:  string,
  status:             "requested" | "approved" | "researching" | "built" | "reviewed" | "published" | "rejected",
  createdAt:          Firestore server timestamp,
  updatedAt:          Firestore server timestamp,
  createdAtIso:       ISO 8601 string,
  updatedAtIso:       ISO 8601 string,
  history:            Array<{status, at, actor, note}>
}
```

**Producers**
- `theladder-use-cases/use-cases-app.js` - `addDoc` from the learner request form on `/theladder-use-cases/`
- `theladder-use-cases/use-cases-admin.js` - `updateDoc` for approval, research, build, review, publication, and rejection status changes

**Consumers**
- `theladder-use-cases/use-cases-admin.js` - `collection` + `query` with `orderBy('createdAt', 'desc')` via `onSnapshot`

**Firestore rule:** No rules file in repo. This collection should allow public creates with validation, and admin-only reads/updates.

**Status:** ✓ producer and consumer in use-case request flow; requires Firebase Console rules for production access control

---

## Summary

| Collection | Producers | Consumers | Status |
|------------|-----------|-----------|--------|
| `learners` | students.html, transcript.html, dashboard.html, firebase-helpers.js (5 update fns), index.html | students.html, transcript.html, dashboard.html, firebase-helpers.js, qr-recovery.js | ⚠ shape mismatch (slim vs full init) |
| `examResults` | index.html | none in code | ⚠ orphan producer |
| `boardUpdateRequests` | board-approvals.html | board-approvals.html | ✓ |
| `config` | panel-review.html | panel-review.html | ✓ (no rule guard) |
| `productCourseRequests` | products-app.js, products-admin.js | products-admin.js | ✓ (requires rules) |
| `useCaseTrainingRequests` | use-cases-app.js, use-cases-admin.js | use-cases-admin.js | ✓ (requires rules) |

---

Note: `/theladder/ladder-app.js` now also produces and consumes optional `learners.ladderProgress` on the existing `learners` documents. The detailed `learners` entry above is authoritative for those fields.

## Audit Trail — Proof of Registry Verification

**Last audit:** 2026-05-23T00:00:00Z (by /cross-boundary-audit, Task #6 branch)

**Boundaries checked:** Firestore collections (all `doc(db, ...)` and `collection(db, ...)` references in ai-academy/, aesop-api/, excluding archive/)

**Evidence recorded:**
- 2 entries with complete producer/consumer pairs ✓ (`boardUpdateRequests`, `config`)
- 1 entry with orphan producer (`examResults`)
- 1 entry with shape mismatch (`learners` — slim writers vs full-schema init)
- New identifiers introduced on this task: `learners.assessmentResults`, `learners.recommendedPathway`, `learners.qrRecoveryToken`, `learners.progressData` (Task #6)
- Registries match current code diff: yes

**Gaps identified:**
- `learners` shape mismatch: three writers create sparse records; `initializeLearnerRecord` returns early for existing docs — assessment sub-objects never backfilled
- `examResults`: written on exam completion, never read by any page

**Status:** Audit complete
