/**
 * certification-engine.js — Catalog-agnostic certification engine.
 *
 * Generalized from theladder/ladder-app.js (the Concepts ladder), where the
 * examiner prompt, rubric evaluation, second-model validator, challenge flow,
 * and evidence-packet building currently live inline against LADDER_TIERS.
 * This module lifts that logic into a reusable engine that any pathway
 * (tiers, products, use cases) can drive against its own catalog item.
 *
 * It preserves the doc-16 (16-Ladder-Certification-Architecture.md) guarantees:
 *
 *   - An AI examiner PROPOSES a result (pass / non-pass, score, rationale).
 *   - An INDEPENDENT second-model validator must confirm BOTH sides before any
 *     credential is recorded:
 *       * learner side  — sufficient relevant evidence for the selected tier/depth
 *       * examiner side — fair, scoped, on-blueprint, did not certify too fast,
 *                         did not ignore contradictions, did not invent evidence
 *   - No credential is recorded without validation.
 *   - A failed validation is LOGGED (as reviewed) but NOT credentialed, and the
 *     transcript distinguishes failed validation from an earned credential.
 *   - Every attempt produces an evidence packet with the doc-16 fields.
 *
 * Signal contracts (identical to the Concepts ladder):
 *   examiner result :  <!--LADDER_CERTIFICATION_RESULT:{...}-->
 *   validator result:  <!--LADDER_CERTIFICATION_VALIDATION:{...}-->
 *
 * The validation call is routed through the AESOP proxy: /aesop-api/proxy.php
 *
 * ---------------------------------------------------------------------------
 * PUBLIC API
 * ---------------------------------------------------------------------------
 *
 * createCertificationEngine(options) -> engine
 *   options:
 *     proxyUrl        string?  Defaults to '/aesop-api/proxy.php'.
 *     validatorModel  string?  Independent validator model id.
 *                              Defaults to CERTIFICATION_VALIDATOR_MODEL.
 *     rubricDimensions string[]?  Defaults to the 7 doc-16 dimensions.
 *     fetchImpl       fn?      Override fetch (for tests / non-browser hosts).
 *
 * Regex exports on the engine:
 *   engine.CERTIFICATION_RESULT_REGEX
 *   engine.CERTIFICATION_VALIDATION_REGEX
 *
 * engine.buildExaminerSystemPrompt(blueprint)
 *   Returns the examiner system prompt parameterized by a blueprint:
 *   {
 *     itemLabel,            // e.g. "Tier 10 - Responsible AI" / product / use case
 *     educationTierLabel,   // teaching/standards level
 *     certificationTierLabel,
 *     standards,            // standards family string
 *     depthLabel, depthOutcome, depthEvidence, depthPassingStandard, depthReview,
 *     languageLabel         // optional, default 'English'
 *   }
 *   The prompt discloses the 7 rubric dimensions to the learner (doc-16),
 *   collects evidence first, forbids one-shot credentials, and requires the
 *   exact rubric block + result marker on a final determination.
 *
 * engine.rubricDisclosure()
 *   The plain-language "BEFORE YOU BEGIN" rubric text shown to learners.
 *
 * engine.parseExaminerResponse(rawText)
 *   -> { certificationResult, rubricDimensions, visibleText }
 *   Strips the result marker, parses the JSON result, and extracts the
 *   7-dimension rubric evaluation from the prose.
 *
 * engine.parseRubricEvaluation(rawText) -> [{ dimension, status, reason }]
 *   The 7-dimension rubric evaluator (prose -> structured).
 *
 * engine.buildValidationSystemPrompt() / engine.buildValidationMessages(...)
 *   The independent validator's prompt + message builders.
 *
 * engine.parseValidationResponse(rawText) -> raw validation object | null
 * engine.normalizeValidation(raw, context, result) -> validation record
 * engine.failedValidation(context, result, reason) -> validation record
 *
 * engine.validateCertification(context, result, conversationMessages)
 *   -> Promise<validation record>
 *   The second-model validator CALL + decision. Calls the proxy with the
 *   validator model. On any error returns a failedValidation record (valid:false)
 *   so the caller never accidentally credentials an unvalidated attempt.
 *
 * engine.recordCertificationResult({ context, result, conversationMessages, hooks })
 *   -> Promise<{ outcome, validation, record? }>
 *   The full no-credential-without-validation pipeline. `outcome` is one of:
 *     'validation_failed' | 'not_awarded' | 'awarded'.
 *   `record` (the credential) is present only when outcome === 'awarded'.
 *   `hooks` (all optional) let the caller persist + log without this engine
 *   knowing about app state:
 *     {
 *       onValidation(validation),               // always called
 *       onCredential(record),                   // only on 'awarded'
 *       resolveItem(context) -> { order, ... }, // catalog lookup for tierOrder
 *       buildIdentityAssurance(earnedAt) -> {}  // identity-assurance record
 *     }
 *
 * engine.buildEvidencePacket({ context, result, rubricDimensions, validation, extra })
 *   -> evidence packet object matching doc-16 "Rubric And Evidence Packet
 *   Requirements". Pure; the caller decides where to store it.
 *
 * engine.buildChallenge({ context, result, validation, challengeText, additionalEvidence, reviewerType })
 *   -> challenge packet (doc-16 "Challenge Documentation"), initialized open.
 * engine.CHALLENGE_OUTCOMES  — { UPHELD, REVERSED, PARTIAL_CREDIT, RETAKE_REQUIRED }
 * engine.resolveChallenge(packet, { outcome, rationale, reviewerType, transcriptChange })
 *   -> resolved challenge packet.
 *
 * ---------------------------------------------------------------------------
 * INVARIANT: never record a credential without a validation record whose
 * `valid === true`. recordCertificationResult enforces this; do not bypass it.
 * ---------------------------------------------------------------------------
 */

export const PROXY_URL = '/aesop-api/proxy.php';
export const CERTIFICATION_RESULT_REGEX = /<!--LADDER_CERTIFICATION_RESULT:([\s\S]*?)-->/;
export const CERTIFICATION_VALIDATION_REGEX = /<!--LADDER_CERTIFICATION_VALIDATION:([\s\S]*?)-->/;
export const CERTIFICATION_VALIDATOR_MODEL = 'claude-sonnet-4-5-20250929';

export const RUBRIC_DIMENSIONS = [
  'Conceptual accuracy',
  'Vocabulary fluency',
  'Applied judgment',
  'Evidence quality',
  'Reasoning defense',
  'Risk awareness',
  'Standards alignment'
];

export const TRANSCRIPT_STATUS = {
  COMPLETED: 'completed',
  PLACED_OUT: 'placed_out',
  VERIFIED: 'verified',
  AI_VERIFIED: 'ai_verified',
  SELF_REPORTED: 'self_reported',
  CHALLENGED: 'challenged',
  REVERSED_ON_CHALLENGE: 'reversed_on_challenge'
};

export const CHALLENGE_OUTCOMES = {
  UPHELD: 'upheld',
  REVERSED: 'reversed',
  PARTIAL_CREDIT: 'partial_credit',
  RETAKE_REQUIRED: 'retake_required'
};

const CERTIFIED_RESULTS = new Set(['certified', 'passed', 'pass']);

export function rubricDisclosure() {
  return `BEFORE YOU BEGIN - RUBRIC EVALUATION CRITERIA
You will be evaluated on these seven dimensions:
1. Conceptual accuracy: Do you understand the key ideas correctly?
2. Vocabulary fluency: Can you use the relevant technical terms?
3. Applied judgment: Can you apply this to real scenarios?
4. Evidence quality: Can you provide or cite strong evidence?
5. Reasoning defense: Can you explain and defend your thinking?
6. Risk awareness: Can you identify limitations and risks?
7. Standards alignment: Does your work meet the standards for this tier?`;
}

export function createCertificationEngine(options = {}) {
  const proxyUrl = options.proxyUrl || PROXY_URL;
  const validatorModel = options.validatorModel || CERTIFICATION_VALIDATOR_MODEL;
  const rubricDimensions = options.rubricDimensions || RUBRIC_DIMENSIONS;
  const fetchImpl = options.fetchImpl || ((...args) => fetch(...args));

  // ---- Examiner prompt --------------------------------------------------

  function buildExaminerSystemPrompt(blueprint = {}) {
    const languageLabel = blueprint.languageLabel || 'English';
    return `You are a structured AI examiner inside AESOP AI Academy. You are strictly scoped to: ${blueprint.itemLabel}.

You deliver a certification test, not a course lesson. The learner is allowed to test out without taking a course first.

Preferred language: ${languageLabel}. Translate your learner-facing responses into this language unless the learner asks otherwise.

Active certification mode: YES.
Item under test: ${blueprint.itemLabel}.
Education tier (teaching/standards level): ${blueprint.educationTierLabel}.
Certification tier: ${blueprint.certificationTierLabel}.
Mapped standards family: ${blueprint.standards}.
Certification depth: ${blueprint.depthLabel} (${blueprint.depthOutcome}).
Required evidence level: ${blueprint.depthEvidence}.
Passing standard: ${blueprint.depthPassingStandard}.
Review posture: ${blueprint.depthReview}.

${rubricDisclosure()}

Before asking the first substantive question, briefly state the rubric dimensions in plain language. Then deliver a dynamic test with vocabulary, scenario judgment, applied task, risk/limitation question, artifact or evidence statement, and defense of reasoning.

For Certification, test for competent and defensible use. For Expert challenge, increase ambiguity, require transfer to a new context, and press harder on edge cases. For Mastery challenge, require original synthesis, portfolio-quality evidence, standards mapping, and leadership-level defense.

Do not award a final credential in one short response. Collect evidence first. When you are ready to make a determination, explain pass or non-pass with specific learner evidence, missing evidence, standards implications, selected depth expectations, and a challenge path. If evidence is insufficient, say what would change the decision. If confidence is low, say human review is recommended.

When and only when you make a final determination, provide your rubric evaluation in this exact format:

Rubric Evaluation:

Conceptual accuracy: PASS or FAIL — [one sentence explaining your assessment]
Vocabulary fluency: PASS or FAIL — [one sentence explaining your assessment]
Applied judgment: PASS or FAIL — [one sentence explaining your assessment]
Evidence quality: PASS or FAIL — [one sentence explaining your assessment]
Reasoning defense: PASS or FAIL — [one sentence explaining your assessment]
Risk awareness: PASS or FAIL — [one sentence explaining your assessment]
Standards alignment: PASS or FAIL — [one sentence explaining your assessment]

Then provide your overall determination and append this exact hidden marker on a new line:
<!--LADDER_CERTIFICATION_RESULT:{"result":"certified","score":NN,"rationale":"one concise evidence-based reason","evidenceSummary":"one concise evidence summary"}-->

If the learner has not met the standard, use "result":"not_certified" and include the missing evidence in rationale. Do not mention the marker or JSON to the learner.`;
  }

  // ---- Examiner response parsing + rubric evaluation --------------------

  function parseRubricEvaluation(aiResponse) {
    const rubricSection = String(aiResponse || '').split('Rubric Evaluation:')[1];
    if (!rubricSection) {
      console.warn('No Rubric Evaluation section found in AI response');
      return rubricDimensions.map((dimension) => ({ dimension, status: 'unknown', reason: 'No evaluation provided' }));
    }
    return rubricDimensions.map((dimension) => {
      const regex = new RegExp(`${dimension}:\\s*(PASS|FAIL)\\s*—\\s*(.+?)(?=\\n(?:[A-Z]|$))`, 'i');
      const match = rubricSection.match(regex);
      if (match) {
        return {
          dimension,
          status: match[1].toUpperCase() === 'PASS' ? 'pass' : 'fail',
          reason: match[2].trim()
        };
      }
      return { dimension, status: 'unknown', reason: 'Evaluation not found' };
    });
  }

  function parseExaminerResponse(rawText) {
    const text = String(rawText || '');
    const visibleText = text.replace(CERTIFICATION_RESULT_REGEX, '').trim();
    const match = text.match(CERTIFICATION_RESULT_REGEX);
    if (!match) return { certificationResult: null, rubricDimensions: null, visibleText };
    try {
      const certificationResult = JSON.parse(match[1]);
      return { certificationResult, rubricDimensions: parseRubricEvaluation(text), visibleText };
    } catch (error) {
      console.warn('Could not parse certification result:', error);
      return { certificationResult: null, rubricDimensions: null, visibleText };
    }
  }

  function isCertifiedResult(result) {
    const normalized = String(result?.result || result?.status || '').toLowerCase().replace(/[\s-]+/g, '_');
    return CERTIFIED_RESULTS.has(normalized);
  }

  // ---- Independent second-model validator -------------------------------

  function buildValidationSystemPrompt() {
    return `You are the independent certification validator for AESOP AI Academy.

You are not the examiner. You are a second model reviewing whether a certification conversation is valid before any credential is recorded.

Validate BOTH sides:
1. Learner side: the learner gave enough relevant evidence for the proposed outcome, at the selected education tier, item under test, and certification depth.
2. Examiner side: the examiner asked fair, scoped, evidence-seeking questions; applied the stated standard; did not certify too quickly; did not ignore contradictions; and did not invent evidence.

Reject validation if the conversation is too short, mostly leading, off-topic, missing evidence, mismatched to the blueprint, or if the proposed result is unsupported.

CATEGORIZING FAILURE REASONS:

If returning valid === false, categorize the concern in the concerns array to enable appropriate remediation:

1. NOT_STRINGENT_ENOUGH
   Situation: Learner understood concepts and can apply them, but evidence is incomplete, shallow, or needs more specificity.
   Example: Correct explanation but artifact lacks implementation details, edge cases not explored, defense incomplete.
   Recoverable: true — offer 3-5 follow-up questions targeting missing evidence.

2. EXAMINER_PROCESS_ISSUE
   Situation: Examiner rushed, missed evidence, or certified too easily.
   Example: Conversation too short, leading questions, insufficient challenge.
   Recoverable: false — require new full attempt.

3. CRITICAL_FAILURE
   Situation: Learner misunderstood core concept, gave unsafe advice, or evidence contradicts.
   Example: Harmful recommendations, privacy misunderstanding, fundamental concept confusion.
   Recoverable: false — require full reattempt with remediation.

4. INSUFFICIENT_EDUCATION_TIER_MATCH
   Situation: Learner's response level doesn't match selected education tier.
   Example: College-tier evidence for high-school certification.
   Recoverable: false — offer to drop to lower tier or retry.

For EACH concern in the concerns array, include:
- type: one of the above (NOT_STRINGENT_ENOUGH, EXAMINER_PROCESS_ISSUE, CRITICAL_FAILURE, INSUFFICIENT_EDUCATION_TIER_MATCH)
- dimension: which rubric dimension failed (e.g., "Evidence quality", "Applied judgment")
- severity: "low" | "moderate" | "high"
- detail: one sentence explaining the gap
- recoverable: true/false (can follow-up questions help resolve this?)

Use recoverable === true ONLY for NOT_STRINGENT_ENOUGH with clear, narrow gaps. All other types should be recoverable === false.

Return only this hidden marker, on one line:
<!--LADDER_CERTIFICATION_VALIDATION:{"valid":true,"learner_valid":true,"examiner_valid":true,"confidence":0.0,"rationale":"one concise reason","learner_evidence":"one concise evidence summary","examiner_review":"one concise process review","concerns":[]}-->

Set valid to true only when learner_valid and examiner_valid are both true. If invalid, set valid false and include concrete concerns with type/dimension/severity/recoverable fields. Do not include markdown, prose, or any text outside the marker.`;
  }

  function buildValidationMessages(context, result, conversationMessages = []) {
    const transcript = conversationMessages
      .map((message, index) => `${index + 1}. ${String(message.role).toUpperCase()}: ${message.content}`)
      .join('\n\n');
    return [{
      role: 'user',
      content: `Validate this certification conversation.

Certification context:
${JSON.stringify(context, null, 2)}

Proposed examiner result:
${JSON.stringify(result, null, 2)}

Conversation transcript:
${transcript}`
    }];
  }

  function parseValidationResponse(rawText) {
    const match = String(rawText || '').match(CERTIFICATION_VALIDATION_REGEX);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      console.warn('Could not parse certification validation:', error);
      return null;
    }
  }

  function normalizeValidation(raw, context, result, responseModel) {
    const learnerValid = raw?.learner_valid === true;
    const examinerValid = raw?.examiner_valid === true;
    const valid = raw?.valid === true && learnerValid && examinerValid;
    return {
      id: `validation:${context.attemptId}`,
      attemptId: context.attemptId,
      blueprintId: context.blueprintId,
      blueprintVersion: context.blueprintVersion,
      itemId: context.itemId ?? context.ladderTierId,
      itemLabel: context.itemLabel ?? context.ladderTierLabel,
      depthId: context.testDepthId,
      depthLabel: context.testDepthLabel,
      certificationTierId: context.certificationTierId,
      certificationTierLabel: context.certificationTierLabel,
      proposedResult: result?.result || result?.status || '',
      valid,
      learnerValid,
      examinerValid,
      confidence: Number(raw?.confidence ?? 0),
      rationale: raw?.rationale || 'Validator did not provide a rationale.',
      learnerEvidence: raw?.learner_evidence || '',
      examinerReview: raw?.examiner_review || '',
      concerns: Array.isArray(raw?.concerns) ? raw.concerns : [],
      reviewerModel: responseModel || validatorModel,
      reviewedAt: new Date().toISOString()
    };
  }

  function failedValidation(context, result, reason) {
    return normalizeValidation({
      valid: false,
      learner_valid: false,
      examiner_valid: false,
      confidence: 0,
      rationale: reason,
      concerns: [reason]
    }, context, result, validatorModel);
  }

  // ---- Retry eligibility logic ------------------------------------------

  function shouldOfferRetry(validation) {
    // Never offer retry on pass
    if (validation.valid) return false;
    // Never offer retry if no concerns array
    if (!Array.isArray(validation.concerns)) return false;

    const hasRecoverableConcern = validation.concerns.some(c =>
      c?.type === 'NOT_STRINGENT_ENOUGH' && c?.recoverable === true
    );
    const hasCriticalConcern = validation.concerns.some(c =>
      c?.type === 'CRITICAL_FAILURE' ||
      c?.type === 'EXAMINER_PROCESS_ISSUE'
    );

    return hasRecoverableConcern && !hasCriticalConcern;
  }

  function retryableFailureDimensions(validation) {
    // Extract rubric dimensions flagged as recoverable NOT_STRINGENT_ENOUGH
    if (!Array.isArray(validation.concerns)) return [];
    return validation.concerns
      .filter(c => c?.type === 'NOT_STRINGENT_ENOUGH' && c?.recoverable === true)
      .map(c => c?.dimension)
      .filter(Boolean);
  }

  // ---- Retry question generation and re-validation ----------------------

  function generateRetryQuestions(context, retryValidation, retryDimensions) {
    // Map flagged dimensions to question strategies
    const questionsByDimension = {
      'Evidence quality': {
        count: 2,
        types: ['deeperArtifact', 'implementationDetail']
      },
      'Applied judgment': {
        count: 1,
        types: ['edgeCase']
      },
      'Reasoning defense': {
        count: 1,
        types: ['defend']
      },
      'Risk awareness': {
        count: 1,
        types: ['limitation']
      },
      'Vocabulary fluency': {
        count: 1,
        types: ['terminology']
      },
      'Conceptual accuracy': {
        count: 1,
        types: ['clarify']
      }
    };

    const questions = [];
    for (const dimension of retryDimensions) {
      const spec = questionsByDimension[dimension] || { count: 1, types: ['clarify'] };
      for (let i = 0; i < spec.count && questions.length < 5; i++) {
        const type = spec.types[i] || spec.types[0];
        questions.push({
          questionId: `retry_q${questions.length + 1}`,
          dimension,
          type,
          promptInstruction: buildRetryQuestionPrompt(dimension, type)
        });
      }
    }

    return questions.slice(0, 5); // Max 5 follow-up questions
  }

  function buildRetryQuestionPrompt(dimension, type) {
    const prompts = {
      'Evidence quality:deeperArtifact': 'Ask for a more detailed walkthrough or breakdown of the artifact mentioned.',
      'Evidence quality:implementationDetail': 'Ask for actual implementation details, code examples, or step-by-step execution.',
      'Applied judgment:edgeCase': 'Ask what happens in an edge case or unusual scenario related to the topic.',
      'Reasoning defense:defend': 'Ask why they chose their approach over alternatives and how they justified it.',
      'Risk awareness:limitation': 'Ask about risks, limitations, failure modes, or safety considerations.',
      'Vocabulary fluency:terminology': 'Ask them to define or use three key technical terms correctly.',
      'Conceptual accuracy:clarify': 'Ask for clarification on a specific concept they mentioned briefly.'
    };
    return prompts[`${dimension}:${type}`] || 'Ask for more evidence or clarification on this dimension.';
  }

  function buildRetrySystemPrompt(blueprint, originalValidation, retryDimensions) {
    const dimensionList = retryDimensions.join(', ');
    return `You are still the AI examiner, now asking follow-up questions to collect more evidence.

CONTEXT: The first certification attempt was validated. Independent review identified these gaps:
${dimensionList}

YOUR ROLE: Ask 3-5 targeted follow-up questions (not original exam questions) to collect deeper evidence on these specific gaps.

INSTRUCTIONS:
1. Do NOT repeat original exam questions.
2. Focus ONLY on the flagged dimensions above.
3. Ask for deeper evidence: implementation details, edge cases, risk awareness, or stronger defense of reasoning.
4. Keep questions focused and brief — one per message.
5. After the learner answers all follow-up questions, say: "Thank you. I have enough for re-evaluation."
6. Then append this marker on a new line (exactly as written, nothing else):
<!--LADDER_CERTIFICATION_RETRY_COMPLETE-->

Do not mention the marker to the learner or indicate it in any way.`;
  }

  function buildCombinedEvidenceForRetryValidation(originalConversation, retryConversation, originalResult, retryQuestions) {
    return {
      originalAttemptSummary: {
        result: originalResult.result || originalResult.status || '',
        score: originalResult.score || null,
        rationale: originalResult.rationale || originalResult.evidenceSummary || '',
        messageCount: originalConversation.length
      },
      retryEvidence: {
        questionsAsked: retryQuestions,
        messageCount: retryConversation.length
      },
      combinedForValidation: `ORIGINAL CERTIFICATION ATTEMPT:
${originalConversation.map((m, i) => `${i + 1}. ${String(m.role).toUpperCase()}: ${m.content}`).join('\n\n')}

FOLLOW-UP QUESTIONS AND RESPONSES:
${retryConversation.map((m, i) => `${i + 1}. ${String(m.role).toUpperCase()}: ${m.content}`).join('\n\n')}`
    };
  }

  async function revalidateCertificationWithRetry(context, originalResult, originalValidation, originalConversation, retryConversation, retryQuestions) {
    const combined = buildCombinedEvidenceForRetryValidation(
      originalConversation,
      retryConversation,
      originalResult,
      retryQuestions
    );

    try {
      const response = await fetchImpl(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: validatorModel,
          messages: [{
            role: 'user',
            content: `Re-validate this certification with follow-up evidence.

Original validation decision (failed):
${JSON.stringify(originalValidation, null, 2)}

Original exam + Follow-up questions + Learner responses:
${combined.combinedForValidation}

TASK: Re-evaluate whether the COMBINED evidence (original + follow-up) now satisfies the validation criteria.

Apply the SAME validation standard as before. Consider:
1. Does the follow-up evidence resolve the gaps identified in the original validation?
2. Does the learner's response to follow-up questions demonstrate the missing competency?
3. Is there NOW enough evidence to certify, or are there still gaps?

Return your validation in this exact marker format:
<!--LADDER_CERTIFICATION_VALIDATION:{"valid":true,"learner_valid":true,"examiner_valid":true,"confidence":0.0,"rationale":"one concise reason","learner_evidence":"one concise evidence summary","examiner_review":"one concise process review","concerns":[]}-->`
          }],
          system_prompt: buildValidationSystemPrompt(),
          max_tokens: 700
        })
      });

      const data = await response.json();
      const rawText = data?.content?.[0]?.text || '';
      const parsed = parseValidationResponse(rawText);

      if (!response.ok || !parsed) {
        return failedValidation(context, originalResult,
          'Re-validation could not be completed.');
      }

      return {
        ...normalizeValidation(parsed, context, originalResult, data?.model),
        isRetryValidation: true,
        retryCount: 1
      };
    } catch (error) {
      return failedValidation(context, originalResult,
        'Re-validation validator could not be reached.');
    }
  }

  async function validateCertification(context, result, conversationMessages = []) {
    try {
      const response = await fetchImpl(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: validatorModel,
          messages: buildValidationMessages(context, result, conversationMessages),
          system_prompt: buildValidationSystemPrompt(),
          max_tokens: 700
        })
      });
      const data = await response.json();
      const rawText = data?.content?.[0]?.text || '';
      const parsed = parseValidationResponse(rawText);
      if (!response.ok || !parsed) {
        return failedValidation(context, result, data?.error || 'Certification validator did not return a valid review.');
      }
      return normalizeValidation(parsed, context, result, data?.model);
    } catch (error) {
      return failedValidation(context, result, 'Certification validator could not be reached.');
    }
  }

  // ---- Evidence packet (doc-16) -----------------------------------------

  function buildEvidencePacket({ context = {}, result = {}, rubricDimensions: dims = [], validation = null, extra = {} } = {}) {
    const now = new Date().toISOString();
    return {
      id: `evidence:${context.attemptId || `cert_${Date.now()}`}`,
      learnerId: extra.learnerId || context.learnerId || 'anonymous',
      certificationTierId: context.certificationTierId,
      certificationTierLabel: context.certificationTierLabel,
      itemId: context.itemId ?? context.ladderTierId,
      itemLabel: context.itemLabel ?? context.ladderTierLabel,
      educationTierId: extra.educationTierId || context.educationTierId || '',
      testDepthId: context.testDepthId,
      testDepthLabel: context.testDepthLabel,
      blueprintId: context.blueprintId,
      blueprintVersion: context.blueprintVersion,
      rubricVersion: extra.rubricVersion || context.rubricVersion || 'v1',
      systemPromptVersion: extra.systemPromptVersion || context.systemPromptVersion || 'v1',
      modelName: extra.modelName || result.model || '',
      validatorModel: validation?.reviewerModel || validatorModel,
      timestamp: now,
      learnerResponses: extra.learnerResponses || [],
      generatedScenario: extra.generatedScenario || '',
      requiredArtifact: context.testDepthEvidence || extra.requiredArtifact || '',
      rubricScores: dims,
      standardsAssessed: context.standards || extra.standardsAssessed || '',
      standardsSatisfied: extra.standardsSatisfied || (isCertifiedResult(result) ? context.standards : ''),
      criticalFailureChecks: extra.criticalFailureChecks || [],
      result: result.result || result.status || '',
      overallScore: Number(result.score ?? 0),
      aiRationale: result.rationale || result.evidenceSummary || '',
      remediationRecommendations: extra.remediationRecommendations || [],
      validation,
      validationStatus: validation ? (validation.valid ? 'valid' : 'invalid') : 'pending',
      humanReviewRecommended: Boolean(extra.humanReviewRecommended),
      challengeStatus: 'none',
      finalDecision: validation && validation.valid && isCertifiedResult(result) ? 'certified' : 'not_certified',
      // NEW: Retry attempt tracking
      retryAttempts: extra.retryAttempts || [],
      originalValidationFailed: Boolean(extra.originalValidationFailed),
      finalValidationStatus: extra.finalValidationStatus || (validation?.valid ? 'valid' : 'invalid'),
      validationAttempts: extra.validationAttempts || 1,
      retryEligible: Boolean(extra.retryEligible),
      retryAccepted: Boolean(extra.retryAccepted),
      retryPath: extra.retryPath || 'none' // 'immediate' | 'deferred' | 'none'
    };
  }

  // ---- No-credential-without-validation pipeline ------------------------

  async function recordCertificationResult({ context, result, conversationMessages = [], hooks = {} } = {}) {
    if (!context || !result) {
      return { outcome: 'validation_failed', validation: null, record: null };
    }
    const isCertified = isCertifiedResult(result);
    const validation = await validateCertification(context, result, conversationMessages);
    if (typeof hooks.onValidation === 'function') hooks.onValidation(validation);

    // INVARIANT: failed validation -> logged, never credentialed.
    if (!validation.valid) {
      // NEW: Check if retry is appropriate
      const offerRetry = shouldOfferRetry(validation);
      const retryDimensions = offerRetry ? retryableFailureDimensions(validation) : [];

      if (offerRetry && typeof hooks.onRetryEligible === 'function') {
        // Signal that retry should be offered to the learner
        hooks.onRetryEligible({ validation, retryDimensions });
        return {
          outcome: 'retry_offered',
          validation,
          record: null,
          retryEligible: true,
          retryDimensions
        };
      }
      // Existing non-retry failure path
      return { outcome: 'validation_failed', validation, record: null };
    }
    if (!isCertified) {
      return { outcome: 'not_awarded', validation, record: null };
    }

    const item = typeof hooks.resolveItem === 'function' ? hooks.resolveItem(context) : null;
    const earnedAt = new Date().toISOString();
    const identityAssurance = typeof hooks.buildIdentityAssurance === 'function'
      ? hooks.buildIdentityAssurance(earnedAt)
      : (context.identityAssurance || null);
    const record = {
      id: `${context.blueprintId}:${context.attemptId}`,
      source: 'ai_exam',
      status: 'certified',
      evidence: TRANSCRIPT_STATUS.VERIFIED,
      depthId: context.testDepthId,
      depthLabel: context.testDepthLabel,
      certificationTierId: context.certificationTierId,
      certificationTierLabel: context.certificationTierLabel,
      itemId: context.itemId ?? context.ladderTierId,
      itemLabel: context.itemLabel ?? context.ladderTierLabel,
      ladderTierId: context.ladderTierId ?? context.itemId,
      ladderTierLabel: context.ladderTierLabel ?? context.itemLabel,
      tierOrder: item?.order ?? context.tierOrder ?? 0,
      title: `${context.itemLabel ?? context.ladderTierLabel} - ${context.testDepthLabel}`,
      earnedAt,
      score: result.score ?? null,
      rationale: result.rationale || result.evidenceSummary || 'Certified by AI examiner.',
      standards: context.standards,
      blueprintId: context.blueprintId,
      blueprintVersion: context.blueprintVersion,
      identityAssurance,
      validation,
      validationStatus: 'valid',
      transcriptLine: `${context.itemLabel ?? context.ladderTierLabel} - ${context.certificationTierLabel} ${context.testDepthLabel}. Independent validation confirmed learner evidence and examiner process.`
    };
    if (typeof hooks.onCredential === 'function') hooks.onCredential(record);
    return { outcome: 'awarded', validation, record };
  }

  // ---- Challenge flow (doc-16) ------------------------------------------

  function buildChallenge({ context = {}, result = {}, validation = null, challengeText = '', additionalEvidence = '', reviewerType = 'ai' } = {}) {
    return {
      id: `challenge:${context.attemptId || Date.now()}`,
      attemptId: context.attemptId,
      blueprintId: context.blueprintId,
      blueprintVersion: context.blueprintVersion,
      itemId: context.itemId ?? context.ladderTierId,
      itemLabel: context.itemLabel ?? context.ladderTierLabel,
      originalResult: result?.result || result?.status || '',
      originalRationale: result?.rationale || result?.evidenceSummary || '',
      originalValidation: validation,
      challengeText: String(challengeText || '').slice(0, 2000),
      additionalEvidence: String(additionalEvidence || '').slice(0, 2000),
      reviewerType,
      status: 'open',
      outcome: null,
      finalRationale: '',
      transcriptChange: '',
      openedAt: new Date().toISOString(),
      resolvedAt: null
    };
  }

  function resolveChallenge(packet, { outcome, rationale = '', reviewerType, transcriptChange = '' } = {}) {
    const allowed = new Set(Object.values(CHALLENGE_OUTCOMES));
    const finalOutcome = allowed.has(outcome) ? outcome : CHALLENGE_OUTCOMES.UPHELD;
    return {
      ...packet,
      status: 'resolved',
      outcome: finalOutcome,
      reviewerType: reviewerType || packet.reviewerType,
      finalRationale: String(rationale || '').slice(0, 2000),
      transcriptChange,
      resolvedAt: new Date().toISOString()
    };
  }

  return {
    PROXY_URL: proxyUrl,
    CERTIFICATION_RESULT_REGEX,
    CERTIFICATION_VALIDATION_REGEX,
    validatorModel,
    rubricDimensions,
    CHALLENGE_OUTCOMES,
    TRANSCRIPT_STATUS,
    rubricDisclosure,
    buildExaminerSystemPrompt,
    parseExaminerResponse,
    parseRubricEvaluation,
    isCertifiedResult,
    buildValidationSystemPrompt,
    buildValidationMessages,
    parseValidationResponse,
    normalizeValidation,
    failedValidation,
    validateCertification,
    shouldOfferRetry,
    retryableFailureDimensions,
    generateRetryQuestions,
    buildRetrySystemPrompt,
    buildCombinedEvidenceForRetryValidation,
    revalidateCertificationWithRetry,
    buildEvidencePacket,
    recordCertificationResult,
    buildChallenge,
    resolveChallenge
  };
}
