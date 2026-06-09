const catalogUrl = '/docs/theladder-products-catalog.md?v=1';
const storageKey = 'aesop-ladder-products-state-v1';
const requestStorageKey = 'aesop-product-course-requests-v1';
const requestCollection = 'productCourseRequests';
const requestEmailUrl = '/aesop-api/product-request-email.php';
const PROXY_URL = '/aesop-api/proxy.php';
const CONVERSATION_COMPLETE_REGEX = /<!--LADDER_CONVERSATION_COMPLETE:([\s\S]*?)-->/;
let requestDbContext = null;

const categoryRanges = [
  { label: 'All products', start: 1, end: 250 },
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
  { label: 'Regulated AI', start: 231, end: 250 }
];

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
  activeCategory: categoryRanges[0],
  query: '',
  depth: 'all',
  courseStarts: {},
  messages: [],
  activeProductChat: null
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
  submitProductRequest: document.querySelector('#submitProductRequest'),
  productCourseWorkspace: document.querySelector('#productCourseWorkspace'),
  productConversationTitle: document.querySelector('#productConversationTitle'),
  productChatLog: document.querySelector('#productChatLog'),
  productChatForm: document.querySelector('#productChatForm'),
  productChatInput: document.querySelector('#productChatInput')
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
  elements.productChatForm?.addEventListener('submit', submitProductChat);

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
      state.activeCategory = categoryRanges.find((category) => category.start === start && category.end === end) || categoryRanges[0];
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
    <div class="cert-stack" aria-label="Certification options">
      <span class="cert-stack-label">Certification tests</span>
      ${certificationOptions.map((option) => `
        <div class="cert-option">
          <strong>${escapeHtml(option.label)}</strong>
          <p>${escapeHtml(option.summary)}</p>
          <button type="button" aria-label="Start ${escapeHtml(option.label.toLowerCase())} for ${escapeHtml(product.name)}">Start</button>
        </div>
      `).join('')}
    </div>
  `;

  const levelSelect = elements.productDetail.querySelector('#courseLevelSelect');
  const launchButton = elements.productDetail.querySelector('#beginSelectedCourseBtn');
  launchButton?.addEventListener('click', () => {
    const level = levelSelect?.value || defaultCourse;
    showCourseStart(product, level, launchButton);
    startProductChat(product, level);
  });

  const savedCourse = state.courseStarts[product.id];
  if (savedCourse) {
    const savedLevel = courses.includes(savedCourse.level) ? savedCourse.level : defaultCourse;
    if (levelSelect) levelSelect.value = savedLevel;
    launchButton.textContent = 'Continue course';
    showCourseStart(product, savedLevel, launchButton, {
      persist: false,
      scroll: false,
      savedAt: savedCourse.savedAt
    });
  }
}

function showCourseStart(product, level, activeButton, options = {}) {
  const { persist = true, scroll = true, savedAt = new Date().toISOString() } = options;
  const notice = elements.productDetail.querySelector('#courseStartNotice');
  if (!notice) return;
  if (persist) {
    state.courseStarts[product.id] = {
      level,
      savedAt,
      status: 'started'
    };
    saveState();
  }
  notice.hidden = false;
  const savedDate = formatSavedDate(savedAt);
  notice.innerHTML = `
    <strong>${escapeHtml(level)} class ${persist ? 'started' : 'saved'}</strong>
    <span>${escapeHtml(product.name)} is ready for a guided class conversation, a practice task, and completion evidence.</span>
    <small>Saved ${escapeHtml(savedDate)}</small>
  `;
  // Show the chat workspace
  elements.productCourseWorkspace.hidden = false;
  elements.productDetail.querySelectorAll('.begin-course-button, .course-launch-button').forEach((courseButton) => {
    courseButton.removeAttribute('aria-current');
  });
  activeButton?.setAttribute('aria-current', 'true');
  activeButton.textContent = 'Continue course';
  if (scroll) notice.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

  const savedCategory = categoryRanges.find((category) => (
    category.start === saved.activeCategory?.start &&
    category.end === saved.activeCategory?.end
  ));
  if (savedCategory) {
    state.activeCategory = savedCategory;
  }

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
      activeCategory: {
        start: state.activeCategory.start,
        end: state.activeCategory.end
      },
      query: state.query,
      depth: state.depth,
      courseStarts: state.courseStarts
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

// Chat and Course Completion System
function startProductChat(product, level) {
  state.activeProductChat = { product, level, messages: [] };
  state.messages = [{
    role: 'user',
    content: `Start my guided conversation for "${product.name}". I'm taking the ${level} course. Help me understand this product through questions, examples, applications, and limitations. When I've demonstrated understanding and we've completed the learning objectives, let me know by including <!--LADDER_CONVERSATION_COMPLETE:{"status":"completed","confidence":0.95,"rationale":"..."}-->`
  }];
  renderProductChat();
  callProductGuide();
}

function renderProductChat() {
  if (!state.activeProductChat) return;
  const { product } = state.activeProductChat;
  elements.productConversationTitle.textContent = `${product.name} - Guided Conversation`;
  elements.productChatLog.innerHTML = state.messages.map(msg =>
    `<div class="message ${msg.role}"><strong>${msg.role === 'assistant' ? 'Guide' : 'You'}</strong><p>${escapeHtml(msg.content)}</p></div>`
  ).join('');
  elements.productChatLog.scrollTop = elements.productChatLog.scrollHeight;
}

async function submitProductChat(event) {
  event.preventDefault();
  const content = elements.productChatInput.value.trim();
  if (!content) return;
  state.messages.push({ role: 'user', content });
  elements.productChatInput.value = '';
  renderProductChat();
  await callProductGuide();
}

async function callProductGuide() {
  if (!state.activeProductChat) return;
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        system_prompt: `You are a product training guide for ${state.activeProductChat.product.name}. Help the learner understand the product through guided conversation. When the learner demonstrates sufficient understanding of the ${state.activeProductChat.level} level learning objectives, end the conversation with a completion signal.`,
        max_tokens: 700
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || 'I encountered an issue. Please try again.';
    const parsed = parseProductCompletionResponse(rawText);
    state.messages.push({ role: 'assistant', content: parsed.visibleText });
    renderProductChat();
    if (parsed.completion) {
      handleProductCompletion(parsed.completion);
    }
  } catch (error) {
    console.error('Chat error:', error);
    state.messages.push({ role: 'assistant', content: 'I encountered an issue connecting to the guide. Please try again.' });
    renderProductChat();
  }
}

function parseProductCompletionResponse(rawText) {
  const visibleText = String(rawText || '').replace(CONVERSATION_COMPLETE_REGEX, '').trim();
  const match = String(rawText || '').match(CONVERSATION_COMPLETE_REGEX);
  if (!match) return { completion: null, visibleText };
  try {
    return { completion: JSON.parse(match[1]), visibleText };
  } catch (error) {
    console.warn('Could not parse completion:', error);
    return { completion: null, visibleText };
  }
}

function handleProductCompletion(completion) {
  if (!state.activeProductChat || !completion || completion.status !== 'completed') return;
  const { product, level } = state.activeProductChat;
  const completionKey = `product_${product.id}_${level}_completed`;
  state.courseStarts[product.id] = {
    level,
    status: 'completed',
    completedAt: new Date().toISOString()
  };
  saveState();
  // Add confirmation message to chat
  state.messages.push({
    role: 'assistant',
    content: '✓ Course complete! You can now move to the next product or return to the catalog.'
  });
  renderProductChat();
  // Update UI and show completion
  renderDetail(product);
}
