const catalogUrl = '/docs/theladder-products-catalog.md?v=1';

const categoryRanges = [
  { label: 'All products', start: 1, end: 250 },
  { label: 'AI assistants and answer engines', start: 1, end: 20 },
  { label: 'Workplace productivity and writing', start: 21, end: 35 },
  { label: 'Coding, app building, and developer tools', start: 36, end: 61 },
  { label: 'Search, research, knowledge, and RAG', start: 62, end: 82 },
  { label: 'Databases, vector stores, and RAG infrastructure', start: 83, end: 107 },
  { label: 'Data analysis, BI, analytics, and ML', start: 108, end: 126 },
  { label: 'Image, design, and presentations', start: 127, end: 146 },
  { label: 'Video, audio, voice, and meetings', start: 147, end: 166 },
  { label: 'GTM, CRM, marketing, and support', start: 167, end: 191 },
  { label: 'Automation, agents, and workflow builders', start: 192, end: 210 },
  { label: 'Model APIs, cloud AI, and inference', start: 211, end: 230 },
  { label: 'Legal, health, finance, and security', start: 231, end: 250 }
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
  depth: 'all'
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
  themeToggle: document.querySelector('#themeToggle')
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
    state.selectedId = state.products[0]?.id || 1;
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
    renderProducts();
  });

  elements.depthFilter.addEventListener('change', (event) => {
    state.depth = event.target.value;
    renderProducts();
  });
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
    <p>${escapeHtml(product.reason)}</p>
    <div id="courseStartNotice" class="course-start-notice" hidden></div>
    <div class="course-stack" aria-label="Course levels">
      ${courses.map((course) => `
        <div class="course-item">
          <strong>${escapeHtml(course)} course</strong>
          <p>${escapeHtml(getCourseSummary(course, product))}</p>
          <button class="begin-course-button" type="button" data-course-level="${escapeHtml(course)}" data-product-id="${product.id}">
            Begin ${escapeHtml(course)} course
          </button>
        </div>
      `).join('')}
    </div>
    <div class="cert-stack" aria-label="Certification options">
      <span class="cert-stack-label">Certification tests</span>
      ${certificationOptions.map((option) => `
        <div class="cert-option">
          <strong>${escapeHtml(option.label)}</strong>
          <p>${escapeHtml(option.summary)}</p>
          <button type="button">Start ${escapeHtml(option.label.toLowerCase())}</button>
        </div>
      `).join('')}
    </div>
  `;

  const levelSelect = elements.productDetail.querySelector('#courseLevelSelect');
  const launchButton = elements.productDetail.querySelector('#beginSelectedCourseBtn');
  launchButton?.addEventListener('click', () => {
    showCourseStart(product, levelSelect?.value || defaultCourse, launchButton);
  });

  elements.productDetail.querySelectorAll('.begin-course-button').forEach((button) => {
    button.addEventListener('click', () => {
      const level = button.dataset.courseLevel || 'Beginner';
      if (levelSelect) levelSelect.value = level;
      showCourseStart(product, level, button);
    });
  });
}

function showCourseStart(product, level, activeButton) {
  const notice = elements.productDetail.querySelector('#courseStartNotice');
  if (!notice) return;
  notice.hidden = false;
  notice.innerHTML = `
    <strong>${escapeHtml(level)} class started</strong>
    <span>${escapeHtml(product.name)} is ready for a guided class conversation, a practice task, and completion evidence.</span>
    <div class="course-conversation-workspace">
      <strong>Guided class conversation</strong>
      <p>Start with how ${escapeHtml(product.name)} is used, then complete one lab: debate a product choice, practice a workflow skill, or build a usable artifact.</p>
    </div>
  `;
  elements.productDetail.querySelectorAll('.begin-course-button, .course-launch-button').forEach((courseButton) => {
    courseButton.removeAttribute('aria-current');
  });
  activeButton?.setAttribute('aria-current', 'true');
  notice.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
