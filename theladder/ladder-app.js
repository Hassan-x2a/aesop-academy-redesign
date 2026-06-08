import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { FIREBASE_CONFIG } from '/ai-academy/js/firebase-config.js';
import { DEFAULT_RESOURCES, LADDER_TIERS, LADDER_VERSION, LANGUAGES } from './ladder-data.js';

const PROXY_URL = '/aesop-api/proxy.php';
const LS_ID = 'aesop-learner-id';
const LS_STATE = 'aesop-ladder-state';
const LS_THEME = 'aesop-theme';
const PLACEMENT_REGEX = /<!--LADDER_PLACEMENT_COMPLETE:([\s\S]*?)-->/;
const TRANSCRIPT_STATUS = {
  COMPLETED: 'completed',
  PLACED_OUT: 'placed_out',
  VERIFIED: 'verified',
  SELF_REPORTED: 'self_reported'
};
const LAB_TYPES = {
  DEBATE: {
    id: 'debate',
    label: 'Debate',
    title: 'Defend a position',
    summary: 'Take a position, respond to challenge, and decide whether your reasoning holds.',
    action: 'debate',
    completion: 'A defended position with at least one revision or justification under pressure.'
  },
  SKILL: {
    id: 'skill',
    label: 'Skill',
    title: 'Apply a technique',
    summary: 'Use a repeatable framework or technique on a concrete example.',
    action: 'skill',
    completion: 'A completed application of the technique with evidence, limits, and next steps.'
  },
  BUILD: {
    id: 'build',
    label: 'Build',
    title: 'Produce an artifact',
    summary: 'Create a small usable output, then explain the choices that shaped it.',
    action: 'build',
    completion: 'A concrete artifact such as a policy, checklist, prompt, workflow, spec, or plan.'
  }
};

const VOCAB_DEFINITIONS = {
  'artificial intelligence': 'Computer systems that perform tasks usually associated with human intelligence, such as reasoning, language, perception, planning, prediction, or decision support.',
  'machine learning': 'A way of building software where patterns are learned from data instead of being written as fixed rules by a programmer.',
  'generative AI': 'AI that creates new outputs such as text, images, audio, video, code, plans, summaries, or structured data.',
  'model': 'The trained system that receives inputs and produces outputs based on patterns learned during training and instructions provided at use time.',
  'chatbot': 'A conversational interface that lets a user interact with software or an AI model through messages.',
  'assistant': 'An AI system designed to help with tasks through conversation, tool use, reasoning, or workflow support.',
  'prompt': 'The instruction, question, context, or data a user gives an AI system to guide its response.',
  'response': 'The output produced by an AI system after receiving a prompt or other input.',
  'token': 'A chunk of text used by language models, often a word fragment, word, punctuation mark, or symbol.',
  'context': 'The information available to the model in the current interaction, including messages, files, retrieved data, and instructions.',
  'training data': 'The examples used to train a model before it is deployed, separate from the user input it sees during a live conversation.',
  'inference': 'The moment a trained model is used to produce an output from a new input.',
  'hallucination': 'A confident AI response that is inaccurate, unsupported, fabricated, or not grounded in reliable evidence.',
  'multimodal': 'Able to work with more than one type of input or output, such as text, images, audio, video, or files.',
  'privacy': 'The protection and responsible handling of personal, sensitive, confidential, or identifying information.',
  'system prompt': 'A high-priority instruction that shapes how an AI assistant should behave across a conversation.',
  'user prompt': 'The instruction, question, or message supplied by the user during an AI interaction.',
  'role prompt': 'A prompt that asks the AI to respond from a particular perspective, job, expertise, or audience role.',
  'instruction': 'A directive that tells the AI what to do, avoid, prioritize, or produce.',
  'constraint': 'A limit or rule placed on an AI response, such as format, length, source use, tone, or allowed actions.',
  'example': 'A sample input or output used to show the AI the pattern, style, or quality expected.',
  'few-shot': 'Prompting with a small number of examples so the model can imitate the desired pattern.',
  'output format': 'The required structure of the AI response, such as bullets, JSON, a table, a checklist, or a short paragraph.',
  'tone': 'The style or emotional quality of writing, such as formal, plainspoken, encouraging, technical, or concise.',
  'persona': 'The role, voice, or identity a prompt asks the AI to adopt for a response.',
  'grounding': 'Connecting an AI answer to provided facts, documents, sources, data, or verified context.',
  'source': 'The origin of information used to support a claim, such as a document, article, dataset, official page, or primary record.',
  'citation': 'A reference that points to the source supporting a statement, quote, fact, or claim.',
  'follow-up': 'A later question or instruction that builds on the previous answer in the same conversation.',
  'prompt template': 'A reusable prompt structure with slots for task-specific details.',
  'primary source': 'Original evidence or first-hand material, such as a law, study, dataset, official documentation, transcript, or direct record.',
  'secondary source': 'A source that summarizes, interprets, or comments on primary sources.',
  'claim': 'A statement that can be checked, supported, challenged, or refined with evidence.',
  'evidence': 'Information that supports or weakens a claim, such as data, examples, citations, observations, or source material.',
  'summary': 'A shortened version of information that preserves the main points.',
  'synthesis': 'Combining information from multiple sources or ideas into a coherent understanding.',
  'literature review': 'A structured review of existing research and sources on a topic.',
  'fact-checking': 'The process of verifying whether a claim is accurate, supported, current, and properly sourced.',
  'recency': 'How current information is and whether it may have changed since publication.',
  'credibility': 'How trustworthy a source or claim is based on evidence, expertise, transparency, and reliability.',
  'bias': 'A systematic slant, preference, omission, or distortion that affects how information is produced or interpreted.',
  'media literacy': 'The ability to evaluate, interpret, verify, and responsibly use information from media and digital sources.',
  'epistemic humility': 'Recognizing the limits of what you know and staying open to correction when evidence changes.',
  'workflow': 'A repeatable sequence of tasks, decisions, tools, and handoffs used to get work done.',
  'sop': 'A standard operating procedure: a documented process for doing a task consistently.',
  'template': 'A reusable structure for producing similar outputs with less repeated setup.',
  'knowledge base': 'An organized collection of information used for reference, support, retrieval, or training.',
  'meeting note': 'A record of discussion, decisions, questions, and action items from a meeting.',
  'action item': 'A specific task assigned to a person or team after a discussion or decision.',
  'human-in-the-loop': 'A workflow where a person reviews, approves, corrects, or guides AI output before it is used.',
  'api': 'An application programming interface: a structured way for software systems to communicate with each other.',
  'json': 'A common structured data format using key-value pairs and arrays, often used in APIs and AI outputs.',
  'rag': 'Retrieval-augmented generation: a pattern where an AI retrieves relevant information before generating an answer.',
  'embedding': 'A numeric representation of text, images, or other data that helps compare meaning or similarity.',
  'vector database': 'A database optimized for storing and searching embeddings by similarity.',
  'agent': 'An AI system that can pursue a goal through multiple steps, often using tools, memory, or external systems.',
  'tool use': 'The ability for an AI system to call external tools, APIs, functions, files, or services.',
  'function calling': 'A structured way for an AI model to request a predefined function or tool with specific arguments.',
  'evaluation': 'The process of testing whether an AI system performs well, safely, and reliably for a defined task.',
  'red-teaming': 'Adversarial testing that tries to find failures, harms, misuse paths, or vulnerabilities before deployment.',
  'prompt injection': 'An attack or failure mode where malicious or conflicting instructions try to override the intended behavior of an AI system.',
  'governance': 'The policies, roles, reviews, and accountability structures that guide responsible AI use.',
  'compliance': 'Following applicable laws, regulations, contracts, policies, and standards.',
  'copyright': 'A legal framework that protects original creative works and affects how content can be copied, transformed, or reused.',
  'risk': 'The possibility that an AI system or use case could cause harm, error, cost, exposure, or unintended consequences.',
  'audit trail': 'A record of actions, decisions, changes, approvals, or outputs that can be reviewed later.',
  'vendor risk': 'Risk created by relying on an outside provider, including privacy, reliability, security, lock-in, cost, and compliance concerns.'
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const state = {
  learnerId: localStorage.getItem(LS_ID) || '',
  theme: localStorage.getItem(LS_THEME) === 'dark' ? 'dark' : 'light',
  language: 'en',
  customLanguage: '',
  activeTierId: LADDER_TIERS[0].id,
  activeTopicId: LADDER_TIERS[0].topics[0].id,
  activeVocabTerm: LADDER_TIERS[0].vocabulary[0],
  searchQuery: '',
  placementExpanded: false,
  messages: [],
  progress: {
    completedTopics: {},
    completedLabs: {},
    vocabulary: {},
    selfAssignedTopicIds: [],
    placement: null,
    assessmentMessages: [],
    transcriptEvents: []
  }
};

const el = {
  languageSelect: document.getElementById('languageSelect'),
  customLanguageInput: document.getElementById('customLanguageInput'),
  darkToggle: document.getElementById('darkToggle'),
  learnerIdLabel: document.getElementById('learnerIdLabel'),
  learnerLookup: document.getElementById('learnerLookup'),
  lookupBtn: document.getElementById('lookupBtn'),
  topicSearchInput: document.getElementById('topicSearchInput'),
  topicSearchResults: document.getElementById('topicSearchResults'),
  placementSection: document.getElementById('placementSection'),
  placementStatus: document.getElementById('placementStatus'),
  placementSummary: document.getElementById('placementSummary'),
  placementMetrics: document.getElementById('placementMetrics'),
  startPlacementBtn: document.getElementById('startPlacementBtn'),
  togglePlacementBtn: document.getElementById('togglePlacementBtn'),
  resetPlacementBtn: document.getElementById('resetPlacementBtn'),
  placementProfilePrompt: document.getElementById('placementProfilePrompt'),
  applyPlacementProfileBtn: document.getElementById('applyPlacementProfileBtn'),
  dismissProfilePromptBtn: document.getElementById('dismissProfilePromptBtn'),
  assessmentTurnCount: document.getElementById('assessmentTurnCount'),
  assessmentTopBtn: document.getElementById('assessmentTopBtn'),
  assessmentLatestBtn: document.getElementById('assessmentLatestBtn'),
  assessmentLog: document.getElementById('assessmentLog'),
  assessmentForm: document.getElementById('assessmentForm'),
  assessmentInput: document.getElementById('assessmentInput'),
  assessmentSend: document.getElementById('assessmentSend'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  tierCompletionStatus: document.getElementById('tierCompletionStatus'),
  tierList: document.getElementById('tierList'),
  activeTierLabel: document.getElementById('activeTierLabel'),
  activeTopicTitle: document.getElementById('activeTopicTitle'),
  completeTopicBtn: document.getElementById('completeTopicBtn'),
  vocabCount: document.getElementById('vocabCount'),
  vocabList: document.getElementById('vocabList'),
  vocabDefinitionTerm: document.getElementById('vocabDefinitionTerm'),
  vocabDefinitionBox: document.getElementById('vocabDefinitionBox'),
  vocabPromptForm: document.getElementById('vocabPromptForm'),
  vocabPromptInput: document.getElementById('vocabPromptInput'),
  resourceList: document.getElementById('resourceList'),
  researchBtn: document.getElementById('researchBtn'),
  startConversationBtn: document.getElementById('startConversationBtn'),
  chatLog: document.getElementById('chatLog'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  assignmentSummary: document.getElementById('assignmentSummary'),
  assignmentTypeBadge: document.getElementById('assignmentTypeBadge'),
  assignmentTitle: document.getElementById('assignmentTitle'),
  assignmentPrompt: document.getElementById('assignmentPrompt'),
  assignmentChecklist: document.getElementById('assignmentChecklist'),
  completeLabBtn: document.getElementById('completeLabBtn'),
  transcriptList: document.getElementById('transcriptList'),
  exportTranscriptBtn: document.getElementById('exportTranscriptBtn')
};

function generateLearnerId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return `AESOP-${code}`;
}

function topicKey(topicId) {
  return `${LADDER_VERSION}:${topicId}`;
}

function getActiveTier() {
  return LADDER_TIERS.find((tier) => tier.id === state.activeTierId) || LADDER_TIERS[0];
}

function getActiveTopic() {
  const tier = getActiveTier();
  return tier.topics.find((topic) => topic.id === state.activeTopicId) || tier.topics[0];
}

function allTopics() {
  return LADDER_TIERS.flatMap((tier) => tier.topics);
}

function topicById(topicId) {
  return allTopics().find((topic) => topic.id === topicId);
}

function tierById(tierId) {
  return LADDER_TIERS.find((tier) => tier.id === tierId) || LADDER_TIERS[0];
}

function languageLabel() {
  if (state.language === 'custom') return state.customLanguage || 'the learner selected language';
  return LANGUAGES.find((item) => item.code === state.language)?.label || 'English';
}

function interestText(placement) {
  if (!placement || !placement.interestTags?.length) return 'general AI fluency';
  return placement.interestTags.join(', ');
}

function assignedTopicsByTier(assignedTopicIds = []) {
  const assigned = new Set(assignedTopicIds);
  return LADDER_TIERS.map((tier) => ({
    tier,
    topics: tier.topics.filter((topic) => assigned.has(topic.id))
  })).filter((group) => group.topics.length);
}

function assignedTopicIds() {
  return [
    ...(state.progress.placement?.assignedTopicIds || []),
    ...(state.progress.selfAssignedTopicIds || [])
  ].filter((topicId, index, list) => topicId && list.indexOf(topicId) === index);
}

function isTopicAssigned(topicId) {
  return assignedTopicIds().includes(topicId);
}

function grantRules(capabilityScore, technicalScore, governanceScore) {
  const rules = [
    ['tier-01', capabilityScore >= 25],
    ['tier-02', capabilityScore >= 35],
    ['tier-03', capabilityScore >= 45],
    ['tier-04', capabilityScore >= 55],
    ['tier-05', capabilityScore >= 60],
    ['tier-06', capabilityScore >= 65],
    ['tier-07', capabilityScore >= 70],
    ['tier-08', capabilityScore >= 70 && technicalScore >= 45],
    ['tier-09', capabilityScore >= 75 && technicalScore >= 55],
    ['tier-10', capabilityScore >= 80 && technicalScore >= 65],
    ['tier-11', capabilityScore >= 85 && technicalScore >= 75],
    ['tier-12', capabilityScore >= 75 && technicalScore >= 55],
    ['tier-13', capabilityScore >= 70 && governanceScore >= 55],
    ['tier-14', capabilityScore >= 88 && technicalScore >= 80],
    ['tier-15', capabilityScore >= 80 && governanceScore >= 50]
  ];
  return rules.filter(([, granted]) => granted).map(([tierId]) => tierId);
}

function topicMatchesInterest(topic, tier, tags) {
  const haystack = `${topic.title} ${tier.title}`.toLowerCase();
  return tags.some((tag) => {
    const words = {
      technical: ['api', 'json', 'structured', 'function', 'tool', 'rag', 'vector', 'agent', 'model', 'code', 'deployment'],
      business: ['business', 'workflow', 'marketing', 'sales', 'support', 'operations', 'strategy', 'roi'],
      governance: ['governance', 'law', 'ethics', 'policy', 'privacy', 'risk', 'compliance', 'copyright', 'bias'],
      creative: ['creative', 'image', 'video', 'audio', 'media', 'content', 'design', 'synthetic'],
      automation: ['automation', 'workflow', 'trigger', 'action', 'agent', 'tool', 'orchestration'],
      research: ['research', 'source', 'citation', 'fact', 'study', 'information', 'search'],
      security: ['security', 'prompt injection', 'red team', 'abuse', 'threat', 'privacy'],
      data: ['data', 'embedding', 'vector', 'retrieval', 'rag', 'search', 'metadata']
    }[tag] || [tag];
    return words.some((word) => haystack.includes(word));
  });
}

function assignedTopicsForPlacement(grantedTierIds, interestTags) {
  const granted = new Set(grantedTierIds);
  const assigned = [];
  LADDER_TIERS.forEach((tier) => {
    if (granted.has(tier.id)) return;
    const core = tier.topics.filter((topic) => topic.order <= 4 || topic.title.toLowerCase().includes('self-assessment'));
    const matched = tier.topics.filter((topic) => topicMatchesInterest(topic, tier, interestTags));
    [...core, ...matched].forEach((topic) => {
      if (!assigned.includes(topic.id)) assigned.push(topic.id);
    });
  });
  return assigned;
}

function normalizePlacementSignals(raw) {
  const capabilityScore = clampInt(raw.capabilityScore ?? raw.aptitudeScore ?? 0, 0, 100);
  const technicalScore = clampInt(raw.technicalScore ?? raw.technical_score ?? 0, 0, 100);
  const governanceScore = clampInt(raw.governanceScore ?? raw.governance_score ?? 0, 0, 100);
  const interestTags = normalizeTags(raw.interestTags ?? raw.interest_tags);
  const grantedTierIds = grantRules(capabilityScore, technicalScore, governanceScore);
  return {
    completedAt: new Date().toISOString(),
    capabilityScore,
    technicalScore,
    governanceScore,
    interestTags,
    grantedTierIds,
    assignedTopicIds: assignedTopicsForPlacement(grantedTierIds, interestTags),
    reasoning: String(raw.reasoning || '').slice(0, 500),
    evidence: TRANSCRIPT_STATUS.VERIFIED
  };
}

function statusLabel(status) {
  const labels = {
    [TRANSCRIPT_STATUS.COMPLETED]: 'Completed',
    [TRANSCRIPT_STATUS.PLACED_OUT]: 'Placed out',
    [TRANSCRIPT_STATUS.VERIFIED]: 'Verified',
    [TRANSCRIPT_STATUS.SELF_REPORTED]: 'Self-reported'
  };
  return labels[status] || 'Self-reported';
}

function normalizeTags(value) {
  const allowed = ['technical', 'business', 'governance', 'creative', 'automation', 'research', 'security', 'data', 'strategy', 'education'];
  const raw = Array.isArray(value) ? value : [];
  const tags = raw.map((tag) => String(tag).toLowerCase().trim()).filter((tag) => allowed.includes(tag));
  return [...new Set(tags)].slice(0, 5);
}

function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function saveLocal() {
  localStorage.setItem(LS_STATE, JSON.stringify({
    language: state.language,
    customLanguage: state.customLanguage,
    activeTierId: state.activeTierId,
    activeTopicId: state.activeTopicId,
    activeVocabTerm: state.activeVocabTerm,
    placementExpanded: state.placementExpanded,
    progress: state.progress
  }));
}

async function saveRemote() {
  if (!state.learnerId) return;
  try {
    await setDoc(doc(db, 'learners', state.learnerId), {
      learnerId: state.learnerId,
      lastActiveAt: new Date().toISOString(),
      ladderProgress: {
        version: LADDER_VERSION,
        language: state.language,
        customLanguage: state.customLanguage,
        activeTierId: state.activeTierId,
        activeTopicId: state.activeTopicId,
        activeVocabTerm: state.activeVocabTerm,
        completedTopics: state.progress.completedTopics,
        completedLabs: state.progress.completedLabs,
        vocabulary: state.progress.vocabulary,
        selfAssignedTopicIds: state.progress.selfAssignedTopicIds,
        placement: state.progress.placement,
        assessmentMessages: state.progress.assessmentMessages,
        transcriptEvents: state.progress.transcriptEvents
      }
    }, { merge: true });
  } catch (error) {
    console.warn('Could not save ladder progress:', error);
  }
}

async function persist() {
  saveLocal();
  await saveRemote();
}

async function loadRemote(learnerId) {
  try {
    const snap = await getDoc(doc(db, 'learners', learnerId));
    if (!snap.exists()) {
      await setDoc(doc(db, 'learners', learnerId), {
        learnerId,
        createdAt: new Date().toISOString(),
        courseProgress: {},
        ladderProgress: {
          version: LADDER_VERSION,
          createdAt: new Date().toISOString()
        }
      }, { merge: true });
      return;
    }

    const data = snap.data();
    if (!data.ladderProgress) return;
    const ladder = data.ladderProgress;
    state.language = ladder.language || state.language;
    state.customLanguage = ladder.customLanguage || state.customLanguage;
    state.activeTierId = ladder.activeTierId || state.activeTierId;
    state.activeTopicId = ladder.activeTopicId || state.activeTopicId;
    state.activeVocabTerm = ladder.activeVocabTerm || state.activeVocabTerm;
    state.progress.completedTopics = ladder.completedTopics || {};
    state.progress.completedLabs = ladder.completedLabs || {};
    state.progress.vocabulary = ladder.vocabulary || {};
    state.progress.selfAssignedTopicIds = ladder.selfAssignedTopicIds || [];
    state.progress.placement = ladder.placement || null;
    state.progress.assessmentMessages = ladder.assessmentMessages || [];
    state.progress.transcriptEvents = ladder.transcriptEvents || [];
    state.placementExpanded = !state.progress.placement;
  } catch (error) {
    console.warn('Could not load ladder progress:', error);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.language = saved.language || state.language;
    state.customLanguage = saved.customLanguage || state.customLanguage;
    state.activeTierId = saved.activeTierId || state.activeTierId;
    state.activeTopicId = saved.activeTopicId || state.activeTopicId;
    state.activeVocabTerm = saved.activeVocabTerm || state.activeVocabTerm;
    state.placementExpanded = saved.placementExpanded ?? state.placementExpanded;
    state.progress = saved.progress || state.progress;
    state.progress.completedTopics ||= {};
    state.progress.completedLabs ||= {};
    state.progress.vocabulary ||= {};
    state.progress.selfAssignedTopicIds ||= [];
    state.progress.placement ||= null;
    state.progress.assessmentMessages ||= [];
    state.progress.transcriptEvents ||= [];
    if (state.progress.placement && saved.placementExpanded === undefined) state.placementExpanded = false;
  } catch (error) {
    console.warn('Could not load local ladder state:', error);
  }
}

function addTranscript(eventType, title, detail, options = {}) {
  state.progress.transcriptEvents.unshift({
    eventType,
    status: options.status || TRANSCRIPT_STATUS.SELF_REPORTED,
    title,
    detail,
    topicId: getActiveTopic().id,
    topicTitle: getActiveTopic().title,
    tierTitle: getActiveTier().title,
    timestamp: new Date().toISOString(),
    evidence: options.evidence || TRANSCRIPT_STATUS.SELF_REPORTED
  });
  state.progress.transcriptEvents = state.progress.transcriptEvents.slice(0, 80);
}

function parsePlacementResponse(rawText) {
  const visibleText = String(rawText || '').replace(PLACEMENT_REGEX, '').trim();
  const match = String(rawText || '').match(PLACEMENT_REGEX);
  if (!match) return { placement: null, visibleText };
  try {
    return { placement: normalizePlacementSignals(JSON.parse(match[1])), visibleText };
  } catch (error) {
    console.warn('Could not parse placement signal:', error);
    return { placement: null, visibleText };
  }
}

function placementSystemPrompt() {
  return `You are The Ladder placement assessor inside AESOP AI Academy.

Your job is to assess BOTH interest and capability, then decide what the learner can test out of and what they should be assigned.

Preferred language: ${languageLabel()}.

Run a 5-7 exchange assessment. Ask one question at a time. Be warm, direct, and practical.

Assess these dimensions:
1. General AI fluency: vocabulary, limits, prompting, verification, everyday use.
2. Technical depth: APIs, JSON, code, data, RAG, agents, evals, deployment.
3. Governance depth: privacy, copyright, ethics, law, security, vendor risk, policy.
4. Interests: what topics energize them enough to keep learning.
5. Application context: what they want to be able to do after learning.

Use light scenario questions, not trivia. Include at least one technical calibration question and one governance/risk question. Do not make beginners feel punished. If they are technical, increase depth.

Allowed interestTags:
technical, business, governance, creative, automation, research, security, data, strategy, education

When you have enough signal after at least 5 learner replies:
1. Give a short visible summary.
2. Append this exact marker on a new line:
<!--LADDER_PLACEMENT_COMPLETE:{"capabilityScore":NN,"technicalScore":NN,"governanceScore":NN,"interestTags":["tag1","tag2"],"reasoning":"one concise sentence"}-->

Rules:
- Scores are integers 0-100.
- interestTags must use the allowed list.
- Do not mention the marker or JSON to the learner.
- Stay on assessment. If they go off topic, redirect to AI learning placement.`;
}

function placementOpener() {
  return 'Let us place you on The Ladder. I will assess both what you already know and what you actually care about learning. First: describe your current relationship with AI. What tools have you used, what have you built or tried, and what feels most interesting or useful to you?';
}

async function ensureLearnerId() {
  if (state.learnerId) return;
  state.learnerId = generateLearnerId();
  localStorage.setItem(LS_ID, state.learnerId);
  try {
    await setDoc(doc(db, 'learners', state.learnerId), {
      learnerId: state.learnerId,
      createdAt: new Date().toISOString(),
      courseProgress: {}
    }, { merge: true });
  } catch (error) {
    console.warn('Could not create learner record immediately:', error);
  }
}

async function startPlacementAssessment() {
  await ensureLearnerId();
  state.placementExpanded = true;
  state.progress.assessmentMessages = [{ role: 'assistant', content: placementOpener() }];
  state.progress.placement = null;
  addTranscript('placement_assessment_started', 'Ladder placement started', 'Started the Ladder placement assessment.');
  await persist();
  render();
}

async function submitPlacementAssessment(event) {
  event.preventDefault();
  const text = el.assessmentInput.value.trim();
  if (!text) return;
  await ensureLearnerId();
  el.assessmentInput.value = '';
  el.assessmentSend.disabled = true;
  state.progress.assessmentMessages.push({ role: 'user', content: text });
  renderPlacement();

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.progress.assessmentMessages,
        system_prompt: placementSystemPrompt(),
        max_tokens: 800
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || data?.error || '';
    const { placement, visibleText } = parsePlacementResponse(rawText);
    state.progress.assessmentMessages.push({
      role: 'assistant',
      content: visibleText || 'Tell me a little more about what you have used, what you understand, and where you want to go next.'
    });
    if (placement && userAssessmentTurns() >= 5) {
      applyPlacement(placement);
    }
  } catch (error) {
    state.progress.assessmentMessages.push({
      role: 'assistant',
      content: 'AI is temporarily unavailable. Practice placement mode: tell me what AI tools you use, whether you code, what risks you understand, and what you want to learn. You can continue when the guide reconnects.'
    });
  }

  el.assessmentSend.disabled = false;
  await persist();
  render();
}

function userAssessmentTurns() {
  return state.progress.assessmentMessages.filter((message) => message.role === 'user').length;
}

function scrollAssessment(position) {
  if (!el.assessmentLog) return;
  el.assessmentLog.scrollTop = position === 'top' ? 0 : el.assessmentLog.scrollHeight;
  el.assessmentLog.focus({ preventScroll: true });
}

function applyPlacement(placement) {
  state.progress.placement = {
    ...placement,
    profileAppliedAt: null,
    profileDeclinedAt: null
  };
  state.placementExpanded = false;
  const now = new Date().toISOString();
  const granted = new Set(placement.grantedTierIds);
  Object.keys(state.progress.completedTopics).forEach((key) => {
    if (state.progress.completedTopics[key]?.status === TRANSCRIPT_STATUS.PLACED_OUT) {
      delete state.progress.completedTopics[key];
    }
  });
  LADDER_TIERS.forEach((tier) => {
    if (!granted.has(tier.id)) return;
    tier.topics.forEach((topic) => {
      state.progress.completedTopics[topicKey(topic.id)] = {
        status: TRANSCRIPT_STATUS.PLACED_OUT,
        completedAt: now,
        evidence: TRANSCRIPT_STATUS.VERIFIED,
        language: state.language
      };
    });
  });
  const firstAssigned = allTopics().find((topic) => placement.assignedTopicIds.includes(topic.id));
  if (firstAssigned) {
    state.activeTopicId = firstAssigned.id;
    state.activeTierId = firstAssigned.tierId;
  }
  addTranscript(
    'placement_assessment_completed',
    'Ladder placement completed',
    `Placed out of ${placement.grantedTierIds.length} tiers and assigned ${placement.assignedTopicIds.length} rungs. Interests: ${interestText(placement)}.`,
    { status: TRANSCRIPT_STATUS.VERIFIED, evidence: TRANSCRIPT_STATUS.VERIFIED }
  );
}

async function resetPlacementAssessment() {
  state.placementExpanded = true;
  state.progress.placement = null;
  state.progress.assessmentMessages = [];
  Object.keys(state.progress.completedTopics).forEach((key) => {
    if (state.progress.completedTopics[key]?.status === TRANSCRIPT_STATUS.PLACED_OUT) {
      delete state.progress.completedTopics[key];
    }
  });
  addTranscript('placement_assessment_reset', 'Ladder placement reset', 'Cleared assessment-based tier grants and assigned rungs.');
  await persist();
  render();
}

async function applyPlacementToProfile() {
  const placement = state.progress.placement;
  if (!placement) return;
  await ensureLearnerId();
  const now = new Date().toISOString();
  const assignedGroups = assignedTopicsByTier(placement.assignedTopicIds).map(({ tier, topics }) => ({
    tierId: tier.id,
    tierName: tier.name,
    tierTitle: tier.title,
    topicIds: topics.map((topic) => topic.id),
    topicTitles: topics.map((topic) => topic.title)
  }));
  try {
    await setDoc(doc(db, 'learners', state.learnerId), {
      learnerId: state.learnerId,
      profile: {
        ladderPlacement: {
          version: LADDER_VERSION,
          updatedAt: now,
          placedOutTierIds: placement.grantedTierIds,
          assignedTopicIds: placement.assignedTopicIds,
          assignedGroups,
          interestTags: placement.interestTags,
          capabilityScore: placement.capabilityScore,
          technicalScore: placement.technicalScore,
          governanceScore: placement.governanceScore,
          reasoning: placement.reasoning || ''
        }
      }
    }, { merge: true });
    state.progress.placement = {
      ...placement,
      profileAppliedAt: now,
      profileDeclinedAt: null
    };
    addTranscript(
      'profile_updated_from_placement',
      'Profile updated from Ladder placement',
      `Saved placement profile with ${placement.grantedTierIds.length} placed-out tiers and ${placement.assignedTopicIds.length} assigned rungs.`,
      { status: TRANSCRIPT_STATUS.VERIFIED, evidence: TRANSCRIPT_STATUS.VERIFIED }
    );
    await persist();
  } catch (error) {
    console.warn('Could not update learner profile from placement:', error);
  }
  render();
}

async function dismissPlacementProfilePrompt() {
  if (!state.progress.placement) return;
  state.progress.placement = {
    ...state.progress.placement,
    profileDeclinedAt: new Date().toISOString()
  };
  await persist();
  render();
}

function renderLanguages() {
  el.languageSelect.innerHTML = LANGUAGES.map((language) => (
    `<option value="${language.code}">${language.label}</option>`
  )).join('');
  el.languageSelect.value = state.language;
}

function renderLearner() {
  el.learnerIdLabel.textContent = state.learnerId || 'Not started';
  el.learnerLookup.value = state.learnerId || '';
}

function topicSearchResults(query) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return allTopics().map((topic) => {
    const tier = tierById(topic.tierId);
    const haystack = [
      topic.id,
      topic.title,
      tier.name,
      tier.title,
      ...(tier.vocabulary || [])
    ].join(' ').toLowerCase();
    const matched = terms.filter((term) => haystack.includes(term)).length;
    const starts = topic.title.toLowerCase().startsWith(terms[0]) ? 2 : 0;
    const titleHit = terms.some((term) => topic.title.toLowerCase().includes(term)) ? 1 : 0;
    return { topic, tier, score: matched + starts + titleHit };
  }).filter((result) => result.score >= terms.length)
    .sort((a, b) => b.score - a.score || a.tier.order - b.tier.order || a.topic.order - b.topic.order)
    .slice(0, 8);
}

function renderTopicSearch() {
  if (!el.topicSearchInput || !el.topicSearchResults) return;
  el.topicSearchInput.value = state.searchQuery;
  const query = state.searchQuery.trim();
  if (!query) {
    el.topicSearchResults.innerHTML = '<p class="topic-search-empty">Search any topic, tier, vocabulary word, or course concept. You can start a rung or assign it to your path without taking the assessment.</p>';
    return;
  }

  const results = topicSearchResults(query);
  if (!results.length) {
    el.topicSearchResults.innerHTML = '<p class="topic-search-empty">No matching rungs yet. Try a broader phrase like agents, ethics, workflow, images, API, or governance.</p>';
    return;
  }

  el.topicSearchResults.innerHTML = results.map(({ topic, tier }) => {
    const assigned = isTopicAssigned(topic.id);
    const assignedText = assigned ? 'Assigned' : 'Assign';
    return `
      <div class="topic-search-result" role="option">
        <strong>${escapeHtml(topic.title)}</strong>
        <small>${topic.id} - ${escapeHtml(tier.name)}: ${escapeHtml(tier.title)}</small>
        <div class="topic-search-actions">
          <button type="button" data-start-topic="${topic.id}">Start</button>
          <button type="button" class="secondary" data-assign-topic="${topic.id}" ${assigned ? 'disabled' : ''}>${assignedText}</button>
        </div>
      </div>
    `;
  }).join('');

  el.topicSearchResults.querySelectorAll('[data-start-topic]').forEach((button) => {
    button.addEventListener('click', () => openTopicFromSearch(button.dataset.startTopic, false));
  });
  el.topicSearchResults.querySelectorAll('[data-assign-topic]').forEach((button) => {
    button.addEventListener('click', () => openTopicFromSearch(button.dataset.assignTopic, true));
  });
}

async function openTopicFromSearch(topicId, assignToPath) {
  const topic = topicById(topicId);
  if (!topic) return;
  const tier = tierById(topic.tierId);
  state.activeTierId = tier.id;
  state.activeTopicId = topic.id;
  state.messages = [];

  if (assignToPath && !state.progress.selfAssignedTopicIds.includes(topic.id)) {
    state.progress.selfAssignedTopicIds.push(topic.id);
    addTranscript(
      'rung_self_assigned',
      topic.title,
      `Self-assigned ${topic.id} from Ladder search.`,
      { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: TRANSCRIPT_STATUS.SELF_REPORTED }
    );
  }

  await persist();
  render();
  document.querySelector('.topic-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPlacement() {
  const placement = state.progress.placement;
  const messages = state.progress.assessmentMessages || [];
  const userTurns = userAssessmentTurns();
  if (!placement) state.placementExpanded = true;
  const isCollapsed = !!placement && !state.placementExpanded;
  el.placementSection.classList.toggle('is-collapsed', isCollapsed);
  el.placementSection.classList.toggle('is-expanded', !isCollapsed);
  el.placementSection.setAttribute('aria-expanded', String(!isCollapsed));
  el.togglePlacementBtn.hidden = !placement;
  el.togglePlacementBtn.textContent = isCollapsed ? 'View results' : 'Minimize';
  el.resetPlacementBtn.hidden = !!placement && isCollapsed;
  el.placementProfilePrompt.hidden = !placement || !!placement.profileAppliedAt || !!placement.profileDeclinedAt;
  el.applyPlacementProfileBtn.disabled = !placement;
  el.dismissProfilePromptBtn.disabled = !placement;

  if (!placement) {
    el.placementStatus.textContent = messages.length ? 'Assessment in progress' : 'Not placed yet';
    el.placementSummary.textContent = messages.length
      ? 'Keep answering the placement guide. It will assess interest, AI fluency, technical depth, and governance readiness.'
      : 'Take the Ladder assessment to test out of tiers and receive assigned rungs based on both capability and interest.';
    el.placementMetrics.innerHTML = '';
  } else {
    el.placementStatus.textContent = `Placed out of ${placement.grantedTierIds.length} tiers`;
    const placementReason = placement.reasoning || `Interests: ${interestText(placement)}.`;
    el.placementSummary.textContent = `${placementReason} Green tiers are already completed by placement. Assigned rungs are your next items to work through.`;
    const assignedGroups = assignedTopicsByTier(placement.assignedTopicIds);
    const assignedList = assignedGroups.map(({ tier, topics }) => `
      <li>
        <strong>${tier.name}</strong>
        <span>${tier.title}</span>
        <ol>
          ${topics.map((topic) => `<li><button type="button" class="assigned-rung-link" data-topic-id="${topic.id}">T${String(tier.order).padStart(2, '0')}-L${String(topic.order).padStart(2, '0')} ${escapeHtml(topic.title)}</button></li>`).join('')}
        </ol>
      </li>
    `).join('');
    el.placementMetrics.innerHTML = `
      <span>Fluency ${placement.capabilityScore}</span>
      <span>Technical ${placement.technicalScore}</span>
      <span>Governance ${placement.governanceScore}</span>
      <span>${placement.grantedTierIds.length} tiers placed out</span>
      <details class="assigned-rungs-panel" open>
        <summary>${placement.assignedTopicIds.length} assigned rungs to complete</summary>
        <ul>${assignedList}</ul>
      </details>
    `;
    el.placementMetrics.querySelectorAll('[data-topic-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const topic = topicById(button.dataset.topicId);
        if (!topic) return;
        state.activeTierId = topic.tierId;
        state.activeTopicId = topic.id;
        state.messages = [];
        persist();
        render();
        document.querySelector('.topic-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  el.assessmentTurnCount.textContent = `${userTurns} ${userTurns === 1 ? 'response' : 'responses'}`;

  if (!messages.length) {
    el.assessmentLog.innerHTML = '<div class="message assistant"><strong>Placement Guide</strong>Start the assessment to let the Ladder assign your path.</div>';
  } else {
    let userIndex = 0;
    let guideIndex = 0;
    el.assessmentLog.innerHTML = messages.map((message) => {
      const isUser = message.role === 'user';
      if (isUser) userIndex += 1;
      else guideIndex += 1;
      const label = isUser ? `You ${userIndex}` : `Guide ${guideIndex}`;
      return `<div class="message ${isUser ? 'user' : 'assistant'}"><strong>${label}</strong>${escapeHtml(message.content)}</div>`;
    }).join('');
    el.assessmentLog.scrollTop = el.assessmentLog.scrollHeight;
  }

  el.assessmentInput.disabled = !!placement;
  el.assessmentSend.disabled = !!placement;
  el.startPlacementBtn.textContent = placement ? 'Retake assessment' : messages.length ? 'Restart assessment' : 'Start assessment';
}

function completedCount() {
  return Object.keys(state.progress.completedTopics || {}).length;
}

function completedTierCount() {
  const granted = new Set(state.progress.placement?.grantedTierIds || []);
  return LADDER_TIERS.filter((tier) => (
    granted.has(tier.id)
    || tier.topics.every((topic) => state.progress.completedTopics[topicKey(topic.id)])
  )).length;
}

function renderProgress() {
  const count = completedCount();
  const total = allTopics().length;
  const pct = total ? Math.round((count / total) * 100) : 0;
  el.progressBar.style.width = `${pct}%`;
  el.progressText.textContent = `${count} of ${total} rungs completed`;
  el.tierCompletionStatus.textContent = `${completedTierCount()} / ${LADDER_TIERS.length} tiers complete`;
}

function renderTiers() {
  const granted = new Set(state.progress.placement?.grantedTierIds || []);
  const assigned = new Set(assignedTopicIds());
  el.tierList.innerHTML = LADDER_TIERS.map((tier) => {
    const done = tier.topics.filter((topic) => state.progress.completedTopics[topicKey(topic.id)]).length;
    const active = tier.id === state.activeTierId ? ' active' : '';
    const assignedCount = tier.topics.filter((topic) => assigned.has(topic.id)).length;
    const statusLabel = granted.has(tier.id)
      ? 'completed'
      : assignedCount
        ? `${assignedCount} assigned`
        : `${done}/${tier.topics.length}`;
    const tierClasses = [
      'tier-button',
      active.trim(),
      granted.has(tier.id) ? 'placed-out' : '',
      assignedCount && !granted.has(tier.id) ? 'has-assigned' : ''
    ].filter(Boolean).join(' ');
    return `
      <div class="tier-item">
        <button class="${tierClasses}" type="button" data-tier-id="${tier.id}" style="--tier-accent:${tier.accent}">
          <span class="tier-number">${tier.order}</span>
          <span class="tier-meta">
            <strong>${tier.name}</strong>
            <small>${tier.title}</small>
          </span>
          <span class="tier-progress">${statusLabel}</span>
        </button>
      </div>
    `;
  }).join('');

  el.tierList.querySelectorAll('[data-tier-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const tier = LADDER_TIERS.find((item) => item.id === button.dataset.tierId);
      state.activeTierId = tier.id;
      state.activeTopicId = tier.topics[0].id;
      state.messages = [];
      persist();
      render();
    });
  });
}

function renderTopicPicker(tier) {
  const existing = document.querySelector('.topic-strip');
  if (existing) existing.remove();

  const strip = document.createElement('div');
  strip.className = 'topic-strip';
  strip.innerHTML = tier.topics.map((topic) => {
    const record = state.progress.completedTopics[topicKey(topic.id)];
    const done = record ? 'done' : '';
    const assigned = isTopicAssigned(topic.id) ? 'assigned' : '';
    const placed = record?.status === TRANSCRIPT_STATUS.PLACED_OUT ? 'placed' : '';
    const active = topic.id === state.activeTopicId ? 'active' : '';
    return `<button class="secondary ${done} ${assigned} ${placed} ${active}" type="button" data-topic-id="${topic.id}" title="${topic.title}">${topic.order}</button>`;
  }).join('');

  document.querySelector('.topic-head').after(strip);
  strip.querySelectorAll('[data-topic-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTopicId = button.dataset.topicId;
      state.messages = [];
      persist();
      render();
    });
  });
}

function definitionForTerm(term, tier) {
  const normalized = String(term || '').toLowerCase();
  return VOCAB_DEFINITIONS[normalized]
    || `${term} is a key term in ${tier.title}. In this tier, focus on what it means, how it changes AI use, where it can fail, and how you would recognize it in a real workflow.`;
}

function renderVocabularyDefinition(tier) {
  if (!tier.vocabulary.includes(state.activeVocabTerm)) {
    state.activeVocabTerm = tier.vocabulary[0];
  }
  const term = state.activeVocabTerm;
  const definition = definitionForTerm(term, tier);
  el.vocabDefinitionTerm.textContent = term;
  el.vocabDefinitionBox.innerHTML = `
    <strong>${escapeHtml(term)}</strong>
    <p>${escapeHtml(definition)}</p>
    <small>Use the prompt below to start an AI conversation about this term.</small>
  `;
  el.vocabPromptInput.placeholder = `Ask about ${term}`;
}

async function selectVocabularyTerm(tier, term) {
  state.activeVocabTerm = term;
  const key = `${tier.id}:${term}`;
  if (!state.progress.vocabulary[key]) {
    state.progress.vocabulary[key] = true;
    addTranscript('vocabulary_marked', term, `Reviewed vocabulary definition in ${tier.title}.`);
  }
  await persist();
  renderVocabulary(tier);
  renderVocabularyDefinition(tier);
  renderTranscript();
}

function renderVocabulary(tier) {
  if (!tier.vocabulary.includes(state.activeVocabTerm)) {
    state.activeVocabTerm = tier.vocabulary[0];
  }
  el.vocabCount.textContent = `${tier.vocabulary.length} terms`;
  el.vocabList.innerHTML = tier.vocabulary.map((term) => {
    const key = `${tier.id}:${term}`;
    const done = state.progress.vocabulary[key] ? ' done' : '';
    const active = term === state.activeVocabTerm ? ' active' : '';
    return `<button class="vocab-pill${done}${active}" type="button" data-vocab="${term}">${term}</button>`;
  }).join('');

  el.vocabList.querySelectorAll('[data-vocab]').forEach((button) => {
    button.addEventListener('click', async () => {
      await selectVocabularyTerm(tier, button.dataset.vocab);
    });
  });
  renderVocabularyDefinition(tier);
}

function resourcesForTopic(topic) {
  const title = topic.title.toLowerCase();
  return DEFAULT_RESOURCES.filter((resource) => resource.topicHints.some((hint) => title.includes(hint.toLowerCase())));
}

function renderResources(topic) {
  const resources = resourcesForTopic(topic);
  const base = resources.length ? resources : DEFAULT_RESOURCES.slice(0, 3);
  el.resourceList.innerHTML = base.map((resource) => (
    `<a class="resource-chip" href="${resource.url}" target="_blank" rel="noopener">${resource.label}</a>`
  )).join('');
}

function labTypeForTopic(topic, tier) {
  const haystack = `${topic.title} ${tier.title}`.toLowerCase();
  if (/(should|when not|ethic|governance|risk|privacy|copyright|bias|compliance|law|oversight|red-team|red team|security|vendor|evaluation|assessment)/.test(haystack)) {
    return LAB_TYPES.DEBATE;
  }
  if (/(build|design|create|workflow|template|policy|plan|roadmap|api|json|agent|rag|retrieval|database|tool|automation|deploy|product|strategy|prompt)/.test(haystack)) {
    return LAB_TYPES.BUILD;
  }
  return LAB_TYPES.SKILL;
}

function assignmentChecklist(topic, tier) {
  const labType = labTypeForTopic(topic, tier);
  const common = [
    `Ground the work in "${topic.title}".`,
    'Use one concrete example, source, role, or use case.',
    'Name one risk, limitation, or failure mode.',
    'Finish with a short artifact or evidence statement for your transcript.'
  ];
  if (labType.id === 'debate') {
    return [
      'State your position clearly.',
      'Answer the AI guide when it challenges your reasoning.',
      'Revise or defend your position with evidence.',
      ...common.slice(2)
    ];
  }
  if (labType.id === 'build') {
    return [
      'Choose the artifact you will produce.',
      'Draft the artifact in the conversation.',
      'Explain the design choices behind it.',
      ...common.slice(2)
    ];
  }
  return [
    'Apply a specific framework, checklist, or technique.',
    'Work through a real or realistic example.',
    'Explain what changed in your understanding.',
    ...common.slice(2)
  ];
}

function assignmentPromptFor(topic, tier) {
  const labType = labTypeForTopic(topic, tier);
  const starters = {
    debate: `Take a position on a real decision involving "${topic.title}". The AI guide will challenge your reasoning until you can defend, revise, or narrow the claim.`,
    skill: `Apply a repeatable technique for "${topic.title}" to a concrete example. The AI guide will press for specificity and help you turn the work into evidence.`,
    build: `Create a small usable artifact connected to "${topic.title}". The AI guide will review the artifact for completeness, risk, and practical use.`
  };
  return starters[labType.id];
}

function renderAssignment(topic, tier) {
  const labType = labTypeForTopic(topic, tier);
  const completed = state.progress.completedLabs[topicKey(topic.id)];
  el.assignmentSummary.textContent = `${labType.label} lab - ${labType.summary}`;
  el.assignmentTypeBadge.textContent = labType.label;
  el.assignmentTypeBadge.dataset.type = labType.id;
  el.assignmentTitle.textContent = labType.title;
  el.assignmentPrompt.textContent = assignmentPromptFor(topic, tier);
  el.assignmentChecklist.innerHTML = assignmentChecklist(topic, tier).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  el.completeLabBtn.textContent = completed ? 'Assignment completed' : 'Complete assignment';
  el.completeLabBtn.disabled = Boolean(completed);
}

function renderChat() {
  if (!state.messages.length) {
    el.chatLog.innerHTML = '<div class="message assistant"><strong>Guide</strong>Select Start to begin a guided conversation for this rung.</div>';
    return;
  }
  el.chatLog.innerHTML = state.messages.map((message) => (
    `<div class="message ${message.role === 'user' ? 'user' : 'assistant'}"><strong>${message.role === 'user' ? 'You' : 'Guide'}</strong>${escapeHtml(message.content)}</div>`
  )).join('');
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

function renderTranscript() {
  if (!state.progress.transcriptEvents.length) {
    el.transcriptList.innerHTML = '<div class="transcript-event"><strong>No events yet</strong><small>Complete conversations, vocabulary, labs, or rungs to build a transcript.</small></div>';
    return;
  }

  el.transcriptList.innerHTML = state.progress.transcriptEvents.map((event) => (
    `<div class="transcript-event"><strong>${event.title}</strong><small>${statusLabel(event.status)} - ${statusLabel(event.evidence)} evidence - ${new Date(event.timestamp).toLocaleString()}</small><p>${event.detail}</p></div>`
  )).join('');
}

function renderTopic() {
  const tier = getActiveTier();
  const topic = getActiveTopic();
  const topicRecord = state.progress.completedTopics[topicKey(topic.id)];
  el.activeTierLabel.textContent = `${tier.name} - ${topic.id}`;
  el.activeTopicTitle.textContent = topic.title;
  el.completeTopicBtn.textContent = topicRecord?.status === TRANSCRIPT_STATUS.PLACED_OUT
    ? 'Placed out'
    : topicRecord ? statusLabel(topicRecord.status) : 'Mark self-reported';
  el.completeTopicBtn.disabled = topicRecord?.status === TRANSCRIPT_STATUS.PLACED_OUT;
  renderTopicPicker(tier);
  renderVocabulary(tier);
  renderResources(topic);
  renderAssignment(topic, tier);
  renderChat();
}

function renderControls() {
  el.languageSelect.value = state.language;
  el.customLanguageInput.value = state.customLanguage || '';
  el.customLanguageInput.style.display = state.language === 'custom' ? '' : 'none';
  renderThemeToggle();
}

function applyTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(LS_THEME, state.theme);
}

function renderThemeToggle() {
  if (!el.darkToggle) return;
  const isDark = state.theme === 'dark';
  el.darkToggle.setAttribute('aria-pressed', String(isDark));
  el.darkToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  el.darkToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

function render() {
  renderLearner();
  renderControls();
  renderTopicSearch();
  renderPlacement();
  renderProgress();
  renderTiers();
  renderTopic();
  renderTranscript();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function systemPromptFor(topic, tier) {
  const placement = state.progress.placement;
  const assigned = placement?.assignedTopicIds?.includes(topic.id) ? 'yes' : 'no';
  const selfAssigned = state.progress.selfAssignedTopicIds?.includes(topic.id) ? 'yes' : 'no';
  const placedOut = state.progress.completedTopics[topicKey(topic.id)]?.status === TRANSCRIPT_STATUS.PLACED_OUT ? 'yes' : 'no';
  const labType = labTypeForTopic(topic, tier);
  const checklist = assignmentChecklist(topic, tier).map((item) => `- ${item}`).join('\n');
  return `You are The Ladder guide inside AESOP AI Academy. You are strictly scoped to the selected topic: ${topic.title}.

Placement interests: ${interestText(placement)}.
Assessment capability score: ${placement?.capabilityScore ?? 'not placed'}.
Assessment technical score: ${placement?.technicalScore ?? 'not placed'}.
Assessment governance score: ${placement?.governanceScore ?? 'not placed'}.
Was this rung assigned by assessment? ${assigned}.
Was this rung self-assigned by the learner? ${selfAssigned}.
Was this rung placed out by assessment? ${placedOut}.
Tier: ${tier.name} - ${tier.title}.
Preferred language: ${languageLabel()}. Translate your learner-facing responses into this language unless the learner asks otherwise.

Every rung is now an assignment lab conversation. This assignment's lab type is ${labType.label.toUpperCase()}: ${labType.summary}
Assignment prompt: ${assignmentPromptFor(topic, tier)}
Completion target: ${labType.completion}
Checklist:
${checklist}

Use this guarded teaching pattern:
1. Diagnose what the learner already understands.
2. Ask vocabulary questions using relevant terms from this tier.
3. Run the ${labType.id} assignment: make the learner ${labType.action}, not just read or summarize.
4. Push application to the learner's role or goal and require a concrete artifact, defense, or worked example.
5. Ask for one risk, limitation, or misconception.
6. End by telling the learner whether this assignment should be transcripted as completed, verified, self-reported, or not yet ready.

Do not act as a general assistant. If the learner goes off topic, warmly redirect them back to ${topic.title}. Do not simply lecture. Ask questions and require the learner to reason. Keep responses concise enough for an interactive learning session.`;
}

async function callGuide() {
  const topic = getActiveTopic();
  const tier = getActiveTier();
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        system_prompt: systemPromptFor(topic, tier),
        max_tokens: 700
      })
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || data?.error || 'The guide could not respond. Use practice mode: explain the topic, name one risk, and ask yourself what evidence would change your mind.';
    state.messages.push({ role: 'assistant', content: text });
  } catch (error) {
    state.messages.push({
      role: 'assistant',
      content: 'AI is temporarily unavailable. Practice mode: explain the topic in your own words, name one example, name one limitation, and decide what you still need to verify.'
    });
  }
  renderChat();
  await persist();
}

async function startConversation() {
  const topic = getActiveTopic();
  const tier = getActiveTier();
  const labType = labTypeForTopic(topic, tier);
  state.messages = [{
    role: 'user',
    content: `Start my ${labType.label} assignment lab for "${topic.title}". Diagnose my current understanding first, then make me ${labType.action} through a concrete assignment. The assignment prompt is: ${assignmentPromptFor(topic, tier)}`
  }];
  renderChat();
  await callGuide();
  addTranscript('assignment_lab_started', `${topic.title} ${labType.label} lab`, `Started a ${labType.label.toLowerCase()} assignment lab for ${topic.id}.`);
  await persist();
  renderTranscript();
}

async function startVocabularyConversation(event) {
  event.preventDefault();
  const tier = getActiveTier();
  const term = state.activeVocabTerm || tier.vocabulary[0];
  const definition = definitionForTerm(term, tier);
  const userQuestion = el.vocabPromptInput.value.trim();
  state.messages = [{
    role: 'user',
    content: `Start a guided vocabulary conversation about "${term}" in the context of "${tier.title}". Begin with this definition: ${definition} Ask me whether I have any additional questions about this vocabulary word, then help me understand it through examples, misconceptions, and one application question.${userQuestion ? ` My specific question is: ${userQuestion}` : ''}`
  }];
  el.vocabPromptInput.value = '';
  renderChat();
  await callGuide();
  addTranscript('vocabulary_conversation_started', term, `Started a guided vocabulary conversation for ${term}.`);
  await persist();
  renderTranscript();
  document.querySelector('.conversation-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitChat(event) {
  event.preventDefault();
  const value = el.chatInput.value.trim();
  if (!value) return;
  state.messages.push({ role: 'user', content: value });
  el.chatInput.value = '';
  renderChat();
  await callGuide();
}

async function markTopicComplete() {
  const topic = getActiveTopic();
  state.progress.completedTopics[topicKey(topic.id)] = {
    status: TRANSCRIPT_STATUS.SELF_REPORTED,
    completedAt: new Date().toISOString(),
    language: state.language
  };
  addTranscript(
    'topic_self_reported',
    topic.title,
    `Marked ${topic.id} as self-reported on The Ladder.`,
    { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: TRANSCRIPT_STATUS.SELF_REPORTED }
  );
  await persist();
  render();
}

async function markLabComplete() {
  const topic = getActiveTopic();
  const tier = getActiveTier();
  const labType = labTypeForTopic(topic, tier);
  state.progress.completedLabs[topicKey(topic.id)] = {
    status: TRANSCRIPT_STATUS.COMPLETED,
    completedAt: new Date().toISOString(),
    evidence: TRANSCRIPT_STATUS.SELF_REPORTED,
    labType: labType.id,
    artifactDesc: labType.completion
  };
  addTranscript(
    'assignment_lab_completed',
    `${topic.title} ${labType.label} lab`,
    `Completed the ${labType.label.toLowerCase()} assignment lab for ${topic.id}: ${labType.completion}`,
    { status: TRANSCRIPT_STATUS.COMPLETED, evidence: TRANSCRIPT_STATUS.SELF_REPORTED }
  );
  await persist();
  render();
}

function exportTranscript() {
  const payload = {
    learnerId: state.learnerId,
    ladderVersion: LADDER_VERSION,
    exportedAt: new Date().toISOString(),
    placement: state.progress.placement,
    selfAssignedTopicIds: state.progress.selfAssignedTopicIds,
    completedTopics: state.progress.completedTopics,
    completedLabs: state.progress.completedLabs,
    transcriptEvents: state.progress.transcriptEvents
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${state.learnerId || 'aesop'}-ladder-transcript.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function findVideos() {
  const topic = getActiveTopic();
  const query = encodeURIComponent(`${topic.title} AI explained tutorial`);
  addTranscript('additional_links_requested', topic.title, `Requested more videos and links for "${topic.title}".`);
  persist();
  window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener');
  renderTranscript();
}

function bindEvents() {
  el.darkToggle?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    renderThemeToggle();
  });

  el.languageSelect.addEventListener('change', async () => {
    state.language = el.languageSelect.value;
    await persist();
    renderControls();
  });

  el.customLanguageInput.addEventListener('change', async () => {
    state.customLanguage = el.customLanguageInput.value.trim();
    await persist();
  });

  el.topicSearchInput?.addEventListener('input', () => {
    state.searchQuery = el.topicSearchInput.value;
    renderTopicSearch();
  });

  el.startPlacementBtn.addEventListener('click', startPlacementAssessment);
  el.togglePlacementBtn.addEventListener('click', async () => {
    state.placementExpanded = !state.placementExpanded;
    await persist();
    render();
  });
  el.resetPlacementBtn.addEventListener('click', resetPlacementAssessment);
  el.applyPlacementProfileBtn.addEventListener('click', applyPlacementToProfile);
  el.dismissProfilePromptBtn.addEventListener('click', dismissPlacementProfilePrompt);
  el.assessmentTopBtn.addEventListener('click', () => scrollAssessment('top'));
  el.assessmentLatestBtn.addEventListener('click', () => scrollAssessment('latest'));
  el.assessmentForm.addEventListener('submit', submitPlacementAssessment);
  el.assessmentInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    el.assessmentForm.requestSubmit();
  });

  el.lookupBtn.addEventListener('click', async () => {
    const id = el.learnerLookup.value.trim().toUpperCase();
    if (!id.startsWith('AESOP-')) return;
    state.learnerId = id;
    localStorage.setItem(LS_ID, id);
    await loadRemote(id);
    await persist();
    render();
  });

  el.startConversationBtn.addEventListener('click', startConversation);
  el.vocabPromptForm.addEventListener('submit', startVocabularyConversation);
  el.chatForm.addEventListener('submit', submitChat);
  el.completeTopicBtn.addEventListener('click', markTopicComplete);
  el.completeLabBtn.addEventListener('click', markLabComplete);
  el.exportTranscriptBtn.addEventListener('click', exportTranscript);
  el.researchBtn.addEventListener('click', findVideos);
}

async function init() {
  applyTheme(state.theme);
  loadLocal();
  renderLanguages();
  bindEvents();
  render();
  if (state.learnerId) {
    await loadRemote(state.learnerId);
    render();
  }
}

init();
