// =============================================================================
// theladder-shared/data-layer.js
// Shared, localStorage-first + Firestore-synced persistence helper for all three
// Ladder pathways (Concepts, Products, Use-Cases).
//
// MODULE STYLE: ES module with Firebase web SDK imported from the gstatic CDN,
// exactly like theladder/ladder-app.js. Include from a page app with:
//   import { initDataLayer, loadLearnerRecord, saveLearnerProgress,
//            recordCompletion, recordCertification, recordStandardsEvidence }
//     from '/theladder-shared/data-layer.js';
//
// DESIGN: Firestore is the database of record (see docs/adr/0001). This module
// degrades gracefully to localStorage-only when Firebase is unavailable or
// fails to init — every public function writes the local cache first, then
// best-effort syncs to Firestore. No call site needs to know whether Firebase
// is up.
//
// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------
//  initDataLayer(options?) -> Promise<{ firebaseReady: boolean }>
//      Lazily initializes Firebase using ai-academy/js/firebase-config.js.
//      Safe to call multiple times; resolves to whether remote sync is live.
//      options.learnerId optionally seeds the learner id.
//
//  loadLearnerRecord(learnerId?) -> Promise<LearnerRecord>
//      Reads localStorage cache immediately, then reconciles with
//      learners/{learnerId} from Firestore when available. Returns the merged
//      record. Falls back to the local cache (or an empty record) on any error.
//
//  saveLearnerProgress(pathway, data) -> Promise<void>
//      pathway is 'concept' | 'product' | 'use-case'. Merges `data` into the
//      pathway's progress key (ladderProgress | productProgress |
//      useCaseProgress), writes local cache, then setDoc merge to Firestore.
//
//  recordCompletion(completion) -> Promise<{ completionId: string }>
//      Appends a completion to the `completions` collection and flips the
//      matching pathway courseStarts[itemId].status to 'completed'.
//      See docs/ladder-data-model.md section 2 for the completion shape.
//
//  recordCertification(evidencePacket, validation?) -> Promise<{ certificationId, evidencePacketId, certificationValidationId }>
//      Writes evidencePackets + certifications (+ certificationValidations when
//      a validation is supplied), and appends a denormalized summary to the
//      learner record. Field names follow docs/ladder-data-model.md sections
//      4-6 (doc-16 exact).
//
//  recordStandardsEvidence(candidate) -> Promise<{ standardsEvidenceId: string }>
//      Persists ONE advisory candidate evidence record. This module never
//      upgrades status beyond 'candidate'; confirmation is a separate reviewer
//      flow. See docs/ladder-data-model.md section 7.
//
// All functions are no-throw at the boundary: remote failures are logged and
// swallowed so the local-first UX never breaks.
// =============================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { FIREBASE_CONFIG } from '/ai-academy/js/firebase-config.js';

// ---- constants --------------------------------------------------------------

const LS_LEARNER_ID = 'aesop-learner-id';
const LS_UNIFIED_CACHE = 'aesop-ladder-unified-record-v1';

const PATHWAY_KEYS = {
  'concept': 'ladderProgress',
  'product': 'productProgress',
  'use-case': 'useCaseProgress',
};

const VALID_EVIDENCE_STATUS = [
  'completed', 'placed_out', 'verified', 'ai_verified', 'self_reported',
];

// ---- module state -----------------------------------------------------------

let db = null;
let firebaseReady = false;
let initPromise = null;
let currentLearnerId = '';

// ---- init -------------------------------------------------------------------

export function initDataLayer(options = {}) {
  if (options.learnerId) currentLearnerId = String(options.learnerId);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const app = initializeApp(FIREBASE_CONFIG);
      db = getFirestore(app);
      firebaseReady = true;
    } catch (error) {
      console.warn('[data-layer] Firebase unavailable, localStorage-only mode:', error);
      db = null;
      firebaseReady = false;
    }
    return { firebaseReady };
  })();
  return initPromise;
}

async function ensureInit() {
  if (!initPromise) initDataLayer();
  await initPromise;
}

// ---- learner id resolution --------------------------------------------------

function resolveLearnerId(explicit) {
  if (explicit) { currentLearnerId = String(explicit); return currentLearnerId; }
  if (currentLearnerId) return currentLearnerId;
  try {
    const stored = localStorage.getItem(LS_LEARNER_ID);
    if (stored) { currentLearnerId = stored; return stored; }
  } catch { /* localStorage may be blocked */ }
  return '';
}

// ---- local cache helpers ----------------------------------------------------

function readLocalRecord() {
  try {
    return JSON.parse(localStorage.getItem(LS_UNIFIED_CACHE) || 'null') || emptyRecord();
  } catch (error) {
    console.warn('[data-layer] Could not parse local record cache:', error);
    return emptyRecord();
  }
}

function writeLocalRecord(record) {
  try {
    localStorage.setItem(LS_UNIFIED_CACHE, JSON.stringify(record));
  } catch (error) {
    console.warn('[data-layer] Could not write local record cache:', error);
  }
}

function emptyRecord() {
  const now = new Date().toISOString();
  return {
    learnerId: currentLearnerId || '',
    createdAt: now,
    lastActiveAt: now,
    accountUid: '',
    accountEmail: '',
    adultAttested: false,
    ladderProgress: {},
    productProgress: { version: 'v1', courseStarts: {}, courseChats: {} },
    useCaseProgress: { version: 'v1', courseStarts: {}, courseChats: {} },
    ladderCertifications: [],
    certificationValidations: [],
    standardsReviews: [],
  };
}

// shallow-merge per-pathway so concurrent pathways do not clobber each other
function mergeRecords(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const merged = { ...local, ...remote };
  for (const key of Object.values(PATHWAY_KEYS)) {
    merged[key] = { ...(local[key] || {}), ...(remote[key] || {}) };
  }
  return merged;
}

// ---- public: loadLearnerRecord ---------------------------------------------

export async function loadLearnerRecord(learnerId) {
  await ensureInit();
  const id = resolveLearnerId(learnerId);
  const local = readLocalRecord();
  if (!id) return local;
  local.learnerId = id;

  if (!firebaseReady || !db) {
    writeLocalRecord(local);
    return local;
  }
  try {
    const snap = await getDoc(doc(db, 'learners', id));
    if (!snap.exists()) {
      // first contact: seed remote from local cache (one-time backfill)
      await setDoc(doc(db, 'learners', id), { ...local, learnerId: id }, { merge: true });
      writeLocalRecord(local);
      return local;
    }
    const merged = mergeRecords(local, snap.data());
    merged.learnerId = id;
    writeLocalRecord(merged);
    return merged;
  } catch (error) {
    console.warn('[data-layer] loadLearnerRecord remote read failed; using local cache:', error);
    return local;
  }
}

// ---- public: saveLearnerProgress -------------------------------------------

export async function saveLearnerProgress(pathway, data) {
  await ensureInit();
  const key = PATHWAY_KEYS[pathway];
  if (!key) throw new Error(`[data-layer] Unknown pathway: ${pathway}`);
  const id = resolveLearnerId();

  const record = readLocalRecord();
  record.learnerId = id || record.learnerId;
  record[key] = { ...(record[key] || {}), ...(data || {}) };
  record.lastActiveAt = new Date().toISOString();
  writeLocalRecord(record);

  if (!id || !firebaseReady || !db) return;
  try {
    await setDoc(doc(db, 'learners', id), {
      learnerId: id,
      lastActiveAt: record.lastActiveAt,
      [key]: record[key],
    }, { merge: true });
  } catch (error) {
    console.warn('[data-layer] saveLearnerProgress remote write failed (local cache kept):', error);
  }
}

// ---- public: recordCompletion ----------------------------------------------

export async function recordCompletion(completion) {
  await ensureInit();
  const id = resolveLearnerId();
  const now = new Date().toISOString();
  const pathwayKey = PATHWAY_KEYS[completion?.pathway];

  const record = readLocalRecord();
  record.learnerId = id || record.learnerId;
  // flip the matching courseStarts entry to completed when applicable
  if (pathwayKey && pathwayKey !== 'ladderProgress' && completion.itemId != null) {
    const prog = record[pathwayKey] || (record[pathwayKey] = { courseStarts: {}, courseChats: {} });
    prog.courseStarts = prog.courseStarts || {};
    prog.courseStarts[completion.itemId] = {
      ...(prog.courseStarts[completion.itemId] || {}),
      status: 'completed',
      savedAt: now,
    };
  }
  writeLocalRecord(record);

  const payload = {
    learnerId: id || '',
    pathway: completion?.pathway || '',
    itemId: completion?.itemId ?? null,
    itemType: completion?.itemType || '',
    itemName: completion?.itemName || '',
    level: completion?.level || '',
    status: completion?.status || 'completed',
    completedAt: completion?.completedAt || now,
    source: completion?.source || 'self_reported',
    certificationId: completion?.certificationId || null,
  };

  let completionId = `local-${now}-${Math.random().toString(36).slice(2, 8)}`;
  if (id && firebaseReady && db) {
    try {
      const ref = await addDoc(collection(db, 'completions'), { completionId: '', ...payload });
      completionId = ref.id;
      await setDoc(doc(db, 'learners', id), { [pathwayKey || 'ladderProgress']: record[pathwayKey || 'ladderProgress'] || {} }, { merge: true });
    } catch (error) {
      console.warn('[data-layer] recordCompletion remote write failed (local cache kept):', error);
    }
  }
  return { completionId };
}

// ---- public: recordCertification -------------------------------------------

export async function recordCertification(evidencePacket, validation) {
  await ensureInit();
  const id = resolveLearnerId();
  const now = new Date().toISOString();

  const packet = { ...(evidencePacket || {}) };
  packet.learnerId = packet.learnerId || id || '';
  packet.dateTime = packet.dateTime || now;
  const evidenceStatus = VALID_EVIDENCE_STATUS.includes(packet.evidenceStatus)
    ? packet.evidenceStatus
    : (packet.result === 'pass' ? 'ai_verified' : 'self_reported');

  let evidencePacketId = `local-ep-${now}`;
  let certificationId = `local-cert-${now}`;
  let certificationValidationId = null;

  // denormalized summary onto the learner record (local-first)
  const record = readLocalRecord();
  record.learnerId = id || record.learnerId;
  const certSummary = {
    certificationId,
    pathway: packet.pathway || '',
    certificationTier: packet.certificationTier || '',
    ladderTier: packet.ladderTier || '',
    testDepth: packet.testDepth || '',
    result: packet.result || '',
    evidenceStatus,
    awardedAt: now,
  };
  record.ladderCertifications = [...(record.ladderCertifications || []), certSummary];
  if (validation) {
    record.certificationValidations = [...(record.certificationValidations || []), { ...validation, validatedAt: validation.validatedAt || now }];
  }
  writeLocalRecord(record);

  if (id && firebaseReady && db) {
    try {
      const epRef = await addDoc(collection(db, 'evidencePackets'), packet);
      evidencePacketId = epRef.id;

      if (validation) {
        const vPayload = {
          ...validation,
          learnerId: id,
          evidencePacketId,
          validatedAt: validation.validatedAt || now,
        };
        const vRef = await addDoc(collection(db, 'certificationValidations'), vPayload);
        certificationValidationId = vRef.id;
      }

      const certPayload = {
        learnerId: id,
        pathway: packet.pathway || '',
        certificationTier: packet.certificationTier || '',
        ladderTier: packet.ladderTier || '',
        testDepth: packet.testDepth || '',
        blueprintVersion: packet.blueprintVersion || '',
        rubricVersion: packet.rubricVersion || '',
        evidencePacketId,
        certificationValidationId,
        evidenceStatus,
        result: packet.result || '',
        finalDecision: packet.finalDecision || packet.result || '',
        challengeStatus: packet.challengeStatus || 'none',
        identityAssurance: packet.identityAssurance || record.identityAssurance || {},
        awardedAt: now,
        humanReviewRecommended: Boolean(packet.humanReviewRecommended),
        humanReviewTriggers: packet.humanReviewTriggers || [],
      };
      const certRef = await addDoc(collection(db, 'certifications'), certPayload);
      certificationId = certRef.id;

      // patch the denormalized summary id and push to the learner doc
      certSummary.certificationId = certificationId;
      await setDoc(doc(db, 'learners', id), {
        learnerId: id,
        ladderCertifications: record.ladderCertifications,
        certificationValidations: record.certificationValidations,
        studentTranscript: {
          updatedAt: now,
          ladderCertifications: record.ladderCertifications,
          certificationValidations: record.certificationValidations,
          standardsReviews: record.standardsReviews || [],
        },
      }, { merge: true });
      writeLocalRecord(record);
    } catch (error) {
      console.warn('[data-layer] recordCertification remote write failed (local cache kept):', error);
    }
  }

  return { certificationId, evidencePacketId, certificationValidationId };
}

// ---- public: recordStandardsEvidence ---------------------------------------

export async function recordStandardsEvidence(candidate) {
  await ensureInit();
  const id = resolveLearnerId();
  const now = new Date().toISOString();

  // ADVISORY ONLY: force candidate status; never trust caller-supplied upgrades.
  const payload = {
    ...(candidate || {}),
    learnerId: id || (candidate && candidate.learnerId) || '',
    status: 'candidate',
    reviewerStatus: 'candidate',
    reviewerType: 'ai',
    reviewerId: null,
    createdAt: candidate?.createdAt || now,
    reviewedAt: null,
    supersededBy: null,
  };

  // mirror a lightweight summary onto the learner record
  const record = readLocalRecord();
  record.learnerId = id || record.learnerId;
  record.standardsReviews = [...(record.standardsReviews || []), {
    standard: payload.linkedStandard || null,
    status: 'candidate',
    confidenceLabel: payload.confidenceLabel || 'low',
    createdAt: payload.createdAt,
  }];
  writeLocalRecord(record);

  let standardsEvidenceId = `local-se-${now}-${Math.random().toString(36).slice(2, 8)}`;
  if (id && firebaseReady && db) {
    try {
      const ref = await addDoc(collection(db, 'standardsEvidence'), payload);
      standardsEvidenceId = ref.id;
      await setDoc(doc(db, 'learners', id), {
        learnerId: id,
        standardsReviews: record.standardsReviews,
      }, { merge: true });
    } catch (error) {
      console.warn('[data-layer] recordStandardsEvidence remote write failed (local cache kept):', error);
    }
  }
  return { standardsEvidenceId };
}

export function isFirebaseReady() {
  return firebaseReady;
}
