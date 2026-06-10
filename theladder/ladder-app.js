import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { FIREBASE_CONFIG } from '/ai-academy/js/firebase-config.js';
import { DEFAULT_RESOURCES, LADDER_TIERS, LADDER_VERSION, LANGUAGES, LADDER_UI_TRANSLATIONS } from './ladder-data.js?v=2';

const PROXY_URL = '/aesop-api/proxy.php';
const LS_ID = 'aesop-learner-id';
const LS_STATE = 'aesop-ladder-state';
const LS_THEME = 'aesop-theme';
const LS_ADULT_ATTESTED = 'aesop-ladder-adult-attested';
const PLACEMENT_REGEX = /<!--LADDER_PLACEMENT_COMPLETE:([\s\S]*?)-->/;
const CERTIFICATION_RESULT_REGEX = /<!--LADDER_CERTIFICATION_RESULT:([\s\S]*?)-->/;
const CERTIFICATION_VALIDATION_REGEX = /<!--LADDER_CERTIFICATION_VALIDATION:([\s\S]*?)-->/;
const CONVERSATION_COMPLETE_REGEX = /<!--LADDER_CONVERSATION_COMPLETE:([\s\S]*?)-->/;
const CERTIFICATION_VALIDATOR_MODEL = 'claude-sonnet-4-5-20250929';
const CERTIFICATION_COOLDOWN_MS = 0; // TODO: Re-enable 24-hour cooldown after testing
const TRANSCRIPT_STATUS = {
  COMPLETED: 'completed',
  PLACED_OUT: 'placed_out',
  VERIFIED: 'verified',
  SELF_REPORTED: 'self_reported'
};
const EDUCATION_TIERS = [
  { id: 'elementary', label: 'Elementary', standards: 'AI4K12, ISTE, UNESCO' },
  { id: 'middle-school', label: 'Middle School', standards: 'AI4K12, ISTE, CSTA, UNESCO' },
  { id: 'high-school', label: 'High School', standards: 'AI4K12, ISTE, CSTA, UNESCO' }
];

const PROFESSIONAL_ROLES = [
  {
    id: 'ai-developer',
    label: 'AI Developer',
    source: 'O*NET 15-1255+',
    standards: 'O*NET, WEF, NIST AI RMF',
    description: 'Develop AI applications, write code for AI systems, implement models',
    roleSpec: `You are evaluating an AI Developer candidate. The AI Developer role requires:
- Proficiency in programming languages (Python, Java, C++, JavaScript) for AI/ML applications
- Understanding of AI/ML frameworks and libraries (TensorFlow, PyTorch, scikit-learn)
- Ability to implement, test, and deploy AI algorithms and models
- Knowledge of software development best practices (version control, testing, documentation)
- Problem-solving skills to translate business requirements into AI solutions`
  },
  {
    id: 'machine-learning-engineer',
    label: 'Machine Learning Engineer',
    source: 'O*NET 15-1255+',
    standards: 'O*NET, WEF, NIST AI RMF',
    description: 'Design and build ML systems, train models, optimize algorithms',
    roleSpec: `You are evaluating a Machine Learning Engineer candidate. The ML Engineer role requires:
- Advanced knowledge of machine learning algorithms, architectures, and best practices
- Ability to design, train, validate, and optimize ML models
- Experience with ML pipelines, data preprocessing, feature engineering
- Knowledge of model evaluation metrics, cross-validation, hyperparameter tuning
- Understanding of production ML systems, scalability, and model deployment
- Proficiency with ML frameworks and tools (TensorFlow, PyTorch, scikit-learn)
- Ability to work with large datasets and distributed computing`
  },
  {
    id: 'data-scientist',
    label: 'Data Scientist',
    source: 'O*NET 15-2051.00',
    standards: 'O*NET, WEF, NIST AI RMF',
    description: 'Analyze data, develop predictive models, extract insights from datasets',
    roleSpec: `You are evaluating a Data Scientist candidate. The Data Scientist role requires:
- Proficiency in statistical analysis, data manipulation, and programming (Python, R, SQL)
- Ability to analyze large datasets and identify trends, patterns, and relationships
- Experience developing predictive and prescriptive models
- Knowledge of data visualization tools and techniques
- Ability to translate business problems into analytical questions
- Strong communication skills to present findings to non-technical stakeholders
- Understanding of data quality, validation, and bias assessment`
  },
  {
    id: 'ai-operations-engineer',
    label: 'AI Operations Engineer',
    source: 'WEF Future of Jobs 2025',
    standards: 'WEF, NIST AI RMF, ISO/IEC 42001',
    description: 'Deploy, monitor, maintain production AI systems (AIOps)',
    roleSpec: `You are evaluating an AI Operations Engineer (AIOps) candidate. This role requires:
- Understanding of AI system deployment, monitoring, and maintenance
- Knowledge of MLOps, model versioning, and continuous integration/deployment for ML
- Ability to set up monitoring, alerting, and incident response for production AI systems
- Experience with observability tools, logging, and performance metrics
- Understanding of model drift, retraining, and model lifecycle management
- Knowledge of cloud platforms and containerization (Docker, Kubernetes)
- Skills in system reliability, troubleshooting, and optimization`
  },
  {
    id: 'ai-product-manager',
    label: 'AI Product Manager',
    source: 'WEF Future of Jobs 2025',
    standards: 'WEF, O*NET Product Management',
    description: 'Define AI product strategy, prioritize features, manage roadmap',
    roleSpec: `You are evaluating an AI Product Manager candidate. This role requires:
- Understanding of AI/ML capabilities, limitations, and practical applications
- Ability to identify AI use cases, assess feasibility, and prioritize features
- Knowledge of product management frameworks and methodologies
- Skills in stakeholder management, roadmap planning, and communication
- Understanding of user research, market analysis, and competitive landscape for AI products
- Ability to translate business objectives into clear product requirements
- Knowledge of responsible AI, ethics, and governance implications of AI products`
  },
  {
    id: 'ai-educator',
    label: 'AI Educator',
    source: 'O*NET 25-1021.00',
    standards: 'O*NET, UNESCO, ISTE',
    description: 'Teach AI/ML concepts, develop curricula, train learners',
    roleSpec: `You are evaluating an AI Educator candidate. This role requires:
- Deep understanding of AI/ML concepts, applications, and limitations
- Ability to explain complex AI/ML topics at multiple difficulty levels
- Experience designing curricula, learning objectives, and assessments
- Knowledge of pedagogical approaches for technology education
- Ability to create engaging learning materials, examples, and hands-on projects
- Skills in classroom/online facilitation, student engagement, and feedback
- Understanding of ethical AI, responsible AI, and societal implications
- Ability to stay current with rapidly evolving AI landscape`
  },
  {
    id: 'ai-security-specialist',
    label: 'AI Security Specialist',
    source: 'O*NET 15-3121.00',
    standards: 'O*NET, NIST AI RMF, OWASP',
    description: 'Secure AI systems, threat modeling, red teaming',
    roleSpec: `You are evaluating an AI Security Specialist candidate. This role requires:
- Deep understanding of AI-specific security threats (prompt injection, data poisoning, model theft)
- Knowledge of security best practices for AI/ML systems
- Ability to conduct threat modeling, risk assessment, and vulnerability analysis
- Experience with red teaming, adversarial testing, and security audits
- Understanding of data security, privacy, and compliance for AI systems
- Knowledge of security tools, frameworks, and standards (OWASP, NIST)
- Ability to design secure AI architectures and mitigation strategies`
  },
  {
    id: 'ai-governance-officer',
    label: 'AI Governance Officer',
    source: 'WEF Future of Jobs 2025',
    standards: 'WEF, NIST AI RMF, EU AI Act',
    description: 'Policy, compliance, ethics, responsible AI frameworks',
    roleSpec: `You are evaluating an AI Governance Officer candidate. This role requires:
- Understanding of AI ethics frameworks, responsible AI principles, and governance
- Knowledge of regulatory landscape (EU AI Act, NIST AI RMF, sector-specific regulations)
- Ability to assess and mitigate AI risks (bias, fairness, transparency, accountability)
- Experience developing AI policies, guidelines, and governance frameworks
- Understanding of compliance requirements and audit trails
- Skills in stakeholder engagement, risk communication, and decision-making
- Knowledge of emerging legal and policy considerations for AI systems`
  },
  {
    id: 'ai-consultant',
    label: 'AI Consultant',
    source: 'O*NET 13-1111.00',
    standards: 'O*NET, WEF, NIST AI RMF',
    description: 'Advise organizations on AI adoption, strategy, implementation',
    roleSpec: `You are evaluating an AI Consultant candidate. This role requires:
- Broad understanding of AI capabilities, applications, and business value
- Experience assessing organizational readiness for AI adoption
- Ability to develop AI strategy, roadmaps, and implementation plans
- Knowledge of change management, organizational design, and team enablement
- Skills in stakeholder engagement, communication, and presentation
- Understanding of various AI use cases across industries and functions
- Ability to identify risks, barriers, and success factors for AI initiatives`
  },
  {
    id: 'executive-leadership',
    label: 'Executive Leadership',
    source: 'WEF, NIST AI RMF',
    standards: 'WEF, NIST AI RMF, EU AI Act',
    description: 'Strategic AI leadership, organizational transformation, policy',
    roleSpec: `You are evaluating an Executive Leadership candidate in AI. This role requires:
- Strategic understanding of how AI transforms business, society, and organizations
- Ability to set organizational AI vision, strategy, and long-term roadmaps
- Leadership and change management skills for AI-driven transformation
- Understanding of AI's business impact, ROI, and competitive advantages
- Knowledge of governance, risk management, and compliance at enterprise scale
- Ability to build and lead high-performing AI teams and partnerships
- Understanding of societal implications, ethics, and responsible AI at scale
- Visionary thinking about AI's future and emerging technologies`
  }
];

const ACCOUNT_REQUIRED_ROLES = new Set(['ai-developer', 'machine-learning-engineer', 'data-scientist', 'ai-operations-engineer', 'ai-product-manager', 'ai-educator', 'ai-security-specialist', 'ai-governance-officer', 'ai-consultant', 'executive-leadership']);
const CERTIFICATION_TIERS = EDUCATION_TIERS; // Keep for backwards compatibility
const TEST_DEPTHS = [
  {
    id: 'core',
    label: 'CORE',
    outcome: 'foundational competency evidence',
    evidence: 'clear foundational competency in the selected function',
    passingStandard: 'solid rubric performance with no critical failures',
    review: 'AI-assessed, auditable, and challengeable'
  },
  {
    id: 'certification',
    label: 'Certification',
    outcome: 'professional certification evidence',
    evidence: 'clear competency evidence for professional role and function',
    passingStandard: 'solid rubric performance with no critical failures',
    review: 'AI-assessed, auditable, and challengeable'
  },
  {
    id: 'expert-certification',
    label: 'Expert Certification',
    outcome: 'expert-level evidence for advanced credit',
    evidence: 'strong transfer, edge-case reasoning, and defensible tradeoff analysis',
    passingStandard: 'high rubric performance, independent reasoning, and confident defense under challenge',
    review: 'AI-assessed with human review recommended for public or employment claims'
  },
  {
    id: 'master-certification',
    label: 'Master Certification',
    outcome: 'mastery evidence and portfolio-quality artifact',
    evidence: 'original synthesis, portfolio-grade artifact, standards mapping, and leadership-level defense',
    passingStandard: 'near-expert rubric performance across all dimensions with no unresolved evidence gaps',
    review: 'AI-assessed with human or panel review recommended before external credential claims'
  }
];

const IDENTITY_ASSURANCE_LEVELS = [
  {
    id: 'self_attested',
    label: 'Self-attested',
    credentialLabel: 'Self-attested',
    requiresAttestation: false,
    proctoringRequired: false,
    active: true,
    description: 'Learner claims the work. No identity check.'
  },
  {
    id: 'account_bound',
    label: 'Account bound',
    credentialLabel: 'Account-bound',
    requiresAttestation: false,
    proctoringRequired: false,
    active: true,
    description: 'Attempt is tied to the AESOP learner ID, browser session, and saved transcript record.'
  },
  {
    id: 'identity_attested',
    label: 'Identity attested',
    credentialLabel: 'Identity-attested',
    requiresAttestation: true,
    proctoringRequired: false,
    active: true,
    description: 'Learner signs an identity statement before the certification attempt.'
  },
  {
    id: 'proctored_verified',
    label: 'Proctored verified',
    credentialLabel: 'Proctored verified',
    requiresAttestation: true,
    proctoringRequired: true,
    active: false,
    description: 'Adult formal credential path requiring ID/liveness plus automated, live, recorded, or institutional proctoring.'
  }
];

const PROCTORING_MODES = [
  { id: 'automated', label: 'Automated proctoring', description: 'Camera/liveness and session signals flag risk for review.' },
  { id: 'live_remote', label: 'Live remote proctor', description: 'A trained proctor checks ID and watches the session.' },
  { id: 'recorded_review', label: 'Recorded review', description: 'The session is recorded and reviewed when flagged or sampled.' },
  { id: 'institutional', label: 'Institutional proctor', description: 'A school, employer, library, workforce center, or testing site verifies the session.' }
];

function normalizeTestDepthId(id) {
  return TEST_DEPTHS.some((item) => item.id === id) ? id : TEST_DEPTHS[0].id;
}

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
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  learnerId: localStorage.getItem(LS_ID) || '',
  authReady: false,
  authUser: null,
  adultAttested: localStorage.getItem(LS_ADULT_ATTESTED) === 'true',
  theme: localStorage.getItem(LS_THEME) === 'dark' ? 'dark' : 'light',
  language: 'en',
  customLanguage: '',
  activeTierId: LADDER_TIERS[0].id,
  activeTopicId: LADDER_TIERS[0].topics[0].id,
  activeVocabTerm: LADDER_TIERS[0].vocabulary[0],
  searchQuery: '',
  educationTierId: 'college',
  certificationTierId: 'workforce',
  testDepthId: 'certification',
  identityAssuranceLevel: 'account_bound',
  identityAttested: false,
  proctoringMode: 'recorded_review',
  evaluationContext: null,
  trainingMessages: [],
  pendingStandardsReview: null,
  placementExpanded: false,
  messages: [],
  progress: {
    completedTopics: {},
    vocabulary: {},
    selfAssignedTopicIds: [],
    evaluationAttempts: [],
    ladderCertifications: [],
    certificationValidations: [],
    standardsReviews: [],
    placement: null,
    assessmentMessages: [],
    transcriptEvents: []
  }
};

const el = {
  educationFocusSelect: document.getElementById('educationFocusSelect'),
  languageSelect: document.getElementById('languageSelect'),
  customLanguageInput: document.getElementById('customLanguageInput'),
  darkToggle: document.getElementById('darkToggle'),
  learnerIdLabel: document.getElementById('learnerIdLabel'),
  learnerLookup: document.getElementById('learnerLookup'),
  lookupBtn: document.getElementById('lookupBtn'),
  topicSearchInput: document.getElementById('topicSearchInput'),
  topicSearchResults: document.getElementById('topicSearchResults'),
  educationTierSelect: document.getElementById('educationTierSelect'),
  certificationTierSelect: document.getElementById('certificationTierSelect'),
  testDepthSelect: document.getElementById('testDepthSelect'),
  authRequiredLink: document.getElementById('authRequiredLink'),
  identityAssuranceField: document.getElementById('identityAssuranceField'),
  accountGatePanel: document.getElementById('accountGatePanel'),
  accountStatusText: document.getElementById('accountStatusText'),
  accountGateMessage: document.getElementById('accountGateMessage'),
  adultAttestationCheck: document.getElementById('adultAttestationCheck'),
  accountForm: document.getElementById('accountForm'),
  accountEmailInput: document.getElementById('accountEmailInput'),
  accountPasswordInput: document.getElementById('accountPasswordInput'),
  accountSignOutBtn: document.getElementById('accountSignOutBtn'),
  accountConfirmAdultBtn: document.getElementById('accountConfirmAdultBtn'),
  accountAuthError: document.getElementById('accountAuthError'),
  identityAssuranceSelect: document.getElementById('identityAssuranceSelect'),
  identityAttestationCheck: document.getElementById('identityAttestationCheck'),
  identityAssuranceNotice: document.getElementById('identityAssuranceNotice'),
  proctoringModeField: document.getElementById('proctoringModeField'),
  proctoringModeSelect: document.getElementById('proctoringModeSelect'),
  activeEvaluationTarget: document.getElementById('activeEvaluationTarget'),
  evaluationCooldownNotice: document.getElementById('evaluationCooldownNotice'),
  startEvaluationBtn: document.getElementById('startEvaluationBtn'),
  certificationWorkspaceTarget: document.getElementById('certificationWorkspaceTarget'),
  certificationWorkspaceCooldown: document.getElementById('certificationWorkspaceCooldown'),
  startWorkspaceCertificationBtn: document.getElementById('startWorkspaceCertificationBtn'),
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
  heroCertCount: document.getElementById('heroCertCount'),
  heroCoursesComplete: document.getElementById('heroCoursesComplete'),
  heroTiersComplete: document.getElementById('heroTiersComplete'),
  heroTiersCertified: document.getElementById('heroTiersCertified'),
  heroTiersExpert: document.getElementById('heroTiersExpert'),
  heroTiersMastered: document.getElementById('heroTiersMastered'),
  heroRibbonTrack: document.getElementById('heroRibbonTrack'),
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
  conversationTitle: document.getElementById('conversationTitle'),
  conversationSummary: document.getElementById('conversationSummary'),
  certificationModeBar: document.getElementById('certificationModeBar'),
  certificationModeTitle: document.getElementById('certificationModeTitle'),
  certificationModeDetail: document.getElementById('certificationModeDetail'),
  startConversationBtn: document.getElementById('startConversationBtn'),
  endCertificationBtn: document.getElementById('endCertificationBtn'),
  chatLog: document.getElementById('chatLog'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  transcriptList: document.getElementById('transcriptList'),
  exportTranscriptBtn: document.getElementById('exportTranscriptBtn'),
  transcriptPageLink: document.getElementById('transcriptPageLink'),
  ladderCertificationsLink: document.getElementById('ladderCertificationsLink'),
  studentTranscriptLink: document.getElementById('studentTranscriptLink'),
  architectureDialog: document.getElementById('architectureDialog'),
  architectureDialogContent: document.getElementById('architectureDialogContent')
};

function generateLearnerId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return `AESOP-${code}`;
}

function selectedCertificationTier(tierId = state.certificationTierId) {
  return CERTIFICATION_TIERS.find((item) => item.id === tierId) || CERTIFICATION_TIERS[0];
}

function certificationTierRequiresAccount(tierId = state.certificationTierId) {
  return ACCOUNT_REQUIRED_CERTIFICATION_TIERS.has(tierId);
}

function accountGateForCertificationTier(tierId = state.certificationTierId) {
  const tier = selectedCertificationTier(tierId);
  if (!certificationTierRequiresAccount(tier.id)) {
    return {
      locked: false,
      tier,
      reason: `${tier.label} certification can continue without an adult account.`,
      buttonLabel: 'Start certification'
    };
  }
  if (!state.authReady) {
    return {
      locked: true,
      tier,
      reason: 'Checking Firebase account status...',
      buttonLabel: 'Checking account'
    };
  }
  if (!state.authUser) {
    return {
      locked: true,
      tier,
      reason: `${tier.label} requires a Firebase username and password before the learner can use this education tier.`,
      buttonLabel: 'Authentication required'
    };
  }
  if (!state.adultAttested) {
    return {
      locked: true,
      tier,
      reason: `${tier.label} requires an adult account attestation before certification or readiness sessions can begin.`,
      buttonLabel: 'Confirm adult access'
    };
  }
  return {
    locked: false,
    tier,
    reason: `${tier.label} is account-bound to ${state.authUser.email || 'this Firebase user'}.`,
    buttonLabel: 'Authenticated'
  };
}

function authErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') return 'That account already exists. Sign in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Invalid username/email or password.';
  if (code === 'auth/weak-password') return 'Use a password with at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address for the username.';
  if (code === 'auth/network-request-failed') return 'Network error. Try again in a moment.';
  return error?.message || 'Account action failed.';
}

function setAccountError(message = '') {
  if (!el.accountAuthError) return;
  el.accountAuthError.hidden = !message;
  el.accountAuthError.textContent = message;
}

function normalizeLearnerId(value) {
  const id = String(value || '').trim().toUpperCase();
  return id.startsWith('AESOP-') ? id : '';
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

function isEducationTier(tierId) {
  return EDUCATION_TIERS.some((tier) => tier.id === tierId);
}

function isProfessionalRole(roleId) {
  return PROFESSIONAL_ROLES.some((role) => role.id === roleId);
}

function getProfessionalRole(roleId) {
  return PROFESSIONAL_ROLES.find((role) => role.id === roleId);
}

function getRoleSpec(roleId) {
  const role = getProfessionalRole(roleId);
  return role ? role.roleSpec : '';
}

function languageLabel() {
  if (state.language === 'custom') return state.customLanguage || 'the learner selected language';
  return LANGUAGES.find((item) => item.code === state.language)?.label || 'English';
}

function languageConfirmationText() {
  const confirmations = {
    en: 'Language set to English. I will continue in English.',
    es: 'Idioma cambiado a español. Continuaré en español.',
    fr: 'Langue changée en français. Je continuerai en français.',
    de: 'Sprache auf Deutsch eingestellt. Ich fahre auf Deutsch fort.',
    ar: 'تم تغيير اللغة إلى العربية. سأتابع باللغة العربية.',
    hi: 'भाषा हिंदी पर सेट कर दी गई है। मैं हिंदी में जारी रखूंगा।',
    ja: '言語を日本語に設定しました。日本語で続けます。',
    ko: '언어가 한국어로 설정되었습니다. 한국어로 계속하겠습니다.',
    pt: 'Idioma alterado para português. Continuarei em português.',
    'zh-TW': '語言已切換為繁體中文。我將繼續使用繁體中文。'
  };
  return confirmations[state.language] || `Language set to ${languageLabel()}. I will continue in ${languageLabel()}.`;
}

function t(key) {
  const translations = LADDER_UI_TRANSLATIONS[state.language] || LADDER_UI_TRANSLATIONS['en'];
  return translations[key] || LADDER_UI_TRANSLATIONS['en'][key] || key;
}

function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
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

function topicIsReadinessCheckTitle(title) {
  const normalized = String(title || '').toLowerCase();
  return normalized.includes('readiness check') || normalized.includes('self-assessment');
}

function isReadinessCheckTopic(topic) {
  return topicIsReadinessCheckTitle(topic?.title);
}

function assignedTopicsForPlacement(grantedTierIds, interestTags) {
  const granted = new Set(grantedTierIds);
  const assigned = [];
  LADDER_TIERS.forEach((tier) => {
    if (granted.has(tier.id)) return;
    const core = tier.topics.filter((topic) => topic.order <= 4 || isReadinessCheckTopic(topic));
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

function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function certificationCooldownKey(tierId, depthId) {
  return `${LADDER_VERSION}:${tierId}:${depthId}`;
}

function attemptCooldownKey(attempt) {
  return attempt.cooldownKey || certificationCooldownKey(attempt.ladderTierId, attempt.testDepthId);
}

function certificationCooldownFor(tierId, depthId) {
  const key = certificationCooldownKey(tierId, depthId);
  const now = Date.now();
  const attempts = (state.progress.evaluationAttempts || [])
    .filter((attempt) => attemptCooldownKey(attempt) === key)
    .map((attempt) => {
      const startedAt = attempt.startedAt || attempt.createdAt || attempt.completedAt;
      const startedTime = Date.parse(startedAt || '');
      return Number.isNaN(startedTime) ? null : { ...attempt, startedAt, startedTime };
    })
    .filter(Boolean)
    .sort((a, b) => b.startedTime - a.startedTime);
  const latest = attempts[0] || null;
  if (!latest) return { locked: false, key, latest: null, remainingMs: 0, availableAt: null };
  const availableTime = latest.startedTime + CERTIFICATION_COOLDOWN_MS;
  const remainingMs = availableTime - now;
  return {
    locked: remainingMs > 0,
    key,
    latest,
    remainingMs: Math.max(0, remainingMs),
    availableAt: new Date(availableTime).toISOString()
  };
}

function saveLocal() {
  localStorage.setItem(LS_STATE, JSON.stringify({
    language: state.language,
    customLanguage: state.customLanguage,
    activeTierId: state.activeTierId,
    activeTopicId: state.activeTopicId,
    activeVocabTerm: state.activeVocabTerm,
    certificationTierId: state.certificationTierId,
    testDepthId: state.testDepthId,
    adultAttested: state.adultAttested,
    identityAssuranceLevel: state.identityAssuranceLevel,
    identityAttested: state.identityAttested,
    proctoringMode: state.proctoringMode,
    evaluationContext: state.evaluationContext,
    trainingMessages: state.trainingMessages,
    pendingStandardsReview: state.pendingStandardsReview,
    messages: state.messages,
    placementExpanded: state.placementExpanded,
    progress: state.progress
  }));
}

async function saveRemote() {
  if (!state.learnerId) return;
  const ladderCertifications = buildCertificationTranscript();
  const certificationValidations = state.progress.certificationValidations || [];
  try {
    await setDoc(doc(db, 'learners', state.learnerId), {
      learnerId: state.learnerId,
      lastActiveAt: new Date().toISOString(),
      accountUid: state.authUser?.uid || '',
      accountEmail: state.authUser?.email || '',
      adultAttested: state.adultAttested,
      ladderCertifications,
      certificationValidations,
      standardsReviews: state.progress.standardsReviews || [],
      studentTranscript: {
        updatedAt: new Date().toISOString(),
        ladderCertifications,
        certificationValidations,
        standardsReviews: state.progress.standardsReviews || []
      },
      ladderProgress: {
        version: LADDER_VERSION,
        language: state.language,
        customLanguage: state.customLanguage,
        activeTierId: state.activeTierId,
        activeTopicId: state.activeTopicId,
        activeVocabTerm: state.activeVocabTerm,
        educationTierId: state.educationTierId,
        certificationTierId: state.certificationTierId,
        testDepthId: state.testDepthId,
        accountUid: state.authUser?.uid || '',
        accountEmail: state.authUser?.email || '',
        adultAttested: state.adultAttested,
        identityAssuranceLevel: state.identityAssuranceLevel,
        identityAttested: state.identityAttested,
        proctoringMode: state.proctoringMode,
        evaluationContext: state.evaluationContext,
        completedTopics: state.progress.completedTopics,
        vocabulary: state.progress.vocabulary,
        selfAssignedTopicIds: state.progress.selfAssignedTopicIds,
        evaluationAttempts: state.progress.evaluationAttempts,
        ladderCertifications,
        certificationValidations,
        standardsReviews: state.progress.standardsReviews || [],
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
      console.log('[loadRemote] Document does not exist, creating:', learnerId);
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

    let data = snap.data();
    console.log('[loadRemote] Loaded document for', learnerId);

    // Fallback 1: if SDK doesn't have certifications at top level, check nested location
    if (!data.ladderCertifications && data.ladderProgress?.ladderCertifications) {
      data.ladderCertifications = data.ladderProgress.ladderCertifications;
    }

    // Fallback 2: if still no certifications, fetch directly from Firestore REST API to bypass SDK cache
    if (!data.ladderCertifications) {
      console.log('[loadRemote] No certs from SDK, trying REST API fallback...');
      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/playagame-f733d/databases/(default)/documents/learners/${learnerId}`;
        console.log('[loadRemote] REST URL:', restUrl);
        const response = await fetch(restUrl);
        console.log('[loadRemote] REST response status:', response.status);
        if (response.ok) {
          const firestoreDoc = await response.json();
          console.log('[loadRemote] REST response has ladderCertifications?', !!firestoreDoc.fields?.ladderCertifications);
          const certArray = firestoreDoc.fields?.ladderCertifications?.arrayValue?.values;
          console.log('[loadRemote] Cert array length:', certArray?.length || 0);
          if (certArray) {
            // Convert REST API format to JavaScript array
            data.ladderCertifications = certArray.map(cert => {
              const fields = cert.mapValue?.fields || {};
              const result = {};
              Object.entries(fields).forEach(([key, value]) => {
                if (value.stringValue) result[key] = value.stringValue;
                else if (value.integerValue) result[key] = parseInt(value.integerValue);
                else if (value.timestampValue) result[key] = value.timestampValue;
                else if (value.booleanValue) result[key] = value.booleanValue;
              });
              return result;
            });
            console.log('[loadRemote] Loaded certifications from REST API fallback:', data.ladderCertifications.length);
          }
        }
      } catch (e) {
        console.warn('[loadRemote] REST API fallback failed:', e.message);
      }
    }

    console.log('[loadRemote] Certifications:', data.ladderCertifications?.length || 0);

    if (!data.ladderProgress) return;
    const ladder = data.ladderProgress;
    state.language = ladder.language || state.language;
    state.customLanguage = ladder.customLanguage || state.customLanguage;
    state.activeTierId = ladder.activeTierId || state.activeTierId;
    state.activeTopicId = ladder.activeTopicId || state.activeTopicId;
    state.activeVocabTerm = ladder.activeVocabTerm || state.activeVocabTerm;
    state.educationTierId = ladder.educationTierId || state.educationTierId;
    state.certificationTierId = ladder.certificationTierId || state.certificationTierId;
    state.testDepthId = normalizeTestDepthId(ladder.testDepthId || state.testDepthId);
    state.adultAttested = Boolean(ladder.adultAttested || data.adultAttested || state.adultAttested);
    localStorage.setItem(LS_ADULT_ATTESTED, String(state.adultAttested));
    state.identityAssuranceLevel = ladder.identityAssuranceLevel || state.identityAssuranceLevel;
    state.identityAttested = Boolean(ladder.identityAttested);
    state.proctoringMode = ladder.proctoringMode || state.proctoringMode;
    state.evaluationContext = ladder.evaluationContext || null;
    state.progress.completedTopics = ladder.completedTopics || {};
    state.progress.vocabulary = ladder.vocabulary || {};
    state.progress.selfAssignedTopicIds = ladder.selfAssignedTopicIds || [];
    state.progress.evaluationAttempts = ladder.evaluationAttempts || [];
    state.progress.ladderCertifications = ladder.ladderCertifications || data.ladderCertifications || [];
    state.progress.certificationValidations = ladder.certificationValidations || data.certificationValidations || data.studentTranscript?.certificationValidations || [];
    state.progress.standardsReviews = ladder.standardsReviews || data.standardsReviews || data.studentTranscript?.standardsReviews || [];
    state.progress.placement = ladder.placement || null;
    state.progress.assessmentMessages = ladder.assessmentMessages || [];
    state.progress.transcriptEvents = ladder.transcriptEvents || [];
    syncAssessmentCertificationRecords();
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
    state.certificationTierId = saved.certificationTierId || state.certificationTierId;
    state.testDepthId = normalizeTestDepthId(saved.testDepthId || state.testDepthId);
    state.adultAttested = Boolean(saved.adultAttested || state.adultAttested);
    localStorage.setItem(LS_ADULT_ATTESTED, String(state.adultAttested));
    state.identityAssuranceLevel = saved.identityAssuranceLevel || state.identityAssuranceLevel;
    state.identityAttested = Boolean(saved.identityAttested);
    state.proctoringMode = saved.proctoringMode || state.proctoringMode;
    state.evaluationContext = saved.evaluationContext || null;
    state.trainingMessages = Array.isArray(saved.trainingMessages) ? saved.trainingMessages : [];
    state.pendingStandardsReview = saved.pendingStandardsReview || null;
    state.messages = Array.isArray(saved.messages) ? saved.messages : [];
    state.placementExpanded = saved.placementExpanded ?? state.placementExpanded;
    state.progress = saved.progress || state.progress;
    state.progress.completedTopics ||= {};
    state.progress.vocabulary ||= {};
    state.progress.selfAssignedTopicIds ||= [];
    state.progress.evaluationAttempts ||= [];
    state.progress.ladderCertifications ||= [];
    state.progress.certificationValidations ||= [];
    state.progress.standardsReviews ||= [];
    state.progress.placement ||= null;
    state.progress.assessmentMessages ||= [];
    state.progress.transcriptEvents ||= [];
    syncAssessmentCertificationRecords();
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

function certificationLevelRank(depthId) {
  return {
    'assessment-certified': 0,
    certification: 1,
    'expert-challenge': 2,
    'mastery-challenge': 3
  }[depthId] ?? 0;
}

function certificationDepthLabel(depthId) {
  if (depthId === 'assessment-certified') return 'Assessment certified';
  return TEST_DEPTHS.find((item) => item.id === depthId)?.label || 'Certification';
}

function sortCertificationRecords(records) {
  return [...records].sort((a, b) => (
    certificationLevelRank(b.depthId) - certificationLevelRank(a.depthId)
    || Number(b.tierOrder || 0) - Number(a.tierOrder || 0)
    || String(b.earnedAt || '').localeCompare(String(a.earnedAt || ''))
  ));
}

function upsertCertificationRecord(record) {
  const existing = state.progress.ladderCertifications || [];
  const filtered = existing.filter((item) => item.id !== record.id);
  state.progress.ladderCertifications = sortCertificationRecords([record, ...filtered]).slice(0, 300);
}

function buildCertificationTranscript() {
  return sortCertificationRecords(state.progress.ladderCertifications || []);
}

function certificationTranscriptLines() {
  const records = buildCertificationTranscript();
  const assessment = records.filter((record) => record.source === 'assessment');
  const exams = records.filter((record) => record.source !== 'assessment');
  const lines = [];
  if (assessment.length) {
    const latest = assessment.reduce((max, record) => (
      String(record.earnedAt || '') > String(max.earnedAt || '') ? record : max
    ), assessment[0]);
    lines.push({
      id: 'assessment-certifications',
      title: 'Assessment certifications',
      depthLabel: 'Assessment certified',
      evidence: TRANSCRIPT_STATUS.VERIFIED,
      earnedAt: latest.earnedAt,
      transcriptLine: `Placed out of ${assessment.length} ${assessment.length === 1 ? 'tier' : 'tiers'}:`,
      tiersList: assessment.map((record) => record.title).reverse()
    });
  }
  return [...lines, ...exams];
}

function syncAssessmentCertificationRecords() {
  const placement = state.progress.placement;
  if (!placement?.grantedTierIds?.length) return;
  const earnedAt = placement.certifiedAt || placement.completedAt || new Date().toISOString();
  const granted = new Set(placement.grantedTierIds);
  LADDER_TIERS.forEach((tier) => {
    if (!granted.has(tier.id)) return;
    upsertCertificationRecord({
      id: `assessment:${LADDER_VERSION}:${tier.id}`,
      source: 'assessment',
      status: 'certified',
      evidence: TRANSCRIPT_STATUS.VERIFIED,
      depthId: 'assessment-certified',
      depthLabel: 'Assessment certified',
      certificationTierId: 'assessment',
      certificationTierLabel: 'Assessment',
      ladderTierId: tier.id,
      ladderTierLabel: `${tier.name} - ${tier.title}`,
      tierOrder: tier.order,
      title: `${tier.name}: ${tier.title}`,
      earnedAt,
      rationale: placement.reasoning || 'Granted by Ladder placement assessment.',
      score: {
        capability: placement.capabilityScore,
        technical: placement.technicalScore,
        governance: placement.governanceScore
      },
      transcriptLine: `${tier.name}: ${tier.title} - Assessment certified`
    });
  });
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

function parseCertificationResponse(rawText) {
  const visibleText = String(rawText || '').replace(CERTIFICATION_RESULT_REGEX, '').trim();
  const match = String(rawText || '').match(CERTIFICATION_RESULT_REGEX);
  if (!match) return { certificationResult: null, rubricDimensions: null, visibleText };
  try {
    const certificationResult = JSON.parse(match[1]);
    const rubricDimensions = parseRubricEvaluation(String(rawText || ''));
    return { certificationResult, rubricDimensions, visibleText };
  } catch (error) {
    console.warn('Could not parse certification result:', error);
    return { certificationResult: null, rubricDimensions: null, visibleText };
  }
}

function parseCertificationValidationResponse(rawText) {
  const match = String(rawText || '').match(CERTIFICATION_VALIDATION_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    console.warn('Could not parse certification validation:', error);
    return null;
  }
}

function parseConversationCompletionResponse(rawText) {
  const text = String(rawText || '');

  // Look for COMPLETION:status format
  const completionMatch = text.match(/COMPLETION:\s*(completed|verified|self_reported|not_ready)/i);

  // Remove completion marker from visible text
  let visibleText = text
    .replace(/COMPLETION:\s*(completed|verified|self_reported|not_ready)\s*$/gim, '')
    .replace(CONVERSATION_COMPLETE_REGEX, '')  // Also remove old format if present
    .replace(/<!--[\s\S]*?-->/g, '')            // Remove any HTML comments
    .trim();

  if (!completionMatch) return { completion: null, visibleText };

  const status = completionMatch[1].toLowerCase();
  const completion = {
    status: ['completed', 'verified', 'self_reported', 'not_ready'].includes(status) ? status : 'not_ready',
    confidence: 0.95,
    rationale: 'parsed from completion marker'
  };

  return { completion: normalizeConversationCompletion(completion), visibleText };
}

function normalizeConversationCompletion(raw) {
  const allowed = new Set([
    TRANSCRIPT_STATUS.COMPLETED,
    TRANSCRIPT_STATUS.VERIFIED,
    TRANSCRIPT_STATUS.SELF_REPORTED,
    'not_ready'
  ]);
  const status = allowed.has(raw?.status) ? raw.status : 'not_ready';
  return {
    status,
    confidence: Math.max(0, Math.min(1, Number(raw?.confidence ?? 0))),
    rationale: String(raw?.rationale || '').slice(0, 500)
  };
}

function standardsReviewIdFor(topicId = getActiveTopic().id) {
  return `${LADDER_VERSION}:standards:${topicId}`;
}

function existingStandardsReview(topicId = getActiveTopic().id) {
  const id = standardsReviewIdFor(topicId);
  return (state.progress.standardsReviews || []).find((review) => review.id === id) || null;
}

function isTranscriptableConversationStatus(status) {
  return [
    TRANSCRIPT_STATUS.COMPLETED,
    TRANSCRIPT_STATUS.VERIFIED,
    TRANSCRIPT_STATUS.SELF_REPORTED
  ].includes(status);
}

function queueStandardsReviewOffer(completion) {
  if (!completion || !isTranscriptableConversationStatus(completion.status)) return;
  const topic = getActiveTopic();
  const tier = getActiveTier();
  if (existingStandardsReview(topic.id)) return;
  state.pendingStandardsReview = {
    id: standardsReviewIdFor(topic.id),
    topicId: topic.id,
    topicTitle: topic.title,
    tierId: tier.id,
    tierLabel: `${tier.name}: ${tier.title}`,
    completion,
    offeredAt: new Date().toISOString(),
    status: 'offered'
  };
}

function standardsFrameworksForReview() {
  const selectedTier = CERTIFICATION_TIERS.find((item) => item.id === state.educationTierId) || CERTIFICATION_TIERS[0];
  const named = selectedTier.standards.split(',').map((item) => item.trim()).filter(Boolean);
  const core = ['AI4K12', 'ISTE', 'CSTA', 'UNESCO', 'NIST AI RMF', 'EU AI Act'];
  return [...new Set([...named, ...core])].slice(0, 8);
}

function standardsReviewSystemPrompt() {
  return `You are an AESOP AI Academy standards reviewer.

Review a completed guided education conversation against multiple standards frameworks. Use the AESOP alignment scale:
- strong: substantial evidence in the conversation
- partial: incidental or limited evidence
- none: not addressed

Judge only from the transcript provided. Do not reward claims that are not evidenced by the learner's responses.

Return only JSON with this shape:
{"overallRating":"strong|partial|none","summary":"one concise student-facing summary","frameworks":[{"framework":"AI4K12","rating":"strong|partial|none","evidence":"one sentence from the conversation evidence","nextStep":"one concise improvement or extension"}]}`;
}

function standardsReviewMessages(offer) {
  const selectedTier = CERTIFICATION_TIERS.find((item) => item.id === state.educationTierId) || CERTIFICATION_TIERS[0];
  const transcript = state.messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .slice(-30)
    .map((message, index) => `${index + 1}. ${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n');
  return [{
    role: 'user',
    content: `Review this completed Ladder learning conversation.

Topic: ${offer.topicTitle}
Ladder tier: ${offer.tierLabel}
Education tier: ${selectedTier.label}
Frameworks to review: ${standardsFrameworksForReview().join(', ')}
Completion status: ${offer.completion?.status || 'completed'}
Completion rationale: ${offer.completion?.rationale || ''}

Conversation transcript:
${transcript}`
  }];
}

function normalizeStandardsReview(raw, offer, responseModel) {
  const now = new Date().toISOString();
  const ratings = new Set(['strong', 'partial', 'none']);
  const frameworks = Array.isArray(raw?.frameworks) ? raw.frameworks : [];
  const normalizedFrameworks = frameworks.map((item) => ({
    framework: String(item?.framework || 'Standards').slice(0, 60),
    rating: ratings.has(String(item?.rating || '').toLowerCase()) ? String(item.rating).toLowerCase() : 'none',
    evidence: String(item?.evidence || 'No specific evidence returned.').slice(0, 280),
    nextStep: String(item?.nextStep || '').slice(0, 220)
  })).filter((item) => item.framework);
  const overall = ratings.has(String(raw?.overallRating || '').toLowerCase())
    ? String(raw.overallRating).toLowerCase()
    : 'partial';
  return {
    id: offer.id,
    source: 'ladder_guided_conversation',
    topicId: offer.topicId,
    topicTitle: offer.topicTitle,
    tierId: offer.tierId,
    tierLabel: offer.tierLabel,
    completionStatus: offer.completion?.status || TRANSCRIPT_STATUS.COMPLETED,
    overallRating: overall,
    summary: String(raw?.summary || 'Standards review completed.').slice(0, 500),
    frameworks: normalizedFrameworks.length ? normalizedFrameworks : standardsFrameworksForReview().map((framework) => ({
      framework,
      rating: 'partial',
      evidence: 'The reviewer did not return framework-level detail.',
      nextStep: 'Run a human spot check before using this externally.'
    })),
    reviewedAt: now,
    reviewerModel: responseModel || CERTIFICATION_VALIDATOR_MODEL,
    scale: {
      strong: 'substantial coverage',
      partial: 'incidental or limited coverage',
      none: 'not addressed'
    }
  };
}

function upsertStandardsReview(review) {
  const existing = state.progress.standardsReviews || [];
  const filtered = existing.filter((item) => item.id !== review.id);
  state.progress.standardsReviews = [review, ...filtered].slice(0, 200);
}

function studentTranscriptUrl() {
  const id = normalizeLearnerId(state.learnerId);
  const idParam = id ? `?id=${encodeURIComponent(id)}` : '';
  return `/student-transcript-live.html${idParam}`;
}

async function runStandardsReview(offer) {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CERTIFICATION_VALIDATOR_MODEL,
      messages: standardsReviewMessages(offer),
      system_prompt: standardsReviewSystemPrompt(),
      max_tokens: 900
    })
  });
  const data = await response.json();
  const rawText = data?.content?.[0]?.text || '{}';
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!response.ok) throw new Error(data?.error || 'Standards review failed.');
  return normalizeStandardsReview(JSON.parse(jsonMatch ? jsonMatch[0] : cleaned), offer, data?.model);
}

async function completeStandardsReview() {
  const offer = state.pendingStandardsReview;
  if (!offer || offer.status === 'reviewing') return;
  await ensureLearnerId();
  state.pendingStandardsReview = { ...offer, status: 'reviewing' };
  renderChat();
  try {
    const review = await runStandardsReview(offer);
    upsertStandardsReview(review);
    addTranscript(
      'standards_review_completed',
      `${review.topicTitle} standards review`,
      `${review.summary} Saved to the student transcript.`,
      { status: review.completionStatus || TRANSCRIPT_STATUS.COMPLETED, evidence: 'standards_review' }
    );
    state.pendingStandardsReview = null;
    state.messages.push({
      role: 'assistant',
      content: `Standards review complete. I saved it to your student page: ${studentTranscriptUrl()}`
    });
  } catch (error) {
    state.pendingStandardsReview = { ...offer, status: 'offered', error: error.message || 'Could not complete standards review.' };
  }
  await persist();
  render();
}

async function dismissStandardsReviewOffer() {
  state.pendingStandardsReview = null;
  await persist();
  renderChat();
}

function handleStandardsReviewClick(event) {
  const button = event.target.closest('[data-standards-review-action]');
  if (!button) return;
  const action = button.dataset.standardsReviewAction;
  if (action === 'run') {
    completeStandardsReview();
  } else if (action === 'dismiss') {
    dismissStandardsReviewOffer();
  }
}

function certificationValidationSystemPrompt() {
  return `You are the independent Ladder certification validator for AESOP AI Academy.

You are not the examiner. You are a second model reviewing whether a certification conversation is valid before any credential is recorded.

Validate BOTH sides:
1. Learner side: the learner gave enough relevant evidence for the proposed outcome, at the selected education tier, Ladder tier, and certification depth.
2. Examiner side: the examiner asked fair, scoped, evidence-seeking questions; applied the stated standard; did not certify too quickly; did not ignore contradictions; and did not invent evidence.

Reject validation if the conversation is too short, mostly leading, off-topic, missing evidence, mismatched to the blueprint, or if the proposed result is unsupported.

Return only this hidden marker, on one line:
<!--LADDER_CERTIFICATION_VALIDATION:{"valid":true,"learner_valid":true,"examiner_valid":true,"confidence":0.0,"rationale":"one concise reason","learner_evidence":"one concise evidence summary","examiner_review":"one concise process review","concerns":[]}-->

Set valid to true only when learner_valid and examiner_valid are both true. If invalid, set valid false and include concrete concerns. Do not include markdown, prose, or any text outside the marker.`;
}

function certificationValidationMessages(context, result, conversationMessages) {
  const transcript = conversationMessages.map((message, index) => (
    `${index + 1}. ${message.role.toUpperCase()}: ${message.content}`
  )).join('\n\n');
  return [{
    role: 'user',
    content: `Validate this Ladder certification conversation.

Certification context:
${JSON.stringify(context, null, 2)}

Proposed examiner result:
${JSON.stringify(result, null, 2)}

Conversation transcript:
${transcript}`
  }];
}

function normalizeCertificationValidation(rawValidation, context, result, responseModel) {
  const learnerValid = rawValidation?.learner_valid === true;
  const examinerValid = rawValidation?.examiner_valid === true;
  const valid = rawValidation?.valid === true && learnerValid && examinerValid;
  return {
    id: `validation:${context.attemptId}`,
    attemptId: context.attemptId,
    blueprintId: context.blueprintId,
    blueprintVersion: context.blueprintVersion,
    ladderTierId: context.ladderTierId,
    ladderTierLabel: context.ladderTierLabel,
    depthId: context.testDepthId,
    depthLabel: context.testDepthLabel,
    certificationTierId: context.certificationTierId,
    certificationTierLabel: context.certificationTierLabel,
    proposedResult: result?.result || result?.status || '',
    valid,
    learnerValid,
    examinerValid,
    confidence: Number(rawValidation?.confidence ?? 0),
    rationale: rawValidation?.rationale || 'Validator did not provide a rationale.',
    learnerEvidence: rawValidation?.learner_evidence || '',
    examinerReview: rawValidation?.examiner_review || '',
    concerns: Array.isArray(rawValidation?.concerns) ? rawValidation.concerns : [],
    reviewerModel: responseModel || CERTIFICATION_VALIDATOR_MODEL,
    reviewedAt: new Date().toISOString()
  };
}

function failedCertificationValidation(context, result, reason) {
  return normalizeCertificationValidation({
    valid: false,
    learner_valid: false,
    examiner_valid: false,
    confidence: 0,
    rationale: reason,
    concerns: [reason]
  }, context, result, CERTIFICATION_VALIDATOR_MODEL);
}

function upsertCertificationValidation(validation) {
  const existing = state.progress.certificationValidations || [];
  const filtered = existing.filter((item) => item.id !== validation.id);
  state.progress.certificationValidations = [validation, ...filtered].slice(0, 100);
}

async function validateCertificationConversation(context, result) {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CERTIFICATION_VALIDATOR_MODEL,
        messages: certificationValidationMessages(context, result, state.messages.slice(-36)),
        system_prompt: certificationValidationSystemPrompt(),
        max_tokens: 700
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || '';
    const parsed = parseCertificationValidationResponse(rawText);
    if (!response.ok || !parsed) {
      return failedCertificationValidation(context, result, data?.error || 'Certification validator did not return a valid review.');
    }
    return normalizeCertificationValidation(parsed, context, result, data?.model);
  } catch (error) {
    return failedCertificationValidation(context, result, 'Certification validator could not be reached.');
  }
}

async function recordCertificationResult(result) {
  const context = state.evaluationContext;
  if (!context || !result) return;
  const normalizedResult = String(result.result || result.status || '').toLowerCase().replace(/[\s-]+/g, '_');
  const isCertified = ['certified', 'passed', 'pass'].includes(normalizedResult);
  const attempt = state.progress.evaluationAttempts.find((item) => item.attemptId === context.attemptId);
  if (attempt) {
    attempt.status = 'validation_pending';
    attempt.proposedStatus = isCertified ? 'certified' : 'not_certified';
    attempt.completedAt = new Date().toISOString();
    attempt.score = result.score ?? null;
    attempt.rationale = result.rationale || result.evidenceSummary || '';
  }
  const validation = await validateCertificationConversation(context, result);
  upsertCertificationValidation(validation);
  if (attempt) {
    attempt.status = validation.valid ? (isCertified ? 'certified' : 'not_certified') : 'validation_failed';
    attempt.validationStatus = validation.valid ? 'valid' : 'invalid';
    attempt.validation = validation;
  }
  if (!validation.valid) {
    addTranscript(
      'certification_validation_failed',
      `${context.certificationTierLabel} ${context.testDepthLabel}`,
      `No credential recorded for ${context.ladderTierLabel}. Independent validation failed: ${validation.rationale}`,
      { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'ai_validation_failed' }
    );
    return;
  }
  if (!isCertified) {
    addTranscript(
      'certification_not_awarded',
      `${context.certificationTierLabel} ${context.testDepthLabel}`,
      `No certification awarded for ${context.ladderTierLabel}. Independent validation confirmed the review process. ${result.rationale || result.evidenceSummary || 'The examiner requested more evidence.'}`,
      { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'ai_exam_validated' }
    );
    return;
  }
  const tier = LADDER_TIERS.find((item) => item.id === context.ladderTierId) || getActiveTier();
  const earnedAt = new Date().toISOString();
  const record = {
    id: `${context.blueprintId}:${context.attemptId}`,
    source: 'ai_exam',
    status: 'certified',
    evidence: TRANSCRIPT_STATUS.VERIFIED,
    depthId: context.testDepthId,
    depthLabel: context.testDepthLabel,
    certificationTierId: context.certificationTierId,
    certificationTierLabel: context.certificationTierLabel,
    ladderTierId: context.ladderTierId,
    ladderTierLabel: context.ladderTierLabel,
    tierOrder: tier.order,
    title: `${context.ladderTierLabel} - ${context.testDepthLabel}`,
    earnedAt,
    score: result.score ?? null,
    rationale: result.rationale || result.evidenceSummary || 'Certified by AI examiner.',
    standards: context.standards,
    blueprintId: context.blueprintId,
    blueprintVersion: context.blueprintVersion,
    identityAssurance: context.identityAssurance || buildIdentityAssuranceRecord(earnedAt),
    validation,
    validationStatus: 'valid',
    transcriptLine: `${context.ladderTierLabel} - ${context.certificationTierLabel} ${context.testDepthLabel}. Independent validation confirmed learner evidence and examiner process.`
  };
  upsertCertificationRecord(record);
  addTranscript(
    'certification_awarded',
    record.title,
    record.transcriptLine,
    { status: TRANSCRIPT_STATUS.VERIFIED, evidence: 'ai_exam_certified' }
  );

  // Show certification success UI
  renderTranscript();
  renderProgress();
  showCertificationSuccess(record);

  // Persist to Firestore
  await persist();
}

function showRecentCertification() {
  // Find the most recent certification
  const certs = state.progress.ladderCertifications || [];
  if (certs.length === 0) {
    alert('No certifications found.');
    return;
  }
  const recent = certs[certs.length - 1];
  showCertificationSuccess(recent);
}

function showCertificationSuccess(record) {
  // Create and show celebration modal
  const modal = document.createElement('div');
  modal.id = 'certificationSuccessModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const message = `🎓 I just earned my ${record.ladderTierLabel} - ${record.certificationTierLabel} ${record.depthLabel} certification on @AesopAIAcademy! Independent validation confirmed. #AIEducation #LearningJourney`;

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    ">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
      <h2 style="color: #102235; margin: 0 0 0.5rem; font-size: 1.8rem;">Certification Awarded!</h2>
      <p style="color: #555; margin: 0 0 1.5rem; font-size: 0.95rem;">
        ${record.title}<br>
        <small style="color: #888;">Independent validation confirmed</small>
      </p>

      <div style="
        background: #f8f4e6;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        text-align: left;
        border: 1px solid #c9a05a;
      ">
        <p style="margin: 0 0 0.5rem; font-size: 0.85rem; color: #666; font-weight: 600;">Share your achievement:</p>
        <textarea id="certificationMessage" readonly style="
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.85rem;
          font-family: monospace;
          min-height: 80px;
          resize: none;
        ">${message}</textarea>
        <button onclick="
          const msg = document.getElementById('certificationMessage');
          msg.select();
          document.execCommand('copy');
          this.textContent = 'Copied!';
          setTimeout(() => this.textContent = 'Copy to clipboard', 2000);
        " style="
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.6rem;
          background: #c9a05a;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        ">Copy to clipboard</button>
      </div>

      <button onclick="document.getElementById('certificationSuccessModal').remove()" style="
        padding: 0.8rem 1.5rem;
        background: #102235;
        color: #ffe7a8;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
      ">View your certification</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Scroll to transcript
  setTimeout(() => {
    const transcript = document.getElementById('transcript');
    if (transcript) {
      transcript.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 500);
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

async function saveAccountProfile() {
  if (!state.authUser) return;
  await ensureLearnerId();
  localStorage.setItem(LS_ADULT_ATTESTED, String(state.adultAttested));
  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, 'learners', state.learnerId), {
      learnerId: state.learnerId,
      accountUid: state.authUser.uid,
      accountEmail: state.authUser.email || '',
      adultAttested: state.adultAttested,
      adultAttestedAt: state.adultAttested ? now : null,
      ladderProgress: {
        accountUid: state.authUser.uid,
        accountEmail: state.authUser.email || '',
        adultAttested: state.adultAttested
      }
    }, { merge: true });
  } catch (error) {
    console.warn('Could not save account profile:', error);
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
  const now = new Date().toISOString();
  const attemptId = `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  state.progress.placement = {
    ...placement,
    certifiedAt: now,
    profileAppliedAt: null,
    profileDeclinedAt: null
  };
  state.placementExpanded = false;
  const granted = new Set(placement.grantedTierIds);
  state.progress.ladderCertifications = (state.progress.ladderCertifications || []).filter((record) => record.source !== 'assessment');

  // Track assessment attempt
  state.progress.evaluationAttempts ||= [];
  state.progress.evaluationAttempts.unshift({
    attemptId,
    certificationTierLabel: 'Assessment',
    testDepthLabel: 'Placement',
    ladderTierLabel: 'Placement assessment',
    status: 'completed',
    score: Math.round((placement.capabilityScore + placement.technicalScore + placement.governanceScore) / 3) || 0,
    startedAt: now,
    completedAt: now,
    rationale: `Assessment completed: ${placement.reasoning || 'No rationale provided.'}`
  });
  // Keep only last 25 attempts
  state.progress.evaluationAttempts = state.progress.evaluationAttempts.slice(0, 25);

  Object.keys(state.progress.completedTopics).forEach((key) => {
    if (state.progress.completedTopics[key]?.status === TRANSCRIPT_STATUS.PLACED_OUT) {
      delete state.progress.completedTopics[key];
    }
  });
  LADDER_TIERS.forEach((tier) => {
    if (!granted.has(tier.id)) return;
    upsertCertificationRecord({
      id: `assessment:${LADDER_VERSION}:${tier.id}`,
      source: 'assessment',
      status: 'certified',
      evidence: TRANSCRIPT_STATUS.VERIFIED,
      depthId: 'assessment-certified',
      depthLabel: 'Assessment certified',
      certificationTierId: 'assessment',
      certificationTierLabel: 'Assessment',
      ladderTierId: tier.id,
      ladderTierLabel: `${tier.name} - ${tier.title}`,
      tierOrder: tier.order,
      title: `${tier.name}: ${tier.title}`,
      earnedAt: now,
      rationale: placement.reasoning || 'Granted by Ladder placement assessment.',
      score: {
        capability: placement.capabilityScore,
        technical: placement.technicalScore,
        governance: placement.governanceScore
      },
      transcriptLine: `${tier.name}: ${tier.title} - Assessment certified`
    });
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
  state.progress.ladderCertifications = (state.progress.ladderCertifications || []).filter((record) => record.source !== 'assessment');
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
  if (el.learnerIdLabel) el.learnerIdLabel.textContent = state.learnerId || 'Not started';
  if (el.learnerLookup) el.learnerLookup.value = state.learnerId || '';
  renderLearnerLinks(state.learnerId);
}

function renderLearnerLinks(learnerId) {
  const id = normalizeLearnerId(learnerId);
  const idParam = id ? `?id=${encodeURIComponent(id)}` : '';
  if (el.transcriptPageLink) el.transcriptPageLink.href = `/student-transcript-live.html${idParam}`;
  if (el.studentTranscriptLink) el.studentTranscriptLink.href = `/student-transcript-live.html${idParam}`;
  if (el.ladderCertificationsLink) el.ladderCertificationsLink.href = `/ladder-certifications.html${idParam}`;
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
  state.evaluationContext = null;
  state.trainingMessages = [];
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

function credentialTierCounts() {
  const certified = new Set();
  const expertise = new Set();
  const mastered = new Set();
  const acceptedStatuses = new Set(['certified', 'passed', 'pass', 'verified']);

  const add = (tierId, depthId, status = 'certified') => {
    if (!tierId || !acceptedStatuses.has(String(status || '').toLowerCase())) return;
    if (depthId === 'certification' || depthId === 'expert-challenge' || depthId === 'mastery-challenge') {
      certified.add(tierId);
    }
    if (depthId === 'expert-challenge' || depthId === 'mastery-challenge') {
      expertise.add(tierId);
    }
    if (depthId === 'mastery-challenge') {
      mastered.add(tierId);
    }
  };

  (state.progress.ladderCertifications || []).forEach((record) => {
    add(record.ladderTierId, record.depthId, record.status);
  });
  (state.progress.evaluationAttempts || []).forEach((attempt) => {
    add(attempt.ladderTierId, attempt.testDepthId, attempt.status);
  });

  return {
    certified: certified.size,
    expertise: expertise.size,
    mastered: mastered.size
  };
}

function highestCertificationByTier() {
  const highest = {};
  const acceptedStatuses = new Set(['certified', 'passed', 'pass', 'verified']);
  const add = (tierId, depthId, status = 'certified', source = '') => {
    if (!tierId || source === 'assessment') return;
    if (!acceptedStatuses.has(String(status || '').toLowerCase())) return;
    const rank = certificationLevelRank(depthId);
    if (rank < 1) return;
    if (!highest[tierId] || rank > highest[tierId].rank) {
      highest[tierId] = { depthId, rank };
    }
  };
  (state.progress.ladderCertifications || []).forEach((record) => {
    add(record.ladderTierId, record.depthId, record.status, record.source);
  });
  (state.progress.evaluationAttempts || []).forEach((attempt) => {
    add(attempt.ladderTierId, attempt.testDepthId, attempt.status, 'attempt');
  });
  return highest;
}

function renderHeroRibbons() {
  if (!el.heroRibbonTrack) return;
  const highest = highestCertificationByTier();
  const labels = {
    certification: { label: 'Certified', short: 'Cert' },
    'expert-challenge': { label: 'Expert', short: 'Expert' },
    'mastery-challenge': { label: 'Mastery', short: 'Master' }
  };
  el.heroRibbonTrack.innerHTML = LADDER_TIERS.map((tier) => {
    const credential = highest[tier.id];
    const depthId = credential?.depthId || '';
    const label = labels[depthId];
    const title = label
      ? `${tier.name}: ${label.label}`
      : `${tier.name}: no certification yet`;
    return `
      <div class="hero-ribbon-slot ${label ? `has-ribbon ribbon-${depthId}` : 'is-empty'}" title="${escapeHtml(title)}">
        <span class="hero-ribbon-number">${tier.order}</span>
        <span class="hero-ribbon-medal">${label ? label.short : ''}</span>
        <span class="hero-ribbon-tier">${label ? label.short : 'no cert'}</span>
      </div>
    `;
  }).join('');
}

function renderHeroProgress(count, total) {
  const tierTotal = LADDER_TIERS.length;
  const tierComplete = completedTierCount();
  const credentials = credentialTierCounts();
  const certCount = (state.progress.ladderCertifications || []).length;
  if (el.heroCertCount) el.heroCertCount.textContent = String(certCount);
  if (el.heroCoursesComplete) el.heroCoursesComplete.textContent = `${count} / ${total}`;
  if (el.heroTiersComplete) el.heroTiersComplete.textContent = `${tierComplete} / ${tierTotal}`;
  if (el.heroTiersCertified) el.heroTiersCertified.textContent = `${credentials.certified} / ${tierTotal}`;
  if (el.heroTiersExpert) el.heroTiersExpert.textContent = `${credentials.expertise} / ${tierTotal}`;
  if (el.heroTiersMastered) el.heroTiersMastered.textContent = `${credentials.mastered} / ${tierTotal}`;
  renderHeroRibbons();
}

function renderCertificationActions() {
  const certs = state.progress.ladderCertifications || [];
  if (certs.length === 0) return;

  const recentCert = certs[certs.length - 1];
  if (!recentCert.celebrationShown) {
    const actionDiv = document.createElement('div');
    actionDiv.style.cssText = `
      padding: 1rem;
      background: #f0f8f5;
      border: 2px solid #4caf82;
      border-radius: 8px;
      margin-bottom: 1rem;
      text-align: center;
    `;
    actionDiv.innerHTML = `
      <p style="margin: 0 0 0.75rem; color: #102235; font-weight: 600;">
        🎓 ${recentCert.title}
      </p>
      <button onclick="showRecentCertification()" style="
        padding: 0.75rem 1.5rem;
        background: #4caf82;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
      ">Show Celebration & Share</button>
    `;

    const transcript = document.getElementById('transcript');
    if (transcript) {
      transcript.insertAdjacentElement('beforebegin', actionDiv);
    }
  }
}

function renderProgress() {
  renderCertificationActions();
  const count = completedCount();
  const total = allTopics().length;
  const pct = total ? Math.round((count / total) * 100) : 0;
  el.progressBar.style.width = `${pct}%`;
  el.progressText.textContent = `${count} of ${total} rungs completed`;
  el.tierCompletionStatus.textContent = `${completedTierCount()} / ${LADDER_TIERS.length} tiers completed`;
  renderHeroProgress(count, total);
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
      state.evaluationContext = null;
      state.trainingMessages = [];
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
      state.evaluationContext = null;
      state.trainingMessages = [];
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

function renderConversationMode() {
  const context = state.evaluationContext;
  const isCertification = Boolean(context);
  const hasMessages = state.messages.length > 0;

  // Show banner if exam is in progress
  if (hasMessages && isCertification && el.conversationPanel) {
    const banner = document.getElementById('examInProgressBanner');
    if (banner) {
      banner.style.display = 'block';
    }
  }

  if (el.conversationTitle) {
    el.conversationTitle.textContent = isCertification ? `${context.testDepthLabel} Exam` : 'Guided Conversation';
  }
  if (el.conversationSummary) {
    el.conversationSummary.textContent = isCertification
      ? 'The same AI window is now collecting certification evidence, applying the rubric, and preparing a reviewable result.'
      : 'The AI asks, challenges, applies, and checks readiness for this rung.';
  }
  if (el.certificationModeBar) {
    el.certificationModeBar.hidden = !isCertification;
  }
  if (el.certificationModeTitle && context) {
    el.certificationModeTitle.textContent = `${context.certificationTierLabel} ${context.testDepthLabel}`;
  }
  if (el.certificationModeDetail && context) {
    el.certificationModeDetail.textContent = `${context.ladderTierLabel}. Required evidence: ${context.testDepthEvidence}. Review: ${context.testDepthReview}.`;
  }
  if (el.startConversationBtn) {
    el.startConversationBtn.hidden = isCertification;
  }
  if (el.chatInput) {
    el.chatInput.placeholder = isCertification
      ? 'Answer the exam question or provide evidence'
      : 'Answer the guide or ask for the next challenge';
  }
}

function renderStandardsReviewPrompt() {
  const offer = state.pendingStandardsReview;
  if (!offer || offer.topicId !== getActiveTopic().id || state.evaluationContext) return '';
  const isReviewing = offer.status === 'reviewing';
  const transcriptHref = studentTranscriptUrl();
  const error = offer.error
    ? `<p class="standards-review-error">${escapeHtml(offer.error)}</p>`
    : '';
  return `
    <div class="standards-review-offer" role="status">
      <strong>Map this conversation to standards?</strong>
      <p>The guide has enough evidence to mark this rung as ${escapeHtml(statusLabel(offer.completion?.status))}. AESOP can now review the conversation against AI4K12, ISTE, CSTA, UNESCO, NIST AI RMF, and EU AI Act style standards, then save the results on your student page.</p>
      ${error}
      <div class="standards-review-actions">
        <button type="button" data-standards-review-action="run" ${isReviewing ? 'disabled' : ''}>${isReviewing ? 'Reviewing...' : 'Complete standards review'}</button>
        <button type="button" class="secondary" data-standards-review-action="dismiss" ${isReviewing ? 'disabled' : ''}>Not now</button>
        <a href="${transcriptHref}">Student page</a>
      </div>
    </div>`;
}

function renderChat() {
  renderConversationMode();
  if (!state.messages.length) {
    el.chatLog.innerHTML = (state.evaluationContext
      ? '<div class="message assistant"><strong>Examiner</strong>The certification exam will begin here when you start certification for this rung.</div>'
      : '<div class="message assistant"><strong>Guide</strong>Click Start Conversation to begin a guided conversation for this rung.</div>')
      + renderStandardsReviewPrompt();
    return;
  }
  el.chatLog.innerHTML = state.messages.map((message) => (
    `<div class="message ${message.role === 'user' ? 'user' : 'assistant'}${state.evaluationContext && message.role === 'assistant' ? ' exam' : ''}"><strong>${message.role === 'user' ? 'You' : state.evaluationContext ? 'Examiner' : 'Guide'}</strong>${formatChatMessage(message.content)}</div>`
  )).join('') + renderStandardsReviewPrompt();
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

function formatChatMessage(content) {
  // Convert markdown to HTML for better readability in chat
  let html = escapeHtml(content);

  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Bullet lists - convert * to <li> and wrap in <ul>
  html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');

  // Line breaks - convert \n to <br> but preserve structure
  html = html.replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

function renderTranscript() {
  const certificationLines = certificationTranscriptLines();
  const standardsReviews = state.progress.standardsReviews || [];
  if (!certificationLines.length && !standardsReviews.length) {
    el.transcriptList.innerHTML = '<div class="transcript-event"><strong>No certifications yet</strong><small>Assessment certifications, exam-awarded certifications, and standards reviews will appear here.</small></div>';
    return;
  }

  const certificationHtml = certificationLines.map((record) => {
    let content = `<p>${escapeHtml(record.transcriptLine || record.rationale || '')}</p>`;
    if (record.tiersList && record.tiersList.length > 0) {
      content += `<ul style="margin: 0.75rem 0 0 0; padding-left: 1.5rem;">
        ${record.tiersList.map(tier => `<li>${escapeHtml(tier)}</li>`).join('')}
      </ul>`;
    }
    return `<div class="transcript-event"><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.depthLabel)} - ${escapeHtml(record.evidence)} evidence - ${new Date(record.earnedAt).toLocaleString()}</small>${content}</div>`;
  }).join('');

  const standardsHtml = standardsReviews.slice(0, 6).map((review) => (
    `<div class="transcript-event standards-review-event">
      <strong>${escapeHtml(review.topicTitle || 'Standards review')}</strong>
      <small>Standards review - ${escapeHtml(review.overallRating || 'partial')} - ${new Date(review.reviewedAt || Date.now()).toLocaleString()}</small>
      <p>${escapeHtml(review.summary || 'Standards review completed.')}</p>
    </div>`
  )).join('');

  el.transcriptList.innerHTML = certificationHtml + standardsHtml;
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
  renderChat();
}

function identityAssuranceLevel() {
  return IDENTITY_ASSURANCE_LEVELS.find((item) => item.id === state.identityAssuranceLevel) || IDENTITY_ASSURANCE_LEVELS[1];
}

function proctoringMode() {
  return PROCTORING_MODES.find((item) => item.id === state.proctoringMode) || PROCTORING_MODES[2];
}

function buildIdentityAssuranceRecord(startedAt = new Date().toISOString()) {
  const level = identityAssuranceLevel();
  const proctor = proctoringMode();
  const attested = Boolean(state.identityAttested);
  return {
    level: level.id,
    label: level.credentialLabel,
    method: level.id,
    accountRequired: certificationTierRequiresAccount(),
    accountUid: state.authUser?.uid || '',
    accountEmail: state.authUser?.email || '',
    adultAttested: state.adultAttested,
    status: level.proctoringRequired
      ? 'proctoring_not_configured'
      : level.requiresAttestation
        ? attested ? 'attested' : 'attestation_missing'
        : level.id === 'account_bound' ? 'account_bound' : 'self_attested',
    attested,
    attestedAt: level.requiresAttestation && attested ? startedAt : null,
    adultOnly: level.id === 'proctored_verified',
    proctoringRequired: level.proctoringRequired,
    proctoringMode: level.proctoringRequired ? proctor.id : 'none',
    proctoringLabel: level.proctoringRequired ? proctor.label : 'None',
    identityProvider: '',
    verificationTransactionId: '',
    sessionRecordingId: '',
    proctorDecision: level.proctoringRequired ? 'not_configured' : 'not_required',
    proctorName: '',
    proctorOrganization: '',
    proctorNotes: ''
  };
}

function certificationIdentityGate() {
  const level = identityAssuranceLevel();
  if (level.proctoringRequired && !level.active) {
    return {
      locked: true,
      reason: 'Proctored verified certification is scaffolded but not connected yet. It will require adult consent, ID/liveness verification, and an automated, live, recorded, or institutional proctor.'
    };
  }
  if (level.requiresAttestation && !state.identityAttested) {
    return {
      locked: true,
      reason: 'Check the identity attestation before starting this certification.'
    };
  }
  return {
    locked: false,
    reason: level.description
  };
}

function renderIdentityAssurance() {
  if (!el.identityAssuranceSelect) return certificationIdentityGate();
  el.identityAssuranceSelect.innerHTML = IDENTITY_ASSURANCE_LEVELS.map((item) => (
    `<option value="${item.id}">${item.label}${item.active ? '' : ' (scaffold)'}</option>`
  )).join('');
  el.identityAssuranceSelect.value = state.identityAssuranceLevel;
  if (el.proctoringModeSelect) {
    el.proctoringModeSelect.innerHTML = PROCTORING_MODES.map((item) => (
      `<option value="${item.id}">${item.label}</option>`
    )).join('');
    el.proctoringModeSelect.value = state.proctoringMode;
  }
  const level = identityAssuranceLevel();
  if (el.identityAttestationCheck) {
    el.identityAttestationCheck.checked = Boolean(state.identityAttested);
    const attestation = el.identityAttestationCheck.closest('.identity-attestation');
    if (attestation) attestation.hidden = !level.requiresAttestation;
  }
  if (el.proctoringModeField) {
    el.proctoringModeField.hidden = !level.proctoringRequired;
  }
  const gate = certificationIdentityGate();
  if (el.identityAssuranceNotice) {
    el.identityAssuranceNotice.hidden = false;
    el.identityAssuranceNotice.textContent = gate.reason;
  }
  return gate;
}

function renderAccountGate() {
  const gate = accountGateForCertificationTier();
  if (certificationTierRequiresAccount()) {
    if (el.accountGatePanel) el.accountGatePanel.hidden = true;
    return gate;
  }
  const shouldShow = Boolean(state.authUser);
  if (el.accountGatePanel) el.accountGatePanel.hidden = !shouldShow;
  if (el.accountStatusText) {
    el.accountStatusText.textContent = state.authUser
      ? `Signed in: ${state.authUser.email || 'Firebase user'}`
      : certificationTierRequiresAccount()
        ? 'Adult account required'
        : 'Account optional';
  }
  if (el.accountGateMessage) el.accountGateMessage.textContent = gate.reason;
  if (el.adultAttestationCheck) {
    el.adultAttestationCheck.checked = state.adultAttested;
    el.adultAttestationCheck.disabled = Boolean(state.adultAttested && state.authUser);
    el.adultAttestationCheck.closest('.account-attestation').hidden = !certificationTierRequiresAccount();
  }
  if (el.accountForm) {
    el.accountForm.hidden = Boolean(state.authUser);
    el.accountForm.querySelectorAll('input, button').forEach((control) => {
      control.disabled = !state.authReady;
    });
  }
  if (el.accountSignOutBtn) el.accountSignOutBtn.hidden = !state.authUser;
  if (el.accountConfirmAdultBtn) {
    const shouldShow = state.authUser && certificationTierRequiresAccount();
    el.accountConfirmAdultBtn.hidden = !shouldShow;

    if (shouldShow) {
      if (state.adultAttested) {
        el.accountConfirmAdultBtn.textContent = 'Adult Access Confirmed';
        el.accountConfirmAdultBtn.disabled = true;
        el.accountConfirmAdultBtn.style.opacity = '0.6';
      } else {
        el.accountConfirmAdultBtn.textContent = 'Confirm adult access';
        el.accountConfirmAdultBtn.disabled = !state.authReady;
        el.accountConfirmAdultBtn.style.opacity = '1';
      }
    }
  }
  if (el.accountEmailInput && state.authUser?.email && !el.accountEmailInput.value) {
    el.accountEmailInput.value = state.authUser.email;
  }
  return gate;
}

function renderEvaluationPanel() {
  if (!el.certificationTierSelect || !el.testDepthSelect) return;
  const tier = getActiveTier();

  // Build combined certification tier selector: education tiers + professional roles
  const educationOptions = EDUCATION_TIERS.map((item) =>
    `<option value="${item.id}">${item.label}</option>`
  );
  const roleOptions = PROFESSIONAL_ROLES.map((item) =>
    `<option value="${item.id}">${item.label} [${item.source}]</option>`
  );
  el.certificationTierSelect.innerHTML = [
    ...educationOptions,
    ...roleOptions
  ].join('');

  el.testDepthSelect.innerHTML = TEST_DEPTHS.map((item) => (
    `<option value="${item.id}">${item.label}</option>`
  )).join('');
  el.educationTierSelect.innerHTML = EDUCATION_TIERS.map((item) => (
    `<option value="${item.id}">${item.label}</option>`
  )).join('');
  el.certificationTierSelect.value = state.certificationTierId;
  el.testDepthSelect.value = state.testDepthId;
  el.educationTierSelect.value = state.educationTierId;
  const cert = CERTIFICATION_TIERS.find((item) => item.id === state.certificationTierId) || CERTIFICATION_TIERS[0];
  const depth = TEST_DEPTHS.find((item) => item.id === state.testDepthId) || TEST_DEPTHS[0];
  el.testDepthSelect.value = depth.id;
  const targetText = `${tier.name}: ${tier.title} - ${cert.label}, ${depth.label}`;
  el.activeEvaluationTarget.textContent = targetText;
  if (el.certificationWorkspaceTarget) el.certificationWorkspaceTarget.textContent = targetText;
  const cooldown = certificationCooldownFor(tier.id, depth.id);
  const accountGate = renderAccountGate();
  const identityGate = renderIdentityAssurance();
  const lockedText = cooldown.locked
    ? `This ${depth.label} can be tried again in ${formatDuration(cooldown.remainingMs)}. The 24-hour wait applies to this Ladder tier and challenge depth across all education tiers.`
    : `24-hour retry limit: this Ladder tier and challenge depth can be attempted once per day, even if the education tier changes.`;
  if (el.authRequiredLink) {
    el.authRequiredLink.hidden = !certificationTierRequiresAccount();
  }
  if (el.identityAssuranceField) {
    el.identityAssuranceField.hidden = true;
  }
  if (el.identityAttestationLabel) {
    el.identityAttestationLabel.hidden = certificationTierRequiresAccount();
  }
  if (el.identityAssuranceNotice) {
    el.identityAssuranceNotice.hidden = certificationTierRequiresAccount();
  }
  [el.evaluationCooldownNotice, el.certificationWorkspaceCooldown].forEach((notice) => {
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = lockedText;
  });
  [el.startEvaluationBtn, el.startWorkspaceCertificationBtn].forEach((button) => {
    if (!button) return;
    button.disabled = cooldown.locked || (accountGate.locked && !certificationTierRequiresAccount()) || identityGate.locked;
    button.textContent = cooldown.locked
      ? `Available in ${formatDuration(cooldown.remainingMs)}`
      : accountGate.locked ? accountGate.buttonLabel
        : identityGate.locked ? 'Identity step required' : 'Start certification';
    button.title = cooldown.locked
      ? `Available at ${new Date(cooldown.availableAt).toLocaleString()}`
      : accountGate.locked ? accountGate.reason
        : identityGate.locked ? identityGate.reason : 'Start certification';
  });
  if (state.evaluationContext && el.certificationModeDetail) renderConversationMode();
}

function renderControls() {
  el.languageSelect.value = state.language;
  if (el.customLanguageInput) {
    el.customLanguageInput.value = state.customLanguage || '';
    el.customLanguageInput.style.display = state.language === 'custom' ? '' : 'none';
  }
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
  renderEvaluationPanel();
  renderPlacement();
  renderProgress();
  renderTiers();
  renderTopic();
  renderTranscript();
  updatePageTranslations();
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

function renderMarkdownTable(lines) {
  const rows = lines
    .filter((line) => !/^\s*\|?\s*-+/.test(line.replace(/\|/g, '')))
    .map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()));
  if (!rows.length) return '';
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderArchitectureMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];
  let table = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    html.push(renderMarkdownTable(table));
    table = [];
  };

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        flushTable();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      return;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushTable();
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      return;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      flushTable();
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      return;
    }
    if (line.includes('|') && /^\s*\|?[^|]+\|/.test(line)) {
      flushParagraph();
      flushList();
      table.push(line);
      return;
    }
    flushList();
    flushTable();
    paragraph.push(line.trim());
  });
  flushParagraph();
  flushList();
  flushTable();
  if (inCode && code.length) html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return html.join('');
}

function systemPromptFor(topic, tier) {
  const placement = state.progress.placement;
  const assigned = placement?.assignedTopicIds?.includes(topic.id) ? 'yes' : 'no';
  const selfAssigned = state.progress.selfAssignedTopicIds?.includes(topic.id) ? 'yes' : 'no';
  const placedOut = state.progress.completedTopics[topicKey(topic.id)]?.status === TRANSCRIPT_STATUS.PLACED_OUT ? 'yes' : 'no';
  const evaluation = state.evaluationContext;
  const selectedEducationTier = CERTIFICATION_TIERS.find((item) => item.id === state.educationTierId) || CERTIFICATION_TIERS[0];
  const selectedCertificationTier = CERTIFICATION_TIERS.find((item) => item.id === state.certificationTierId) || CERTIFICATION_TIERS[0];
  const selectedDepth = TEST_DEPTHS.find((item) => item.id === state.testDepthId) || TEST_DEPTHS[0];
  const readinessCheck = isReadinessCheckTopic(topic);
  const roleSpec = evaluation && isProfessionalRole(evaluation.certificationTierId) ? `
PROFESSIONAL ROLE SPECIFICATION
${getRoleSpec(evaluation.certificationTierId)}

` : '';
  const evaluationBlock = evaluation ? `
Active certification mode: YES.
Certification blueprint: ${evaluation.blueprintId} ${evaluation.blueprintVersion}.
Certification tier: ${evaluation.certificationTierLabel}.
Mapped standards family: ${evaluation.standards}.
Certification depth: ${evaluation.testDepthLabel} (${evaluation.testDepthOutcome}).
Required evidence level: ${evaluation.testDepthEvidence}.
Passing standard: ${evaluation.testDepthPassingStandard}.
Review posture: ${evaluation.testDepthReview}.

${roleSpec}BEFORE YOU BEGIN - RUBRIC EVALUATION CRITERIA
You will be evaluated on these seven dimensions:
1. Conceptual accuracy: Do you understand the key ideas correctly?
2. Vocabulary fluency: Can you use the relevant technical terms?
3. Applied judgment: Can you apply this to real scenarios?
4. Evidence quality: Can you provide or cite strong evidence?
5. Reasoning defense: Can you explain and defend your thinking?
6. Risk awareness: Can you identify limitations and risks?
7. Standards alignment: Does your work meet the standards for this tier?

Act as a structured AI examiner, not a course tutor. The learner is allowed to test out without taking a course. Before asking the first substantive question, briefly state the rubric dimensions in plain language. Then deliver a dynamic test for this Ladder tier with vocabulary, scenario judgment, applied task, risk/limitation question, artifact or evidence statement, and defense of reasoning.

For Certification, test for competent and defensible use of the tier. For Expert challenge, increase ambiguity, require transfer to a new context, and press harder on edge cases. For Mastery challenge, require original synthesis, portfolio-quality evidence, standards mapping, and leadership-level defense.

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

If the learner has not met the standard, use "result":"not_certified" and include the missing evidence in rationale. Do not mention the marker or JSON to the learner.
` : '';
  const readinessBlock = readinessCheck && !evaluation ? `
Active readiness check: YES.
Desired education tier: ${selectedCertificationTier.label}.
Mapped standards family: ${selectedCertificationTier.standards}.
Desired mastery level: ${selectedDepth.label}.
Target outcome: ${selectedDepth.outcome}.
Required evidence level: ${selectedDepth.evidence}.
Passing standard being prepared for: ${selectedDepth.passingStandard}.

This is a readiness check, not a certification exam and not a course lesson. Do not certify the learner, do not append a certification result marker, and do not imply transcript credit. Use the selected education tier and mastery level as the target. If the learner seems to have chosen the wrong target, ask whether they want to change the Education tier or Mastery level controls before continuing.

Run the readiness check as a guided diagnostic:
1. Confirm the learner's target in plain language.
2. Ask for current confidence and relevant experience.
3. Ask 3-5 targeted questions that sample vocabulary, applied judgment, risk awareness, and evidence quality for this Ladder tier.
4. Ask what evidence or artifact they could use in a real challenge.
5. End with one of these readiness statements: ready now, close but needs review, or not ready yet.
6. Recommend the next action: start certification, switch mastery level, review specific rungs, or gather evidence.
` : '';
  const completionBlock = !evaluation && !readinessCheck ? `
When you have enough evidence to decide whether the learning conversation is complete, say that clearly to the learner. Then on a new line, write the completion status in this format: COMPLETION:status where status is one of: completed, verified, self_reported, or not_ready.

Use "verified" only when the learner gave strong evidence in the conversation. Use "completed" for solid learning completion. Use "self_reported" when the learner has enough engagement for a record but evidence is mostly learner-claimed. Use "not_ready" when the learner needs more work. Do not mention the completion marker format to the learner.
` : '';
  return `You are The Ladder guide inside AESOP AI Academy. You are strictly scoped to the selected topic: ${topic.title}.

Placement interests: ${interestText(placement)}.
Assessment capability score: ${placement?.capabilityScore ?? 'not placed'}.
Assessment technical score: ${placement?.technicalScore ?? 'not placed'}.
Assessment governance score: ${placement?.governanceScore ?? 'not placed'}.
Was this rung assigned by assessment? ${assigned}.
Was this rung self-assigned by the learner? ${selfAssigned}.
Was this rung placed out by assessment? ${placedOut}.
Tier: ${tier.name} - ${tier.title}.
Education tier (teaching level): ${selectedEducationTier.label}.
Preferred language: ${languageLabel()}. Translate your learner-facing responses into this language unless the learner asks otherwise.

TEACHING LEVEL GUIDANCE:
You are teaching a ${selectedEducationTier.label}-level learner. Adjust your language, examples, and depth of analysis to match this level:
- Elementary: Simple, concrete language. Everyday examples. Short sentences. Build foundational understanding.
- Middle School: Clear explanations. Introduce technical terms. Encourage thinking and questions.
- High School: Academic language. Abstract concepts. Connect to real-world applications. Develop critical thinking.
- Young Adult: Professional context. Career relevance. Independent problem-solving.
- College: Rigorous, theory-grounded. Advanced concepts. Research literacy and evidence.
- Workforce: Practical, job-relevant skills. Business scenarios. Applied problem-solving.
- Leadership: Strategic perspective. Organizational and policy implications. Systems thinking.

Every rung is a guided AI learning conversation. The goal is discovery, critical thinking, vocabulary fluency, and applied understanding. Do not frame the experience as schoolwork.
${evaluationBlock}
${readinessBlock}
${completionBlock}

Use this guarded teaching pattern:
1. Diagnose what the learner already understands.
2. Ask vocabulary questions using relevant terms from this tier.
3. Force discovery by making the learner compare, question, verify, or reason through the topic.
4. Push application to the learner's role or goal using a realistic example, decision, workflow, or scenario.
5. Ask for one risk, limitation, or misconception.
6. End by telling the learner whether this rung should be transcripted as completed, verified, self-reported, or not yet ready.

Do not act as a general assistant. If the learner goes off topic, warmly redirect them back to ${topic.title}. Do not simply lecture. Ask questions and require the learner to reason. Keep responses concise enough for an interactive learning session.`;
}

function parseRubricEvaluation(aiResponse) {
  // Extract the "Rubric Evaluation:" section from AI response
  // Format expected:
  // Conceptual accuracy: PASS — [reason]
  // Vocabulary fluency: PASS — [reason]
  // etc.
  const dimensions = [
    'Conceptual accuracy',
    'Vocabulary fluency',
    'Applied judgment',
    'Evidence quality',
    'Reasoning defense',
    'Risk awareness',
    'Standards alignment'
  ];

  const results = [];
  const rubricSection = aiResponse.split('Rubric Evaluation:')[1];

  if (!rubricSection) {
    console.warn('No Rubric Evaluation section found in AI response');
    return dimensions.map(d => ({ dimension: d, status: 'unknown', reason: 'No evaluation provided' }));
  }

  dimensions.forEach(dimension => {
    const regex = new RegExp(`${dimension}:\\s*(PASS|FAIL)\\s*—\\s*(.+?)(?=\\n(?:[A-Z]|$))`, 'i');
    const match = rubricSection.match(regex);

    if (match) {
      results.push({
        dimension: dimension,
        status: match[1].toUpperCase() === 'PASS' ? 'pass' : 'fail',
        reason: match[2].trim()
      });
    } else {
      results.push({
        dimension: dimension,
        status: 'unknown',
        reason: 'Evaluation not found'
      });
    }
  });

  return results;
}

function buildCertificationResult(evaluation, rubricDimensions, overallResult) {
  // Build complete certification result object for storage
  return {
    id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ladderTierId: evaluation.ladderTierId,
    ladderTierLabel: evaluation.ladderTierLabel,
    certificationTierId: evaluation.certificationTierId,
    certificationTierLabel: evaluation.certificationTierLabel,
    testDepthId: evaluation.testDepthId,
    testDepthLabel: evaluation.testDepthLabel,
    testDepthOutcome: evaluation.testDepthOutcome,
    testDepthEvidence: evaluation.testDepthEvidence,
    overallResult: overallResult.result,
    overallScore: overallResult.score || 0,
    overallRationale: overallResult.rationale || '',
    evidenceSummary: overallResult.evidenceSummary || '',
    evidenceStatus: 'ai_verified',
    rubricDimensions: rubricDimensions,
    educationTier: state.educationTierId,
    learnerId: state.learnerId || 'anonymous'
  };
}

function saveCertificationResult(certificationResult) {
  // Save to localStorage for now (will be upgraded to database later)
  try {
    const key = 'aesop-ladder-cert-results';
    let results = JSON.parse(localStorage.getItem(key) || '[]');
    results.push(certificationResult);
    // Keep only last 20 results
    results = results.slice(-20);
    localStorage.setItem(key, JSON.stringify(results));
    console.log('Certification result saved:', certificationResult.id);
  } catch (e) {
    console.error('Failed to save certification result:', e);
  }
}

function getLatestCertificationResult() {
  // Retrieve most recent certification result
  try {
    const key = 'aesop-ladder-cert-results';
    const results = JSON.parse(localStorage.getItem(key) || '[]');
    return results.length > 0 ? results[results.length - 1] : null;
  } catch (e) {
    console.error('Failed to retrieve certification result:', e);
    return null;
  }
}

function fallbackGuideText(topic, tier) {
  if (isReadinessCheckTopic(topic)) {
    const cert = CERTIFICATION_TIERS.find((item) => item.id === state.certificationTierId) || CERTIFICATION_TIERS[0];
    const depth = TEST_DEPTHS.find((item) => item.id === state.testDepthId) || TEST_DEPTHS[0];
    return `Readiness check practice mode: target ${cert.label}, ${depth.label}. Rate your confidence, name three concepts from ${tier.title} you can explain, describe one realistic application, name one risk or limitation, and identify the evidence you would use in a certification challenge.`;
  }
  return 'The guide could not respond. Use practice mode: explain the topic, name one risk, and ask yourself what evidence would change your mind.';
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
    const rawText = data?.content?.[0]?.text || data?.error || fallbackGuideText(topic, tier);
    const parsed = state.evaluationContext
      ? { ...parseCertificationResponse(rawText), completion: null }
      : { certificationResult: null, rubricDimensions: null, ...parseConversationCompletionResponse(rawText) };
    const { certificationResult, rubricDimensions, completion, visibleText } = parsed;
    state.messages.push({ role: 'assistant', content: visibleText });
    renderChat();
    if (certificationResult) {
      await recordCertificationResult(certificationResult);
      // Save rubric evaluation if available
      if (rubricDimensions && rubricDimensions.length > 0) {
        const certResult = buildCertificationResult(state.evaluationContext, rubricDimensions, certificationResult);
        saveCertificationResult(certResult);
      }
      renderTranscript();
      renderProgress();
    }
    if (completion) {
      queueStandardsReviewOffer(completion);
      renderChat();
    }
  } catch (error) {
    state.messages.push({
      role: 'assistant',
      content: fallbackGuideText(topic, tier)
    });
  }
  renderChat();
  await persist();
}

async function startConversation() {
  const topic = getActiveTopic();
  const tier = getActiveTier();
  const cert = CERTIFICATION_TIERS.find((item) => item.id === state.certificationTierId) || CERTIFICATION_TIERS[0];
  const depth = TEST_DEPTHS.find((item) => item.id === state.testDepthId) || TEST_DEPTHS[0];
  const readinessCheck = isReadinessCheckTopic(topic);
  const accountGate = accountGateForCertificationTier(cert.id);
  if (readinessCheck && accountGate.locked) {
    renderEvaluationPanel();
    document.getElementById('accountGatePanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  state.evaluationContext = null;
  state.trainingMessages = [];
  state.messages = [{
    role: 'user',
    content: readinessCheck
      ? `Start my readiness check for ${tier.name}: ${tier.title}. Use my selected Education tier: ${cert.label}. Use my selected Mastery level: ${depth.label}. Help me determine whether I am ready to attempt that challenge, what evidence I need, and what I should review before trying.`
      : `Start my guided conversation for "${topic.title}". Diagnose my current understanding first, then help me discover the topic through questions, vocabulary, examples, application, and one risk or limitation.`
  }];
  renderChat();
  await callGuide();
  addTranscript('guided_conversation_started', topic.title, `Started a guided conversation for ${topic.id}.`);
  await persist();
  renderTranscript();
}

async function startEvaluation() {
  const tier = getActiveTier();
  const cert = CERTIFICATION_TIERS.find((item) => item.id === state.certificationTierId) || CERTIFICATION_TIERS[0];
  const depth = TEST_DEPTHS.find((item) => item.id === state.testDepthId) || TEST_DEPTHS[0];
  const cooldown = certificationCooldownFor(tier.id, depth.id);
  const accountGate = accountGateForCertificationTier(cert.id);
  const identityGate = certificationIdentityGate();
  if (cooldown.locked || accountGate.locked || identityGate.locked) {
    if (accountGate.locked && certificationTierRequiresAccount()) {
      window.location.href = '/theladder/authenticate.html';
      return;
    }
    renderEvaluationPanel();
    document.getElementById(accountGate.locked ? 'accountGatePanel' : 'evaluationPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const attemptId = `eval_${Date.now()}`;
  const startedAt = new Date().toISOString();
  const identityAssurance = buildIdentityAssuranceRecord(startedAt);
  const cooldownKey = certificationCooldownKey(tier.id, depth.id);
  const cooldownExpiresAt = new Date(Date.parse(startedAt) + CERTIFICATION_COOLDOWN_MS).toISOString();
  if (!state.evaluationContext) {
    state.trainingMessages = [...state.messages];
  }
  state.evaluationContext = {
    attemptId,
    certificationTierId: cert.id,
    certificationTierLabel: cert.label,
    standards: cert.standards,
    testDepthId: depth.id,
    testDepthLabel: depth.label,
    testDepthOutcome: depth.outcome,
    testDepthEvidence: depth.evidence,
    testDepthPassingStandard: depth.passingStandard,
    testDepthReview: depth.review,
    ladderTierId: tier.id,
    ladderTierLabel: `${tier.name} - ${tier.title}`,
    blueprintId: `${cert.id}:${tier.id}:${depth.id}`,
    blueprintVersion: 'v0.1',
    identityAssurance,
    cooldownKey,
    cooldownExpiresAt,
    startedAt
  };
  state.progress.evaluationAttempts.unshift({
    ...state.evaluationContext,
    status: 'started'
  });
  state.progress.evaluationAttempts = state.progress.evaluationAttempts.slice(0, 25);
  state.messages = [{
    role: 'user',
    content: `Start my ${depth.label} for ${tier.name}: ${tier.title}. Certification tier: ${cert.label}. Identity assurance: ${identityAssurance.label} (${identityAssurance.status}). Standards family: ${cert.standards}. Required evidence: ${depth.evidence}. Passing standard: ${depth.passingStandard}. Deliver the test dynamically, document the rubric, require evidence, and do not require that I take a course first.`
  }];
  addTranscript(
    'test_started',
    `${cert.label} ${tier.name} ${depth.label}`,
    `Started ${depth.label.toLowerCase()} for ${tier.title}. Blueprint ${state.evaluationContext.blueprintId} ${state.evaluationContext.blueprintVersion}. Identity assurance: ${identityAssurance.label}.`,
    { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'ai_evaluation_started' }
  );
  renderEvaluationPanel();
  renderChat();
  renderTranscript();
  await persist();
  document.querySelector('.conversation-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await callGuide();
}

async function startVocabularyConversation(event) {
  event.preventDefault();
  const tier = getActiveTier();
  const term = state.activeVocabTerm || tier.vocabulary[0];
  const definition = definitionForTerm(term, tier);
  const userQuestion = el.vocabPromptInput.value.trim();
  state.evaluationContext = null;
  state.trainingMessages = [];
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

async function endCertification() {
  const context = state.evaluationContext;
  state.evaluationContext = null;
  state.messages = state.trainingMessages.length ? [...state.trainingMessages] : [];
  state.trainingMessages = [];
  if (context) {
    addTranscript(
      'certification_returned_to_training',
      `${context.certificationTierLabel} ${context.testDepthLabel}`,
      `Returned from ${context.testDepthLabel.toLowerCase()} to guided training for ${context.ladderTierLabel}.`,
      { status: TRANSCRIPT_STATUS.SELF_REPORTED, evidence: 'certification_paused' }
    );
  }
  await persist();
  render();
  document.querySelector('.conversation-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitChat(event) {
  event.preventDefault();
  const value = el.chatInput.value.trim();
  if (!value) return;
  if (state.evaluationContext) {
    const accountGate = accountGateForCertificationTier(state.evaluationContext.certificationTierId);
    if (accountGate.locked) {
      renderEvaluationPanel();
      document.getElementById('accountGatePanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }
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

function exportTranscript() {
  const payload = {
    _format: 'aesop-ladder-certification-transcript-v1',
    learnerId: state.learnerId,
    ladderVersion: LADDER_VERSION,
    exportedAt: new Date().toISOString(),
    transcriptLines: certificationTranscriptLines(),
    ladderCertifications: buildCertificationTranscript(),
    certificationValidations: state.progress.certificationValidations || [],
    standardsReviews: state.progress.standardsReviews || []
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

function renderCertificationGuide() {
  const tier = getActiveTier();
  const cert = CERTIFICATION_TIERS.find((item) => item.id === state.certificationTierId) || CERTIFICATION_TIERS[0];
  const depth = TEST_DEPTHS.find((item) => item.id === state.testDepthId) || TEST_DEPTHS[0];
  const identity = IDENTITY_ASSURANCE_LEVELS.find((item) => item.id === state.identityAssuranceLevel) || IDENTITY_ASSURANCE_LEVELS[0];
  const target = `${tier.name}: ${tier.title} - ${cert.label}, ${depth.label}`;

  return `
    <div class="certification-guide">
      <p class="certification-guide-lead">Ladder certification is how a learner proves what they can do. A learner may study first, but taking a course is not required. The credential is earned by demonstrating capability in the same AI conversation window used for learning.</p>

      <div class="certification-guide-callout">
        <span>Current target</span>
        <strong>${escapeHtml(target)}</strong>
      </div>

      <div class="certification-guide-grid">
        <section>
          <h4>What happens</h4>
          <ol>
            <li>Choose an education tier, mastery level, and identity assurance level.</li>
            <li>Start certification for the active rung.</li>
            <li>The AI examiner asks scenario, vocabulary, judgment, risk, and application questions.</li>
            <li>The learner produces evidence in the conversation.</li>
            <li>The AI evaluates the evidence against a documented rubric.</li>
            <li>If certification is awarded, the result is written to the learner transcript.</li>
          </ol>
        </section>

        <section>
          <h4>Certification levels</h4>
          <ul>
            <li><strong>Assessment certified:</strong> placement evidence that the learner likely already knows a tier.</li>
            <li><strong>Certification:</strong> standard exam-level proof for the rung or tier.</li>
            <li><strong>Expert Challenge:</strong> a harder applied challenge with stronger reasoning and evidence.</li>
            <li><strong>Mastery Challenge:</strong> the highest proof level, requiring advanced judgment and defense.</li>
          </ul>
        </section>

        <section>
          <h4>What gets recorded</h4>
          <ul>
            <li>learner ID, Ladder tier, rung, education tier, and mastery level</li>
            <li>identity assurance level: ${escapeHtml(identity.credentialLabel)}</li>
            <li>score or result, rationale, evidence summary, standards mapping, and date</li>
            <li>independent second-model validation of both learner evidence and examiner process</li>
            <li>student transcript entry and public credential page when certified</li>
          </ul>
        </section>

        <section>
          <h4>Second model review</h4>
          <ul>
            <li>The first AI examiner can propose a pass or non-pass result.</li>
            <li>A separate validator model reviews the transcript before a credential is recorded.</li>
            <li>The validator checks whether the learner gave enough evidence and whether the examiner asked a fair, scoped test.</li>
            <li>If validation fails, no certification credential is stored.</li>
          </ul>
        </section>

        <section>
          <h4>If the learner does not pass</h4>
          <ul>
            <li>The AI must explain why certification was not awarded.</li>
            <li>The learner can challenge the decision after reading the rationale.</li>
            <li>The same Ladder tier and mastery level can only be attempted once every 24 hours.</li>
            <li>The learner can keep learning, review assigned rungs, and try again later.</li>
          </ul>
        </section>
      </div>

      <div class="certification-guide-note">
        <strong>Why this matters:</strong>
        <span>The Ladder is not just giving a badge. It creates a defensible record of AI capability that can be explained to a learner, parent, school, employer, workforce program, or board member.</span>
      </div>
    </div>
  `;
}

async function openArchitectureDialog() {
  if (!el.architectureDialog || !el.architectureDialogContent) return;
  el.architectureDialogContent.innerHTML = renderCertificationGuide();
  if (typeof el.architectureDialog.showModal === 'function') {
    el.architectureDialog.showModal();
  } else {
    el.architectureDialog.setAttribute('open', '');
  }
  el.architectureDialogContent.focus();
}

async function submitAccount(event) {
  event.preventDefault();
  setAccountError('');
  const mode = event.submitter?.value || 'sign-in';
  const email = el.accountEmailInput?.value.trim();
  const password = el.accountPasswordInput?.value || '';
  if (!email || !password) {
    setAccountError('Username/email and password are required.');
    return;
  }
  // TODO: Re-enable adult attestation check after fixing authentication flow
  // if (certificationTierRequiresAccount() && !el.adultAttestationCheck?.checked && !state.adultAttested) {
  //   setAccountError('Confirm that you are 18 or older before using this education tier.');
  //   return;
  // }
  try {
    if (mode === 'create') {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    if (el.adultAttestationCheck?.checked) state.adultAttested = true;
    localStorage.setItem(LS_ADULT_ATTESTED, String(state.adultAttested));
    el.accountPasswordInput.value = '';
    await saveAccountProfile();
    await persist();
    render();
  } catch (error) {
    setAccountError(authErrorMessage(error));
  }
}

async function confirmAdultAccess() {
  setAccountError('');
  if (!state.authUser) {
    setAccountError('Sign in before confirming adult access.');
    return;
  }
  if (!el.adultAttestationCheck?.checked) {
    setAccountError('Check the adult access attestation first.');
    return;
  }
  state.adultAttested = true;
  localStorage.setItem(LS_ADULT_ATTESTED, 'true');
  await saveAccountProfile();
  await persist();
  render();
}

function bindEvents() {
  el.educationFocusSelect?.addEventListener('change', (event) => {
    const target = event.target.value;
    if (target && target !== window.location.pathname) {
      window.location.href = target;
    }
  });

  el.darkToggle?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    renderThemeToggle();
  });

  async function continueChatAfterLanguageChange(previousLabel) {
    const nextLabel = languageLabel();
    if (!state.messages.length || !nextLabel || nextLabel === previousLabel) return;
    state.messages.push({
      role: 'assistant',
      content: languageConfirmationText()
    });
    renderChat();
    await persist();
  }

  el.languageSelect?.addEventListener('change', async () => {
    const previousLabel = languageLabel();
    state.language = el.languageSelect.value;
    await persist();
    renderControls();
    updatePageTranslations();
    if (state.language === 'custom' && !state.customLanguage) {
      el.customLanguageInput?.focus();
      return;
    }
    await continueChatAfterLanguageChange(previousLabel);
  });

  async function applyCustomLanguage() {
    const previousLabel = languageLabel();
    state.customLanguage = el.customLanguageInput.value.trim();
    if (state.customLanguage) state.language = 'custom';
    await persist();
    renderControls();
    updatePageTranslations();
    await continueChatAfterLanguageChange(previousLabel);
  }

  el.customLanguageInput?.addEventListener('change', applyCustomLanguage);
  el.customLanguageInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyCustomLanguage();
  });

  el.topicSearchInput?.addEventListener('input', () => {
    state.searchQuery = el.topicSearchInput.value;
    renderTopicSearch();
  });

  el.certificationTierSelect?.addEventListener('change', async () => {
    state.certificationTierId = el.certificationTierSelect.value;
    await persist();
    renderEvaluationPanel();
  });

  el.testDepthSelect?.addEventListener('change', async () => {
    state.testDepthId = el.testDepthSelect.value;
    await persist();
    renderEvaluationPanel();
  });

  el.educationTierSelect?.addEventListener('change', async () => {
    state.educationTierId = el.educationTierSelect.value;
    await persist();
  });

  el.accountForm?.addEventListener('submit', submitAccount);

  el.adultAttestationCheck?.addEventListener('change', async () => {
    state.adultAttested = Boolean(el.adultAttestationCheck.checked);
    localStorage.setItem(LS_ADULT_ATTESTED, String(state.adultAttested));
    if (state.authUser && state.adultAttested) {
      await saveAccountProfile();
      await persist();
    }
    renderEvaluationPanel();
  });

  el.accountConfirmAdultBtn?.addEventListener('click', confirmAdultAccess);

  el.accountSignOutBtn?.addEventListener('click', async () => {
    setAccountError('');
    await signOut(auth);
  });

  el.identityAssuranceSelect?.addEventListener('change', async () => {
    state.identityAssuranceLevel = el.identityAssuranceSelect.value;
    state.identityAttested = false;
    await persist();
    renderEvaluationPanel();
  });

  el.identityAttestationCheck?.addEventListener('change', async () => {
    state.identityAttested = el.identityAttestationCheck.checked;
    await persist();
    renderEvaluationPanel();
  });

  el.proctoringModeSelect?.addEventListener('change', async () => {
    state.proctoringMode = el.proctoringModeSelect.value;
    await persist();
    renderEvaluationPanel();
  });

  el.startEvaluationBtn?.addEventListener('click', startEvaluation);
  el.startWorkspaceCertificationBtn?.addEventListener('click', startEvaluation);
  el.endCertificationBtn?.addEventListener('click', endCertification);

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

  el.lookupBtn?.addEventListener('click', async () => {
    const id = normalizeLearnerId(el.learnerLookup?.value);
    if (!id) return;
    state.learnerId = id;
    localStorage.setItem(LS_ID, id);
    await loadRemote(id);
    await persist();
    render();
  });
  el.learnerLookup?.addEventListener('input', () => {
    renderLearnerLinks(el.learnerLookup?.value);
  });

  el.startConversationBtn.addEventListener('click', startConversation);
  el.vocabPromptForm.addEventListener('submit', startVocabularyConversation);
  el.chatForm.addEventListener('submit', submitChat);

  // Shift+Enter for line break, Enter to submit
  el.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: insert newline
        e.preventDefault();
        const start = el.chatInput.selectionStart;
        const end = el.chatInput.selectionEnd;
        const value = el.chatInput.value;
        el.chatInput.value = value.substring(0, start) + '\n' + value.substring(end);
        el.chatInput.selectionStart = el.chatInput.selectionEnd = start + 1;
      } else {
        // Enter: submit
        e.preventDefault();
        el.chatForm.dispatchEvent(new Event('submit'));
      }
    }
  });

  el.chatLog.addEventListener('click', handleStandardsReviewClick);
  el.completeTopicBtn.addEventListener('click', markTopicComplete);
  el.exportTranscriptBtn.addEventListener('click', exportTranscript);
  el.researchBtn.addEventListener('click', findVideos);
  document.querySelectorAll('[data-open-architecture]').forEach((button) => {
    button.addEventListener('click', openArchitectureDialog);
  });
}

async function init() {
  applyTheme(state.theme);
  loadLocal();
  onAuthStateChanged(auth, async (user) => {
    state.authReady = true;
    state.authUser = user ? { uid: user.uid, email: user.email || '' } : null;
    if (state.authUser) {
      await saveAccountProfile();
    }
    render();
  });
  const queryLearnerId = normalizeLearnerId(new URLSearchParams(location.search).get('id'));
  if (queryLearnerId) {
    state.learnerId = queryLearnerId;
    localStorage.setItem(LS_ID, queryLearnerId);
  }
  renderLanguages();
  bindEvents();
  render();
  if (state.learnerId) {
    await loadRemote(state.learnerId);
    render();
  }
}

init();
