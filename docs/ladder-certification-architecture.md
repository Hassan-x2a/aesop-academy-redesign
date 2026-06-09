# The Ladder Certification Architecture

## Core Principle

The Ladder certification system is test-out first.

A learner does not need to take an Aesop course to earn credit for a Ladder tier, an education-tier assessment, or a certification path. Courses, videos, labs, and guided conversations are preparation and remediation resources. The credential is earned by demonstrating competence through a dynamic AI-delivered test, an evidence artifact, and a reviewable transcript.

## Defensibility Standard

Every certification decision must be explainable, documented, reviewable, and readable by a non-technical person.

An AI-awarded certification must also pass independent validation by a second model before it is stored as a credential. The first model may propose a certification result, but the validator must confirm both sides of the conversation: the learner supplied sufficient relevant evidence, and the examiner followed a fair, scoped, evidence-seeking process aligned to the selected blueprint.

The standard is:

```text
No hidden certification decisions.
No undocumented rubric judgments.
No credential without evidence.
No non-pass without a clear explanation and challenge path.
```

Aesop must be able to defend:

- what the learner was tested on
- why that test was appropriate for the certification tier
- which standards the test mapped to
- what evidence the learner produced
- how the AI evaluated the evidence
- why the learner passed or did not pass
- what model, prompt, rubric, and blueprint version were used
- whether a human review was required or available
- how a learner challenged the result
- whether the final credential record changed after challenge

The learner-facing explanation must be plain enough for a parent, employer, school administrator, or learner to understand. The internal record must be detailed enough for audit, appeal, recalibration, or legal review.

## Identity Assurance and Proctoring

Certification validity has two separate questions:

1. Did the learner demonstrate the skill?
2. Do we know the person taking the test is the person named on the credential?

The Ladder records identity assurance as a credential attribute, not a vague "verified" flag. Initial assurance tracks:

| Track | Meaning | Product Status |
|-------|---------|----------------|
| self_attested | Learner claims the work. No account or identity proof beyond the active browser session. | Active |
| account_bound | Attempt is bound to AESOP learner ID, saved transcript record, and account/session signals. | Active default |
| identity_attested | Learner signs an identity statement before the certification attempt. | Active |
| proctored_verified | Adult formal credential path with ID/liveness verification plus automated, live remote, recorded review, or institutional proctoring. | Scaffolded, not yet active |

Adult and upper education tiers require an account before the learner can start certification or readiness-check sessions. Elementary, Middle School, and High School tiers can continue without Firebase authentication. Young Adult, College / Technical, Workforce, and Leadership tiers require:

- Firebase email/password account
- 18+ adult access attestation
- account binding on the learner record
- credential evidence that records whether the attempt was account-required and account-bound

Proctored verified should not be claimed until the provider/proctor workflow exists. The intended modes are:

- automated proctoring: ID/liveness plus camera/session signals and flagged review
- live remote proctor: trained proctor checks ID and watches the session
- recorded review: session recording reviewed when flagged or sampled
- institutional proctor: school, employer, library, workforce center, or testing site verifies the person and environment

The credential record should store identity assurance separately from AI examiner validation:

```json
{
  "identityAssurance": {
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
}
```

For adults, formal certification can later require `proctored_verified`. Normal learning and internal progress should remain lighter-weight.

## Certification Matrix

Every test exists at the intersection of:

- education / certification tier
- Ladder tier
- certification depth

The matrix looks like this:

```text
education/certification tier x Ladder tier x certification depth = test blueprint
```

Example:

```text
High School x Tier 10 Responsible AI, Law, and Governance x Expert Challenge
```

That blueprint produces a dynamic assessment aligned to the standards-backed certification tier, the Ladder tier, and the required credential depth.

## Education / Certification Tiers

Education tiers are certification tiers. They are not learner goals, job roles, or interests. They are standards-backed credential bands that answer: "What level of educational or employment standard is this test meant to satisfy?"

They should be configurable data, not hard-coded copy.

Initial architecture tiers:

| ID | Label | Primary Standards |
|----|-------|-------------------|
| elementary | Elementary | AI4K12, ISTE, UNESCO AI Competency |
| middle-school | Middle School | AI4K12, ISTE, CSTA, UNESCO AI Competency |
| high-school | High School | AI4K12, ISTE, CSTA, UNESCO AI Competency |
| young-adult | Young Adult / Early Career | ISTE, CSTA, UNESCO AI Competency, WEF Skills |
| college | College / Technical Program | CSTA, O*NET, WEF Skills, NIST AI RMF |
| workforce | Workforce / Professional | O*NET, WEF Skills, NIST AI RMF, EU AI Act |
| leadership | Leadership / Enterprise | O*NET, WEF Skills, NIST AI RMF, EU AI Act, UNESCO AI Competency |

These tiers control language level, scenario complexity, rubric expectations, standards mappings, and what kind of evidence is appropriate. A learner may choose the tier they want to certify against, and the placement assessment may recommend a tier, but the tier is part of the credential record.

## Ladder Tiers

All 15 Ladder tiers must support certification testing:

1. AI Orientation
2. Prompting and Chatbot Fluency
3. Research, Study, and Information Literacy
4. Productivity and Professional Workflows
5. Multimodal, Media, and Content Creation
6. Function-Specific AI Use
7. No-Code, Automation, and Team Systems
8. APIs, Structured Outputs, and AI App Basics
9. Data, Retrieval, and Knowledge Systems
10. Responsible AI, Law, and Governance
11. Evaluation, Reliability, Deployment, and Operations
12. Security, Red Teaming, and Misuse
13. Leadership, Policy, and Organizational Adoption
14. AI Concepts, Model Families, and Research Literacy
15. Product, Market, Adoption, and Frontier Planning

## Certification Depths

Each education/certification-tier and Ladder-tier pair exposes three certification depths. Placement is handled by the Ladder assessment, not by the certification depth selector. Placed-out credit can be recorded by the assessment or by a passed certification attempt, but the learner-facing certification path should use these three depth labels.

| Depth | Purpose | Outcome |
|-------|---------|---------|
| certification | Confirms competent, defensible understanding and use of the selected Ladder tier at the selected education/certification tier | verified or AI-verified certification evidence |
| expert-challenge | Tests advanced transfer, edge-case reasoning, tradeoff judgment, and independent defense beyond baseline certification | expert-level evidence for advanced credit |
| mastery-challenge | Tests original synthesis, portfolio-grade evidence, standards mapping, and leadership-level defense | mastery evidence and portfolio-quality artifact |

## Depth Differences

The three depths must not be cosmetic labels. They change what the learner is asked to do, how much evidence is required, and how cautious the system should be before recording a pass.

| Depth | Evidence Standard | AI Behavior | Review Expectation |
|-------|-------------------|-------------|--------------------|
| certification | Clear competency evidence across vocabulary, concept, application, risk, and reasoning | Uses realistic but bounded scenarios; checks that the learner can apply the tier responsibly | AI review may be enough for internal Aesop progress, but the record remains challengeable |
| expert-challenge | Strong evidence of transfer to unfamiliar contexts, edge cases, and tradeoff decisions | Increases ambiguity, asks harder follow-ups, and requires the learner to defend choices under pressure | Human review is recommended for public, employer, or high-stakes claims |
| mastery-challenge | Portfolio-quality artifact or evidence statement, original synthesis, standards mapping, and leadership-level explanation | Requires the learner to connect multiple concepts, anticipate failure modes, and justify decisions to multiple audiences | Human or panel review is recommended before external credential claims |

Depth also affects pass thresholds:

| Depth | Minimum Interpretation |
|-------|------------------------|
| certification | The learner can use the tier safely and competently with enough evidence to justify certification credit. |
| expert-challenge | The learner can generalize the tier to new situations and defend decisions when challenged. |
| mastery-challenge | The learner can synthesize, lead, teach, or govern the tier with portfolio-quality evidence. |

## Public Credential Documentation

Each test blueprint must have a public-facing documentation card before it can be used for certification.

That card should include:

- test name
- education/certification tier
- Ladder tier
- certification depth
- intended learner level
- what the test measures
- standards frameworks mapped
- evidence required
- pass threshold
- critical-failure rules
- retake and challenge policy
- whether the decision is AI-reviewed, human-reviewed, or both
- last review date
- blueprint version

The card should avoid technical jargon where possible. If the certification is meant to be trusted outside Aesop, the public explanation must be strong enough to show an employer or educator why the credential means something.

## Test Delivery Flow

```text
learner selects education/certification tier and Ladder tier
  -> system loads test blueprint
  -> AI examiner generates dynamic scenario and tasks
  -> learner answers in a guided assessment conversation
  -> learner produces or describes required evidence artifact
  -> AI assessor scores against rubric
  -> AI returns pass/fail with reasons
  -> if failed, learner may challenge the decision
  -> challenge assessor reviews failure rationale plus learner challenge
  -> final decision is stored in transcript
```

The AI should not merely ask quiz questions. Every test must include:

- vocabulary check
- scenario judgment
- applied task
- risk/limitation question
- artifact or evidence statement
- defense of reasoning

## AI Roles

The architecture separates AI roles so the same prompt is not both teaching and grading without structure.

| Role | Responsibility |
|------|----------------|
| examiner | Delivers the test, asks adaptive follow-ups, prevents drift |
| assessor | Scores the completed attempt against the rubric |
| explainer | Explains why the learner did or did not pass |
| challenge assessor | Reviews learner challenge after a failed result |
| remediation guide | Recommends courses, rungs, videos, and practice labs after non-pass |

The first production implementation may use one model call path, but data should preserve these logical roles.

## Rubric Requirements

Every certification test needs a written rubric. The AI cannot invent the grading criteria at runtime.

Minimum rubric dimensions:

| Dimension | What It Measures |
|-----------|------------------|
| conceptual accuracy | Does the learner understand the core ideas? |
| vocabulary fluency | Can the learner use the required terms correctly? |
| applied judgment | Can the learner apply the idea to a realistic scenario? |
| evidence quality | Did the learner produce enough concrete evidence? |
| reasoning defense | Can the learner explain and defend the decision? |
| risk awareness | Did the learner identify limitations, harms, or failure modes? |
| standards alignment | Did the response satisfy the mapped standard expectations? |

Each rubric dimension must define:

- what passing looks like
- what partial evidence looks like
- what non-passing evidence looks like
- examples of acceptable evidence
- examples of insufficient evidence
- critical-failure conditions

## Depth-Specific Rubric Expectations

The same rubric dimensions apply at every depth, but the score interpretation changes by depth.

### Certification

Certification is the baseline credential decision. It should answer: "Can this learner use this Ladder tier competently, safely, and explainably at the selected education/certification tier?"

Certification-level passing evidence requires:

- accurate core concepts
- correct use of required vocabulary
- a realistic application example
- basic risk and limitation awareness
- enough reasoning to show the learner is not guessing
- no critical-failure flags

Certification does not require a polished portfolio artifact. It does require enough evidence for the transcript to explain what was demonstrated.

### Expert Challenge

Expert Challenge is an advanced transfer decision. It should answer: "Can this learner handle unfamiliar situations, ambiguity, and challenge beyond the baseline?"

Expert-level passing evidence requires everything in Certification plus:

- transfer to a new or unfamiliar scenario
- edge-case reasoning
- clear tradeoff analysis
- defense under follow-up questions
- correction or refinement when challenged
- stronger evidence quality than baseline certification

Expert Challenge should not pass a learner who only repeats definitions or performs a familiar pattern. The learner must show adaptable judgment.

### Mastery Challenge

Mastery Challenge is the highest Ladder depth. It should answer: "Can this learner synthesize, lead, teach, govern, or produce portfolio-quality evidence for this tier?"

Mastery-level passing evidence requires everything in Expert Challenge plus:

- original synthesis across multiple concepts
- a portfolio-quality artifact or evidence statement
- explicit standards mapping
- leadership, governance, teaching, or implementation perspective where appropriate
- anticipation of failure modes and second-order effects
- a defense that would be understandable to a reviewer outside the conversation

Mastery Challenge should normally trigger human or panel review before the result is used as an external credential claim.

## Evidence Packet

Every test attempt should produce an evidence packet.

The evidence packet is the defensible record of the certification decision. It should be readable in the transcript and exportable for review.

Minimum packet fields:

- learner ID
- certification tier
- Ladder tier
- certification depth
- test blueprint version
- rubric version
- AI model name and version
- system prompt version
- date and time
- learner responses
- generated scenario
- required artifact or evidence statement
- rubric scores
- depth-specific expectations assessed
- standards mappings assessed
- standards mappings satisfied
- critical-failure checks
- pass/non-pass result
- AI rationale
- remediation recommendations
- challenge status
- final decision

The packet should not expose private model internals, but it must preserve enough information to reconstruct the basis for the decision.

## Pass/Fail Rules

The AI may determine whether the learner passed, but the decision must be auditable.

A passing result requires:

- minimum rubric score
- no critical-failure flags
- sufficient evidence for the education tier
- standards coverage for the test blueprint
- reasoning defense, not just correct answers
- sufficient evidence for the selected certification depth

Depth-specific pass rules:

| Depth | Pass Rule |
|-------|-----------|
| certification | The learner meets baseline competency across the rubric and can apply the tier responsibly. |
| expert-challenge | The learner exceeds baseline competency and demonstrates transfer, ambiguity handling, and defense under challenge. |
| mastery-challenge | The learner demonstrates synthesis, portfolio-quality evidence, standards mapping, and leadership-level defense. |

Critical-failure examples:

- unsafe AI use recommendation
- privacy or sensitive data mishandling
- fabricated citation defended as real
- inability to explain own artifact
- governance or legal misconception in a high-stakes tier
- prompt injection/security advice that creates harm

## AI Decision Controls

AI assessment must be constrained.

The assessor prompt must require:

- scoring only against the written rubric
- citing learner evidence for each score
- separating missing evidence from incorrect evidence
- flagging uncertainty instead of guessing
- applying critical-failure rules before awarding a pass
- producing learner-facing rationale
- producing internal audit rationale
- recommending human review when confidence is low or stakes are high

The system should store:

- model identifier
- model provider
- prompt version
- temperature or decoding settings when available
- rubric version
- blueprint version
- scoring schema version

For high-stakes certification tiers, the AI should not be the only possible reviewer. The architecture must support human review, sampled review, and escalation review even if the first MVP uses AI-only scoring.

## Human Review Triggers

Human review should be required or strongly recommended when:

- the learner challenges a non-pass result
- the AI confidence is below a defined threshold
- the result is near the pass threshold
- the attempted depth is Expert Challenge and the credential will be shown externally
- the attempted depth is Mastery Challenge
- a critical-failure flag is disputed
- the credential is leadership, workforce, legal, governance, security, or high-impact
- the learner requests a formal review
- the result will be used for an employer, school, or public credential claim
- the AI detects possible cheating, impersonation, or unsupported artifact claims
- the test blueprint is newly launched or recently changed

The first implementation can mark these as "review recommended" if no human review workflow exists yet, but the data model must preserve the trigger.

## Challenge / Appeal Flow

When a learner does not pass, the AI must explain why before the learner can challenge.

Non-pass result includes:

- rubric scores
- missing competencies
- failed standards mappings
- examples from the learner's own answers
- what would have changed the decision
- recommended remediation rungs/courses

The learner may then choose:

1. Accept result and study recommended material.
2. Challenge the decision with clarification.
3. Submit additional evidence.
4. Retake after a cooldown or remediation step.

Challenge review:

```text
failed attempt + AI rationale + learner challenge + additional evidence
  -> challenge assessor reviews only the record
  -> decision: upheld, reversed, partially credited, or retake required
  -> challenge record appended to transcript
```

Challenge outcomes:

| Outcome | Meaning |
|---------|---------|
| upheld | The non-pass decision stands |
| reversed | The learner passes based on challenge review |
| partial_credit | Some competencies are granted; remaining competencies assigned |
| retake_required | The challenge does not resolve the gap, but retake is allowed |

## Challenge Documentation

Every challenge must produce a challenge packet:

- original result
- original AI rationale
- learner challenge text
- additional evidence submitted
- challenge reviewer type: AI, human, or panel
- challenge rubric
- final decision
- final rationale
- changes to transcript or credential status
- date resolved

The learner should see a readable explanation of the challenge result. The internal record should preserve the complete review basis.

## Calibration And Quality Control

Certification tests require ongoing calibration. Without calibration, the system cannot defend consistency.

Required quality controls:

- SME review of each test blueprint before launch
- sample test attempts reviewed by humans
- periodic audit of pass/non-pass decisions
- annual standards mapping review
- versioned cut scores and pass thresholds
- monitoring for unfair pass-rate differences across learner groups
- review of challenge reversal rates
- review of AI rationale quality
- retirement or revision of weak blueprints
- documented change log for every rubric or blueprint update

If a blueprint changes materially, old attempts should remain linked to the old blueprint version. The system may recommend retesting, but it should not silently rewrite old credential records.

## Data Model

### education_tiers

```json
{
  "id": "high-school",
  "label": "High School",
  "readingLevel": "grade-9-12",
  "scenarioComplexity": "moderate",
  "primaryStandards": ["AI4K12", "ISTE", "CSTA", "UNESCO AI Competency"]
}
```

### test_blueprints

```json
{
  "id": "high-school:tier-10:expert-challenge",
  "educationTierId": "high-school",
  "ladderTierId": "tier-10",
  "certificationDepth": "expert-challenge",
  "title": "Responsible AI, Law, and Governance Expert Challenge",
  "requiredSections": ["vocabulary", "scenario", "applied_task", "risk", "artifact", "defense"],
  "depthExpectations": {
    "evidenceStandard": "advanced transfer, edge-case reasoning, and tradeoff defense",
    "reviewExpectation": "human review recommended for external claims"
  },
  "standards": [
    { "framework": "AI4K12", "code": "impact", "weight": 0.2 },
    { "framework": "ISTE", "code": "knowledge-constructor", "weight": 0.2 },
    { "framework": "NIST AI RMF", "code": "GOVERN", "weight": 0.3 },
    { "framework": "EU AI Act", "code": "risk-management", "weight": 0.3 }
  ],
  "rubricId": "rubric:tier-10:expert-challenge"
}
```

### test_attempts

```json
{
  "id": "attempt_...",
  "learnerId": "AESOP-7K3X",
  "blueprintId": "high-school:tier-10:expert-challenge",
  "certificationDepth": "expert-challenge",
  "status": "passed",
  "score": 84,
  "evidenceStatus": "ai_verified",
  "reviewMode": "ai_only",
  "humanReviewTrigger": false,
  "startedAt": "2026-06-08T00:00:00Z",
  "completedAt": "2026-06-08T00:25:00Z",
  "model": {
    "provider": "anthropic",
    "name": "claude-haiku-4-5-20251001",
    "promptVersion": "examiner-v1",
    "rubricVersion": "rubric:tier-10:expert-challenge:v1",
    "blueprintVersion": "high-school:tier-10:expert-challenge:v1"
  },
  "criticalFailures": [],
  "rubricScores": {},
  "standardsEvidence": {},
  "artifact": {},
  "aiRationale": "..."
}
```

### challenge_records

```json
{
  "id": "challenge_...",
  "attemptId": "attempt_...",
  "learnerId": "AESOP-7K3X",
  "challengeText": "...",
  "additionalEvidence": [],
  "decision": "partial_credit",
  "reviewerType": "ai",
  "reviewRationale": "...",
  "createdAt": "2026-06-08T00:30:00Z",
  "resolvedAt": "2026-06-08T00:35:00Z"
}
```

### transcript_events

Certification testing adds transcript events:

- `test_started`
- `test_passed`
- `test_not_passed`
- `test_challenged`
- `challenge_upheld`
- `challenge_reversed`
- `partial_credit_awarded`
- `retake_required`
- `credential_awarded`

Evidence statuses:

- `completed`
- `placed_out`
- `verified`
- `ai_verified`
- `self_reported`
- `challenged`
- `reversed_on_challenge`

## Certification Paths

Certification paths are assembled from passed tests, not course completion.

Examples:

| Path | Required Evidence |
|------|-------------------|
| AI Foundations | education-tier appropriate tests across Ladder tiers 1-3 |
| AI Workplace Practitioner | tests across tiers 3, 4, 6, and selected applied labs |
| AI Builder | tests across tiers 8, 9, 11, and a build artifact |
| AI Governance and Risk | tests across tiers 10, 13, and standards-mapped artifacts |
| AI Security and Red Teaming | tests across tiers 10, 12, and adversarial reasoning artifacts |
| AI Agent Builder | tests across tiers 8, 11, 12, and an agent design artifact |
| AI Leadership and Strategy | tests across tiers 10, 13, 15, and a strategy artifact |

The existing 10-level certification page can remain as a progress/rank display, but the Ladder certification layer should become evidence-based and path-based.

## Standards Mapping

Every test blueprint must map to standards at the assessment level and evidence level.

Standards families:

- AI4K12
- CSTA
- ISTE
- UNESCO AI Competency
- NIST AI RMF
- EU AI Act
- O*NET
- World Economic Forum Skills

The transcript should show:

- which standards were assessed
- which standards were passed
- which standards need more evidence
- what artifact or response supports each mapping
- which rubric version and blueprint version were used
- whether the decision was AI-only, AI-reviewed, human-reviewed, or challenged

## Learner-Facing Result Language

Result language must be readable and specific.

Passing result should say:

- what the learner demonstrated
- which evidence mattered most
- what standards were satisfied
- what credential or tier credit was awarded
- what the next recommended test or rung is

Non-pass result should say:

- that the learner has not yet met the standard
- which competencies were missing or weak
- what evidence was insufficient
- whether any critical-failure rule applied
- what to study or practice next
- how to challenge the result
- when retake is available

The system should avoid vague language such as "not good enough" or "failed by AI." It should say exactly what standard was not met and what evidence would change the decision.

## Course Relationship

Courses are optional.

If a learner passes the test:

- grant certification/tier evidence
- recommend next tier or the next certification depth
- do not require the course

If a learner does not pass:

- explain why
- allow challenge
- assign specific Ladder rungs
- recommend Aesop courses, Anthropic Skilljar courses, videos, and labs as remediation

## UI Requirements

The Ladder page needs:

- education tier selector
- certification path selector
- certification depth selector with Certification, Expert Challenge, and Mastery Challenge
- "Start certification" action for active Ladder tier and selected depth
- certification exams delivered inside the same Guided Conversation window, with a visible exam-mode state
- return-to-training control that restores the learner's guided conversation context
- pass/fail result panel
- AI rationale panel
- challenge form after non-pass
- assigned remediation rungs after non-pass
- transcript entry for every attempt

The certification page needs:

- current legacy level display, if retained
- Ladder certification paths
- path progress by test evidence
- education tier coverage
- standards coverage
- challenge history
- shareable transcript/certification link

## Guardrails

- The AI must not silently fail a learner. It must explain the decision.
- The AI must not award credit without evidence.
- The AI must not require course completion as a prerequisite to testing.
- The AI must distinguish self-reported, AI-verified, verified, placed-out, and challenged evidence.
- The AI must preserve enough attempt data for later audit.
- The system must be able to re-score or review attempts if standards change.
- The system must preserve the versioned basis for every decision.
- The system must support appeal and correction.
- The system must identify decisions that need human review.
- The system must not present AI-only certification as externally verified by humans.

## Implementation Phases

### Phase 1 - Architecture and static data

- Add education tiers.
- Add certification depths.
- Add certification paths.
- Add blueprint schema.
- Add transcript event types.
- Update certification page copy to explain evidence-based Ladder credentials.

### Phase 2 - Ladder test UI

- Add test panel to active Ladder tier.
- Let learner choose education tier and certification depth.
- Start AI-delivered test.
- Store attempt transcript.
- Return pass/fail with rationale.

### Phase 3 - Challenge flow

- Add challenge form after non-pass.
- Add challenge assessor prompt.
- Store challenge records.
- Reflect reversed/partial/upheld outcomes in transcript.

### Phase 4 - Standards and course mapping

- Connect Aesop course REST API.
- Map courses to remediation rungs and standards.
- Add Anthropic Skilljar references.
- Add YouTube resource search and reviewed-resource storage.

### Phase 5 - Credential publication

- Update certification page.
- Add shareable certification/transcript link.
- Add standards coverage export.
- Add employer/education audience views.
