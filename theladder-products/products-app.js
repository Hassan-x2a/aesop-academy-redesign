import { createPlacementEngine } from '/theladder-shared/placement-engine.js';
import { createCertificationEngine } from '/theladder-shared/certification-engine.js';
import {
  initDataLayer,
  saveLearnerProgress,
  recordCompletion,
  recordCertification
} from '/theladder-shared/data-layer.js';
import {
  buildProductPlacementDescriptor,
  buildProductBlueprint,
  buildProductCertContext,
  buildProductIdentityAssurance,
  resolveProductIdentityLevel,
  PRODUCT_IDENTITY_LEVELS,
  CERT_DEPTHS,
  depthForLabel
} from '/theladder-products/products-ladder.js';
import {
  PRODUCTS_LANGUAGES,
  PRODUCTS_UI_TRANSLATIONS,
  productsLanguageLabel
} from '/theladder-products/products-i18n.js?v=1';

const catalogUrl = '/docs/theladder-products-catalog.md?v=2';
const storageKey = 'aesop-ladder-products-state-v1';
// Task 31 — persisted UI language (shared key shape with the Concepts ladder).
const languageStorageKey = 'aesop-ladder-products-lang-v1';
const requestStorageKey = 'aesop-product-course-requests-v1';
const requestCollection = 'productCourseRequests';
const requestEmailUrl = '/aesop-api/product-request-email.php';
const PROXY_URL = '/aesop-api/proxy.php';
const CONVERSATION_COMPLETE_REGEX = /<!--LADDER_CONVERSATION_COMPLETE:([\s\S]*?)-->/;
let requestDbContext = null;

// Shared certification engine (examiner + independent second-model validator).
const certificationEngine = createCertificationEngine();
// Placement engine is built once the catalog is parsed (needs the products).
let placementEngine = null;

// Expansion tracks (Task 34): a higher-level grouping layered over the per-type
// product categories. The 10 new product types (ids 251-500) and the existing
// foundation types each map to one of three tracks. The foundation categories
// (ids 1-250) are not assigned to an expansion track; they surface only under
// "All tracks". Mapping follows the Products Ladder Expansion Research doc.
const ALL_PRODUCTS_END = 500;

const categoryRanges = [
  { label: 'All products', start: 1, end: ALL_PRODUCTS_END },
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
  // Expansion product types (ids 251-500).
  { label: 'HR + recruiting', start: 251, end: 275, track: 'Workforce' },
  { label: 'Education + tutoring', start: 276, end: 300, track: 'Workforce' },
  { label: 'Ecommerce + retail', start: 301, end: 325, track: 'Operations' },
  { label: 'Finance + accounting', start: 326, end: 350, track: 'Operations' },
  { label: 'AIOps + incidents', start: 351, end: 375, track: 'Operations' },
  { label: 'AI governance', start: 376, end: 400, track: 'Operations' },
  { label: 'Construction + real estate', start: 401, end: 425, track: 'Industry' },
  { label: 'Manufacturing + supply chain', start: 426, end: 450, track: 'Industry' },
  { label: 'Science + clinical AI', start: 451, end: 475, track: 'Industry' },
  { label: 'Personal productivity', start: 476, end: 500, track: 'Workforce' }
];

// Track filter options layered over categoryRanges. "All tracks" disables the
// track constraint; each named track narrows to its mapped categories.
const expansionTracks = [
  { id: 'all', label: 'All tracks' },
  { id: 'Workforce', label: 'Workforce' },
  { id: 'Operations', label: 'Operations' },
  { id: 'Industry', label: 'Industry' }
];

// A category belongs to the active track when its track tag matches. "All
// tracks" matches every category.
function categoryInTrack(category, track) {
  return track === 'all' || category.track === track;
}

// A product belongs to a track when it falls inside the id range of a category
// tagged with that track. "All tracks" matches every product.
function productInTrack(product, track) {
  if (track === 'all') return true;
  return categoryRanges.some((category) =>
    category.track === track && inRange(product, category)
  );
}

// The `label` stays canonical English: it is the data-cert-depth value passed to
// depthForLabel() downstream, so it must NOT be translated. The labelKey/summaryKey
// map to products-i18n.js for display only.
const certificationOptions = [
  {
    label: 'Certification',
    labelKey: 'certification',
    summaryKey: 'certificationSummary',
    summary: 'Proves you can use the product safely for common work, explain its core features, and complete a guided assignment.'
  },
  {
    label: 'Expert certification',
    labelKey: 'expertCertification',
    summaryKey: 'expertCertificationSummary',
    summary: 'Proves you can choose the right workflow, troubleshoot limits, compare alternatives, and teach another learner.'
  },
  {
    label: 'Master certification',
    labelKey: 'masterCertification',
    summaryKey: 'masterCertificationSummary',
    summary: 'Proves you can design a production workflow, evaluate risk, document evidence, and defend your choices.'
  }
];

// Course-level display keys. The level VALUE stays canonical English (used by
// getCourseLevels / course start records / the AI prompts); only the label is
// translated for display.
const COURSE_LEVEL_KEYS = {
  Beginner: 'levelBeginner',
  Intermediate: 'levelIntermediate',
  Advanced: 'levelAdvanced'
};

const state = {
  // Task 31 — persisted UI language (defaults to English, restored on init).
  language: 'en',
  products: [],
  selectedId: 1,
  activeCategory: categoryRanges[0],
  query: '',
  depth: 'all',
  track: 'all',
  courseStarts: {},
  messages: [],
  activeProductChat: null,
  // Placement assessment (Task 25)
  assessmentMessages: [],
  assessmentOpen: false,
  placement: null,
  // Certification exam (Task 27) — separate chat channel from the course chat
  certMessages: [],
  certContext: null,
  activeCert: null,
  certOutcome: null,
  // Task 30 — identity-assurance gate shown before a certification starts.
  // pendingCert holds the (product, depthLabel, level) chosen at the gate until
  // the learner confirms; identityGate holds the resolved assurance record.
  pendingCert: null,
  identityGate: null,
  authUser: null
};

const IDENTITY_GATE_LS = 'aesop-products-identity-gate-v1';

// Lazily import Firebase auth (same gstatic 10.12.0 modules the page already
// uses) only when the certification gate is opened — never on catalog load.
let authContext = null;
async function getAuthContext() {
  if (authContext) return authContext;
  const [{ initializeApp, getApps, getApp }, authModule, configModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
    import('/ai-academy/js/firebase-config.js')
  ]);
  const app = getApps().length ? getApp() : initializeApp(configModule.FIREBASE_CONFIG);
  const auth = authModule.getAuth(app);
  authContext = { auth, ...authModule };
  authModule.onAuthStateChanged(auth, (user) => {
    state.authUser = user ? { uid: user.uid, email: user.email || '' } : null;
    if (state.pendingCert) renderIdentityGate();
  });
  return authContext;
}

const elements = {
  categoryList: document.querySelector('#categoryList'),
  productGrid: document.querySelector('#productGrid'),
  productDetail: document.querySelector('#productDetail'),
  productSearch: document.querySelector('#productSearch'),
  depthFilter: document.querySelector('#depthFilter'),
  trackFilter: document.querySelector('#trackFilter'),
  visibleCount: document.querySelector('#visibleCount'),
  totalProducts: document.querySelector('#totalProducts'),
  advancedCount: document.querySelector('#advancedCount'),
  educationFocusSelect: document.querySelector('#educationFocusSelect'),
  languageSelect: document.querySelector('#languageSelect'),
  themeToggle: document.querySelector('#themeToggle'),
  productRequestForm: document.querySelector('#productRequestForm'),
  productRequestMessage: document.querySelector('#productRequestMessage'),
  submitProductRequest: document.querySelector('#submitProductRequest'),
  productCourseWorkspace: document.querySelector('#productCourseWorkspace'),
  productConversationTitle: document.querySelector('#productConversationTitle'),
  productChatLog: document.querySelector('#productChatLog'),
  productChatForm: document.querySelector('#productChatForm'),
  productChatInput: document.querySelector('#productChatInput'),
  // Placement assessment (Task 25)
  assessmentToggle: document.querySelector('#assessmentToggle'),
  assessmentPanel: document.querySelector('#assessmentPanel'),
  assessmentLog: document.querySelector('#assessmentLog'),
  assessmentForm: document.querySelector('#assessmentForm'),
  assessmentInput: document.querySelector('#assessmentInput'),
  assessmentResult: document.querySelector('#assessmentResult'),
  // Certification exam (Task 27)
  certWorkspace: document.querySelector('#certWorkspace'),
  certTitle: document.querySelector('#certTitle'),
  certLog: document.querySelector('#certLog'),
  certForm: document.querySelector('#certForm'),
  certInput: document.querySelector('#certInput'),
  certOutcomePanel: document.querySelector('#certOutcomePanel'),
  certClose: document.querySelector('#certClose'),
  // Task 30 — identity-assurance gate
  identityGate: document.querySelector('#identityGate'),
  identityGateTitle: document.querySelector('#identityGateTitle'),
  identityGateBody: document.querySelector('#identityGateBody'),
  identityGateCancel: document.querySelector('#identityGateCancel')
};

init();

async function init() {
  restoreLanguage();
  setupTheme();
  setupLanguageSelect();
  updatePageTranslations();
  renderLoading();

  // Task 29: route all durable writes through the shared data layer. Local-first,
  // so this never blocks the catalog UI even if Firebase is unavailable.
  initDataLayer().catch((error) => console.warn('Data layer init failed (local-only mode)', error));

  try {
    const markdown = await fetch(catalogUrl).then((response) => {
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
      return response.text();
    });
    state.products = parseCatalog(markdown);
    // Task 25: build the placement engine from the parsed catalog.
    placementEngine = createPlacementEngine(buildProductPlacementDescriptor(state.products, categoryRanges));
    restoreSavedState();
    if (!state.products.some((product) => product.id === state.selectedId)) {
      state.selectedId = state.products[0]?.id || 1;
    }
    bindEvents();
    render();
    updatePageTranslations();
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

  elements.trackFilter?.addEventListener('change', (event) => {
    state.track = event.target.value;
    // If the active category is not in the new track, fall back to "All products".
    if (!categoryInTrack(state.activeCategory, state.track)) {
      state.activeCategory = categoryRanges[0];
    }
    saveState();
    renderCategories();
    renderProducts();
  });

  elements.productRequestForm?.addEventListener('submit', handleProductRequestSubmit);
  elements.productChatForm?.addEventListener('submit', submitProductChat);

  // Task 25: placement assessment
  elements.assessmentToggle?.addEventListener('click', toggleAssessment);
  elements.assessmentForm?.addEventListener('submit', submitAssessment);

  // Task 27: certification exam
  elements.certForm?.addEventListener('submit', submitCertChat);
  elements.certClose?.addEventListener('click', closeCertExam);

  // Task 30: identity-assurance gate (shown before a certification starts)
  elements.identityGateCancel?.addEventListener('click', closeIdentityGate);

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
  if (elements.trackFilter) elements.trackFilter.value = state.track;
  renderCategories();
  renderProducts();
  renderDetail(getSelectedProduct());
  renderAssessment();
}

function renderCategories() {
  // When a track is active, show only that track's categories (plus the
  // always-present "All products" entry). "All tracks" shows every category.
  const visibleCategories = categoryRanges.filter((category, index) =>
    index === 0 || categoryInTrack(category, state.track)
  );

  elements.categoryList.innerHTML = visibleCategories.map((category) => {
    const count = state.products.filter((product) =>
      inRange(product, category) && productInTrack(product, state.track)
    ).length;
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
    elements.productGrid.innerHTML = `<p class="empty-state">${escapeHtml(t('noProductsMatch'))}</p>`;
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
    <p class="detail-label">${escapeHtml(t('productCourse'))}</p>
    <h2>${escapeHtml(product.name)}</h2>
    <section class="course-launch-panel" aria-label="Start product class">
      <span>${escapeHtml(t('startClass'))}</span>
      <label class="course-level-field" for="courseLevelSelect">
        <span>${escapeHtml(t('courseLevel'))}</span>
        <select id="courseLevelSelect">
          ${courses.map((course) => `<option value="${escapeHtml(course)}">${escapeHtml(t(COURSE_LEVEL_KEYS[course] || '') || course)}</option>`).join('')}
        </select>
      </label>
      <button id="beginSelectedCourseBtn" class="course-launch-button" type="button">
        ${escapeHtml(t('beginCourse'))}
      </button>
    </section>
    <div id="courseStartNotice" class="course-start-notice" hidden></div>
    <div class="cert-stack" aria-label="Certification options">
      <span class="cert-stack-label">${escapeHtml(t('certificationTests'))}</span>
      ${certificationOptions.map((option) => `
        <div class="cert-option">
          <strong>${escapeHtml(t(option.labelKey))}</strong>
          <p>${escapeHtml(t(option.summaryKey))}</p>
          <button type="button" data-cert-depth="${escapeHtml(option.label)}" aria-label="Start ${escapeHtml(option.label.toLowerCase())} for ${escapeHtml(product.name)}">${escapeHtml(t('start'))}</button>
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

  elements.productDetail.querySelectorAll('[data-cert-depth]').forEach((button) => {
    button.addEventListener('click', () => {
      const level = levelSelect?.value || defaultCourse;
      // Task 30: certification depths pass through the identity-assurance gate
      // first. Ordinary product courses (Begin course, above) are NOT gated.
      openIdentityGate(product, button.dataset.certDepth, level);
    });
  });

  const savedCourse = state.courseStarts[product.id];
  if (savedCourse) {
    const savedLevel = courses.includes(savedCourse.level) ? savedCourse.level : defaultCourse;
    if (levelSelect) levelSelect.value = savedLevel;
    launchButton.textContent = t('continueCourse');
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
  activeButton.textContent = t('continueCourse');
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

  if (expansionTracks.some((track) => track.id === saved.track)) {
    state.track = saved.track;
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

  if (saved.placement && typeof saved.placement === 'object') {
    state.placement = saved.placement;
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
      track: state.track,
      courseStarts: state.courseStarts,
      placement: state.placement
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
    showRequestMessage(t('requestNeedsFields'), 'error');
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
    showRequestMessage(t('requestSentSuccess'), 'success');
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
    showRequestMessage(t('requestSavedLocally'), 'warning');
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
  elements.submitProductRequest.textContent = isSubmitting ? t('sending') : t('sendRequest');
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
  elements.productGrid.innerHTML = `<p class="empty-state">${escapeHtml(t('loadingCatalog'))}</p>`;
}

function renderError(error) {
  elements.productGrid.innerHTML = `
    <p class="empty-state">The product catalog could not load. ${escapeHtml(error.message)}</p>
  `;
}

function getFilteredProducts() {
  return state.products.filter((product) => {
    const categoryMatch = inRange(product, state.activeCategory);
    const trackMatch = productInTrack(product, state.track);
    const depthMatch = state.depth === 'all' || product.depth === state.depth;
    const queryMatch = !state.query || [product.name, product.type, product.reason, product.depth]
      .join(' ')
      .toLowerCase()
      .includes(state.query);
    return categoryMatch && trackMatch && depthMatch && queryMatch;
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

// =============================================================================
// Task 31 — Multi-language UI. Mirrors theladder/ladder-app.js: t(key) looks up
// the active language with an English fallback; updatePageTranslations() rewrites
// every [data-i18n] / [data-i18n-placeholder] element; languageLabel() feeds the
// readable language name into the AI system prompts (placement, course, cert).
// =============================================================================

function t(key) {
  const translations = PRODUCTS_UI_TRANSLATIONS[state.language] || PRODUCTS_UI_TRANSLATIONS.en;
  return translations[key] || PRODUCTS_UI_TRANSLATIONS.en[key] || key;
}

function languageLabel() {
  return productsLanguageLabel(state.language);
}

function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

function restoreLanguage() {
  try {
    const saved = localStorage.getItem(languageStorageKey);
    if (saved && PRODUCTS_LANGUAGES.some((language) => language.code === saved)) {
      state.language = saved;
    }
  } catch (error) {
    console.warn('Could not restore Products language', error);
  }
}

function setupLanguageSelect() {
  if (!elements.languageSelect) return;
  elements.languageSelect.innerHTML = PRODUCTS_LANGUAGES.map((language) =>
    `<option value="${language.code}">${escapeHtml(language.label)}</option>`
  ).join('');
  elements.languageSelect.value = state.language;
  elements.languageSelect.addEventListener('change', (event) => {
    const next = event.target.value;
    if (!PRODUCTS_LANGUAGES.some((language) => language.code === next)) return;
    state.language = next;
    try { localStorage.setItem(languageStorageKey, next); } catch (error) {
      console.warn('Could not save Products language', error);
    }
    updatePageTranslations();
    // Re-render the dynamic panels so their freshly built markup picks up the
    // new language too (catalog detail, assessment, certification UI).
    renderCategories();
    renderProducts();
    renderDetail(getSelectedProduct());
    renderAssessment();
    if (state.activeCert) renderCertExam();
    if (state.pendingCert) renderIdentityGate();
  });
}

// Chat and Course Completion System
function startProductChat(product, level) {
  state.activeProductChat = { product, level, messages: [] };
  state.messages = [{
    role: 'user',
    content: `Start my guided conversation for "${product.name}". I'm taking the ${level} course. Help me understand this product through questions, examples, applications, and limitations. When I've demonstrated sufficient understanding of the learning objectives, end with a completion confirmation.`
  }];
  renderProductChat();
  callProductGuide();
}

function renderProductChat() {
  if (!state.activeProductChat) return;
  const { product } = state.activeProductChat;
  elements.productConversationTitle.textContent = `${product.name} - Guided Conversation`;
  elements.productChatLog.innerHTML = state.messages.map(msg =>
    `<div class="message ${msg.role}"><strong>${msg.role === 'assistant' ? 'Guide' : 'You'}</strong>${formatChatMessage(msg.content)}</div>`
  ).join('');
  elements.productChatLog.scrollTop = elements.productChatLog.scrollHeight;
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
        system_prompt: `You are a product training guide for ${state.activeProductChat.product.name}. Help the learner understand this product through guided conversation using questions, examples, applications, and limitations. Engage naturally until the learner demonstrates sufficient understanding. When ready to end, write "COURSE_COMPLETE" on its own line as your final line. Preferred language: ${languageLabel()}. Write your learner-facing responses in this language unless the learner asks otherwise.`,
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
  const text = String(rawText || '');

  // Check for completion marker
  const isCourseComplete = text.includes('COURSE_COMPLETE');

  // Remove completion marker and any HTML comments from visible text
  let visibleText = text
    .replace(/COURSE_COMPLETE\s*$/gm, '')      // Remove COURSE_COMPLETE marker
    .replace(/<!--[\s\S]*?-->/g, '')            // Remove any HTML comments
    .trim();

  if (!isCourseComplete) return { completion: null, visibleText };

  const completion = {
    status: 'completed',
    confidence: 0.95,
    rationale: 'learner demonstrated competency'
  };

  return { completion, visibleText };
}

function handleProductCompletion(completion) {
  if (!state.activeProductChat || !completion || completion.status !== 'completed') return;
  const { product, level } = state.activeProductChat;
  state.courseStarts[product.id] = {
    level,
    status: 'completed',
    completedAt: new Date().toISOString()
  };
  saveState();

  // Task 29: durable completion through the shared data layer (local-first; it
  // also flips productProgress.courseStarts[itemId].status to 'completed').
  recordCompletion({
    pathway: 'product',
    itemId: product.id,
    itemType: product.type,
    itemName: product.name,
    level,
    status: 'completed',
    source: 'ai_verified',
    completedAt: state.courseStarts[product.id].completedAt
  }).catch((error) => console.warn('recordCompletion failed (local state kept)', error));

  // Add confirmation message to chat
  state.messages.push({
    role: 'assistant',
    content: t('courseComplete')
  });
  renderProductChat();
  // Update UI and show completion
  renderDetail(product);
}

// =============================================================================
// Task 25 — Conversational placement assessment.
// Mirrors the Concepts ladder's assessment UX: a conversational assessor that
// ends with the LADDER_PLACEMENT_COMPLETE marker, then applies placement and
// persists it via the shared data layer. Catalog browsing is never blocked.
// =============================================================================

function toggleAssessment() {
  state.assessmentOpen = !state.assessmentOpen;
  if (state.assessmentOpen && state.assessmentMessages.length === 0) {
    state.assessmentMessages = [{ role: 'assistant', content: placementEngine.placementOpener() }];
  }
  renderAssessment();
  if (state.assessmentOpen) {
    elements.assessmentInput?.focus();
  }
}

function learnerTurnCount() {
  return state.assessmentMessages.filter((message) => message.role === 'user').length;
}

async function submitAssessment(event) {
  event.preventDefault();
  if (!placementEngine) return;
  const content = elements.assessmentInput.value.trim();
  if (!content) return;
  state.assessmentMessages.push({ role: 'user', content });
  elements.assessmentInput.value = '';
  renderAssessment();

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.assessmentMessages,
        system_prompt: placementEngine.buildSystemPrompt({ languageLabel: languageLabel() }),
        max_tokens: 800
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || data?.error || 'I had trouble responding. Could you say that another way?';
    const { placement, visibleText } = placementEngine.parsePlacementResponse(rawText);
    state.assessmentMessages.push({ role: 'assistant', content: visibleText });
    renderAssessment();
    if (placementEngine.shouldApplyPlacement(placement, learnerTurnCount())) {
      applyPlacement(placement);
    }
  } catch (error) {
    console.error('Placement assessment error:', error);
    state.assessmentMessages.push({ role: 'assistant', content: 'I could not reach the placement assessor. Please try again, or browse the catalog directly.' });
    renderAssessment();
  }
}

function applyPlacement(placement) {
  state.placement = placement;
  saveState();

  // Resolve granted category labels + assigned product ids into readable names.
  const grantedCategories = placement.grantedTierIds || [];
  const assignedProductIds = (placement.assignedTopicIds || [])
    .map((itemId) => Number(String(itemId).replace('product-', '')))
    .filter((id) => Number.isFinite(id));
  const assignedProducts = assignedProductIds
    .map((id) => state.products.find((product) => product.id === id))
    .filter(Boolean);

  // Task 29 + 25: persist placement (transcript-style record) via the data layer.
  saveLearnerProgress('product', {
    version: 'v1',
    placement: {
      ...placement,
      grantedCategories,
      assignedProductNames: assignedProducts.map((product) => product.name),
      transcriptLine: `Product placement: granted ${grantedCategories.length} categories, assigned ${assignedProducts.length} products. ${placement.reasoning || ''}`.trim()
    },
    assessmentMessages: state.assessmentMessages
  }).catch((error) => console.warn('saveLearnerProgress(placement) failed (local kept)', error));

  renderAssessment();
}

function renderAssessment() {
  if (!elements.assessmentPanel) return;
  elements.assessmentPanel.hidden = !state.assessmentOpen;
  if (elements.assessmentToggle) {
    elements.assessmentToggle.textContent = state.assessmentOpen
      ? t('hidePlacementAssessment')
      : (state.placement ? t('reopenPlacementAssessment') : t('takePlacementAssessment'));
    elements.assessmentToggle.setAttribute('aria-expanded', String(state.assessmentOpen));
  }

  if (elements.assessmentLog) {
    elements.assessmentLog.innerHTML = state.assessmentMessages.map((message) => `
      <div class="course-message ${message.role === 'assistant' ? 'assistant' : 'user'}">
        <span>${message.role === 'assistant' ? escapeHtml(t('assessor')) : escapeHtml(t('you'))}</span>
        <p>${escapeHtml(message.content)}</p>
      </div>
    `).join('');
    elements.assessmentLog.scrollTop = elements.assessmentLog.scrollHeight;
  }

  renderPlacementResult();
}

function renderPlacementResult() {
  if (!elements.assessmentResult) return;
  const placement = state.placement;
  if (!placement) {
    elements.assessmentResult.hidden = true;
    elements.assessmentResult.innerHTML = '';
    return;
  }
  const grantedCategories = placement.grantedTierIds || [];
  const assignedProducts = (placement.assignedTopicIds || [])
    .map((itemId) => Number(String(itemId).replace('product-', '')))
    .map((id) => state.products.find((product) => product.id === id))
    .filter(Boolean)
    .slice(0, 12);

  elements.assessmentResult.hidden = false;
  elements.assessmentResult.innerHTML = `
    <strong>${escapeHtml(t('yourProductPlacement'))}</strong>
    <p class="placement-scores">
      Hands-on use ${placement.capabilityScore} ·
      APIs/automation ${placement.technicalScore} ·
      Responsible use ${placement.governanceScore}
    </p>
    <div class="placement-block">
      <span class="placement-block-label">${escapeHtml(t('categoriesYouCanSkip'))}</span>
      ${grantedCategories.length
        ? `<ul>${grantedCategories.map((label) => `<li>${escapeHtml(label)}</li>`).join('')}</ul>`
        : `<p class="placement-empty">${escapeHtml(t('noCategoriesYet'))}</p>`}
    </div>
    <div class="placement-block">
      <span class="placement-block-label">${escapeHtml(t('productsAssignedToYou'))}${assignedProducts.length > 12 ? ' (top 12)' : ''}</span>
      ${assignedProducts.length
        ? `<ul>${assignedProducts.map((product) => `<li>${escapeHtml(product.name)} <small>${escapeHtml(product.type)}</small></li>`).join('')}</ul>`
        : `<p class="placement-empty">${escapeHtml(t('noAssignmentsYet'))}</p>`}
    </div>
    ${placement.reasoning ? `<p class="placement-reasoning">${escapeHtml(placement.reasoning)}</p>` : ''}
  `;
}

// =============================================================================
// Task 27 — Real certification (examiner + independent validator).
// Wires the three certification buttons to createCertificationEngine: builds a
// blueprint per (product, depth), runs the examiner conversation, then on the
// examiner's final determination validates with a second model and records the
// result. NO credential is stored unless validation.valid — the engine enforces
// this in recordCertificationResult; we wire its hooks correctly.
// =============================================================================

// ---------------------------------------------------------------------------
// Task 30 — Identity-assurance gate (only before CERTIFICATION, not courses).
//
// The learner picks an active assurance level (self_attested / account_bound /
// identity_attested) and confirms the 18+ adult attestation before the exam
// starts. The resolved record is stored on state.identityGate and then onto the
// certification context (and from there into the credential record + evidence
// packet). The gate never blocks: with no account it resolves to self_attested
// (or identity_attested when the learner signs the identity statement).
// ---------------------------------------------------------------------------

function readSavedGate() {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_GATE_LS) || 'null') || {};
  } catch { return {}; }
}

function openIdentityGate(product, depthLabel, level) {
  const depth = depthForLabel(depthLabel);
  const saved = readSavedGate();
  state.pendingCert = { product, depth, depthLabel, level };
  state.identityGate = {
    levelId: saved.levelId || 'self_attested',
    adultAttested: false,
    identitySigned: false
  };
  // Kick off auth detection (populates state.authUser, re-renders the gate).
  getAuthContext().catch((error) => console.warn('Firebase auth unavailable (gate stays usable)', error));
  renderIdentityGate();
  elements.identityGate?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function closeIdentityGate() {
  state.pendingCert = null;
  if (elements.identityGate) elements.identityGate.hidden = true;
}

function renderIdentityGate() {
  if (!elements.identityGate || !state.pendingCert || !state.identityGateBody) return;
  const { product, depth, level } = state.pendingCert;
  const gate = state.identityGate;
  const account = state.authUser;
  const resolved = resolveProductIdentityLevel({ ...gate, account });

  if (elements.identityGateTitle) {
    elements.identityGateTitle.textContent = `${t('verifyBeforeCertification')} — ${depth.label}`;
  }

  const accountLine = account
    ? `Signed in as <strong>${escapeHtml(account.email || account.uid)}</strong>. ${escapeHtml(t('accountBoundAvailable'))}`
    : escapeHtml(t('noAccountSignedIn'));

  const levelOptions = PRODUCT_IDENTITY_LEVELS.map((option) => {
    const disabled = option.id === 'account_bound' && !account;
    return `
      <label class="identity-level${gate.levelId === option.id ? ' selected' : ''}${disabled ? ' disabled' : ''}">
        <input type="radio" name="identityLevel" value="${option.id}" ${gate.levelId === option.id ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <span class="identity-level-label">${escapeHtml(option.label)}</span>
        <span class="identity-level-desc">${escapeHtml(option.description)}</span>
        ${disabled ? `<span class="identity-level-note">${escapeHtml(t('signInToUseLevel'))}</span>` : ''}
      </label>
    `;
  }).join('');

  const showSign = resolveProductIdentityLevel({ ...gate, account }).requiresSignature
    || gate.levelId === 'identity_attested';

  elements.identityGateBody.innerHTML = `
    <p class="identity-gate-intro">Certification credentials record <em>who</em> took the test, not just the score. Pick how this ${escapeHtml(depth.label.toLowerCase())} attempt for <strong>${escapeHtml(product.name)}</strong> is identified. You can always continue — we just record the honest level.</p>
    <p class="identity-gate-account">${accountLine}</p>
    <div class="identity-levels" role="radiogroup" aria-label="Identity assurance level">${levelOptions}</div>
    <label class="identity-check identity-sign" ${showSign ? '' : 'hidden'}>
      <input type="checkbox" id="identitySignCheck" ${gate.identitySigned ? 'checked' : ''}>
      <span>${escapeHtml(t('identitySignAffirm'))}</span>
    </label>
    <label class="identity-check identity-adult">
      <input type="checkbox" id="identityAdultCheck" ${gate.adultAttested ? 'checked' : ''}>
      <span>${escapeHtml(t('identityAdultAffirm'))}</span>
    </label>
    <p class="identity-resolved">${escapeHtml(t('identityRecordedAs'))} <strong>${escapeHtml((PRODUCT_IDENTITY_LEVELS.find((l) => l.id === resolved.level) || {}).label || resolved.level)}</strong>.</p>
    <div class="identity-gate-actions">
      <button type="button" id="identityGateStart">${escapeHtml(t('start'))}</button>
    </div>
    <p class="identity-gate-error" id="identityGateError" hidden></p>
  `;

  elements.identityGate.hidden = false;

  elements.identityGateBody.querySelectorAll('input[name="identityLevel"]').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      state.identityGate.levelId = event.target.value;
      renderIdentityGate();
    });
  });
  const signCheck = elements.identityGateBody.querySelector('#identitySignCheck');
  signCheck?.addEventListener('change', (event) => {
    state.identityGate.identitySigned = event.target.checked;
    renderIdentityGate();
  });
  const adultCheck = elements.identityGateBody.querySelector('#identityAdultCheck');
  adultCheck?.addEventListener('change', (event) => {
    state.identityGate.adultAttested = event.target.checked;
  });
  const startButton = elements.identityGateBody.querySelector('#identityGateStart');
  startButton?.addEventListener('click', confirmIdentityGate);
}

function confirmIdentityGate() {
  if (!state.pendingCert) return;
  const errorEl = elements.identityGateBody?.querySelector('#identityGateError');
  const gate = { ...state.identityGate, account: state.authUser };
  const resolved = resolveProductIdentityLevel(gate);

  // 18+ adult attestation is required for the adult certification path (mirrors
  // ladder-auth.js). identity_attested additionally requires the signature.
  if (!gate.adultAttested) {
    if (errorEl) { errorEl.textContent = t('errorConfirmAdult'); errorEl.hidden = false; }
    return;
  }
  if (resolved.requiresSignature && !resolved.identitySigned) {
    if (errorEl) { errorEl.textContent = t('errorSignIdentity'); errorEl.hidden = false; }
    return;
  }

  // Remember the chosen level for next time (not the attestations).
  try { localStorage.setItem(IDENTITY_GATE_LS, JSON.stringify({ levelId: resolved.level })); } catch {}

  const { product, depthLabel, level } = state.pendingCert;
  closeIdentityGate();
  startCertificationExam(product, depthLabel, level, gate);
}

function startCertificationExam(product, depthLabel, level, identityGate = {}) {
  const depth = depthForLabel(depthLabel);
  const blueprint = buildProductBlueprint({ product, level, depth });
  // Task 31: thread the selected UI language into the examiner system prompt
  // (buildExaminerSystemPrompt reads blueprint.languageLabel).
  blueprint.languageLabel = languageLabel();
  state.activeCert = { product, depth, level, blueprint };
  state.certContext = buildProductCertContext({ product, depth });
  // Task 30: stamp the resolved identity-assurance record onto the context now,
  // at attempt start. It rides into the credential record (via the
  // buildIdentityAssurance hook) and the evidence packet (set in onCredential).
  state.identityGate = identityGate;
  state.certContext.identityAssurance = buildProductIdentityAssurance(
    new Date().toISOString(),
    identityGate
  );
  state.certOutcome = null;
  state.certMessages = [{
    role: 'user',
    content: `I want to attempt the ${depth.label} for "${product.name}" (${product.type}). I studied at the ${level} level. Begin the certification test now: state the rubric, then assess my evidence.`
  }];
  renderCertExam();
  callCertExaminer();
}

async function submitCertChat(event) {
  event.preventDefault();
  if (!state.activeCert) return;
  const content = elements.certInput.value.trim();
  if (!content) return;
  state.certMessages.push({ role: 'user', content });
  elements.certInput.value = '';
  renderCertExam();
  await callCertExaminer();
}

async function callCertExaminer() {
  if (!state.activeCert) return;
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.certMessages,
        system_prompt: certificationEngine.buildExaminerSystemPrompt(state.activeCert.blueprint),
        max_tokens: 900
      })
    });
    const data = await response.json();
    const rawText = data?.content?.[0]?.text || data?.error || 'The examiner had trouble responding. Please continue.';
    const { certificationResult, rubricDimensions, visibleText } = certificationEngine.parseExaminerResponse(rawText);
    state.certMessages.push({ role: 'assistant', content: visibleText });
    renderCertExam();
    if (certificationResult) {
      await finalizeCertification(certificationResult, rubricDimensions);
    }
  } catch (error) {
    console.error('Certification examiner error:', error);
    state.certMessages.push({ role: 'assistant', content: 'I could not reach the examiner. Please try again.' });
    renderCertExam();
  }
}

async function finalizeCertification(certificationResult, rubricDimensions) {
  const context = state.certContext;
  if (!context) return;

  // The engine runs the independent second-model validator and enforces the
  // no-credential-without-validation invariant. We persist via data-layer hooks.
  const { outcome, validation, record } = await certificationEngine.recordCertificationResult({
    context,
    result: certificationResult,
    conversationMessages: state.certMessages,
    hooks: {
      // onCredential fires ONLY when outcome === 'awarded' (validation.valid &&
      // certified) — so recordCertification only ever runs for a validated pass.
      onCredential: (credentialRecord) => {
        const evidencePacket = certificationEngine.buildEvidencePacket({
          context,
          result: certificationResult,
          rubricDimensions: rubricDimensions || [],
          validation,
          extra: {
            modelName: certificationResult.model || '',
            learnerResponses: state.certMessages
              .filter((message) => message.role === 'user')
              .map((message) => message.content)
          }
        });
        evidencePacket.pathway = 'product';
        // Task 30: carry the resolved identity-assurance level onto the evidence
        // packet so the data-layer certification row records it (the credential
        // record already carries it via the buildIdentityAssurance hook below).
        evidencePacket.identityAssurance = context.identityAssurance
          || credentialRecord.identityAssurance
          || null;
        recordCertification(evidencePacket, validation)
          .catch((error) => console.warn('recordCertification failed (local kept)', error));
      },
      // Re-stamp at award time using the gate selection captured at attempt
      // start, so attestedAt/earnedAt reflect the credential timestamp. Falls
      // back to the context's pre-stamped record if the gate is unavailable.
      buildIdentityAssurance: (earnedAt) =>
        (state.identityGate
          ? buildProductIdentityAssurance(earnedAt, { ...state.identityGate, account: state.authUser })
          : (context.identityAssurance || buildProductIdentityAssurance(earnedAt)))
    }
  });

  state.certOutcome = {
    outcome,
    validation,
    record,
    result: certificationResult,
    rubricDimensions: rubricDimensions || []
  };
  renderCertExam();
}

function startCertChatWorkspace() {
  if (elements.certWorkspace) elements.certWorkspace.hidden = false;
}

function closeCertExam() {
  state.activeCert = null;
  state.certContext = null;
  state.certMessages = [];
  state.certOutcome = null;
  state.identityGate = null;
  if (elements.certWorkspace) elements.certWorkspace.hidden = true;
}

function renderCertExam() {
  if (!elements.certWorkspace || !state.activeCert) return;
  startCertChatWorkspace();
  const { product, depth } = state.activeCert;
  if (elements.certTitle) {
    elements.certTitle.textContent = `${product.name} — ${depth.label}`;
  }
  if (elements.certLog) {
    elements.certLog.innerHTML = state.certMessages.map((message) => `
      <div class="course-message ${message.role === 'assistant' ? 'assistant' : 'user'}">
        <span>${message.role === 'assistant' ? escapeHtml(t('examiner')) : escapeHtml(t('you'))}</span>
        <p>${escapeHtml(message.content)}</p>
      </div>
    `).join('');
    elements.certLog.scrollTop = elements.certLog.scrollHeight;
  }
  renderCertOutcome();
}

function renderCertOutcome() {
  if (!elements.certOutcomePanel) return;
  const data = state.certOutcome;
  if (!data) {
    elements.certOutcomePanel.hidden = true;
    elements.certOutcomePanel.innerHTML = '';
    return;
  }
  const { outcome, validation, result, rubricDimensions } = data;
  const passed = outcome === 'awarded';
  const headline = passed
    ? t('certifiedRecorded')
    : outcome === 'validation_failed'
      ? t('notCertifiedValidation')
      : t('notCertifiedYet');

  const rubricRows = (rubricDimensions || []).map((dimension) => `
    <li class="rubric-row rubric-${dimension.status}">
      <span class="rubric-dim">${escapeHtml(dimension.dimension)}</span>
      <span class="rubric-status">${escapeHtml((dimension.status || 'unknown').toUpperCase())}</span>
      <small>${escapeHtml(dimension.reason || '')}</small>
    </li>
  `).join('');

  elements.certOutcomePanel.hidden = false;
  elements.certOutcomePanel.dataset.outcome = passed ? 'pass' : 'non-pass';
  elements.certOutcomePanel.innerHTML = `
    <strong class="cert-outcome-headline">${escapeHtml(headline)}</strong>
    ${result?.rationale ? `<p class="cert-rationale">${escapeHtml(result.rationale)}</p>` : ''}
    ${rubricRows ? `<ul class="rubric-list" aria-label="Rubric evaluation">${rubricRows}</ul>` : ''}
    ${validation ? `<p class="cert-validation"><strong>${escapeHtml(t('independentValidator'))}</strong> ${escapeHtml(validation.rationale || '')}${validation.reviewerModel ? ` <small>(${escapeHtml(validation.reviewerModel)})</small>` : ''}</p>` : ''}
    <p class="cert-challenge">${escapeHtml(t('certChallenge'))}</p>
  `;
}
