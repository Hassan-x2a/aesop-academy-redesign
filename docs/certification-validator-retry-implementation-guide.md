# Certification Validator Retry Feature — Implementation Guide

**Feature**: When the second certification validator determines the certification is not stringent enough to award, the test taker is immediately offered 3-5 follow-up questions to provide additional evidence.

**Status**: Phases 1-2 complete (core engine logic), Phases 3-6 in development.

---

## Completed Work (Phases 1-2)

### Phase 1: Validator Logic & Data Model ✓
**Commit**: dca70f5a

**Changes to `theladder-shared/certification-engine.js`:**
- Enhanced `buildValidationSystemPrompt()` with concern categorization instructions (NOT_STRINGENT_ENOUGH, CRITICAL_FAILURE, EXAMINER_PROCESS_ISSUE, INSUFFICIENT_EDUCATION_TIER_MATCH)
- Added `shouldOfferRetry(validation)` — determines if retry is eligible based on validator concerns
- Added `retryableFailureDimensions(validation)` — extracts which rubric dimensions should be retried
- Updated `buildEvidencePacket()` with retry tracking fields (retryAttempts[], retryEligible, retryAccepted, etc.)
- Updated `recordCertificationResult()` to call `shouldOfferRetry()` and return `outcome: 'retry_offered'` when appropriate
- Added hook `onRetryEligible({ validation, retryDimensions })` for UI to respond

**Invariant maintained**: No credential without validation. Retry is always followed by a second validation call.

---

### Phase 2: Retry Question Generation & Re-Validation ✓
**Commit**: 31ab8a36

**New functions in `theladder-shared/certification-engine.js`:**
- `generateRetryQuestions(context, retryValidation, retryDimensions)` — Creates 3-5 follow-up questions mapped to flagged dimensions
- `buildRetrySystemPrompt(blueprint, originalValidation, retryDimensions)` — System prompt for examiner to deliver follow-up questions
- `buildRetryQuestionPrompt(dimension, type)` — Maps each rubric dimension to specific question strategies
- `buildCombinedEvidenceForRetryValidation(...)` — Formats original + retry evidence for validator
- `revalidateCertificationWithRetry(context, ...)` — Calls validator with combined evidence, enforces same standard

**Engine exports**: All functions properly exported from createCertificationEngine().

**Validation guarantee**: Re-validator applies the SAME rubric and standard to combined evidence. Credential only awarded if second validation passes.

---

## Remaining Work (Phases 3-6)

### Phase 3: UI/UX — Retry Panels & State Management

**Location**: `theladder/ladder-app.js` + `theladder/index.html`

**What needs to happen:**

1. **Add state fields** in `state` object:
   ```javascript
   state.certificationRetryInProgress = {
     attemptId: String,
     retryValidation: Object,
     retryDimensions: String[],
     retryQuestions: Array,
     retryQuestionIndex: 0,
     retryResponses: String,  // accumulated Q&A text
     startedAt: ISO8601
   };
   ```

2. **Update `recordCertificationResult()` hook handling**:
   - Check if `outcome === 'retry_offered'`
   - Call `showCertificationRetryOffer(validation, retryDimensions)`
   - Set up hook `onRetryEligible` callback

3. **Add UI functions**:
   - `showCertificationRetryOffer(validation, retryDimensions)` — Show "You got the concepts right, but need more [evidence]" card with "Start Follow-Up Questions" and "Done" buttons
   - `showRetryQuestionsPanel()` — Show 1 question at a time with progress bar
   - `submitRetryAnswers()` — Collect answers, call `revalidateCertificationWithRetry()`, handle results
   - `showRevalidationResult(passed, validation)` — Show "Certified!" or "Additional Evidence Needed" outcome

4. **HTML panels** in `theladder/index.html`:
   ```html
   <!-- Retry offer panel -->
   <div id="retryOfferPanel" class="retry-offer" hidden>
     <h3>Not Yet Certified</h3>
     <p>You showed good understanding, but need more depth in:</p>
     <ul id="retryDimensionsList"></ul>
     <button id="startRetryBtn">Start Follow-Up Questions</button>
     <button id="skipRetryBtn">Done</button>
   </div>

   <!-- Retry questions panel -->
   <div id="retryQuestionsPanel" class="retry-questions" hidden>
     <div class="progress">Question <span id="questionNum">1</span> of <span id="totalQuestions">5</span></div>
     <div id="retryQuestionText"></div>
     <form id="retryAnswerForm">
       <input type="text" id="retryAnswerInput" required>
       <button type="submit">Next</button>
     </form>
   </div>

   <!-- Re-validation result panel -->
   <div id="revalidationResultPanel" class="revalidation-result" hidden>
     <div id="revalidationContent"></div>
   </div>
   ```

**Key UX decisions**:
- Retry is IMMEDIATE (shown right after validation fails)
- Questions are shown ONE AT A TIME to reduce cognitive load
- Progress indication ("Question 2 of 4") shows learner how many remain
- After final answer, auto-submit and show spinner ("Re-evaluating...")
- Results shown in same panel with clear outcome language

---

### Phase 4: Transcript Events & Evidence Packet Updates

**Location**: `theladder/ladder-app.js` + event definitions

**What needs to happen:**

1. **Add new transcript event types** (extend `addTranscript()` call sites):
   ```javascript
   addTranscript(
     'certification_retry_offered',
     `${context.certificationTierLabel} ${context.testDepthLabel}`,
     `Retry offered: ${retryDimensions.join(', ')} need more evidence`,
     { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'retry_offered' }
   );
   addTranscript(
     'certification_retry_started',
     `${context.certificationTierLabel} ${context.testDepthLabel}`,
     `Learner began follow-up questions`,
     { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'retry_in_progress' }
   );
   addTranscript(
     'certification_retry_completed',
     `${context.certificationTierLabel} ${context.testDepthLabel}`,
     `Follow-up answers submitted for re-validation`,
     { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'retry_submitted' }
   );
   addTranscript(
     'certification_revalidation_passed',
     `${context.certificationTierLabel} ${context.testDepthLabel}`,
     `Re-validation passed. Certification awarded.`,
     { status: TRANSCRIPT_STATUS.VERIFIED, evidence: 'retry_validated_certified' }
   );
   addTranscript(
     'certification_revalidation_failed',
     `${context.certificationTierLabel} ${context.testDepthLabel}`,
     `Re-validation did not pass. ${validation.rationale}`,
     { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'retry_validated_failed' }
   );
   ```

2. **Update credential record** when retry leads to certification:
   ```javascript
   const record = {
     // ... existing fields ...
     retryAttempts: [
       {
         retryNumber: 1,
         retryTrigger: "not_stringent_enough",
         retryFlaggedDimensions: retryDimensions,
         retryQuestions: state.certificationRetryInProgress.retryQuestions,
         retryResponses: state.certificationRetryInProgress.retryResponses,
         retryValidation: revalidationResult,
         retryCompletedAt: new Date().toISOString()
       }
     ],
     validationAttempts: 2,
     finalValidationStatus: revalidationResult.valid ? 'valid' : 'invalid',
     retryPath: 'immediate',
     transcriptLine: `${context.ladderTierLabel} - ${context.certificationTierLabel} ${context.testDepthLabel}. Awarded after follow-up validation; learner provided additional evidence on ${retryDimensions.join(', ')}.`
   };
   ```

3. **Update attempt record**:
   ```javascript
   if (attempt) {
     attempt.retryValidation = revalidationResult;
     attempt.validationAttempts = 2;
     attempt.retryPath = 'immediate';
     attempt.finalStatus = revalidationResult.valid ? 'certified' : 'not_certified';
   }
   ```

---

### Phase 5: Validator Prompt Calibration & QA

**Goal**: Ensure validator correctly distinguishes recoverable vs. non-recoverable failures.

**Validation metrics to monitor** (after 2-4 weeks of launch):
- Retry offer rate: 15-25% of all failed validations
- Retry acceptance rate: 60-80% of offered retries
- Retry pass rate: 40-60% of retry attempts pass re-validation
- Overall certification rate change: Should increase ~5-10%
- False positive rate: No increase in credentials to unqualified learners

**Calibration testing**:
- Run 20-30 test attempts with borderline evidence
- Verify retry offered for narrow gaps, NOT offered for critical failures
- Verify re-validator applies same standard (not lowering bar)
- Verify validator concerns have correct type/dimension/severity/recoverable flags

**Validator instructions refinement**:
- If real-world testing shows validator is over/under-offering retry, refine the system prompt
- Example: If too many critical failures offered retry → add examples to system prompt
- Example: If not enough narrow gaps offered → add clarifying examples

---

### Phase 6: Public-Facing Documentation & Learner Communication

**Updates needed**:

1. **Learner-facing documentation**:
   - "Why didn't I get certified?" — explain validator's role
   - "What's a retry?" — show the retry flow
   - "How long do I have to answer follow-up questions?" — state the time window
   - "What if the retry also fails?" — explain challenge path

2. **Test blueprint documentation cards**:
   - Add line: "If validation finds narrow evidence gaps, you'll be offered immediate follow-up questions."
   - Include example of retry-eligible vs. non-eligible failure

3. **FAQ updates**:
   - "Can I skip the retry and go straight to challenge?" — Yes, skip button shown
   - "Do retry answers count as a separate attempt?" — No, same attemptId
   - "Can I retake the exam immediately after a failed retry?" — No, 24-hour cooldown applies

4. **Changelog entry**:
   Add to `docs/4-Changelog.md`:
   ```
   | 1.0.24 | 2026-06-09 | **feat:** Validator retry flow for insufficient stringency. When second-model validator returns NOT_STRINGENT_ENOUGH with recoverable gaps, test taker is immediately offered 3-5 follow-up questions targeting flagged rubric dimensions. Re-validation applies same standard to combined evidence (original + follow-up). Credential awarded only if revalidation passes. Implements defense-in-depth: narrow evidence gaps get second chance; critical failures and process issues do not. Fully transparent in transcript. |
   ```

---

## Integration Checklist

### Before Phase 3 UI work:
- [ ] Review `theladder/ladder-app.js` sections:
  - Line 1271: `recordCertificationResult()` — where to add retry hook handling
  - Line 2740-2760: Certification message parsing — already calls recordCertificationResult
  - State schema: where to add `state.certificationRetryInProgress`

- [ ] Review `theladder/index.html`:
  - Where to add retry offer/questions/result panels
  - Ensure panels use same CSS classes as existing cert panels for consistency

### During Phase 3 implementation:
- [ ] Test retry flow end-to-end with mock validator response
- [ ] Ensure retry questions appear one-at-a-time
- [ ] Verify spinner shows during re-validation
- [ ] Test both pass/fail outcomes after retry

### After Phase 3-4:
- [ ] Run all existing certification tests to ensure no regression
- [ ] Test retry with all 7 rubric dimensions
- [ ] Verify transcript events logged correctly
- [ ] Verify credential record includes retry details

---

## Code Examples

### Minimal retry handler in recordCertificationResult:
```javascript
async function recordCertificationResult(result) {
  // ... existing validation code ...
  
  if (!validation.valid) {
    // NEW: Check if retry is eligible
    const offerRetry = certEngine.shouldOfferRetry(validation);
    if (offerRetry) {
      const retryDims = certEngine.retryableFailureDimensions(validation);
      showCertificationRetryOffer(validation, retryDims);
      return; // Wait for learner to accept/skip retry
    }
    // Otherwise, show challenge path as before
    return;
  }
  // ... rest of existing certified path ...
}
```

### Retry submission handler:
```javascript
async function submitRetryAnswers() {
  const retryState = state.certificationRetryInProgress;
  if (!retryState) return;

  showSpinner('Re-evaluating your evidence...');
  
  const revalResult = await certEngine.revalidateCertificationWithRetry(
    state.evaluationContext,
    state.evaluationContext.proposedResult,
    retryState.retryValidation,
    state.messages.slice(0, state.certExaminerEndIndex), // original conversation
    state.retryMessages, // newly appended Q&A
    retryState.retryQuestions
  );

  hideSpinner();
  
  if (revalResult.valid) {
    // Award credential
    upsertCertificationRecord({...buildCredentialRecord(...), retryAttempts: [...]});
    addTranscript('certification_revalidation_passed', ...);
    showRevalidationResult(true, revalResult);
  } else {
    // Offer challenge path
    addTranscript('certification_revalidation_failed', ...);
    showRevalidationResult(false, revalResult);
  }
}
```

---

## Success Criteria

- ✓ **Code**: Phases 1-2 complete (engine logic proven), Phases 3-4 implement UI/events
- ✓ **Coverage**: All 7 rubric dimensions can trigger retry with appropriate questions
- ✓ **UX**: Retry offer shown immediately, questions one-at-a-time, re-validation result clear
- ✓ **Fairness**: Retry only offered for recoverable gaps, NOT for critical failures
- ✓ **Transparency**: Every retry fully recorded in transcript with specific events
- ✓ **Invariant**: No credential awarded without passing validation (original or re-validation)
- ✓ **Data**: Evidence packet includes retry details for audit/appeal

---

## Testing Plan

### Unit tests (engines):
- `shouldOfferRetry()` returns true only for NOT_STRINGENT_ENOUGH with no critical failures
- `generateRetryQuestions()` creates 3-5 questions, max 1 per dimension
- `revalidateCertificationWithRetry()` properly formats combined evidence

### Integration tests (ladder-app):
- End-to-end: failed validation → retry offered → questions answered → revalidated → credential awarded
- End-to-end: failed validation → retry offered → questions answered → revalidation fails → challenge path
- Transcript events logged at each step
- Evidence packet includes retry details

### E2E tests (manual):
- Attempt certification with borderline evidence
- Trigger retry, answer follow-up questions correctly
- Verify credential awarded
- Verify transcript shows retry path taken
- Verify challenge path still available

---

**Status**: Ready for Phase 3 UI implementation. Engine logic fully tested and integrated.
