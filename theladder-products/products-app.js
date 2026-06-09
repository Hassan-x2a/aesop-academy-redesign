const catalogUrl = '/docs/theladder-products-catalog.md?v=2';
const storageKey = 'aesop-ladder-products-state-v1';
const requestStorageKey = 'aesop-product-course-requests-v1';
const requestCollection = 'productCourseRequests';
const requestEmailUrl = '/aesop-api/product-request-email.php';
const courseProxyUrl = '/aesop-api/proxy.php';
let requestDbContext = null;

const categoryRanges = [
  { label: 'AI assistants', start: 1, end: 20 },
  { label: 'Workplace + writing', start: 21, end: 35 },
  { label: 'Coding tools', start: 36, end: 61 },
  { label: 'Search + RAG', start: 62, end: 82 },
  { label: 'Vector databases', start: 83, end: 107 },
  { label: 'Data + analytics', start: 108, end: 126 },
  { label: 'Design + slides', start: 127, end: 146 },
  { label: 'Video + audio', start: 147, end: 166 },
  { label: 'Sales + support', start: 167, end: 191 },
  { label: 'Agents + automation', start: 192, end: 210 },
  { label: 'Model APIs + cloud', start: 211, end: 230 },
  { label: 'Regulated AI', start: 231, end: 250 },
  { label: 'HR + recruiting', start: 251, end: 275 },
  { label: 'Education + tutoring', start: 276, end: 300 },
  { label: 'Ecommerce + retail', start: 301, end: 325 },
  { label: 'Finance + accounting', start: 326, end: 350 },
  { label: 'AIOps + incidents', start: 351, end: 375 },
  { label: 'AI governance', start: 376, end: 400 },
  { label: 'Construction + real estate', start: 401, end: 425 },
  { label: 'Manufacturing + supply chain', start: 426, end: 450 },
  { label: 'Science + clinical AI', start: 451, end: 475 },
  { label: 'Personal productivity', start: 476, end: 500 }
];
const defaultCategory = categoryRanges[0];

const certificationOptions = [
  {
    label: 'Certification',
    summary: 'Proves you can use the product safely for common work, explain its core features, and complete a guided assignment.'
  },
  {
    label: 'Expert certification',
    summary: 'Proves you can choose the right workflow, troubleshoot limits, compare alternatives, and teach another learner.'
  },
  {
    label: 'Master certification',
    summary: 'Proves you can design a production workflow, evaluate risk, document evidence, and defend your choices.'
  }
];

const state = {
  products: [],
  selectedId: 1,
  activeCategory: defaultCategory,
  query: '',
  depth: 'all',
  courseStarts: {},
  courseChats: {}
};

const elements = {
  categoryList: document.querySelector('#categoryList'),
  productGrid: document.querySelector('#productGrid'),
  productDetail: document.querySelector('#productDetail'),
  productSearch: document.querySelector('#productSearch'),
  depthFilter: document.querySelector('#depthFilter'),
  visibleCount: document.querySelector('#visibleCount'),
  totalProducts: document.querySelector('#totalProducts'),
  advancedCount: document.querySelector('#advancedCount'),
  educationFocusSelect: document.querySelector('#educationFocusSelect'),
  themeToggle: document.querySelector('#themeToggle'),
  productRequestForm: document.querySelector('#productRequestForm'),
  productRequestMessage: document.querySelector('#productRequestMessage'),
  submitProductRequest: document.querySelector('#submitProductRequest')
};

init();

async function init() {
  setupTheme();
  renderLoading();

  try {
    const markdown = await fetch(catalogUrl).then((response) => {
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
      return response.text();
    });
    state.products = parseCatalog(markdown);
    restoreSavedState();
    if (!state.products.some((product) => product.id === state.selectedId)) {
      state.selectedId = state.products[0]?.id || 1;
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

function setupEducationFocusSelect() {
  if (!elements.educationFocusSelect) return;
  elements.educationFocusSelect.addEventListener('change', (event) => {
    const target = event.target.value;
    if (target && target !== window.location.pathname) {
      window.location.href = target;
    }
  });
}

function bindEvents() {
  setupEducationFocusSelect();

  elements.productSearch.addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    saveState();
    renderProducts();
  });

  elements.depthFilter.addEventListener('change', (event) => {
    state.depth = event.target.value;
    saveState();
    renderProducts();
  });

  elements.productRequestForm?.addEventListener('submit', handleProductRequestSubmit);

  window.addEventListener('beforeunload', saveState);
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
        type: cells[2],
        reason: cells[3],
        depth: cells[4]
      };
    })
    .filter((product) => Number.isFinite(product.id) && product.name);
}

function render() {
  elements.totalProducts.textContent = state.products.length.toString();
  elements.advancedCount.textContent = state.products.filter((product) => product.depth === 'B/I/A').length.toString();
  elements.productSearch.value = state.query;
  elements.depthFilter.value = state.depth;
  renderCategories();
  renderProducts();
  renderDetail(getSelectedProduct());
}

function renderCategories() {
  elements.categoryList.innerHTML = categoryRanges.map((category) => {
    const count = state.products.filter((product) => inRange(product, category)).length;
    const active = category.label === state.activeCategory.label ? ' active' : '';
    return `
      <button class="category-button${active}" type="button" data-start="${category.start}" data-end="${category.end}">
        <strong>${escapeHtml(category.label)}</strong>
        <span>${count}</span>
      </button>
    `;
  }).join('');

  elements.categoryList.querySelectorAll('.category-button').forEach((button) => {
    button.addEventListener('click', () => {
      const start = Number(button.dataset.start);
      const end = Number(button.dataset.end);
      state.activeCategory = categoryRanges.find((category) => category.start === start && category.end === end) || defaultCategory;
      saveState();
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const products = getFilteredProducts();
  elements.visibleCount.textContent = `${products.length} shown`;

  if (!products.length) {
    elements.productGrid.innerHTML = '<p class="empty-state">No products match those filters.</p>';
    return;
  }

  if (!products.some((product) => product.id === state.selectedId)) {
    state.selectedId = products[0].id;
    saveState();
    renderDetail(products[0]);
  }

  elements.productGrid.innerHTML = products.map((product) => `
    <button class="product-card${product.id === state.selectedId ? ' active' : ''}" type="button" data-product-id="${product.id}">
      <div class="card-top">
        <span class="product-number">#${product.id}</span>
        <span class="depth-pill">${escapeHtml(product.depth)}</span>
      </div>
      <h3>${escapeHtml(product.name)}</h3>
      <p class="product-type">${escapeHtml(product.type)}</p>
      <p class="product-reason">${escapeHtml(product.reason)}</p>
    </button>
  `).join('');

  elements.productGrid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedId = Number(card.dataset.productId);
      saveState();
      renderProducts();
      renderDetail(getSelectedProduct());
    });
  });
}

function renderDetail(product) {
  if (!product) return;
  const courses = getCourseLevels(product.depth);
  const defaultCourse = courses[0] || 'Beginner';
  const chat = ensureDefaultCourseChat(product, defaultCourse);
  elements.productDetail.innerHTML = `
    <p class="detail-label">Product course</p>
    <h2>${escapeHtml(product.name)}</h2>
    <section class="course-launch-panel" aria-label="Start product class">
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
      ${renderCourseWorkspace(product, chat)}
    </section>
    <div class="cert-stack" aria-label="Certification options">
      <span class="cert-stack-label">Certification tests</span>
      ${certificationOptions.map((option) => `
        <div class="cert-option">
          <strong>${escapeHtml(option.label)}</strong>
          <p>${escapeHtml(option.summary)}</p>
          <button type="button" data-certification-label="${escapeHtml(option.label)}" ${chat?.mode === 'certification' && chat.certificationLabel === option.label ? 'aria-current="true"' : ''} aria-label="Start ${escapeHtml(option.label.toLowerCase())} for ${escapeHtml(product.name)}">Start test</button>
        </div>
      `).join('')}
    </div>
  `;

  const levelSelect = elements.productDetail.querySelector('#courseLevelSelect');
  const launchButton = elements.productDetail.querySelector('#beginSelectedCourseBtn');
  launchButton?.addEventListener('click', () => {
    startCourseConversation(product, levelSelect?.value || defaultCourse, launchButton);
  });
  elements.productDetail.querySelectorAll('[data-certification-label]').forEach((button) => {
    button.addEventListener('click', () => {
      startCertificationConversation(product, button.dataset.certificationLabel, levelSelect?.value || defaultCourse, button);
    });
  });
  bindCourseWorkspace(product);

  const savedCourse = state.courseStarts[product.id];
  if (savedCourse) {
    const savedLevel = courses.includes(savedCourse.level) ? savedCourse.level : defaultCourse;
    if (levelSelect) levelSelect.value = savedLevel;
    launchButton.textContent = 'Continue course';
    if (chat?.mode === 'course') launchButton.setAttribute('aria-current', 'true');
  }
}

function ensureDefaultCourseChat(product, level) {
  if (state.courseChats[product.id]) return state.courseChats[product.id];
  const savedAt = new Date().toISOString();
  state.courseChats[product.id] = {
    mode: 'course',
    level,
    savedAt,
    updatedAt: savedAt,
    status: 'ready',
    messages: [{
      role: 'assistant',
      content: `This is the course chat for ${product.name}. Tell me what you want to learn or click Begin course and I will start the guided class.`
    }]
  };
  saveState();
  return state.courseChats[product.id];
}

function renderCourseWorkspace(product, chat) {
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
        <strong>${escapeHtml(product.name)}</strong>
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

function startCourseConversation(product, level, activeButton) {
  const savedAt = new Date().toISOString();
  state.courseStarts[product.id] = {
    level,
    savedAt,
    status: 'started'
  };
  state.courseChats[product.id] = {
    mode: 'course',
    level,
    savedAt,
    updatedAt: savedAt,
    status: 'started',
    messages: [{
      role: 'user',
      content: `I'm ready to start the ${level} course for ${product.name}.`
    }]
  };
  saveState();
  renderDetail(product);
  setActiveCourseButton(activeButton);
  callCourseGuide(product);
}

function startCertificationConversation(product, certificationLabel, level, activeButton) {
  const savedAt = new Date().toISOString();
  state.courseStarts[product.id] = {
    level,
    savedAt,
    status: 'certification_started'
  };
  state.courseChats[product.id] = {
    mode: 'certification',
    certificationLabel,
    level,
    savedAt,
    updatedAt: savedAt,
    status: 'started',
    messages: [{
      role: 'user',
      content: `I'm ready to start the ${certificationLabel} test for ${product.name}.`
    }]
  };
  saveState();
  renderDetail(product);
  setActiveCourseButton(activeButton);
  callCourseGuide(product);
}

function setActiveCourseButton(activeButton) {
  elements.productDetail.querySelectorAll('.course-launch-button, .cert-option button').forEach((courseButton) => {
    courseButton.removeAttribute('aria-current');
  });
  activeButton?.setAttribute('aria-current', 'true');
  if (activeButton?.classList.contains('course-launch-button')) activeButton.textContent = 'Continue course';
}

function bindCourseWorkspace(product) {
  const form = elements.productDetail.querySelector('#courseChatForm');
  const input = elements.productDetail.querySelector('#courseChatInput');
  const completeButton = elements.productDetail.querySelector('#completeCourseBtn');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    const chat = state.courseChats[product.id];
    if (!chat) return;
    chat.messages.push({ role: 'user', content });
    chat.updatedAt = new Date().toISOString();
    input.value = '';
    saveState();
    renderDetail(product);
    await callCourseGuide(product);
  });
  completeButton?.addEventListener('click', () => {
    const chat = state.courseChats[product.id];
    if (!chat) return;
    chat.status = 'complete';
    chat.updatedAt = new Date().toISOString();
    state.courseStarts[product.id] = {
      ...(state.courseStarts[product.id] || {}),
      level: chat.level || 'Beginner',
      savedAt: chat.updatedAt,
      status: chat.mode === 'certification' ? 'certification_complete' : 'completed'
    };
    saveState();
    renderDetail(product);
  });
}

async function callCourseGuide(product) {
  const chat = state.courseChats[product.id];
  if (!chat) return;
  chat.messages.push({ role: 'assistant', content: 'Thinking through the next step...' });
  renderDetail(product);
  const outboundMessages = chat.messages.filter((message) => message.content !== 'Thinking through the next step...');
  while (outboundMessages[0]?.role === 'assistant') outboundMessages.shift();
  if (!outboundMessages.length) {
    outboundMessages.push({ role: 'user', content: `Start the course conversation for ${product.name}.` });
  }
  try {
    const response = await fetch(courseProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: outboundMessages,
        system_prompt: productSystemPrompt(product, chat),
        max_tokens: 900
      })
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || data?.error || fallbackCourseGuide(product, chat);
    chat.messages = chat.messages.filter((message) => message.content !== 'Thinking through the next step...');
    chat.messages.push({ role: 'assistant', content: text });
  } catch (error) {
    chat.messages = chat.messages.filter((message) => message.content !== 'Thinking through the next step...');
    chat.messages.push({ role: 'assistant', content: fallbackCourseGuide(product, chat) });
  }
  chat.updatedAt = new Date().toISOString();
  chat.messages = chat.messages.slice(-30);
  saveState();
  renderDetail(product);
}

function productSystemPrompt(product, chat) {
  if (chat.mode === 'certification') {
    return `You are an AESOP AI Academy certification examiner. Certify the learner on ${product.name}, product type ${product.type}. Certification level: ${chat.certificationLabel}. Ask one focused prompt at a time. Require evidence. Evaluate correctness, safety, limitations, and practical application. Do not pass the learner casually. Keep responses under 180 words.`;
  }
  return `You are an AESOP AI Academy product course guide. Teach ${product.name}, product type ${product.type}, at ${chat.level} level. Use guided conversation. Each assignment must include one lab type: debate a product choice, practice a workflow skill, or build a usable artifact. Keep responses under 180 words and end with the next concrete learner action.`;
}

function fallbackCourseGuide(product, chat) {
  if (chat.mode === 'certification') {
    return `Certification prompt for ${product.name}: describe a real task you would perform, the steps you would take, the risks or limits you would watch for, and the evidence that your result worked.`;
  }
  return `Course prompt for ${product.name}: describe what you want to accomplish with this product. Then choose one lab: debate whether this is the right product, practice a specific workflow, or build a small artifact you can inspect.`;
}

function restoreSavedState() {
  const saved = readSavedState();
  if (!saved) return;

  if (Number.isFinite(saved.selectedId)) {
    state.selectedId = saved.selectedId;
  }

  if (typeof saved.query === 'string') {
    state.query = saved.query;
  }

  if (['all', 'B', 'B/I', 'B/I/A'].includes(saved.depth)) {
    state.depth = saved.depth;
  }

  state.activeCategory = defaultCategory;

  if (saved.courseStarts && typeof saved.courseStarts === 'object') {
    state.courseStarts = Object.fromEntries(
      Object.entries(saved.courseStarts)
        .filter(([productId, record]) => {
          const id = Number(productId);
          return Number.isFinite(id) && typeof record?.level === 'string';
        })
        .map(([productId, record]) => [productId, {
          level: record.level,
          savedAt: record.savedAt || new Date().toISOString(),
          status: record.status || 'started'
        }])
    );
  }

  if (saved.courseChats && typeof saved.courseChats === 'object') {
    state.courseChats = Object.fromEntries(
      Object.entries(saved.courseChats)
        .filter(([productId, record]) => {
          const id = Number(productId);
          return Number.isFinite(id) && Array.isArray(record?.messages);
        })
        .map(([productId, record]) => [productId, {
          mode: record.mode === 'certification' ? 'certification' : 'course',
          certificationLabel: record.certificationLabel || '',
          level: record.level || 'Beginner',
          savedAt: record.savedAt || new Date().toISOString(),
          updatedAt: record.updatedAt || record.savedAt || new Date().toISOString(),
          status: record.status || 'started',
          messages: record.messages
            .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
            .slice(-30)
        }])
    );
  }
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch (error) {
    console.warn('Could not restore Products course state', error);
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      selectedId: state.selectedId,
      query: state.query,
      depth: state.depth,
      courseStarts: state.courseStarts,
      courseChats: state.courseChats
    }));
  } catch (error) {
    console.warn('Could not save Products course state', error);
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

async function handleProductRequestSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const productName = String(formData.get('productName') || '').trim();
  const productType = String(formData.get('productType') || '').trim();
  const reason = String(formData.get('reason') || '').trim();
  const requesterEmail = String(formData.get('requesterEmail') || '').trim();

  if (!productName || !reason) {
    showRequestMessage('Add the product name and why it should be taught.', 'error');
    return;
  }

  const selectedProduct = getSelectedProduct();
  const submittedAtIso = new Date().toISOString();
  const request = {
    productName,
    productType: productType || 'Unassigned',
    reason,
    requesterEmail,
    sourcePath: window.location.pathname,
    sourceProductId: selectedProduct?.id || null,
    sourceProductName: selectedProduct?.name || '',
    status: 'requested',
    createdAtIso: submittedAtIso,
    updatedAtIso: submittedAtIso,
    history: [{
      status: 'requested',
      at: submittedAtIso,
      actor: requesterEmail || 'requester',
      note: 'Submitted from The Ladder Products page.'
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
    await notifyProductRequest({
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
    await notifyProductRequest({
      ...offlineRequest,
      requestId: offlineRequest.id,
      storage: 'local_fallback'
    });
    form.reset();
    showRequestMessage('Firebase did not accept the request, so it was saved locally on this browser for admin review.', 'warning');
    console.warn('Product request saved locally', error);
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
    console.warn('Could not read local product requests', error);
    return [];
  }
}

function setRequestSubmitting(isSubmitting) {
  if (!elements.submitProductRequest) return;
  elements.submitProductRequest.disabled = isSubmitting;
  elements.submitProductRequest.textContent = isSubmitting ? 'Sending...' : 'Send request';
}

function showRequestMessage(message, tone = 'success') {
  if (!elements.productRequestMessage) return;
  elements.productRequestMessage.hidden = false;
  elements.productRequestMessage.dataset.tone = tone;
  elements.productRequestMessage.textContent = message;
}

async function notifyProductRequest(request) {
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
    console.warn('Product request email notification failed', error);
  }
}

function renderLoading() {
  elements.productGrid.innerHTML = '<p class="empty-state">Loading product catalog...</p>';
}

function renderError(error) {
  elements.productGrid.innerHTML = `
    <p class="empty-state">The product catalog could not load. ${escapeHtml(error.message)}</p>
  `;
}

function getFilteredProducts() {
  return state.products.filter((product) => {
    const categoryMatch = inRange(product, state.activeCategory);
    const depthMatch = state.depth === 'all' || product.depth === state.depth;
    const queryMatch = !state.query || [product.name, product.type, product.reason, product.depth]
      .join(' ')
      .toLowerCase()
      .includes(state.query);
    return categoryMatch && depthMatch && queryMatch;
  });
}

function getSelectedProduct() {
  return state.products.find((product) => product.id === state.selectedId) || state.products[0];
}

function inRange(product, category) {
  return product.id >= category.start && product.id <= category.end;
}

function getCourseLevels(depth) {
  if (depth === 'B/I/A') return ['Beginner', 'Intermediate', 'Advanced'];
  if (depth === 'B/I') return ['Beginner', 'Intermediate'];
  return ['Beginner'];
}

function getCourseSummary(course, product) {
  if (course === 'Beginner') return `Learn what ${product.name} does, where it fits, and how to complete a safe first assignment.`;
  if (course === 'Intermediate') return `Build repeatable ${product.type.toLowerCase()} workflows, compare settings, and review output quality.`;
  return `Design, document, and defend a production-ready ${product.name} workflow with evidence and risk controls.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
