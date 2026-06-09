import { createPlacementEngine } from '/theladder-shared/placement-engine.js';
import { createCertificationEngine } from '/theladder-shared/certification-engine.js';
import {
  initDataLayer,
  loadLearnerRecord,
  saveLearnerProgress,
  recordCompletion,
  recordCertification
} from '/theladder-shared/data-layer.js';

const catalogUrl = '/docs/theladder-use-cases-catalog.md?v=1';
const storageKey = 'aesop-ladder-use-cases-state-v1';
const requestStorageKey = 'aesop-use-case-training-requests-v1';
const requestCollection = 'useCaseTrainingRequests';
const requestEmailUrl = '/aesop-api/use-case-request-email.php';
const PROXY_URL = '/aesop-api/proxy.php';
const CONVERSATION_COMPLETE_REGEX = /<!--LADDER_CONVERSATION_COMPLETE:([\s\S]*?)-->/;
const MIN_PLACEMENT_TURNS = 5;
let requestDbContext = null;

const topicRanges = [
  { label: 'All use cases', start: 1, end: 300 },
  { label: 'Personal productivity + planning', start: 1, end: 15 },
  { label: 'Writing + communication', start: 16, end: 30 },
  { label: 'Research + knowledge work', start: 31, end: 45 },
  { label: 'Education + training', start: 46, end: 60 },
  { label: 'Software development', start: 61, end: 75 },
  { label: 'IT operations + cybersecurity', start: 76, end: 90 },
  { label: 'Data, BI + analytics', start: 91, end: 105 },
  { label: 'Marketing + content', start: 106, end: 120 },
  { label: 'Sales + revenue operations', start: 121, end: 135 },
  { label: 'Customer service + support', start: 136, end: 150 },
  { label: 'HR + people operations', start: 151, end: 165 },
  { label: 'Finance + accounting', start: 166, end: 180 },
  { label: 'Legal, risk + compliance', start: 181, end: 195 },
  { label: 'Healthcare + life sciences', start: 196, end: 210 },
  { label: 'Operations + supply chain', start: 211, end: 225 },
  { label: 'Manufacturing + field service', start: 226, end: 240 },
  { label: 'Retail + ecommerce', start: 241, end: 255 },
  { label: 'Creative, media + design', start: 256, end: 270 },
  { label: 'Government, nonprofit + public services', start: 271, end: 285 },
  { label: 'Strategy, leadership + governance', start: 286, end: 300 }
];

// Certification depths offered per use case. Mirrors the Concepts ladder
// TEST_DEPTHS contract so the shared certification engine's blueprint fields
// (depthLabel/depthOutcome/depthEvidence/depthPassingStandard/depthReview) map
// directly. The three buttons in the detail panel correspond to these depths.
const certificationOptions = [
  {
    id: 'certification',
    label: 'Certification',
    summary: 'Proves you can perform the use case safely, explain its limits, and complete a guided assignment.',
    outcome: 'certification path evidence',
    evidence: 'clear competency evidence for the selected use case at the certification tier',
    passingStandard: 'solid rubric performance with no critical failures',
    review: 'AI-assessed, auditable, and challengeable'
  },
  {
    id: 'expert-challenge',
    label: 'Expert certification',
    summary: 'Proves you can adapt the workflow, troubleshoot failures, compare approaches, and teach another learner.',
    outcome: 'expert-level evidence for advanced credit',
    evidence: 'strong transfer, edge-case reasoning, and defensible tradeoff analysis',
    passingStandard: 'high rubric performance, independent reasoning, and confident defense under challenge',
    review: 'AI-assessed with human review recommended for public or employment claims'
  },
  {
    id: 'mastery-challenge',
    label: 'Master certification',
    summary: 'Proves you can design a production-ready workflow, evaluate risk, document evidence, and defend decisions.',
    outcome: 'mastery evidence and portfolio-quality artifact',
    evidence: 'original synthesis, portfolio-grade artifact, standards mapping, and leadership-level defense',
    passingStandard: 'near-expert rubric performance across all dimensions with no unresolved evidence gaps',
    review: 'AI-assessed with human or panel review recommended before external credential claims'
  }
];

// ---------------------------------------------------------------------------
// PLACEMENT SCORE MAPPING (Task 26)
// ---------------------------------------------------------------------------
// The shared placement engine carries three normalized scores. The Concepts
// ladder reads them as general AI fluency / technical / governance. For the
// Use-Cases pathway we re-interpret the SAME three slots as work-pattern
// fluency, because what matters here is whether a learner already performs AI
// work in a topic — not abstract concept knowledge:
//
//   capabilityScore  -> APPLIES: does the learner already apply AI to real
//                       work tasks in this area (drafts, plans, analyses,
//                       support, decisions)? High = they live the use cases.
//   technicalScore   -> TOOLING/AUTOMATION DEPTH: comfort wiring tools, APIs,
//                       agents, data pipelines, and automations around the work.
//   governanceScore  -> RESPONSIBLE/CRITICAL JUDGMENT: verification, privacy,
//                       risk, policy, and the critical thinking to know when
//                       NOT to trust the output.
//
// Grant rules grant whole TOPIC GROUPS the learner already performs well (they
// test out of those topics' use cases). Within topics they did NOT grant out
// of, the engine assigns the core use cases plus any matched by interest.
const PLACEMENT_GRANT_STRONG = 78;   // grant most topics
const PLACEMENT_GRANT_TECH = 72;     // technical/automation-heavy topics
const PLACEMENT_GRANT_GOV = 72;      // governance/judgment-heavy topics

// Topic groups whose use cases lean technical / automation-heavy.
const TECH_HEAVY_GROUPS = new Set([
  'Software development',
  'IT operations + cybersecurity',
  'Data, BI + analytics'
]);
// Topic groups whose use cases lean governance / critical-judgment-heavy.
const GOVERNANCE_HEAVY_GROUPS = new Set([
  'Legal, risk + compliance',
  'Healthcare + life sciences',
  'Government, nonprofit + public services',
  'Strategy, leadership + governance'
]);

function topicGroupForId(id) {
  const topic = topicRanges.find((range) => range.label !== 'All use cases' && id >= range.start && id <= range.end);
  return topic ? topic.label : 'Unassigned';
}

const certificationEngine = createCertificationEngine({ proxyUrl: PROXY_URL });

const state = {
  useCases: [],
  selectedId: 1,
  activeTopic: topicRanges[0],
  query: '',
  depth: 'all',
  courseStarts: {},
  messages: [],
  activeUseCaseChat: null,
  placement: null,
  // assessment mode swaps the central chat into a placement assessor
  assessmentActive: false,
  // certification mode swaps the central chat into an examiner
  certificationContext: null,
  placementEngine: null
};

const elements = {
  categoryList: document.querySelector('#categoryList'),
  useCaseGrid: document.querySelector('#useCaseGrid'),
  useCaseDetail: document.querySelector('#useCaseDetail'),
  useCaseSearch: document.querySelector('#useCaseSearch'),
  depthFilter: document.querySelector('#depthFilter'),
  visibleCount: document.querySelector('#visibleCount'),
  totalUseCases: document.querySelector('#totalUseCases'),
  advancedCount: document.querySelector('#advancedCount'),
  educationFocusSelect: document.querySelector('#educationFocusSelect'),
  themeToggle: document.querySelector('#themeToggle'),
  useCaseRequestForm: document.querySelector('#useCaseRequestForm'),
  useCaseRequestMessage: document.querySelector('#useCaseRequestMessage'),
  submitUseCaseRequest: document.querySelector('#submitUseCaseRequest'),
  requestUseCaseTopic: document.querySelector('#requestUseCaseTopic'),
  useCaseCourseWorkspace: document.querySelector('#useCaseCourseWorkspace'),
  useCaseConversationTitle: document.querySelector('#useCaseConversationTitle'),
  useCaseChatLog: document.querySelector('#useCaseChatLog'),
  useCaseChatForm: document.querySelector('#useCaseChatForm'),
  useCaseChatInput: document.querySelector('#useCaseChatInput'),
  assessmentPanel: null,
  placementSummary: null
};

init();

async function init() {
  setupTheme();
  renderLoading();

  // Task 29: durable learner records — init the local-first data layer once.
  // Local cache is hydrated immediately; remote sync best-effort.
  try {
    await initDataLayer();
  } catch (error) {
    console.warn('Data layer init failed; continuing in localStorage-only mode', error);
  }

  try {
    const markdown = await fetch(catalogUrl).then((response) => {
      if (!response.ok) throw new Error(`Use case catalog request failed: ${response.status}`);
      return response.text();
    });
    state.useCases = parseCatalog(markdown);
    state.placementEngine = buildPlacementEngine();
    restoreSavedState();
    await hydrateFromDataLayer();
    if (!state.useCases.some((useCase) => useCase.id === state.selectedId)) {
      state.selectedId = state.useCases[0]?.id || 1;
    }
    bindEvents();
    render();
  } catch (error) {
    renderError(error);
  }
}

// Build the placement descriptor from the live catalog (Task 26).
function buildPlacementEngine() {
  const items = state.useCases.map((useCase) => {
    const group = useCase.topic || topicGroupForId(useCase.id);
    return {
      id: String(useCase.id),
      label: useCase.name,
      group,
      // order within the topic block; core items are the first few per topic
      order: useCase.id - (topicRanges.find((range) =>
        range.label !== 'All use cases' && useCase.id >= range.start && useCase.id <= range.end)?.start ?? useCase.id) + 1,
      interestText: `${useCase.name} ${useCase.topic} ${useCase.outcome}`
    };
  });

  return createPlacementEngine({
    items,
    grantRules: ({ capabilityScore, technicalScore, governanceScore }) => {
      const granted = new Set();
      const groups = [...new Set(items.map((item) => item.group))];
      groups.forEach((group) => {
        // Strong general applied fluency grants out of most topics.
        if (capabilityScore >= PLACEMENT_GRANT_STRONG) {
          granted.add(group);
          return;
        }
        // Technical/automation-heavy topics need both applied fluency AND
        // tooling depth to test out.
        if (TECH_HEAVY_GROUPS.has(group)
          && technicalScore >= PLACEMENT_GRANT_TECH
          && capabilityScore >= PLACEMENT_GRANT_TECH) {
          granted.add(group);
          return;
        }
        // Governance/judgment-heavy topics need responsible-judgment depth AND
        // applied fluency to test out.
        if (GOVERNANCE_HEAVY_GROUPS.has(group)
          && governanceScore >= PLACEMENT_GRANT_GOV
          && capabilityScore >= PLACEMENT_GRANT_GOV) {
          granted.add(group);
        }
      });
      return [...granted];
    },
    coreItemsPerGroup: 4,
    minLearnerTurns: MIN_PLACEMENT_TURNS,
    assessment: {
      role: 'use-case placement assessor',
      intro: 'Your job is to assess how the learner already applies AI to real work, how deep their tooling/automation is, and how strong their responsible-use judgment is — then decide which use-case topics they can test out of and which specific use cases to assign.',
      exchangeGuidance: 'Run a 5-7 exchange assessment. Ask one question at a time. Be warm, direct, and practical. Focus on the work they actually do.',
      dimensions: [
        'Applied work fluency (capabilityScore): does the learner already apply AI to real tasks — drafting, planning, analysis, support, decisions?',
        'Tooling and automation depth (technicalScore): comfort wiring tools, APIs, agents, data pipelines, and automations around the work.',
        'Responsible and critical judgment (governanceScore): verification habits, privacy, risk, policy, and knowing when NOT to trust AI output.',
        'Interests: which work areas energize them enough to keep learning.',
        'Application context: what work outcomes they want to be able to perform after learning.'
      ],
      styleGuidance: 'Use realistic work scenarios, not trivia. Ask at least one automation/tooling question and one risk/judgment question. Do not punish beginners. If they clearly do advanced work, press deeper.',
      redirectGuidance: 'Stay on placement for AI use-case training. If they go off topic, redirect.',
      opener: 'Let us place you across the use-case catalog. Tell me about the AI work you already do: what tasks do you use AI for at work or school, which tools, and where do you most want to get stronger?'
    }
  });
}

function setupTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  elements.themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  elements.themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('aesop-theme', 'dark');
      elements.themeToggle.textContent = 'Light mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('aesop-theme', 'light');
      elements.themeToggle.textContent = 'Dark mode';
    }
  });
}

function bindEvents() {
  setupEducationFocusSelect();
  renderTopicRequestOptions();

  elements.useCaseSearch.addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    saveState();
    renderUseCases();
  });

  elements.depthFilter.addEventListener('change', (event) => {
    state.depth = event.target.value;
    saveState();
    renderUseCases();
  });

  elements.useCaseRequestForm?.addEventListener('submit', handleUseCaseRequestSubmit);
  elements.useCaseChatForm?.addEventListener('submit', submitUseCaseChat);
  window.addEventListener('beforeunload', saveState);
}

function setupEducationFocusSelect() {
  elements.educationFocusSelect?.addEventListener('change', (event) => {
    const target = event.target.value;
    if (target && target !== window.location.pathname) {
      window.location.href = target;
    }
  });
}

function renderTopicRequestOptions() {
  if (!elements.requestUseCaseTopic) return;
  elements.requestUseCaseTopic.insertAdjacentHTML('beforeend', topicRanges
    .filter((topic) => topic.label !== 'All use cases')
    .map((topic) => `<option>${escapeHtml(topic.label)}</option>`)
    .join(''));
}

function parseCatalog(markdown) {
  return markdown
    .split('\n')
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      return {
        id: Number(cells[0]),
        name: cells[1],
        topic: cells[2],
        outcome: cells[3],
        depth: cells[4]
      };
    })
    .filter((useCase) => Number.isFinite(useCase.id) && useCase.name);
}

function render() {
  elements.totalUseCases.textContent = state.useCases.length.toString();
  elements.advancedCount.textContent = state.useCases.filter((useCase) => useCase.depth === 'B/I/A').length.toString();
  elements.useCaseSearch.value = state.query;
  elements.depthFilter.value = state.depth;
  renderTopics();
  renderUseCases();
  renderDetail(getSelectedUseCase());
  renderAssessmentEntry();
}

function renderTopics() {
  elements.categoryList.innerHTML = topicRanges.map((topic) => {
    const count = state.useCases.filter((useCase) => inRange(useCase, topic)).length;
    const active = topic.label === state.activeTopic.label ? ' active' : '';
    const granted = isTopicGranted(topic) ? ' data-granted="true"' : '';
    const grantedBadge = isTopicGranted(topic) ? '<span class="depth-pill" style="margin-left:0.4rem">Placed out</span>' : '';
    return `
      <button class="category-button${active}" type="button" data-start="${topic.start}" data-end="${topic.end}"${granted}>
        <strong>${escapeHtml(topic.label)}${grantedBadge}</strong>
        <span>${count}</span>
      </button>
    `;
  }).join('');

  elements.categoryList.querySelectorAll('.category-button').forEach((button) => {
    button.addEventListener('click', () => {
      const start = Number(button.dataset.start);
      const end = Number(button.dataset.end);
      state.activeTopic = topicRanges.find((topic) => topic.start === start && topic.end === end) || topicRanges[0];
      saveState();
      renderTopics();
      renderUseCases();
    });
  });
}

function isTopicGranted(topic) {
  if (!state.placement || topic.label === 'All use cases') return false;
  return (state.placement.grantedTierIds || []).includes(topic.label);
}

function renderUseCases() {
  const useCases = getFilteredUseCases();
  elements.visibleCount.textContent = `${useCases.length} shown`;

  if (!useCases.length) {
    elements.useCaseGrid.innerHTML = '<p class="empty-state">No use cases match those filters.</p>';
    return;
  }

  if (!useCases.some((useCase) => useCase.id === state.selectedId)) {
    state.selectedId = useCases[0].id;
    saveState();
    renderDetail(useCases[0]);
  }

  const assigned = new Set((state.placement?.assignedTopicIds || []).map(String));
  elements.useCaseGrid.innerHTML = useCases.map((useCase) => {
    const recommended = assigned.has(String(useCase.id));
    const recBadge = recommended ? '<span class="depth-pill">Recommended</span>' : '';
    return `
    <button class="product-card${useCase.id === state.selectedId ? ' active' : ''}" type="button" data-use-case-id="${useCase.id}">
      <div class="card-top">
        <span class="product-number">#${useCase.id}</span>
        <span class="depth-pill">${escapeHtml(useCase.depth)}</span>
        ${recBadge}
      </div>
      <h3>${escapeHtml(useCase.name)}</h3>
      <p class="product-type">${escapeHtml(useCase.topic)}</p>
      <p class="product-reason">${escapeHtml(useCase.outcome)}</p>
    </button>
  `;
  }).join('');

  elements.useCaseGrid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedId = Number(card.dataset.useCaseId);
      saveState();
      renderUseCases();
      renderDetail(getSelectedUseCase());
    });
  });
}

function renderDetail(useCase) {
  if (!useCase) return;
  const courses = getCourseLevels(useCase.depth);
  const defaultCourse = courses[0] || 'Beginner';
  elements.useCaseDetail.innerHTML = `
    <p class="detail-label">Use-case course</p>
    <h2>${escapeHtml(useCase.name)}</h2>
    <p>${escapeHtml(useCase.outcome)}</p>
    <section class="course-launch-panel" aria-label="Start use case class">
      <span>Start class</span>
      <label class="course-level-field" for="courseLevelSelect">
        <span>Course level</span>
        <select id="courseLevelSelect">
          ${courses.map((course) => `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`).join('')}
        </select>
      </label>
      <button id="beginSelectedCourseBtn" class="course-launch-button" type="button">
        Begin course
      </button>
    </section>
    <div id="courseStartNotice" class="course-start-notice" hidden></div>
    <div class="cert-stack" aria-label="Certification options">
      <span class="cert-stack-label">Certification tests</span>
      ${certificationOptions.map((option) => `
        <div class="cert-option">
          <strong>${escapeHtml(option.label)}</strong>
          <p>${escapeHtml(option.summary)}</p>
          <button type="button" data-cert-depth="${escapeHtml(option.id)}" aria-label="Start ${escapeHtml(option.label.toLowerCase())} for ${escapeHtml(useCase.name)}">Start</button>
        </div>
      `).join('')}
    </div>
    <div id="certResultPanel" class="course-start-notice" hidden></div>
  `;

  const levelSelect = elements.useCaseDetail.querySelector('#courseLevelSelect');
  const launchButton = elements.useCaseDetail.querySelector('#beginSelectedCourseBtn');
  launchButton?.addEventListener('click', () => {
    const level = levelSelect?.value || defaultCourse;
    showCourseStart(useCase, level, launchButton);
    startUseCaseChat(useCase, level);
  });

  // Task 28: wire each certification button to the real examiner flow.
  elements.useCaseDetail.querySelectorAll('[data-cert-depth]').forEach((button) => {
    button.addEventListener('click', () => {
      const depthId = button.dataset.certDepth;
      const option = certificationOptions.find((item) => item.id === depthId) || certificationOptions[0];
      startCertificationExam(useCase, option);
    });
  });

  const savedCourse = state.courseStarts[useCase.id];
  if (savedCourse) {
    const savedLevel = courses.includes(savedCourse.level) ? savedCourse.level : defaultCourse;
    if (levelSelect) levelSelect.value = savedLevel;
    launchButton.textContent = savedCourse.status === 'completed' ? 'Completed - revisit' : 'Continue course';
    showCourseStart(useCase, savedLevel, launchButton, {
      persist: false,
      scroll: false,
      savedAt: savedCourse.savedAt
    });
  }
}

function showCourseStart(useCase, level, activeButton, options = {}) {
  const { persist = true, scroll = true, savedAt = new Date().toISOString() } = options;
  const notice = elements.useCaseDetail.querySelector('#courseStartNotice');
  if (!notice) return;
  if (persist) {
    state.courseStarts[useCase.id] = {
      level,
      savedAt,
      status: 'started'
    };
    saveState();
    persistUseCaseProgress();
  }
  notice.hidden = false;
  notice.innerHTML = `
    <strong>${escapeHtml(level)} class ${persist ? 'started' : 'saved'}</strong>
    <span>${escapeHtml(useCase.name)} is ready for a guided conversation, a practice task, and completion evidence.</span>
    <small>Saved ${escapeHtml(formatSavedDate(savedAt))}</small>
  `;
  // Show the chat workspace
  elements.useCaseCourseWorkspace.hidden = false;
  elements.useCaseDetail.querySelectorAll('.course-launch-button').forEach((courseButton) => {
    courseButton.removeAttribute('aria-current');
  });
  activeButton?.setAttribute('aria-current', 'true');
  activeButton.textContent = 'Continue course';
  if (scroll) notice.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function handleUseCaseRequestSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const useCaseName = String(formData.get('useCaseName') || '').trim();
  const topic = String(formData.get('topic') || '').trim();
  const reason = String(formData.get('reason') || '').trim();
  const requesterEmail = String(formData.get('requesterEmail') || '').trim();

  if (!useCaseName || !reason) {
    showRequestMessage('Add the use case name and why it should be taught.', 'error');
    return;
  }

  const selectedUseCase = getSelectedUseCase();
  const submittedAtIso = new Date().toISOString();
  const request = {
    useCaseName,
    topic: topic || 'Unassigned',
    reason,
    requesterEmail,
    sourcePath: window.location.pathname,
    sourceUseCaseId: selectedUseCase?.id || null,
    sourceUseCaseName: selectedUseCase?.name || '',
    status: 'requested',
    createdAtIso: submittedAtIso,
    updatedAtIso: submittedAtIso,
    history: [{
      status: 'requested',
      at: submittedAtIso,
      actor: requesterEmail || 'requester',
      note: 'Submitted from The Ladder Use Cases page.'
    }]
  };

  setRequestSubmitting(true);
  try {
    const { collection, addDoc, serverTimestamp, db } = await getRequestDbContext();
    const requestRef = await addDoc(collection(db, requestCollection), {
      ...request,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await notifyUseCaseRequest({
      ...request,
      requestId: requestRef.id,
      storage: 'firestore'
    });
    form.reset();
    showRequestMessage('Request sent to the admin review queue.', 'success');
  } catch (error) {
    const offlineRequest = {
      ...request,
      id: `local-${Date.now()}`,
      localOnly: true,
      error: error.message || 'Firebase write failed'
    };
    saveOfflineRequest(offlineRequest);
    await notifyUseCaseRequest({
      ...offlineRequest,
      requestId: offlineRequest.id,
      storage: 'local_fallback'
    });
    form.reset();
    showRequestMessage('Firebase did not accept the request, so it was saved locally on this browser for admin review.', 'warning');
    console.warn('Use case request saved locally', error);
  } finally {
    setRequestSubmitting(false);
  }
}

async function getRequestDbContext() {
  if (requestDbContext) return requestDbContext;
  const [{ initializeApp, getApps, getApp }, firestoreModule, configModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
    import('/ai-academy/js/firebase-config.js')
  ]);
  const app = getApps().length ? getApp() : initializeApp(configModule.FIREBASE_CONFIG);
  requestDbContext = {
    db: firestoreModule.getFirestore(app),
    collection: firestoreModule.collection,
    addDoc: firestoreModule.addDoc,
    serverTimestamp: firestoreModule.serverTimestamp
  };
  return requestDbContext;
}

function getFilteredUseCases() {
  return state.useCases.filter((useCase) => {
    const topicMatch = inRange(useCase, state.activeTopic);
    const depthMatch = state.depth === 'all' || useCase.depth === state.depth;
    const queryMatch = !state.query || [useCase.name, useCase.topic, useCase.outcome, useCase.depth]
      .join(' ')
      .toLowerCase()
      .includes(state.query);
    return topicMatch && depthMatch && queryMatch;
  });
}

function getSelectedUseCase() {
  return state.useCases.find((useCase) => useCase.id === state.selectedId) || state.useCases[0];
}

function inRange(useCase, topic) {
  return useCase.id >= topic.start && useCase.id <= topic.end;
}

function getCourseLevels(depth) {
  if (depth === 'B/I/A') return ['Beginner', 'Intermediate', 'Advanced'];
  if (depth === 'B/I') return ['Beginner', 'Intermediate'];
  return ['Beginner'];
}

function restoreSavedState() {
  const saved = readSavedState();
  if (!saved) return;
  if (Number.isFinite(saved.selectedId)) state.selectedId = saved.selectedId;
  if (typeof saved.query === 'string') state.query = saved.query;
  if (['all', 'B', 'B/I', 'B/I/A'].includes(saved.depth)) state.depth = saved.depth;
  const savedTopic = topicRanges.find((topic) => topic.start === saved.activeTopic?.start && topic.end === saved.activeTopic?.end);
  if (savedTopic) state.activeTopic = savedTopic;
  if (saved.placement && typeof saved.placement === 'object') state.placement = saved.placement;
  if (saved.courseStarts && typeof saved.courseStarts === 'object') {
    state.courseStarts = Object.fromEntries(Object.entries(saved.courseStarts)
      .filter(([useCaseId, record]) => Number.isFinite(Number(useCaseId)) && typeof record?.level === 'string')
      .map(([useCaseId, record]) => [useCaseId, {
        level: record.level,
        savedAt: record.savedAt || new Date().toISOString(),
        status: record.status || 'started'
      }]));
  }
}

// Task 29: reconcile durable learner record into local state on load.
async function hydrateFromDataLayer() {
  try {
    const learner = await loadLearnerRecord();
    const progress = learner?.useCaseProgress;
    if (progress?.courseStarts && typeof progress.courseStarts === 'object') {
      Object.entries(progress.courseStarts).forEach(([id, record]) => {
        if (!record || typeof record !== 'object') return;
        const existing = state.courseStarts[id];
        // prefer a completed status from the durable record
        if (!existing || record.status === 'completed') {
          state.courseStarts[id] = {
            level: record.level || existing?.level || 'Beginner',
            savedAt: record.savedAt || existing?.savedAt || new Date().toISOString(),
            status: record.status || existing?.status || 'started'
          };
        }
      });
    }
    if (progress?.placement && !state.placement) {
      state.placement = progress.placement;
    }
  } catch (error) {
    console.warn('Could not hydrate from data layer', error);
  }
}

// Persist the use-case progress block through the data layer (local-first).
function persistUseCaseProgress() {
  try {
    saveLearnerProgress('use-case', {
      version: 'v1',
      courseStarts: state.courseStarts,
      placement: state.placement || null
    });
  } catch (error) {
    console.warn('Could not persist use-case progress', error);
  }
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch (error) {
    console.warn('Could not restore Use Cases course state', error);
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      selectedId: state.selectedId,
      activeTopic: {
        start: state.activeTopic.start,
        end: state.activeTopic.end
      },
      query: state.query,
      depth: state.depth,
      courseStarts: state.courseStarts,
      placement: state.placement
    }));
  } catch (error) {
    console.warn('Could not save Use Cases course state', error);
  }
}

function saveOfflineRequest(request) {
  const existing = readOfflineRequests();
  existing.unshift(request);
  localStorage.setItem(requestStorageKey, JSON.stringify(existing.slice(0, 50)));
}

function readOfflineRequests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(requestStorageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Could not read local use case requests', error);
    return [];
  }
}

function setRequestSubmitting(isSubmitting) {
  if (!elements.submitUseCaseRequest) return;
  elements.submitUseCaseRequest.disabled = isSubmitting;
  elements.submitUseCaseRequest.textContent = isSubmitting ? 'Sending...' : 'Send request';
}

function showRequestMessage(message, tone = 'success') {
  if (!elements.useCaseRequestMessage) return;
  elements.useCaseRequestMessage.hidden = false;
  elements.useCaseRequestMessage.dataset.tone = tone;
  elements.useCaseRequestMessage.textContent = message;
}

async function notifyUseCaseRequest(request) {
  try {
    const response = await fetch(requestEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Email notification failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('Use case request email notification failed', error);
  }
}

function formatSavedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function renderLoading() {
  elements.useCaseGrid.innerHTML = '<p class="empty-state">Loading use case catalog...</p>';
}

function renderError(error) {
  elements.useCaseGrid.innerHTML = `
    <p class="empty-state">The use case catalog could not load. ${escapeHtml(error.message)}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ===========================================================================
// Assessment / placement entry (Task 26)
// Renders a small panel above the catalog. A learner who skips it still
// browses the catalog directly — nothing is blocked.
// ===========================================================================
function renderAssessmentEntry() {
  let panel = document.querySelector('#useCaseAssessmentEntry');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'useCaseAssessmentEntry';
    panel.className = 'request-panel';
    panel.setAttribute('aria-label', 'Use-case placement assessment');
    // Insert just before the catalog tools (above the catalog grid).
    const tools = document.querySelector('.catalog-tools');
    tools?.parentElement?.insertBefore(panel, tools);
  }
  const placed = state.placement;
  const summary = placed ? `
    <p>Placement complete. You tested out of
      <strong>${(placed.grantedTierIds || []).length}</strong> topic group(s) and were assigned
      <strong>${(placed.assignedTopicIds || []).length}</strong> use case(s).
      ${placed.reasoning ? escapeHtml(placed.reasoning) : ''}</p>
  ` : `
    <p>Not sure where to start? Take a short conversational placement. We will assess how you already apply AI to real work, then test you out of topics you have mastered and recommend the use cases worth your time. You can also just browse the catalog.</p>
  `;
  panel.innerHTML = `
    <div class="request-copy">
      <span>Optional</span>
      <h2>Use-case placement</h2>
      ${summary}
    </div>
    <div class="cert-option" style="border:none;background:transparent">
      <button id="startUseCaseAssessmentBtn" type="button">${placed ? 'Retake placement' : 'Start placement'}</button>
    </div>
  `;
  panel.querySelector('#startUseCaseAssessmentBtn')?.addEventListener('click', startAssessment);
}

function startAssessment() {
  if (!state.placementEngine) return;
  state.assessmentActive = true;
  state.certificationContext = null;
  state.activeUseCaseChat = null;
  state.messages = [{
    role: 'assistant',
    content: state.placementEngine.placementOpener()
  }];
  elements.useCaseCourseWorkspace.hidden = false;
  renderUseCaseChat();
  elements.useCaseCourseWorkspace.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ===========================================================================
// Chat + Course Completion System (existing flow — preserved, Task 29 durable)
// ===========================================================================
function startUseCaseChat(useCase, level) {
  state.assessmentActive = false;
  state.certificationContext = null;
  state.activeUseCaseChat = { useCase, level, messages: [] };
  state.messages = [{
    role: 'user',
    content: `Start my guided conversation for "${useCase.name}". I'm taking the ${level} course. Help me understand this use case through questions, examples, applications, and limitations. When I've demonstrated understanding and we've completed the learning objectives, let me know by including <!--LADDER_CONVERSATION_COMPLETE:{"status":"completed","confidence":0.95,"rationale":"..."}-->`
  }];
  renderUseCaseChat();
  callUseCaseGuide();
}

function activeChatTitle() {
  if (state.assessmentActive) return 'Use-case placement assessment';
  if (state.certificationContext) {
    return `${state.certificationContext.itemLabel} - ${state.certificationContext.testDepthLabel}`;
  }
  if (state.activeUseCaseChat) return `${state.activeUseCaseChat.useCase.name} - Guided Conversation`;
  return 'Guided Conversation';
}

function activeSpeakerLabel() {
  if (state.assessmentActive) return 'Assessor';
  if (state.certificationContext) return 'Examiner';
  return 'Guide';
}

function renderUseCaseChat() {
  elements.useCaseConversationTitle.textContent = activeChatTitle();
  const speaker = activeSpeakerLabel();
  elements.useCaseChatLog.innerHTML = state.messages.map(msg =>
    `<div class="message ${msg.role}"><strong>${msg.role === 'assistant' ? speaker : 'You'}</strong><p>${escapeHtml(msg.content)}</p></div>`
  ).join('');
  elements.useCaseChatLog.scrollTop = elements.useCaseChatLog.scrollHeight;
}

async function submitUseCaseChat(event) {
  event.preventDefault();
  const content = elements.useCaseChatInput.value.trim();
  if (!content) return;
  state.messages.push({ role: 'user', content });
  elements.useCaseChatInput.value = '';
  renderUseCaseChat();
  if (state.assessmentActive) {
    await callPlacementAssessor();
  } else if (state.certificationContext) {
    await callExaminer();
  } else {
    await callUseCaseGuide();
  }
}

async function callUseCaseGuide() {
  if (!state.activeUseCaseChat) return;
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        system_prompt: `You are a use case training guide for "${state.activeUseCaseChat.useCase.name}". Help the learner understand this use case through guided conversation. When the learner demonstrates sufficient understanding of the ${state.activeUseCaseChat.level} level learning objectives, end the conversation with a completion signal.`,
        max_tokens: 700
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || 'I encountered an issue. Please try again.';
    const parsed = parseUseCaseCompletionResponse(rawText);
    state.messages.push({ role: 'assistant', content: parsed.visibleText });
    renderUseCaseChat();
    if (parsed.completion) {
      handleUseCaseCompletion(parsed.completion);
    }
  } catch (error) {
    console.error('Chat error:', error);
    state.messages.push({ role: 'assistant', content: 'I encountered an issue connecting to the guide. Please try again.' });
    renderUseCaseChat();
  }
}

function parseUseCaseCompletionResponse(rawText) {
  const text = String(rawText || '');
  const match = text.match(CONVERSATION_COMPLETE_REGEX);

  // Remove the completion signal and any remaining HTML comment artifacts
  let visibleText = text
    .replace(CONVERSATION_COMPLETE_REGEX, '')  // Remove the actual completion signal
    .replace(/<!--[\s\S]*?-->/g, '')            // Remove any remaining HTML comments
    .trim();

  if (!match) return { completion: null, visibleText };
  try {
    return { completion: JSON.parse(match[1]), visibleText };
  } catch (error) {
    console.warn('Could not parse completion:', error);
    return { completion: null, visibleText };
  }
}

function handleUseCaseCompletion(completion) {
  if (!state.activeUseCaseChat || !completion || completion.status !== 'completed') return;
  const { useCase, level } = state.activeUseCaseChat;
  state.courseStarts[useCase.id] = {
    level,
    status: 'completed',
    completedAt: new Date().toISOString(),
    savedAt: new Date().toISOString()
  };
  saveState();
  // Task 29: durable completion via the data layer (local-first).
  try {
    recordCompletion({
      pathway: 'use-case',
      itemId: useCase.id,
      itemType: 'use-case',
      itemName: useCase.name,
      level,
      status: 'completed',
      source: 'self_reported'
    });
  } catch (error) {
    console.warn('Could not record completion durably', error);
  }
  // Add confirmation message to chat
  state.messages.push({
    role: 'assistant',
    content: '✓ Course complete! You can now move to the next use case or return to the catalog.'
  });
  renderUseCaseChat();
  // Update UI and show completion
  renderDetail(useCase);
}

// ===========================================================================
// Placement assessor flow (Task 26)
// ===========================================================================
async function callPlacementAssessor() {
  if (!state.placementEngine) return;
  const engine = state.placementEngine;
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        system_prompt: engine.buildSystemPrompt({ languageLabel: 'English' }),
        max_tokens: 700
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || 'I encountered an issue. Please try again.';
    const { placement, visibleText } = engine.parsePlacementResponse(rawText);
    state.messages.push({ role: 'assistant', content: visibleText });
    renderUseCaseChat();
    const learnerTurns = state.messages.filter((message) => message.role === 'user').length;
    if (placement && engine.shouldApplyPlacement(placement, learnerTurns)) {
      applyPlacement(placement);
    }
  } catch (error) {
    console.error('Placement error:', error);
    state.messages.push({ role: 'assistant', content: 'I encountered an issue connecting to the assessor. Please try again.' });
    renderUseCaseChat();
  }
}

function applyPlacement(placement) {
  state.placement = placement;
  state.assessmentActive = false;
  saveState();
  // Task 26 + 29: persist placement + recommended/assigned use cases durably.
  persistUseCaseProgress();
  const grantedCount = (placement.grantedTierIds || []).length;
  const assignedCount = (placement.assignedTopicIds || []).length;
  state.messages.push({
    role: 'assistant',
    content: `✓ Placement complete. You tested out of ${grantedCount} topic group(s) and we recommended ${assignedCount} use case(s) to start with. Recommended cards are flagged in the catalog; topics you placed out of are marked "Placed out".`
  });
  renderUseCaseChat();
  renderTopics();
  renderUseCases();
  renderAssessmentEntry();
}

// ===========================================================================
// Certification examiner flow (Task 28)
// Wires the three depth buttons to the shared certification engine: examiner
// conversation -> parse result + rubric -> validateCertification (2nd model)
// -> recordCertificationResult (no-credential-without-validation) -> persist
// the awarded credential via data-layer.recordCertification.
// ===========================================================================
function buildCertificationContext(useCase, option) {
  const attemptId = `usecase-${useCase.id}-${option.id}-${Date.now()}`;
  const educationTierLabel = 'Workforce';
  const standards = 'O*NET, WEF, NIST AI RMF';
  return {
    attemptId,
    blueprintId: `usecase-cert:${useCase.id}:${option.id}`,
    blueprintVersion: 'v1',
    itemId: useCase.id,
    itemLabel: useCase.name,
    educationTierId: 'workforce',
    educationTierLabel,
    certificationTierId: option.id,
    certificationTierLabel: option.label,
    standards,
    testDepthId: option.id,
    testDepthLabel: option.label,
    testDepthOutcome: option.outcome,
    testDepthEvidence: option.evidence,
    testDepthPassingStandard: option.passingStandard,
    testDepthReview: option.review,
    pathway: 'use-case'
  };
}

function startCertificationExam(useCase, option) {
  const context = buildCertificationContext(useCase, option);
  state.certificationContext = context;
  state.assessmentActive = false;
  state.activeUseCaseChat = null;
  state.messages = [{
    role: 'user',
    content: `I want to attempt the ${option.label} for the use case "${useCase.name}". Begin the certification exam. State the rubric dimensions first, then assess my evidence.`
  }];
  elements.useCaseCourseWorkspace.hidden = false;
  renderUseCaseChat();
  elements.useCaseCourseWorkspace.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  callExaminer();
}

async function callExaminer() {
  const context = state.certificationContext;
  if (!context) return;
  const blueprint = {
    itemLabel: context.itemLabel,
    educationTierLabel: context.educationTierLabel,
    certificationTierLabel: context.certificationTierLabel,
    standards: context.standards,
    depthLabel: context.testDepthLabel,
    depthOutcome: context.testDepthOutcome,
    depthEvidence: context.testDepthEvidence,
    depthPassingStandard: context.testDepthPassingStandard,
    depthReview: context.testDepthReview,
    languageLabel: 'English'
  };
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        system_prompt: certificationEngine.buildExaminerSystemPrompt(blueprint),
        max_tokens: 900
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || 'I encountered an issue. Please try again.';
    const { certificationResult, rubricDimensions, visibleText } = certificationEngine.parseExaminerResponse(rawText);
    state.messages.push({ role: 'assistant', content: visibleText });
    renderUseCaseChat();
    if (certificationResult) {
      await finalizeCertification(context, certificationResult, rubricDimensions);
    }
  } catch (error) {
    console.error('Examiner error:', error);
    state.messages.push({ role: 'assistant', content: 'I encountered an issue connecting to the examiner. Please try again.' });
    renderUseCaseChat();
  }
}

async function finalizeCertification(context, certificationResult, rubricDimensions) {
  const conversationMessages = state.messages.slice(-36);
  // No-credential-without-validation pipeline. recordCertificationResult
  // calls validateCertification (independent second model) internally and
  // ONLY returns an awarded record when validation.valid === true.
  const { outcome, validation, record } = await certificationEngine.recordCertificationResult({
    context,
    result: certificationResult,
    conversationMessages,
    hooks: {
      // Persist the awarded credential durably. This hook fires only on
      // outcome === 'awarded' (i.e. after a valid validation), preserving the
      // invariant — we never call recordCertification for an unvalidated pass.
      onCredential: (cred) => {
        try {
          const evidencePacket = certificationEngine.buildEvidencePacket({
            context,
            result: certificationResult,
            rubricDimensions: rubricDimensions || [],
            validation
          });
          // Map engine packet -> data-layer packet field names (doc-16).
          recordCertification({
            ...evidencePacket,
            pathway: 'use-case',
            certificationTier: context.certificationTierLabel,
            ladderTier: context.itemLabel,
            testDepth: context.testDepthLabel,
            result: certificationEngine.isCertifiedResult(certificationResult) ? 'pass' : 'non_pass',
            evidenceStatus: 'ai_verified',
            finalDecision: 'pass',
            identityAssurance: cred.identityAssurance || {}
          }, validation);
        } catch (error) {
          console.warn('Could not persist certification durably', error);
        }
      }
    }
  });
  renderCertificationOutcome(context, outcome, validation, certificationResult, rubricDimensions, record);
}

function renderCertificationOutcome(context, outcome, validation, result, rubricDimensions, record) {
  const panel = elements.useCaseDetail.querySelector('#certResultPanel');
  const rubricHtml = (rubricDimensions || []).map((dim) => {
    const tone = dim.status === 'pass' ? 'PASS' : dim.status === 'fail' ? 'FAIL' : '—';
    return `<li><strong>${escapeHtml(dim.dimension)}:</strong> ${escapeHtml(tone)} — ${escapeHtml(dim.reason || '')}</li>`;
  }).join('');

  let headline = '';
  let body = '';
  if (outcome === 'awarded') {
    headline = `Credential awarded: ${escapeHtml(context.testDepthLabel)}`;
    body = `Independent validation confirmed your evidence and the examiner process. ${escapeHtml(result.rationale || '')}`;
  } else if (outcome === 'not_awarded') {
    headline = `Not yet certified: ${escapeHtml(context.testDepthLabel)}`;
    body = `Validation confirmed the review was fair, but the examiner needs more evidence. ${escapeHtml(result.rationale || '')} You can challenge or retake.`;
  } else {
    headline = `No credential recorded: ${escapeHtml(context.testDepthLabel)}`;
    body = `Independent validation did not confirm this attempt, so no credential was stored. ${escapeHtml(validation?.rationale || '')} You can challenge or retake.`;
  }

  const outcomeMessage = outcome === 'awarded'
    ? `✓ ${headline}.`
    : `${headline}.`;
  state.messages.push({ role: 'assistant', content: outcomeMessage });
  renderUseCaseChat();

  if (panel) {
    panel.hidden = false;
    panel.innerHTML = `
      <strong>${headline}</strong>
      <span>${body}</span>
      ${rubricHtml ? `<ul style="margin:0.5rem 0 0;padding-left:1.1rem;font-size:0.85rem">${rubricHtml}</ul>` : ''}
      <small>Challenge path: reply in the chat with additional evidence, or retake at any time.</small>
    `;
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // a fresh attempt context so the next button press is a clean exam
  state.certificationContext = null;
}
