// =============================================================================
// theladder-products/products-ladder.js
// Wiring layer between the Products catalog and the shared Ladder engines.
//
// This module builds the descriptors/blueprints the shared engines need so that
// products-app.js can stay focused on UI + state. It imports nothing from the
// engines itself — products-app.js owns engine construction — it only produces
// plain data the engines consume.
//
//   buildProductPlacementDescriptor(products, categoryRanges) -> descriptor
//       Turns the flat product catalog into createPlacementEngine items + the
//       three-score grant rules adapted to *product fluency*.
//
//   buildProductBlueprint({ product, level, depth }) -> examiner blueprint
//       Per (product, certification depth) examiner blueprint for
//       createCertificationEngine().buildExaminerSystemPrompt.
//
//   buildProductCertContext({ product, depth }) -> certification context
//       The context object recordCertificationResult / buildEvidencePacket need.
//
//   PRODUCT_IDENTITY_LEVELS — the three ACTIVE identity-assurance levels a
//       learner may resolve to before a product certification (doc-16):
//       self_attested, account_bound, identity_attested. proctored_verified is
//       intentionally absent — it is scaffolded, not active.
//
//   buildProductIdentityAssurance(earnedAt, gate) -> identity-assurance record
//       Full doc-16-shaped identity-assurance record built from the learner's
//       pre-certification gate selection. Populated at gate time, stored into
//       the certification context, the credential record, and the evidence
//       packet (so the data-layer credential row carries the honest level).
//
//   CERT_DEPTHS — the three product certification depths (Certification /
//       Expert / Master) with doc-16 depth fields.
// =============================================================================

// ---------------------------------------------------------------------------
// PLACEMENT — adapting the 3-score model to PRODUCT fluency.
//
// The shared placement engine speaks in three normalized scores. The Concepts
// ladder reads them as general AI fluency / technical depth / governance depth.
// For the Products pathway we re-interpret the SAME three axes as *product
// fluency* so a learner already fluent in a product category is not pushed
// remedial product courses:
//
//   capabilityScore  -> HANDS-ON TOOL USE. How confidently the learner already
//                       operates everyday AI products (assistants, writing,
//                       office, creative, productivity tools). High capability
//                       grants the mainstream/everyday product categories.
//   technicalScore   -> APIs / AUTOMATION / INFRASTRUCTURE. Comfort with the
//                       builder-grade product categories: coding tools, search
//                       + RAG, vector databases, data + analytics, agents +
//                       automation, model APIs + cloud. High technical grants
//                       those builder categories.
//   governanceScore  -> RESPONSIBLE / REGULATED USE. Comfort with regulated and
//                       risk-bearing product categories (Regulated AI). High
//                       governance grants the regulated-product category.
//
// grantRules returns the GROUP ids (category labels) the learner places out of.
// Categories NOT granted get their core products (low order in range) plus any
// interest-matched products assigned. So: grant the categories the learner is
// fluent in; assign specific products inside the categories they still need.
// ---------------------------------------------------------------------------

// Map each catalog category label to which score axis gates placing out of it,
// and the threshold. Thresholds rise with category difficulty.
const CATEGORY_GRANT_GATES = {
  'AI assistants':        (s) => s.capabilityScore >= 35,
  'Workplace + writing':  (s) => s.capabilityScore >= 40,
  'Design + slides':      (s) => s.capabilityScore >= 45,
  'Video + audio':        (s) => s.capabilityScore >= 45,
  'Sales + support':      (s) => s.capabilityScore >= 50,
  'Coding tools':         (s) => s.capabilityScore >= 55 && s.technicalScore >= 50,
  'Search + RAG':         (s) => s.technicalScore >= 55,
  'Vector databases':     (s) => s.technicalScore >= 60,
  'Data + analytics':     (s) => s.technicalScore >= 55,
  'Agents + automation':  (s) => s.technicalScore >= 60,
  'Model APIs + cloud':   (s) => s.technicalScore >= 65,
  'Regulated AI':         (s) => s.capabilityScore >= 55 && s.governanceScore >= 55
};

// Interest keyword map tuned for product-pathway language (extends the engine
// defaults so product reason-text matches well).
export const PRODUCT_INTEREST_KEYWORDS = {
  technical: ['api', 'sdk', 'json', 'structured', 'function', 'tool', 'rag', 'vector', 'agent', 'model', 'code', 'coding', 'deployment', 'inference', 'embedding'],
  business: ['business', 'workflow', 'marketing', 'sales', 'support', 'operations', 'crm', 'roi', 'enterprise'],
  governance: ['governance', 'law', 'legal', 'ethics', 'policy', 'privacy', 'risk', 'compliance', 'regulated', 'clinical', 'finance', 'security', 'audit'],
  creative: ['creative', 'image', 'video', 'audio', 'music', 'voice', 'media', 'content', 'design', 'slides', 'synthetic'],
  automation: ['automation', 'workflow', 'trigger', 'action', 'agent', 'orchestration', 'rpa', 'pipeline'],
  research: ['research', 'source', 'citation', 'fact', 'study', 'information', 'search', 'analysis', 'analytics'],
  security: ['security', 'prompt injection', 'red team', 'abuse', 'threat', 'privacy', 'incident', 'observability'],
  data: ['data', 'embedding', 'vector', 'retrieval', 'rag', 'search', 'metadata', 'analytics', 'bi', 'warehouse']
};

function categoryForProduct(product, categoryRanges) {
  // categoryRanges[0] is "All products"; skip it and find the real bucket.
  return categoryRanges.find((category) => (
    category.label !== 'All products' &&
    product.id >= category.start &&
    product.id <= category.end
  )) || null;
}

/**
 * Build a createPlacementEngine descriptor from the product catalog.
 * Items use the category label as `group`, and order within the category so the
 * lowest-numbered products in each non-granted category are auto-assigned core.
 */
export function buildProductPlacementDescriptor(products, categoryRanges) {
  const items = [];
  const orderByCategory = {};
  products.forEach((product) => {
    const category = categoryForProduct(product, categoryRanges);
    if (!category) return;
    orderByCategory[category.label] = (orderByCategory[category.label] || 0) + 1;
    items.push({
      id: `product-${product.id}`,
      label: product.name,
      group: category.label,
      order: orderByCategory[category.label],
      interestText: `${product.name} ${product.type} ${product.reason}`
    });
  });

  return {
    items,
    interestKeywords: PRODUCT_INTEREST_KEYWORDS,
    coreItemsPerGroup: 3,
    minLearnerTurns: 5,
    grantRules(scores) {
      return Object.entries(CATEGORY_GRANT_GATES)
        .filter(([, test]) => {
          try { return Boolean(test(scores)); } catch { return false; }
        })
        .map(([label]) => label);
    },
    assessment: {
      product: 'AESOP AI Academy Products',
      role: 'product placement assessor',
      intro: 'Your job is to assess how fluently the learner already uses real AI products, then decide which product CATEGORIES they can skip and which specific products to assign.',
      exchangeGuidance: 'Run a 5-7 exchange assessment. Ask one question at a time. Be warm, direct, and practical. Anchor questions in real product use, not abstract theory.',
      dimensions: [
        'Hands-on tool use (capabilityScore): which AI products they actually use day to day (assistants, writing, office, creative, productivity) and how confidently.',
        'APIs / automation / infrastructure (technicalScore): comfort with builder-grade products — coding tools, search + RAG, vector databases, data + analytics, agents + automation, model APIs + cloud.',
        'Responsible / regulated use (governanceScore): comfort with risk-bearing and regulated AI products (legal, clinical, finance, governance, security).',
        'Interests: which product areas energize them enough to keep learning.',
        'Application context: what work they want to get done with AI products.'
      ],
      styleGuidance: 'Use light scenario questions grounded in named products, not trivia. Include at least one builder/automation calibration question and one regulated/risk question. Do not make beginners feel punished. If they are technical, probe API and deployment depth.',
      redirectGuidance: 'Stay on product-fluency assessment. If they go off topic, redirect to AI product placement.',
      opener: 'Let us place you across the AI product catalog. I will gauge which products you already use well and which you actually want to learn. First: which AI products do you currently use, what do you use them for, and where do you feel least confident?'
    }
  };
}

// ---------------------------------------------------------------------------
// CERTIFICATION — three product depths reusing the doc-16 depth fields.
// ---------------------------------------------------------------------------

export const CERT_DEPTHS = [
  {
    id: 'certification',
    label: 'Certification',
    certificationTierLabel: 'Product Certification',
    outcome: 'Competent, defensible everyday use of the product for common work.',
    evidence: 'A guided assignment plus explanations of core features, fit, and one limitation.',
    passingStandard: 'Demonstrates correct core-feature use, safe defaults, and accurate explanation.',
    review: 'AI examiner with independent second-model validation.'
  },
  {
    id: 'expert',
    label: 'Expert certification',
    certificationTierLabel: 'Product Expert Certification',
    outcome: 'Chooses the right workflow, troubleshoots limits, compares alternatives, and can teach another learner.',
    evidence: 'A non-trivial scenario solved with a justified workflow, plus a comparison against an alternative product.',
    passingStandard: 'Transfers skill to a new context, handles edge cases, and defends tool choice.',
    review: 'AI examiner with independent second-model validation; higher ambiguity.'
  },
  {
    id: 'master',
    label: 'Master certification',
    certificationTierLabel: 'Product Master Certification',
    outcome: 'Designs a production workflow, evaluates risk, documents evidence, and defends every choice.',
    evidence: 'Portfolio-quality artifact: a production-ready workflow design with risk controls and evidence.',
    passingStandard: 'Original synthesis, standards mapping, risk governance, and leadership-level defense.',
    review: 'AI examiner with independent second-model validation; mastery rigor.'
  }
];

export function depthForLabel(label) {
  return CERT_DEPTHS.find((depth) => depth.label === label) || CERT_DEPTHS[0];
}

/**
 * Examiner blueprint for buildExaminerSystemPrompt(blueprint).
 * `level` is the course level the learner studied (Beginner/Intermediate/...),
 * used only to flavor the item label; the depth drives examiner rigor.
 */
export function buildProductBlueprint({ product, level, depth }) {
  const itemLabel = `${product.name} (${product.type})`;
  return {
    itemLabel,
    educationTierLabel: level ? `${level} product course` : 'Product course',
    certificationTierLabel: depth.certificationTierLabel,
    standards: `AESOP Product Competency — ${product.type}`,
    depthLabel: depth.label,
    depthOutcome: depth.outcome,
    depthEvidence: depth.evidence,
    depthPassingStandard: depth.passingStandard,
    depthReview: depth.review,
    languageLabel: 'English'
  };
}

/**
 * Context object for recordCertificationResult / buildEvidencePacket.
 * Field names follow what certification-engine.js reads (itemId/itemLabel,
 * testDepth*, certificationTier*, blueprintId, standards, attemptId).
 */
export function buildProductCertContext({ product, depth, learnerId }) {
  const attemptId = `prodcert_${product.id}_${depth.id}_${Date.now()}`;
  return {
    attemptId,
    pathway: 'product',
    learnerId: learnerId || '',
    itemId: product.id,
    itemLabel: `${product.name} (${product.type})`,
    certificationTierId: depth.id,
    certificationTierLabel: depth.certificationTierLabel,
    standards: `AESOP Product Competency — ${product.type}`,
    testDepthId: depth.id,
    testDepthLabel: depth.label,
    testDepthOutcome: depth.outcome,
    testDepthEvidence: depth.evidence,
    testDepthPassingStandard: depth.passingStandard,
    testDepthReview: depth.review,
    blueprintId: `product:${product.id}:${depth.id}`,
    blueprintVersion: 'v0.1',
    rubricVersion: 'v1',
    systemPromptVersion: 'v1'
  };
}

// ---------------------------------------------------------------------------
// IDENTITY ASSURANCE — lightweight pre-certification gate (doc-16).
//
// Before a learner STARTS any certification depth, products-app.js presents an
// identity step that resolves to one of the three ACTIVE levels below. The
// resolved record is stored on the certification context and flows into both
// the credential record and the evidence packet. proctored_verified is NOT
// offered here — it is scaffolded in doc-16 but has no provider workflow yet,
// so we never claim it.
// ---------------------------------------------------------------------------

export const PRODUCT_IDENTITY_LEVELS = [
  {
    id: 'self_attested',
    label: 'Self-attested',
    requiresSignature: false,
    accountRequired: false,
    description: 'You claim the work. No account or identity check beyond this browser session.'
  },
  {
    id: 'account_bound',
    label: 'Account-bound',
    requiresSignature: false,
    accountRequired: true,
    description: 'Your attempt is tied to a signed-in AESOP account, learner ID, and saved transcript record.'
  },
  {
    id: 'identity_attested',
    label: 'Identity-attested',
    requiresSignature: true,
    accountRequired: false,
    description: 'You sign an identity statement before the attempt, confirming you are the person named on the credential.'
  }
];

export function identityLevelById(levelId) {
  return PRODUCT_IDENTITY_LEVELS.find((level) => level.id === levelId) || null;
}

/**
 * Resolve the honest identity-assurance level from a gate selection. Never
 * blocks: if no account is present we fall back to self_attested (or
 * identity_attested when the learner signs the identity statement).
 *
 * @param {object} gate
 * @param {string} [gate.levelId]      learner's chosen level id
 * @param {boolean} [gate.adultAttested]   18+ adult attestation checkbox
 * @param {boolean} [gate.identitySigned]  identity-statement signature (for identity_attested)
 * @param {object|null} [gate.account]     { uid, email } when a Firebase user is signed in
 * @returns {{level:string, requiresSignature:boolean, accountRequired:boolean, adultAttested:boolean, identitySigned:boolean, account:object|null}}
 */
export function resolveProductIdentityLevel(gate = {}) {
  const account = gate.account && gate.account.uid ? gate.account : null;
  let levelId = gate.levelId;
  let level = identityLevelById(levelId);

  // account_bound requires a signed-in account; without one, fall back honestly.
  if (level && level.id === 'account_bound' && !account) {
    levelId = gate.identitySigned ? 'identity_attested' : 'self_attested';
    level = identityLevelById(levelId);
  }
  // No explicit choice: prefer account_bound when signed in, else the honest
  // signed/unsigned self level.
  if (!level) {
    levelId = account ? 'account_bound' : (gate.identitySigned ? 'identity_attested' : 'self_attested');
    level = identityLevelById(levelId);
  }

  return {
    level: level.id,
    requiresSignature: level.requiresSignature,
    accountRequired: level.accountRequired,
    adultAttested: Boolean(gate.adultAttested),
    identitySigned: Boolean(gate.identitySigned),
    account
  };
}

/**
 * Full doc-16-shaped identity-assurance record. Built at gate time from the
 * resolved level so the credential record + evidence packet carry the honest
 * level, account binding, and attestation. proctoringRequired is always false
 * and proctoringMode is always 'none' on this pathway.
 *
 * @param {string} earnedAt  ISO timestamp the credential/attempt is stamped with
 * @param {object} gate      gate selection (see resolveProductIdentityLevel)
 */
export function buildProductIdentityAssurance(earnedAt = new Date().toISOString(), gate = {}) {
  const resolved = resolveProductIdentityLevel(gate);
  const meta = identityLevelById(resolved.level);
  // "attested" tracks the identity-statement signature; account_bound and
  // self_attested do not sign, so attested is false unless the learner signed.
  const attested = resolved.requiresSignature ? resolved.identitySigned : false;
  return {
    level: resolved.level,
    label: meta ? meta.label : resolved.level,
    status: resolved.level,
    accountRequired: resolved.accountRequired,
    accountUid: resolved.account ? resolved.account.uid : '',
    accountEmail: resolved.account ? (resolved.account.email || '') : '',
    adultAttested: resolved.adultAttested,
    attested,
    attestedAt: attested ? earnedAt : null,
    proctoringRequired: false,
    proctoringMode: 'none'
  };
}
