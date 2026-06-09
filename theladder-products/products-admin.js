import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { FIREBASE_CONFIG } from '/ai-academy/js/firebase-config.js';

const requestCollection = 'productCourseRequests';
const offlineRequestKey = 'aesop-product-course-requests-v1';
const adminEmails = ['scott@aesopacademy.org'];

const statusMeta = {
  requested: { label: 'Requested', next: 'approved', action: 'Approve request' },
  approved: { label: 'Approved', next: 'researching', action: 'Start research' },
  researching: { label: 'Researching', next: 'built', action: 'Mark draft built' },
  built: { label: 'Built', next: 'reviewed', action: 'Mark reviewed' },
  reviewed: { label: 'Reviewed', next: 'published', action: 'Publish course' },
  published: { label: 'Published', next: '', action: '' },
  rejected: { label: 'Rejected', next: '', action: '' }
};

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  requests: [],
  currentFilter: 'active',
  user: null,
  unsubscribe: null
};

const elements = {
  themeToggle: document.querySelector('#themeToggle'),
  authPanel: document.querySelector('#authPanel'),
  adminQueue: document.querySelector('#adminQueue'),
  adminEmail: document.querySelector('#adminEmail'),
  adminPassword: document.querySelector('#adminPassword'),
  adminSignIn: document.querySelector('#adminSignIn'),
  adminSignOut: document.querySelector('#adminSignOut'),
  adminAuthError: document.querySelector('#adminAuthError'),
  adminUserLabel: document.querySelector('#adminUserLabel'),
  requestList: document.querySelector('#requestList'),
  pendingRequestCount: document.querySelector('#pendingRequestCount')
};

setupTheme();
bindEvents();

onAuthStateChanged(auth, (user) => {
  if (user && adminEmails.includes(user.email)) {
    state.user = user;
    elements.authPanel.hidden = true;
    elements.adminQueue.hidden = false;
    elements.adminUserLabel.textContent = `Signed in as ${user.email}`;
    startListening();
    return;
  }

  if (user && !adminEmails.includes(user.email)) {
    signOut(auth);
    showAuthError('This account does not have admin access.');
  }

  state.user = null;
  elements.authPanel.hidden = false;
  elements.adminQueue.hidden = true;
  if (state.unsubscribe) {
    state.unsubscribe();
    state.unsubscribe = null;
  }
});

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
  elements.adminSignIn.addEventListener('click', signInAdmin);
  elements.adminPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') signInAdmin();
  });
  elements.adminEmail.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') signInAdmin();
  });
  elements.adminSignOut.addEventListener('click', () => signOut(auth));
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.currentFilter = button.dataset.filter;
      renderRequests();
    });
  });
}

async function signInAdmin() {
  showAuthError('');
  const email = elements.adminEmail.value.trim();
  const password = elements.adminPassword.value;
  if (!email || !password) {
    showAuthError('Email and password are required.');
    return;
  }
  elements.adminSignIn.disabled = true;
  elements.adminSignIn.textContent = 'Signing in...';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showAuthError(error.code === 'auth/invalid-credential' ? 'Invalid email or password.' : error.message);
  } finally {
    elements.adminSignIn.disabled = false;
    elements.adminSignIn.textContent = 'Sign in';
  }
}

function startListening() {
  if (state.unsubscribe) return;
  const requestQuery = query(collection(db, requestCollection), orderBy('createdAt', 'desc'));
  state.unsubscribe = onSnapshot(requestQuery, (snapshot) => {
    state.requests = snapshot.docs.map((entry) => ({ id: entry.id, source: 'firebase', ...entry.data() }));
    renderRequests();
  }, (error) => {
    elements.requestList.innerHTML = `<p class="empty-state">Could not load Firestore requests. ${escapeHtml(error.message)}</p>`;
  });
}

function renderRequests() {
  const offlineRequests = readOfflineRequests();
  const combined = [...offlineRequests, ...state.requests];
  const pendingCount = combined.filter((request) => request.status === 'requested').length;
  elements.pendingRequestCount.textContent = pendingCount.toString();

  const filtered = combined.filter((request) => {
    if (state.currentFilter === 'all') return true;
    if (state.currentFilter === 'active') return !['published', 'rejected'].includes(request.status);
    return request.status === state.currentFilter;
  });

  if (!filtered.length) {
    elements.requestList.innerHTML = '<p class="empty-state">No product requests match this view.</p>';
    return;
  }

  elements.requestList.innerHTML = filtered.map(renderRequestCard).join('');
  elements.requestList.querySelectorAll('[data-next-status]').forEach((button) => {
    button.addEventListener('click', () => advanceRequest(button.dataset.requestId, button.dataset.nextStatus, button));
  });
  elements.requestList.querySelectorAll('[data-reject-request]').forEach((button) => {
    button.addEventListener('click', () => advanceRequest(button.dataset.requestId, 'rejected', button));
  });
}

function renderRequestCard(request) {
  const meta = statusMeta[request.status] || statusMeta.requested;
  const localOnly = request.source === 'local';
  const submitted = formatDate(request.createdAtIso || request.createdAt);
  const nextAction = meta.next && !localOnly
    ? `<button type="button" data-request-id="${escapeHtml(request.id)}" data-next-status="${escapeHtml(meta.next)}">${escapeHtml(meta.action)}</button>`
    : '';
  const rejectAction = !['published', 'rejected'].includes(request.status) && !localOnly
    ? `<button class="danger-admin-button" type="button" data-reject-request="${escapeHtml(request.id)}" data-request-id="${escapeHtml(request.id)}">Reject</button>`
    : '';
  const localNote = localOnly
    ? '<p class="local-request-note">Local fallback only. Firestore did not receive this request from the learner browser.</p>'
    : '';
  const history = Array.isArray(request.history) ? request.history : [];

  return `
    <article class="admin-request-card status-${escapeHtml(request.status || 'requested')}">
      <div class="request-card-main">
        <div class="request-card-heading">
          <span class="status-pill">${escapeHtml(meta.label)}</span>
          <span>${escapeHtml(submitted)}</span>
        </div>
        <h3>${escapeHtml(request.productName)}</h3>
        <dl>
          <div>
            <dt>Type</dt>
            <dd>${escapeHtml(request.productType || 'Unassigned')}</dd>
          </div>
          <div>
            <dt>Requested by</dt>
            <dd>${escapeHtml(request.requesterEmail || 'Not provided')}</dd>
          </div>
          <div>
            <dt>Reason</dt>
            <dd>${escapeHtml(request.reason)}</dd>
          </div>
          ${request.sourceProductName ? `<div><dt>Submitted from</dt><dd>${escapeHtml(request.sourceProductName)}</dd></div>` : ''}
        </dl>
        ${localNote}
      </div>
      <div class="request-card-side">
        <label>
          <span>Admin note</span>
          <textarea id="note-${escapeHtml(request.id)}" rows="3" ${localOnly ? 'disabled' : ''}></textarea>
        </label>
        <div class="admin-card-actions">
          ${nextAction}
          ${rejectAction}
        </div>
        <div class="request-history">
          <strong>History</strong>
          ${history.length ? history.slice(-4).map((item) => `
            <p>${escapeHtml(statusMeta[item.status]?.label || item.status)}: ${escapeHtml(formatDate(item.at))}</p>
          `).join('') : '<p>No history yet.</p>'}
        </div>
      </div>
    </article>
  `;
}

async function advanceRequest(id, nextStatus, button) {
  const request = state.requests.find((item) => item.id === id);
  if (!request) return;
  const note = document.querySelector(`#note-${CSS.escape(id)}`)?.value.trim() || '';
  const at = new Date().toISOString();
  button.disabled = true;
  button.textContent = 'Saving...';
  try {
    await updateDoc(doc(db, requestCollection, id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
      updatedAtIso: at,
      [`${nextStatus}At`]: serverTimestamp(),
      history: arrayUnion({
        status: nextStatus,
        at,
        actor: state.user?.email || 'admin',
        note
      })
    });
  } catch (error) {
    alert(`Could not update request: ${error.message}`);
    button.disabled = false;
    button.textContent = statusMeta[nextStatus]?.label || 'Retry';
  }
}

function readOfflineRequests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(offlineRequestKey) || '[]');
    return Array.isArray(parsed)
      ? parsed.map((request) => ({ ...request, source: 'local' }))
      : [];
  } catch (error) {
    console.warn('Could not read local product requests', error);
    return [];
  }
}

function showAuthError(message) {
  elements.adminAuthError.hidden = !message;
  elements.adminAuthError.textContent = message;
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
