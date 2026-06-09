const catalogUrl = '/docs/theladder-use-cases-catalog.md?v=1';
const storageKey = 'aesop-ladder-use-cases-state-v1';
const requestStorageKey = 'aesop-use-case-training-requests-v1';
const requestCollection = 'useCaseTrainingRequests';
const requestEmailUrl = '/aesop-api/use-case-request-email.php';
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
  courseStarts: {}
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
          <button type="button" aria-label="Start ${escapeHtml(option.label.toLowerCase())} for ${escapeHtml(useCase.name)}">Start</button>
        </div>
      `).join('')}
    </div>
  `;

  const levelSelect = elements.useCaseDetail.querySelector('#courseLevelSelect');
  const launchButton = elements.useCaseDetail.querySelector('#beginSelectedCourseBtn');
  launchButton?.addEventListener('click', () => {
    showCourseStart(useCase, levelSelect?.value || defaultCourse, launchButton);
  });

  const savedCourse = state.courseStarts[useCase.id];
  if (savedCourse) {
    const savedLevel = courses.includes(savedCourse.level) ? savedCourse.level : defaultCourse;
    if (levelSelect) levelSelect.value = savedLevel;
    launchButton.textContent = 'Continue course';
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
  }
  notice.hidden = false;
  notice.innerHTML = `
    <strong>${escapeHtml(level)} class ${persist ? 'started' : 'saved'}</strong>
    <span>${escapeHtml(useCase.name)} is ready for a guided conversation, a practice task, and completion evidence.</span>
    <small>Saved ${escapeHtml(formatSavedDate(savedAt))}</small>
    <div class="course-conversation-workspace">
      <strong>Guided class conversation</strong>
      <p>Start with the real work scenario, then complete one lab: debate the right use of AI, practice the workflow skill, or build a usable artifact.</p>
    </div>
  `;
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
      courseStarts: state.courseStarts
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
