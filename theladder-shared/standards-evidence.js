// =============================================================================
// theladder-shared/standards-evidence.js
// Advisory standards-evidence engine for The Ladder.
//
// MODULE STYLE: ES module, no Firebase imports (pure analysis). Persistence is
// the caller's job via theladder-shared/data-layer.js `recordStandardsEvidence`.
// Include with:
//   import { analyzeSessionForStandards, STANDARDS_FAMILIES }
//     from '/theladder-shared/standards-evidence.js';
//
// PURPOSE: Given a WHOLE-SESSION transcript (a lab/assignment conversation),
// produce CANDIDATE evidence spans mapped to standards families. This is an
// evidence ASSISTANT, not a grader (see Obsidian doc 15 "Standards Evidence
// Mapping"). It evaluates the conversation as a portfolio artifact and surfaces
// where a learner may have demonstrated a standard, always with the exact
// transcript span and a plain-language rationale.
//
// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------
//  STANDARDS_FAMILIES
//      Frozen array of supported family identifiers.
//
//  analyzeSessionForStandards(transcript, options?) -> CandidateEvidence[]
//      transcript: Array<{ role: 'user'|'assistant', content: string }>
//      options.families?: subset of STANDARDS_FAMILIES to consider
//      options.learnerId?, options.sessionId?, options.pathway?
//      options.classifier?: optional async fn(transcript, families) ->
//          raw candidate hints, for an LLM-backed pass. When omitted, a
//          deterministic keyword heuristic runs (offline-safe, never networks).
//      Returns an array of CandidateEvidence records, each with status
//      'candidate', an exact transcriptSpan, a rationale, and a confidenceLabel.
//      NEVER mutates the transcript and NEVER assigns mastery.
//
//  buildCandidateRecord(fields) -> CandidateEvidence
//      Normalizes a single candidate into the docs/ladder-data-model.md
//      section-7 shape with status forced to 'candidate'. Exposed for tests and
//      for callers wiring an external classifier.
//
// -----------------------------------------------------------------------------
// NON-GOALS (hard constraints — do not violate)
// -----------------------------------------------------------------------------
//  - NEVER auto-grade. No score, grade, or "mastered" output.
//  - NEVER auto-upgrade status. Every record is born 'candidate'. Upgrades to
//    learner_confirmed / reviewer_verified happen only in a separate human or
//    learner review flow, never here.
//  - NEVER mutate official mastery, placement, certification, or transcript.
//  - ALWAYS preserve the exact transcript span (message indices + char offsets +
//    verbatim excerpt) so a learner/parent/reviewer/employer can see WHY a
//    standard was suggested.
//  - Output is advisory. It is not school-issued credit or a proctored
//    assessment, and it is not a legal conclusion (doc 15).
// =============================================================================

export const STANDARDS_FAMILIES = Object.freeze([
  'AI4K12',
  'CSTA',
  'ISTE',
  'UNESCO-AI-Competency',
  'NIST-AI-RMF',
  'EU-AI-Act',
  'O*NET',
  'WEF-Skills',
]);

const CONFIDENCE = Object.freeze(['low', 'medium', 'high']);

// Advisory labels permitted on candidate output (doc 15). Note: NO 'verified'
// here — verified is reserved for the post-review flow, never emitted by this
// engine.
const ADVISORY_LABELS = Object.freeze([
  'evidence_observed',
  'partial_evidence',
  'insufficient_evidence',
  'needs_review',
  'self_reported',
]);

// -----------------------------------------------------------------------------
// Deterministic, offline-safe heuristic dictionary.
// Each family maps to a small set of signal phrases and a representative
// standard descriptor. This is intentionally conservative: it suggests
// CANDIDATES, it does not decide. An LLM classifier passed via
// options.classifier can replace/augment this without changing the contract.
// -----------------------------------------------------------------------------
const FAMILY_SIGNALS = Object.freeze({
  'AI4K12': {
    standardLabel: 'Five Big Ideas in AI (perception, representation, learning, interaction, societal impact)',
    phrases: ['machine learning', 'training data', 'how ai learns', 'neural', 'perception', 'societal impact'],
  },
  'CSTA': {
    standardLabel: 'Computer Science Teachers Association K-12 standards',
    phrases: ['algorithm', 'variable', 'function', 'debug', 'data structure', 'computational'],
  },
  'ISTE': {
    standardLabel: 'ISTE Standards for Students (empowered learner, digital citizen)',
    phrases: ['digital citizen', 'responsible use', 'cite source', 'evaluate information', 'creative communicator'],
  },
  'UNESCO-AI-Competency': {
    standardLabel: 'UNESCO AI Competency Framework for Students',
    phrases: ['human-centred', 'ethics of ai', 'ai for good', 'human agency', 'inclusive'],
  },
  'NIST-AI-RMF': {
    standardLabel: 'NIST AI Risk Management Framework (govern, map, measure, manage)',
    phrases: ['risk', 'trustworthy', 'govern', 'map measure manage', 'mitigate', 'bias evaluation'],
  },
  'EU-AI-Act': {
    standardLabel: 'EU AI Act risk-tier obligations',
    phrases: ['high-risk system', 'prohibited', 'transparency obligation', 'conformity', 'risk tier'],
  },
  'O*NET': {
    standardLabel: 'O*NET occupational tasks, skills, and work activities',
    phrases: ['job task', 'workplace', 'occupation', 'work activity', 'professional skill'],
  },
  'WEF-Skills': {
    standardLabel: 'WEF Future of Jobs core skills (analytical thinking, AI literacy)',
    phrases: ['analytical thinking', 'problem solving', 'ai literacy', 'adaptability', 'collaboration'],
  },
});

// -----------------------------------------------------------------------------
// buildCandidateRecord — normalize one candidate to the canonical shape.
// -----------------------------------------------------------------------------
export function buildCandidateRecord(fields = {}) {
  const span = fields.transcriptSpan || {};
  const confidenceLabel = CONFIDENCE.includes(fields.confidenceLabel) ? fields.confidenceLabel : 'low';
  const advisoryLabel = ADVISORY_LABELS.includes(fields.advisoryLabel) ? fields.advisoryLabel : 'needs_review';
  const family = STANDARDS_FAMILIES.includes(fields.family) ? fields.family : (fields.linkedStandard?.family || '');

  return {
    learnerId: fields.learnerId || '',
    pathway: fields.pathway || '',
    sessionId: fields.sessionId || '',
    // Status is ALWAYS candidate from this engine. Hard rule.
    status: 'candidate',
    linkedStandard: {
      family,
      id: fields.standardId || fields.linkedStandard?.id || '',
      label: fields.standardLabel || fields.linkedStandard?.label || '',
    },
    transcriptSpan: {
      messageIndexStart: Number.isInteger(span.messageIndexStart) ? span.messageIndexStart : 0,
      messageIndexEnd: Number.isInteger(span.messageIndexEnd) ? span.messageIndexEnd : 0,
      charStart: Number.isInteger(span.charStart) ? span.charStart : 0,
      charEnd: Number.isInteger(span.charEnd) ? span.charEnd : 0,
      excerpt: typeof span.excerpt === 'string' ? span.excerpt : '',
    },
    rationale: fields.rationale || '',
    confidenceLabel,
    advisoryLabel,
    reviewerStatus: 'candidate',
    reviewerType: 'ai',
    reviewerId: null,
    createdAt: fields.createdAt || new Date().toISOString(),
    reviewedAt: null,
    supersededBy: null,
  };
}

// -----------------------------------------------------------------------------
// Internal: locate the first signal phrase within the transcript and return an
// exact span (message index + char offsets + verbatim excerpt) or null.
// -----------------------------------------------------------------------------
function findSpan(transcript, phrase) {
  const needle = phrase.toLowerCase();
  for (let i = 0; i < transcript.length; i += 1) {
    const msg = transcript[i];
    if (!msg || typeof msg.content !== 'string') continue;
    // Only learner-authored turns count as the learner's own evidence.
    if (msg.role !== 'user') continue;
    const haystack = msg.content.toLowerCase();
    const at = haystack.indexOf(needle);
    if (at === -1) continue;
    const charStart = at;
    const charEnd = at + phrase.length;
    // widen excerpt to a readable window around the match
    const windowStart = Math.max(0, charStart - 40);
    const windowEnd = Math.min(msg.content.length, charEnd + 40);
    return {
      messageIndexStart: i,
      messageIndexEnd: i,
      charStart,
      charEnd,
      excerpt: msg.content.slice(windowStart, windowEnd),
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// analyzeSessionForStandards — main entry point.
// -----------------------------------------------------------------------------
export async function analyzeSessionForStandards(transcript, options = {}) {
  if (!Array.isArray(transcript) || transcript.length === 0) return [];

  const families = (options.families && options.families.length)
    ? options.families.filter((f) => STANDARDS_FAMILIES.includes(f))
    : STANDARDS_FAMILIES;

  const base = {
    learnerId: options.learnerId || '',
    pathway: options.pathway || '',
    sessionId: options.sessionId || '',
  };

  // Optional LLM-backed classifier. It returns raw hints; we still force every
  // result through buildCandidateRecord so the candidate-only contract holds.
  if (typeof options.classifier === 'function') {
    let hints = [];
    try {
      hints = await options.classifier(transcript, families) || [];
    } catch (error) {
      console.warn('[standards-evidence] classifier failed; falling back to heuristic:', error);
      hints = [];
    }
    if (hints.length) {
      return hints.map((h) => buildCandidateRecord({ ...base, ...h }));
    }
  }

  // Deterministic, offline-safe heuristic pass.
  const candidates = [];
  for (const family of families) {
    const sig = FAMILY_SIGNALS[family];
    if (!sig) continue;
    for (const phrase of sig.phrases) {
      const span = findSpan(transcript, phrase);
      if (!span) continue;
      candidates.push(buildCandidateRecord({
        ...base,
        family,
        standardLabel: sig.standardLabel,
        rationale: `Learner referenced "${phrase}", which is a candidate indicator for ${family}. ` +
          `This is advisory only and requires learner or reviewer confirmation before any verified status.`,
        confidenceLabel: 'low',
        advisoryLabel: 'evidence_observed',
        transcriptSpan: span,
      }));
      // one candidate per family keeps output conservative and reviewable
      break;
    }
  }
  return candidates;
}
