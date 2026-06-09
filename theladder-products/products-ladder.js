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
//   buildProductIdentityAssurance(startedAt) -> identity-assurance record
//       Minimal identity-assurance snapshot mirroring the Concepts ladder.
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

/**
 * Minimal identity-assurance snapshot. Mirrors the Concepts ladder's record
 * shape (doc-data-model section 3) without the auth gate (out of scope here).
 */
export function buildProductIdentityAssurance(startedAt = new Date().toISOString()) {
  return {
    level: 'session_only',
    accountBound: false,
    method: 'anonymous_session',
    attestedAt: startedAt
  };
}
