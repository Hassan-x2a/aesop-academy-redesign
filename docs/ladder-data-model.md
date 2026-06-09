# The Ladder — Canonical Firestore Data Model

> Status: DRAFT (paired with ADR `docs/adr/0001-ladder-database-of-record.md`).
> Field names for `evidencePackets`, `certificationValidations`, and
> `identityAssurance` are kept **byte-for-byte consistent with Obsidian doc
> `16-Ladder-Certification-Architecture.md`** so the sibling certification-engine
> worktree lines up. Collection list and advisory statuses follow doc
> `15-The-Ladder-Architecture.md`.

Database of record: **Firestore** (project `playagame-f733d`, config in
`ai-academy/js/firebase-config.js`). localStorage is an offline cache that syncs
up (see ADR 0001). All learner-scoped writes use `setDoc(..., { merge: true })`.

---

## 1. `learners/{learnerId}` — unified learner record (root document)

One document per learner, shared by all three pathways. `learnerId` is the
existing anonymous Concepts-ladder id (localStorage `aesop-learner-id`); an
authenticated `accountUid` may be bound for stronger identity assurance.

```jsonc
{
  "learnerId": "string (doc id)",
  "createdAt": "ISO-8601",
  "lastActiveAt": "ISO-8601",
  "accountUid": "firebase uid when present | ''",
  "accountEmail": "learner@example.com | ''",
  "adultAttested": true,

  // --- Concepts pathway (already written by theladder/ladder-app.js) ---
  "ladderProgress": {
    "version": "LADDER_VERSION",
    "language": "en",
    "customLanguage": "",
    "activeTierId": "string",
    "activeTopicId": "string",
    "activeVocabTerm": "string",
    "completedTopics": { "<topicId>": { "completedAt": "ISO-8601" } },
    "completedLabs": { "<labId>": { "completedAt": "ISO-8601" } },
    "vocabulary": { "<term>": { "...": "..." } },
    "selfAssignedTopicIds": ["string"],
    "placement": { "...": "..." },
    "assessmentMessages": [ { "role": "user|assistant", "content": "string" } ],
    "transcriptEvents": [ /* see Transcript Events, section 8 */ ]
  },

  // --- Products pathway (new; mirrors theladder-products courseStarts) ---
  "productProgress": {
    "version": "v1",
    "courseStarts": {
      "<productId>": {
        "level": "Beginner|Intermediate|Advanced",
        "savedAt": "ISO-8601",
        "status": "started|in_progress|completed"
      }
    },
    "courseChats": {
      "<productId>": [ { "role": "user|assistant", "content": "string" } ]
    }
  },

  // --- Use-Cases pathway (new; mirrors theladder-use-cases) ---
  "useCaseProgress": {
    "version": "v1",
    "courseStarts": {
      "<useCaseId>": {
        "level": "string",
        "savedAt": "ISO-8601",
        "status": "started|in_progress|completed"
      }
    },
    "courseChats": {
      "<useCaseId>": [ { "role": "user|assistant", "content": "string" } ]
    }
  },

  // --- Cross-pathway certification rollups (denormalized for fast reads) ---
  // The Concepts ladder already writes these at the root today; we keep them
  // and let all pathways contribute. Authoritative copies live in the
  // certifications / evidencePackets collections (sections 4-5).
  "ladderCertifications": [ /* certification summaries, section 4 */ ],
  "certificationValidations": [ /* validation summaries, section 6 */ ],
  "standardsReviews": [ /* advisory standards summaries, section 7 */ ],
  "studentTranscript": {
    "updatedAt": "ISO-8601",
    "ladderCertifications": [],
    "certificationValidations": [],
    "standardsReviews": []
  },

  "identityAssurance": { /* section 3 */ }
}
```

How product/use-case completions and certs attach: a completion in any pathway
updates that pathway's `*Progress.courseStarts[id].status = "completed"` AND
appends a record to the `completions` collection (section 2). A certification in
any pathway writes a `certifications` doc + `evidencePackets` doc (sections 4-5)
keyed by `learnerId`, and a denormalized summary into `ladderCertifications` on
this root document. Pathway is always carried as `pathway:
"concept" | "product" | "use-case"` so one learner record spans all three.

---

## 2. `completions/{completionId}` — pathway-agnostic completion log

Durable record of a single course/rung/lab completion in any pathway. The
authoritative source for "what did this learner finish".

```jsonc
{
  "completionId": "string (doc id)",
  "learnerId": "string",
  "pathway": "concept | product | use-case",
  "itemId": "topicId | productId | useCaseId",
  "itemType": "topic | lab | product-course | use-case-training",
  "itemName": "string",
  "level": "Beginner|Intermediate|Advanced | tierLabel | ''",
  "status": "completed | placed_out",
  "completedAt": "ISO-8601",
  "source": "self_reported | ai_observed | reviewer_confirmed",
  "certificationId": "string | null"  // set if this completion was certified
}
```

---

## 3. `identityAssurance` (embedded on `learners`, and copied onto each credential)

Stored separately from AI examiner validation. **Field names exact per doc 16.**

```jsonc
{
  "level": "account_bound",
  "label": "Account-bound",
  "status": "account_bound",
  "accountRequired": true,
  "accountUid": "firebase uid when present",
  "accountEmail": "learner@example.com",
  "adultAttested": true,
  "attested": false,
  "attestedAt": null,
  "proctoringRequired": false,
  "proctoringMode": "none",
  "identityProvider": "",
  "verificationTransactionId": "",
  "sessionRecordingId": "",
  "proctorDecision": "not_required",
  "proctorName": "",
  "proctorOrganization": "",
  "proctorNotes": ""
}
```

---

## 4. `certifications/{certificationId}` — awarded credential records

One per awarded (or attempted) certification, any pathway.

```jsonc
{
  "certificationId": "string (doc id)",
  "learnerId": "string",
  "pathway": "concept | product | use-case",
  "certificationTier": "elementary|middle-school|high-school|young-adult|college|workforce|leadership",
  "ladderTier": "string (one of the 15 Ladder tiers)",
  "testDepth": "placement | tier-test-out | certification | mastery-challenge",
  "blueprintVersion": "string",
  "rubricVersion": "string",
  "evidencePacketId": "string -> evidencePackets",
  "certificationValidationId": "string | null -> certificationValidations",
  "evidenceStatus": "completed | placed_out | verified | ai_verified | self_reported",
  "result": "pass | non_pass",
  "finalDecision": "pass | non_pass | reversed | partial_credit | retake_required",
  "challengeStatus": "none | upheld | reversed | partial_credit | retake_required",
  "identityAssurance": { /* section 3 snapshot at award time */ },
  "awardedAt": "ISO-8601",
  "humanReviewRecommended": false,
  "humanReviewTriggers": ["string"]
}
```

A denormalized summary of each cert is also appended to
`learners/{learnerId}.ladderCertifications[]` for fast transcript rendering.

---

## 5. `evidencePackets/{evidencePacketId}` — per-attempt evidence (doc-16 field list, exact)

Every certification attempt produces exactly one evidence packet. **The field
set below is the doc-16 "evidence packet containing" list, 1:1.**

```jsonc
{
  "evidencePacketId": "string (doc id)",
  "learnerId": "string",                  // learner ID
  "certificationTier": "string",          // certification tier
  "ladderTier": "string",                 // Ladder tier
  "testDepth": "string",                  // test depth
  "blueprintVersion": "string",           // test blueprint version
  "rubricVersion": "string",              // rubric version
  "aiModel": "string",                    // AI model name and version
  "modelProvider": "string",              // (doc-16 AI Decision Controls)
  "systemPromptVersion": "string",        // system prompt version
  "decodingSettings": { },                // (doc-16 decoding settings where available)
  "scoringSchemaVersion": "string",       // (doc-16 scoring schema version)
  "dateTime": "ISO-8601",                 // date and time
  "learnerResponses": [ "string" ],       // learner responses
  "generatedScenario": "string",          // generated scenario
  "requiredArtifact": "string",           // required artifact or evidence statement
  "rubricScores": {                       // rubric scores
    "conceptualAccuracy": 0,
    "vocabularyFluency": 0,
    "appliedJudgment": 0,
    "evidenceQuality": 0,
    "reasoningDefense": 0,
    "riskAwareness": 0,
    "standardsAlignment": 0
  },
  "standardsMappingsAssessed": [ "string" ],   // standards mappings assessed
  "standardsMappingsSatisfied": [ "string" ],  // standards mappings satisfied
  "criticalFailureChecks": [                    // critical-failure checks
    { "rule": "string", "passed": true }
  ],
  "result": "pass | non_pass",            // pass/non-pass result
  "aiRationale": "string",                // AI rationale
  "auditRationale": "string",             // (doc-16 internal audit rationale)
  "remediationRecommendations": [ "string" ],  // remediation recommendations
  "challengeStatus": "none | upheld | reversed | partial_credit | retake_required", // challenge status
  "finalDecision": "string",              // final decision
  "reviewerModel": "string"               // doc-16: stored here, never hard-coded
}
```

### `challengePackets` (subcollection of an evidence packet, doc-16 challenge list)

```jsonc
{
  "originalResult": "string",
  "originalAiRationale": "string",
  "learnerChallengeText": "string",
  "additionalEvidenceSubmitted": [ "string" ],
  "challengeReviewerType": "AI | human | panel",
  "challengeRubric": { },
  "finalDecision": "upheld | reversed | partial_credit | retake_required",
  "finalRationale": "string",
  "transcriptOrCredentialChanges": "string",
  "dateResolved": "ISO-8601"
}
```

---

## 6. `certificationValidations/{certificationValidationId}` — second-model validation

Independent validator-model review of a certification attempt (doc 16: stored in
`certificationValidations`, attached to the attempt and credential when valid).

```jsonc
{
  "certificationValidationId": "string (doc id)",
  "learnerId": "string",
  "certificationId": "string -> certifications",
  "evidencePacketId": "string -> evidencePackets",
  "reviewerModel": "string",              // exact validator model (doc 16)
  "reviewerModelProvider": "string",
  "validatedAt": "ISO-8601",
  "agreesWithPrimary": true,
  "validatorResult": "pass | non_pass | uncertain",
  "validatorRationale": "string",
  "disagreements": [ "string" ],
  "valid": true,                          // attached to credential only when true
  "confidenceLabel": "low | medium | high"
}
```

---

## 7. `standardsEvidence/{standardsEvidenceId}` — advisory candidate evidence

Advisory only. AI never auto-grades or auto-upgrades mastery. Every record
starts `candidate` and preserves the exact transcript span, rationale, and
confidence label (doc 15 Standards Evidence Mapping).

```jsonc
{
  "standardsEvidenceId": "string (doc id)",
  "learnerId": "string",
  "pathway": "concept | product | use-case",
  "sessionId": "string",                  // the lab/session this came from
  "status": "candidate | learner_confirmed | reviewer_verified | rejected | stale",
  "linkedStandard": {
    "family": "AI4K12 | CSTA | ISTE | UNESCO-AI-Competency | NIST-AI-RMF | EU-AI-Act | O*NET | WEF-Skills",
    "id": "string",                       // e.g. CSTA 3A-AP-13
    "label": "string"
  },
  "transcriptSpan": {
    "messageIndexStart": 0,               // exact span into the session transcript
    "messageIndexEnd": 0,
    "charStart": 0,                       // exact char offsets within the span
    "charEnd": 0,
    "excerpt": "verbatim transcript text"
  },
  "rationale": "string",                  // why the AI suggests this standard
  "confidenceLabel": "low | medium | high",
  "advisoryLabel": "evidence_observed | partial_evidence | insufficient_evidence | needs_review | self_reported | verified",
  "reviewerStatus": "candidate | learner_confirmed | reviewer_verified | rejected | stale",
  "reviewerType": "ai | learner | human | panel | null",
  "reviewerId": "string | null",
  "createdAt": "ISO-8601",
  "reviewedAt": "ISO-8601 | null",
  "supersededBy": "string | null"         // set when status becomes stale
}
```

`verified` is only ever set after human/authorized confirmation (doc 15). The AI
engine writes records with `status: "candidate"` exclusively.

A denormalized summary is mirrored into
`learners/{learnerId}.standardsReviews[]` for transcript display.

---

## 8. Transcript events (embedded array, doc-16 event list)

Stored under `ladderProgress.transcriptEvents` (Concepts) and mirrored per
pathway. Event `type` is one of:

```
test_started, test_passed, test_not_passed, test_challenged,
challenge_upheld, challenge_reversed, partial_credit_awarded,
retake_required, credential_awarded
```

```jsonc
{
  "type": "credential_awarded",
  "at": "ISO-8601",
  "pathway": "concept | product | use-case",
  "ladderTier": "string",
  "certificationTier": "string",
  "testDepth": "string",
  "certificationId": "string | null",
  "evidenceStatus": "completed | placed_out | verified | ai_verified | self_reported"
}
```

---

## 9. Resource & mapping collections (doc-15 "Integrations To Build" list)

These hold the database-backed resource/mapping layer. Read-mostly, admin-write.

| Collection | Doc shape (key fields) |
|---|---|
| `rungs/{rungId}` | `ladderTier`, `order`, `title`, `description`, `learningObjectives[]`, `standardsRefs[]` |
| `resources/{resourceId}` | `rungId`, `type`, `title`, `url`, `provider`, `freshnessCheckedAt`, `researchRunId` |
| `videos/{videoId}` | `rungId`, `title`, `youtubeId`, `channel`, `durationSec`, `freshnessCheckedAt` |
| `courses/{courseId}` | `title`, `provider` (aesop/skilljar), `externalId`, `rungRefs[]`, `level` |
| `products/{productId}` | `name`, `category`, `rungRefs[]`, `level`, `vendor` (mirrors theladder-products catalog) |
| `useCases/{useCaseId}` | `name`, `domain`, `rungRefs[]`, `level` (mirrors theladder-use-cases catalog) |
| `assignmentLabs/{labId}` | `rungId`, `prompt`, `rubricRef`, `version` |
| `standardsDefinitions/{standardId}` | `family`, `code`, `label`, `description`, `version` |
| `resourceResearchRuns/{runId}` | `startedAt`, `finishedAt`, `scope`, `itemsUpdated`, `status` |

---

## 10. Request queues (already in production — keep as-is)

Public-create, admin-read. Written today by the page apps with `addDoc`.

| Collection | Producer | localStorage mirror |
|---|---|---|
| `productCourseRequests` | `theladder-products/products-app.js` | `aesop-product-course-requests-v1` |
| `useCaseTrainingRequests` | `theladder-use-cases/use-cases-app.js` | `aesop-use-case-training-requests-v1` |

```jsonc
{
  "learnerId": "string | ''",
  "itemId": "productId | useCaseId",
  "itemName": "string",
  "level": "string",
  "message": "string",
  "createdAt": "ISO-8601",
  "status": "new | reviewed | actioned"   // admin-only writes after create
}
```
