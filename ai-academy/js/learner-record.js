// =============================================================================
// ai-academy/js/learner-record.js
// Surfacing-layer reader for the UNIFIED learner record across all three Ladder
// pathways (Concepts, Products, Use-Cases).
//
// WHY: transcript.html, students.html, and the credential pages historically
// read ONLY the Concepts-ladder localStorage state (`aesop-ladder-state`).
// Product and Use-Case completions/certifications are now durably recorded in
// the unified learner record (see docs/ladder-data-model.md and
// theladder-shared/data-layer.js, cache key `aesop-ladder-unified-record-v1`).
// This module aggregates ALL THREE pathways into one normalized view for the
// surfacing pages, without importing the full data-layer (which owns writes).
//
// READ ORDER (prefer durable + cross-device, degrade to offline-today):
//   1. Firestore `learners/{id}` document, when a getter is supplied and it
//      resolves — authoritative, works cross-device once Firebase syncs.
//   2. The unified localStorage cache `aesop-ladder-unified-record-v1` written
//      by the data-layer — works offline, populated on this device.
//   3. The per-pathway legacy localStorage keys — last-resort fallback so the
//      page still works for learners whose data predates the unified record:
//        - Concepts:  `aesop-ladder-state`
//        - Products:  `aesop-ladder-products-state-v1`
//        - Use-Cases: `aesop-ladder-use-cases-state-v1`
//
// This module never writes anything. It is no-throw at the boundary.
// =============================================================================

export const LS_UNIFIED_CACHE = 'aesop-ladder-unified-record-v1';
export const LS_CONCEPT_STATE = 'aesop-ladder-state';
export const LS_PRODUCTS_STATE = 'aesop-ladder-products-state-v1';
export const LS_USE_CASES_STATE = 'aesop-ladder-use-cases-state-v1';

// Evidence types carried on completions / certifications (doc-16 / data model).
export const EVIDENCE_LABELS = {
  completed:     { label: 'Completed',     short: 'Completed' },
  placed_out:    { label: 'Placed Out',    short: 'Placed Out' },
  ai_verified:   { label: 'AI Verified',   short: 'AI Verified' },
  verified:      { label: 'Verified',      short: 'Verified' },
  self_reported: { label: 'Self Reported', short: 'Self Reported' },
};

// Certification depth (test depth) → human label, used to show Cert/Expert/Master.
export const DEPTH_LABELS = {
  'placement':         'Assessment',
  'tier-test-out':     'Assessment',
  'certification':     'Certification',
  'mastery-challenge': 'Mastery',
};

function safeParse(raw) {
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function readLocal(key) {
  try { return safeParse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
}

/**
 * Normalize a depth/level string into one of Certification | Expert | Master.
 * Falls back to the raw label when it doesn't match a known depth.
 * @param {string} depth - testDepth or human level label
 * @returns {string}
 */
export function depthLabel(depth) {
  const raw = String(depth || '').toLowerCase();
  if (!raw) return '';
  if (raw.includes('master')) return 'Master';
  if (raw.includes('expert')) return 'Expert';
  if (DEPTH_LABELS[raw]) return DEPTH_LABELS[raw];
  if (raw.includes('mastery')) return 'Master';
  if (raw.includes('certification') || raw.includes('certified')) return 'Certification';
  if (raw.includes('assessment') || raw.includes('placement') || raw.includes('test-out')) return 'Assessment';
  return String(depth);
}

/**
 * Normalize an evidence status into a friendly label.
 * @param {string} status - completed | placed_out | ai_verified | verified | self_reported
 * @returns {{label:string, short:string, key:string}}
 */
export function evidenceLabel(status) {
  const key = String(status || '').toLowerCase();
  const entry = EVIDENCE_LABELS[key] || { label: status || 'Completed', short: status || 'Completed' };
  return { ...entry, key };
}

// ---- pathway extraction from a unified-shaped record -----------------------

function completionsFromProgress(progress) {
  const starts = (progress && progress.courseStarts) || {};
  return Object.entries(starts)
    .filter(([, v]) => v && (v.status === 'completed' || v.status === 'placed_out'))
    .map(([itemId, v]) => ({
      itemId,
      itemName: v.itemName || v.title || itemId,
      level: v.level || '',
      status: v.status || 'completed',
      evidenceStatus: v.status === 'placed_out' ? 'placed_out' : (v.source || 'self_reported'),
      completedAt: v.completedAt || v.savedAt || '',
    }));
}

function certsForPathway(record, pathway) {
  const all = Array.isArray(record && record.ladderCertifications) ? record.ladderCertifications : [];
  return all.filter((c) => c && c.pathway === pathway).map((c) => ({
    certificationId: c.certificationId || '',
    pathway: c.pathway || pathway,
    itemId: c.itemId || c.ladderTier || '',
    itemName: c.itemName || c.ladderTier || c.certificationTier || 'Certification',
    ladderTier: c.ladderTier || '',
    certificationTier: c.certificationTier || '',
    testDepth: c.testDepth || '',
    depth: depthLabel(c.testDepth),
    result: c.result || '',
    evidenceStatus: c.evidenceStatus || '',
    awardedAt: c.awardedAt || '',
  }));
}

// ---- legacy localStorage fallbacks -----------------------------------------

function conceptCountsFromLegacy() {
  const s = readLocal(LS_CONCEPT_STATE) || {};
  return {
    certified: s.heroTiersCertified || 0,
    expert: s.heroTiersExpert || 0,
    mastery: s.heroTiersMastered || 0,
  };
}

function conceptCountsFromRecord(record) {
  // Prefer per-pathway cert summaries when present; else fall back to the
  // legacy hero counters embedded in ladderProgress, else legacy LS state.
  const lp = (record && record.ladderProgress) || {};
  const certified = lp.heroTiersCertified;
  if (certified !== undefined || lp.heroTiersExpert !== undefined || lp.heroTiersMastered !== undefined) {
    return {
      certified: lp.heroTiersCertified || 0,
      expert: lp.heroTiersExpert || 0,
      mastery: lp.heroTiersMastered || 0,
    };
  }
  return conceptCountsFromLegacy();
}

/**
 * Build a unified-shaped record from the legacy per-pathway localStorage keys.
 * Used only when neither Firestore nor the unified cache is available.
 */
function recordFromLegacyLocal() {
  return {
    ladderProgress: readLocal(LS_CONCEPT_STATE) || {},
    productProgress: readLocal(LS_PRODUCTS_STATE) || {},
    useCaseProgress: readLocal(LS_USE_CASES_STATE) || {},
    ladderCertifications: [],
  };
}

/**
 * Merge a Firestore record over a local record, per-pathway, so neither
 * clobbers the other. Mirrors theladder-shared/data-layer.js mergeRecords.
 */
function mergeRecords(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const merged = { ...local, ...remote };
  for (const key of ['ladderProgress', 'productProgress', 'useCaseProgress']) {
    merged[key] = { ...(local[key] || {}), ...(remote[key] || {}) };
  }
  // ladderCertifications: prefer the longer / remote list (remote is durable).
  const localCerts = Array.isArray(local.ladderCertifications) ? local.ladderCertifications : [];
  const remoteCerts = Array.isArray(remote.ladderCertifications) ? remote.ladderCertifications : [];
  merged.ladderCertifications = remoteCerts.length >= localCerts.length ? remoteCerts : localCerts;
  return merged;
}

/**
 * Read the best-available unified record.
 *
 * @param {Object}   [opts]
 * @param {string}   [opts.learnerId]   - learner id, used for the Firestore read
 * @param {Function} [opts.fetchRemote] - async (learnerId) => Firestore doc data | null.
 *                                         Supply this to enable cross-device reads;
 *                                         omit for offline / localStorage-only mode.
 * @returns {Promise<Object>} unified-shaped record (never throws)
 */
export async function loadUnifiedRecord(opts = {}) {
  const cached = readLocal(LS_UNIFIED_CACHE);
  let base = cached || recordFromLegacyLocal();

  // If the unified cache is empty of all three pathways, layer in legacy keys
  // so a learner mid-migration still sees their Concepts/Product/Use-Case work.
  if (cached) {
    const legacy = recordFromLegacyLocal();
    base = mergeRecords(legacy, cached);
  }

  if (opts.fetchRemote && opts.learnerId) {
    try {
      const remote = await opts.fetchRemote(opts.learnerId);
      if (remote) base = mergeRecords(base, remote);
    } catch (error) {
      console.warn('[learner-record] remote read failed; using local data:', error);
    }
  }
  return base || {};
}

/**
 * Normalize a unified record into a per-pathway view for the surfacing pages.
 *
 * @param {Object} record - unified-shaped record (from loadUnifiedRecord)
 * @returns {{
 *   concept: {certified:number, expert:number, mastery:number, certs:Array},
 *   products: {completions:Array, certs:Array},
 *   useCases: {completions:Array, certs:Array}
 * }}
 */
export function normalizePathways(record) {
  const rec = record || {};
  return {
    concept: {
      ...conceptCountsFromRecord(rec),
      certs: certsForPathway(rec, 'concept'),
    },
    products: {
      completions: completionsFromProgress(rec.productProgress),
      certs: certsForPathway(rec, 'product'),
    },
    useCases: {
      completions: completionsFromProgress(rec.useCaseProgress),
      certs: certsForPathway(rec, 'use-case'),
    },
  };
}

/**
 * Convenience: load + normalize in one call.
 * @param {Object} [opts] - same as loadUnifiedRecord
 */
export async function loadPathways(opts = {}) {
  const record = await loadUnifiedRecord(opts);
  return normalizePathways(record);
}
