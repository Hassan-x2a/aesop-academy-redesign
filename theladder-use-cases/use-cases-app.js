const catalogUrl = '/docs/theladder-use-cases-catalog.md?v=1';
const storageKey = 'aesop-ladder-use-cases-state-v1';
const requestStorageKey = 'aesop-use-case-training-requests-v1';
const requestCollection = 'useCaseTrainingRequests';
const requestEmailUrl = '/aesop-api/use-case-request-email.php';
const courseProxyUrl = '/aesop-api/proxy.php';
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

const certificationOptions = [
  {
    label: 'Certification',
    summary: 'Proves you can perform the use case safely, explain its limits, and complete a guided assignment.'
  },
  {
    label: 'Expert certification',
    summary: 'Proves you can adapt the workflow, troubleshoot failures, compare approaches, and teach another learner.'
  },
  {
    label: 'Master certification',
    summary: 'Proves you can design a production-ready workflow, evaluate risk, document evidence, and defend decisions.'
  }
];

const state = {
  useCases: [],
  selectedId: 1,
  activeTopic: topicRanges[0],
  query: '',
  depth: 'all',
  courseStarts: {},
  courseChats: {}
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
  requestUseCaseTopic: document.querySelector('#requestUseCaseTopic')
};

init();

async function init() {
  setupTheme();
  renderLoading();

  try {
    const markdown = await fetch(catalogUrl).then((response) => {
      if (!response.ok) throw new Error(`Use case catalog request failed: ${response.status}`);
      return response.text();
    });
    state.useCases = parseCatalog(markdown);
    restoreSavedState();
    if (!state.useCases.some((useCase) => useCase.id === state.selectedId)) {
      state.selectedId = state.useCases[0]?.id || 1;
    }
    bindEvents();
    render();
  } catch (error) {
    renderError(error);
  }
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
}

function renderTopics() {
  elements.categoryList.innerHTML = topicRanges.map((topic) => {
    const count = state.useCases.filter((useCase) => inRange(useCase, topic)).length;
    const active = topic.label === state.activeTopic.label ? ' active' : '';
    return `
      <button class="category-button${active}" type="button" data-start="${topic.start}" data-end="${topic.end}">
        <strong>${escapeHtml(topic.label)}</strong>
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

  elements.useCaseGrid.innerHTML = useCases.map((useCase) => `
    <button class="product-card${useCase.id === state.selectedId ? ' active' : ''}" type="button" data-use-case-id="${useCase.id}">
      <div class="card-top">
        <span class="product-number">#${useCase.id}</span>
        <span class="depth-pill">${escapeHtml(useCase.depth)}</span>
      </div>
      <h3>${escapeHtml(useCase.name)}</h3>
      <p class="product-type">${escapeHtml(useCase.topic)}</p>
      <p class="product-reason">${escapeHtml(useCase.outcome)}</p>
    </button>
  `).join('');

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
  const chat = ensureDefaultCourseChat(useCase, defaultCourse);
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
    <section id="courseWorkspace" class="course-conversation-workspace" aria-label="Course conversation workspace">
      ${renderCourseWorkspace(useCase, chat)}
    </section>
    <div class="cert-stack" aria-label="Certification options">
      <span class="cert-stack-label">Certification tests</span>
      ${certificationOptions.map((option) => `
        <div class="cert-option">
          <strong>${escapeHtml(option.label)}</strong>
          <p>${escapeHtml(option.summary)}</p>
          <button type="button" data-certification-label="${escapeHtml(option.label)}" ${chat?.mode === 'certification' && chat.certificationLabel === option.label ? 'aria-current="true"' : ''} aria-label="Start ${escapeHtml(option.label.toLowerCase())} for ${escapeHtml(useCase.name)}">Start test</button>
        </div>
      `).join('')}
    </div>
  `;

  const levelSelect = elements.useCaseDetail.querySelector('#courseLevelSelect');
  const launchButton = elements.useCaseDetail.querySelector('#beginSelectedCourseBtn');
  launchButton?.addEventListener('click', () => {
    startCourseConversation(useCase, levelSelect?.value || defaultCourse, launchButton);
  });
  elements.useCaseDetail.querySelectorAll('[data-certification-label]').forEach((button) => {
    button.addEventListener('click', () => {
      startCertificationConversation(useCase, button.dataset.certificationLabel, levelSelect?.value || defaultCourse, button);
    });
  });
  bindCourseWorkspace(useCase);

  const savedCourse = state.courseStarts[useCase.id];
  if (savedCourse) {
    const savedLevel = courses.includes(savedCourse.level) ? savedCourse.level : defaultCourse;
    if (levelSelect) levelSelect.value = savedLevel;
    launchButton.textContent = 'Continue course';
    if (chat?.mode === 'course') launchButton.setAttribute('aria-current', 'true');
  }
}

function ensureDefaultCourseChat(useCase, level) {
  if (state.courseChats[useCase.id]) return state.courseChats[useCase.id];
  const savedAt = new Date().toISOString();
  state.courseChats[useCase.id] = {
    mode: 'course',
    level,
    savedAt,
    updatedAt: savedAt,
    status: 'ready',
    messages: [{
      role: 'assistant',
      content: `This is the course chat for ${useCase.name}. Tell me what you want to practice or click Begin course and I will start the guided class.`
    }]
  };
  saveState();
  return state.courseChats[useCase.id];
}

function renderCourseWorkspace(useCase, chat) {
  if (!chat) {
    return `
      <div class="workspace-empty">
        <strong>No conversation started</strong>
        <p>Begin a course or start a certification test to open the guided prompt workspace.</p>
      </div>
    `;
  }
  const modeLabel = chat.mode === 'certification'
    ? `${chat.certificationLabel || 'Certification'} test`
    : `${chat.level || 'Beginner'} course`;
  const messages = Array.isArray(chat.messages) ? chat.messages : [];
  return `
    <div class="workspace-head">
      <div>
        <span>${escapeHtml(modeLabel)}</span>
        <strong>${escapeHtml(useCase.name)}</strong>
      </div>
      <small>${escapeHtml(chat.status === 'complete' ? 'Ready for review' : `Saved ${formatSavedDate(chat.updatedAt || chat.savedAt)}`)}</small>
    </div>
    <div id="courseChatLog" class="course-chat-log" aria-live="polite">
      ${messages.map(renderCourseMessage).join('')}
    </div>
    <form id="courseChatForm" class="course-chat-form">
      <label for="courseChatInput">Your response</label>
      <textarea id="courseChatInput" rows="4" required placeholder="${escapeHtml(chat.mode === 'certification' ? 'Answer the certification prompt with evidence.' : 'Ask a question, describe your attempt, or submit your lab work.')}"></textarea>
      <div class="course-chat-actions">
        <button type="submit">Send response</button>
        <button type="button" id="completeCourseBtn" class="secondary-course-button">Mark complete</button>
      </div>
    </form>
  `;
}

function renderCourseMessage(message) {
  const role = message.role === 'assistant' ? 'assistant' : 'user';
  const label = role === 'assistant' ? 'AESOP guide' : 'Learner';
  return `
    <article class="course-message ${role}">
      <span>${label}</span>
      <p>${escapeHtml(message.content || '')}</p>
    </article>
  `;
}

function startCourseConversation(useCase, level, activeButton) {
  const savedAt = new Date().toISOString();
  state.courseStarts[useCase.id] = {
    level,
    savedAt,
    status: 'started'
  };
  state.courseChats[useCase.id] = {
    mode: 'course',
    level,
    savedAt,
    updatedAt: savedAt,
    status: 'started',
    messages: [{
      role: 'user',
      content: `I'm ready to start the ${level} course for ${useCase.name}.`
    }]
  };
  saveState();
  renderDetail(useCase);
  setActiveCourseButton(activeButton);
  callCourseGuide(useCase);
}

function startCertificationConversation(useCase, certificationLabel, level, activeButton) {
  const savedAt = new Date().toISOString();
  state.courseStarts[useCase.id] = {
    level,
    savedAt,
    status: 'certification_started'
  };
  state.courseChats[useCase.id] = {
    mode: 'certification',
    certificationLabel,
    level,
    savedAt,
    updatedAt: savedAt,
    status: 'started',
    messages: [{
      role: 'user',
      content: `I'm ready to start the ${certificationLabel} test for ${useCase.name}.`
    }]
  };
  saveState();
  renderDetail(useCase);
  setActiveCourseButton(activeButton);
  callCourseGuide(useCase);
}

function setActiveCourseButton(activeButton) {
  elements.useCaseDetail.querySelectorAll('.course-launch-button, .cert-option button').forEach((courseButton) => {
    courseButton.removeAttribute('aria-current');
  });
  activeButton?.setAttribute('aria-current', 'true');
  if (activeButton?.classList.contains('course-launch-button')) activeButton.textContent = 'Continue course';
}

function bindCourseWorkspace(useCase) {
  const form = elements.useCaseDetail.querySelector('#courseChatForm');
  const input = elements.useCaseDetail.querySelector('#courseChatInput');
  const completeButton = elements.useCaseDetail.querySelector('#completeCourseBtn');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    const chat = state.courseChats[useCase.id];
    if (!chat) return;
    chat.messages.push({ role: 'user', content });
    chat.updatedAt = new Date().toISOString();
    input.value = '';
    saveState();
    renderDetail(useCase);
    await callCourseGuide(useCase);
  });
  completeButton?.addEventListener('click', () => {
    const chat = state.courseChats[useCase.id];
    if (!chat) return;
    chat.status = 'complete';
    chat.updatedAt = new Date().toISOString();
    state.courseStarts[useCase.id] = {
      ...(state.courseStarts[useCase.id] || {}),
      level: chat.level || 'Beginner',
      savedAt: chat.updatedAt,
      status: chat.mode === 'certification' ? 'certification_complete' : 'completed'
    };
    saveState();
    renderDetail(useCase);
  });
}

async function callCourseGuide(useCase) {
  const chat = state.courseChats[useCase.id];
  if (!chat) return;
  chat.messages.push({ role: 'assistant', content: 'Thinking through the next step...' });
  renderDetail(useCase);
  const outboundMessages = chat.messages.filter((message) => message.content !== 'Thinking through the next step...');
  while (outboundMessages[0]?.role === 'assistant') outboundMessages.shift();
  if (!outboundMessages.length) {
    outboundMessages.push({ role: 'user', content: `Start the course conversation for ${useCase.name}.` });
  }
  try {
    const response = await fetch(courseProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: outboundMessages,
        system_prompt: useCaseSystemPrompt(useCase, chat),
        max_tokens: 900
      })
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || data?.error || fallbackCourseGuide(useCase, chat);
    chat.messages = chat.messages.filter((message) => message.content !== 'Thinking through the next step...');
    chat.messages.push({ role: 'assistant', content: text });
  } catch (error) {
    chat.messages = chat.messages.filter((message) => message.content !== 'Thinking through the next step...');
    chat.messages.push({ role: 'assistant', content: fallbackCourseGuide(useCase, chat) });
  }
  chat.updatedAt = new Date().toISOString();
  chat.messages = chat.messages.slice(-30);
  saveState();
  renderDetail(useCase);
}

function useCaseSystemPrompt(useCase, chat) {
  if (chat.mode === 'certification') {
    return `You are an AESOP AI Academy certification examiner. Certify the learner on this AI use case: ${useCase.name}. Topic: ${useCase.topic}. Certification level: ${chat.certificationLabel}. Ask one focused prompt at a time. Require evidence. Evaluate correctness, safety, limitations, and practical application. Do not pass the learner casually. Keep responses under 180 words.`;
  }
  return `You are an AESOP AI Academy use-case course guide. Teach this AI use case: ${useCase.name}. Topic: ${useCase.topic}. Outcome: ${useCase.outcome}. Level: ${chat.level}. Use guided conversation. Each assignment must include one lab type: debate whether AI should be used, practice the workflow skill, or build a usable artifact. Keep responses under 180 words and end with the next concrete learner action.`;
}

function fallbackCourseGuide(useCase, chat) {
  if (chat.mode === 'certification') {
    return `Certification prompt for ${useCase.name}: describe the workflow you would use, the risk or limitation you would manage, the evidence you would collect, and how you would decide whether the result is good enough.`;
  }
  return `Course prompt for ${useCase.name}: describe the real task you want to perform. Then choose one lab: debate whether AI belongs in the task, practice a workflow step, or build a small artifact you can inspect.`;
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
  if (saved.courseStarts && typeof saved.courseStarts === 'object') {
    state.courseStarts = Object.fromEntries(Object.entries(saved.courseStarts)
      .filter(([useCaseId, record]) => Number.isFinite(Number(useCaseId)) && typeof record?.level === 'string')
      .map(([useCaseId, record]) => [useCaseId, {
        level: record.level,
        savedAt: record.savedAt || new Date().toISOString(),
        status: record.status || 'started'
      }]));
  }
  if (saved.courseChats && typeof saved.courseChats === 'object') {
    state.courseChats = Object.fromEntries(Object.entries(saved.courseChats)
      .filter(([useCaseId, record]) => Number.isFinite(Number(useCaseId)) && Array.isArray(record?.messages))
      .map(([useCaseId, record]) => [useCaseId, {
        mode: record.mode === 'certification' ? 'certification' : 'course',
        certificationLabel: record.certificationLabel || '',
        level: record.level || 'Beginner',
        savedAt: record.savedAt || new Date().toISOString(),
        updatedAt: record.updatedAt || record.savedAt || new Date().toISOString(),
        status: record.status || 'started',
        messages: record.messages
          .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
          .slice(-30)
      }]));
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
      courseChats: state.courseChats
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
