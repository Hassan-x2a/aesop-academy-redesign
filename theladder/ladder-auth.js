// Authentication module for The Ladder
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { FIREBASE_CONFIG } from '/ai-academy/js/firebase-config.js';

const IDENTITY_ASSURANCE_LEVELS = [
  {
    id: 'self_attested',
    label: 'Self-attested',
    requiresAttestation: false,
    proctoringRequired: false,
    active: true,
    description: 'Learner claims the work. No identity check.'
  },
  {
    id: 'account_bound',
    label: 'Account bound',
    requiresAttestation: false,
    proctoringRequired: false,
    active: true,
    description: 'Attempt is tied to the AESOP learner ID, browser session, and saved transcript record.'
  },
  {
    id: 'identity_attested',
    label: 'Identity attested',
    requiresAttestation: true,
    proctoringRequired: false,
    active: true,
    description: 'Learner signs an identity statement before the certification attempt.'
  },
  {
    id: 'proctored_verified',
    label: 'Proctored verified',
    requiresAttestation: true,
    proctoringRequired: true,
    active: false,
    description: 'Adult formal credential path requiring ID/liveness plus automated, live, recorded, or institutional proctoring.'
  }
];

const PROCTORING_MODES = [
  { id: 'automated', label: 'Automated proctoring', description: 'Camera/liveness and session signals flag risk for review.' },
  { id: 'live', label: 'Live proctor', description: 'Real-time human monitoring during the attempt.' },
  { id: 'recorded', label: 'Recorded proctoring', description: 'Session recorded and reviewed by a human proctor.' },
  { id: 'institutional', label: 'Institutional', description: 'Proctored at an accredited testing center.' }
];

const auth = getAuth(initializeApp(FIREBASE_CONFIG));
const LS_IDENTITY_ASSURANCE = 'aesop-ladder-identity-assurance';
const LS_PROCTORING_MODE = 'aesop-ladder-proctoring-mode';
const LS_ADULT_ATTESTED = 'aesop-ladder-adult-attested';

const el = {
  authEmailInput: document.getElementById('authEmailInput'),
  authPasswordInput: document.getElementById('authPasswordInput'),
  authSignInBtn: document.getElementById('authSignInBtn'),
  authCreateBtn: document.getElementById('authCreateBtn'),
  authGoogleBtn: document.getElementById('authGoogleBtn'),
  createAccountModal: document.getElementById('createAccountModal'),
  createEmailInput: document.getElementById('createEmailInput'),
  createPasswordInput: document.getElementById('createPasswordInput'),
  createAccountError: document.getElementById('createAccountError'),
  closeCreateModal: document.getElementById('closeCreateModal'),
  submitCreateAccount: document.getElementById('submitCreateAccount'),
  loggedInSection: document.getElementById('loggedInSection'),
  loggedInEmail: document.getElementById('loggedInEmail'),
  logoutBtn: document.getElementById('logoutBtn'),
  authIdentityAssuranceSelect: document.getElementById('authIdentityAssuranceSelect'),
  authIdentityAssuranceDescription: document.getElementById('authIdentityAssuranceDescription'),
  authProctoringModeField: document.getElementById('authProctoringModeField'),
  authProctoringModeSelect: document.getElementById('authProctoringModeSelect'),
  authProctoringModeDescription: document.getElementById('authProctoringModeDescription'),
  authIdentityAttestationCheck: document.getElementById('authIdentityAttestationCheck'),
  authProceedBtn: document.getElementById('authProceedBtn'),
  authError: document.getElementById('authError'),
  darkToggle: document.getElementById('darkToggle')
};

let state = {
  authUser: null,
  identityAssuranceId: localStorage.getItem(LS_IDENTITY_ASSURANCE) || 'account_bound',
  proctoringModeId: localStorage.getItem(LS_PROCTORING_MODE) || ''
};

function setError(message) {
  if (el.authError) {
    el.authError.textContent = message;
    el.authError.hidden = !message;
  }
}

function renderIdentityAssuranceSelect() {
  const options = [
    '<option value="">Choose verification level...</option>',
    ...IDENTITY_ASSURANCE_LEVELS
      .filter(level => level.active)
      .map(level => `<option value="${level.id}">${level.label}</option>`)
  ];
  el.authIdentityAssuranceSelect.innerHTML = options.join('');
  el.authIdentityAssuranceSelect.value = state.identityAssuranceId;
  updateIdentityAssuranceDescription();
}

function renderProctoringModeSelect() {
  const options = [
    '<option value="">Choose proctoring method...</option>',
    ...PROCTORING_MODES
      .map(mode => `<option value="${mode.id}">${mode.label}</option>`)
  ];
  el.authProctoringModeSelect.innerHTML = options.join('');
  el.authProctoringModeSelect.value = state.proctoringModeId;
  updateProctoringModeDescription();
}

function updateIdentityAssuranceDescription() {
  const selectedLevel = IDENTITY_ASSURANCE_LEVELS.find(l => l.id === state.identityAssuranceId);
  if (el.authIdentityAssuranceDescription) {
    if (selectedLevel && selectedLevel.description) {
      el.authIdentityAssuranceDescription.textContent = selectedLevel.description;
      el.authIdentityAssuranceDescription.classList.add('visible');
    } else {
      el.authIdentityAssuranceDescription.classList.remove('visible');
    }
  }
}

function updateProctoringModeDescription() {
  const selectedMode = PROCTORING_MODES.find(m => m.id === state.proctoringModeId);
  if (el.authProctoringModeDescription) {
    if (selectedMode && selectedMode.description && state.proctoringModeId) {
      el.authProctoringModeDescription.textContent = selectedMode.description;
      el.authProctoringModeDescription.classList.add('visible');
    } else {
      el.authProctoringModeDescription.classList.remove('visible');
    }
  }
}

function updateProctoringModeVisibility() {
  const selectedLevel = IDENTITY_ASSURANCE_LEVELS.find(l => l.id === state.identityAssuranceId);
  if (el.authProctoringModeField) {
    el.authProctoringModeField.hidden = !selectedLevel?.proctoringRequired;
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  console.log('[SIGN IN] Handler called');
  setError('');
  const email = el.authEmailInput?.value?.trim();
  const password = el.authPasswordInput?.value;

  console.log('[SIGN IN] Email:', email ? '***' : 'empty', 'Password:', password ? '***' : 'empty');

  if (!email || !password) {
    setError('Please enter email and password.');
    return;
  }

  try {
    console.log('[SIGN IN] Calling Firebase...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('[SIGN IN] Success');
    setError('');
  } catch (error) {
    setError(`Sign in failed: ${error.message}`);
  }
}

function openCreateAccountModal() {
  if (el.createAccountModal) {
    el.createAccountModal.style.display = 'flex';
    el.createEmailInput?.focus();
    el.createAccountError.textContent = '';
  }
}

function closeCreateAccountModal() {
  if (el.createAccountModal) {
    el.createAccountModal.style.display = 'none';
    el.createEmailInput.value = '';
    el.createPasswordInput.value = '';
    el.createAccountError.textContent = '';
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    el.authEmailInput.value = '';
    el.authPasswordInput.value = '';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

async function handleCreateAccount() {
  const email = el.createEmailInput?.value?.trim();
  const password = el.createPasswordInput?.value;

  if (!email || !password) {
    el.createAccountError.textContent = 'Please enter email and password.';
    return;
  }

  try {
    el.createAccountError.textContent = '';
    await createUserWithEmailAndPassword(auth, email, password);
    closeCreateAccountModal();
  } catch (error) {
    el.createAccountError.textContent = error.message;
  }
}


function handleProceed() {
  console.log('[ATTESTATION] handleProceed called');
  // Validate required fields
  const selectedLevel = IDENTITY_ASSURANCE_LEVELS.find(l => l.id === state.identityAssuranceId);

  console.log('[ATTESTATION] Identity assurance level:', state.identityAssuranceId);
  if (!state.identityAssuranceId) {
    console.log('[ATTESTATION] ERROR: No identity assurance level selected');
    setError('Please select an identity assurance level.');
    return;
  }

  console.log('[ATTESTATION] Proctoring required:', selectedLevel?.proctoringRequired, 'Mode selected:', state.proctoringModeId);
  if (selectedLevel?.proctoringRequired && !state.proctoringModeId) {
    console.log('[ATTESTATION] ERROR: Proctoring required but not selected');
    setError('Please select a proctoring method for the selected assurance level.');
    return;
  }

  console.log('[ATTESTATION] Attestation checkbox checked:', el.authIdentityAttestationCheck?.checked);
  if (!el.authIdentityAttestationCheck?.checked) {
    console.log('[ATTESTATION] ERROR: Attestation not checked');
    setError('Please confirm that you will take this certification attempt yourself.');
    return;
  }

  // Save selections to localStorage
  console.log('[ATTESTATION] About to save to localStorage');
  localStorage.setItem(LS_IDENTITY_ASSURANCE, state.identityAssuranceId);
  localStorage.setItem(LS_PROCTORING_MODE, state.proctoringModeId);
  localStorage.setItem(LS_ADULT_ATTESTED, 'true');
  console.log('[ATTESTATION] Saved. Value in localStorage:', localStorage.getItem(LS_ADULT_ATTESTED));

  // Redirect back to the appropriate ladder pathway
  const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/theladder/';
  console.log('[ATTESTATION] Redirecting to:', returnTo);
  window.location.href = returnTo;
}

function initializeDarkMode() {
  const isDark = localStorage.getItem('aesop-theme') === 'dark';
  if (el.darkToggle) {
    el.darkToggle.setAttribute('aria-pressed', isDark);
    el.darkToggle.addEventListener('click', () => {
      const newTheme = localStorage.getItem('aesop-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('aesop-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme === 'dark' ? 'dark' : '');
      el.darkToggle.setAttribute('aria-pressed', newTheme === 'dark');
    });
  }
}

// Initialize
renderIdentityAssuranceSelect();
renderProctoringModeSelect();
updateProctoringModeVisibility();
initializeDarkMode();

// Event listeners
if (el.authIdentityAssuranceSelect) {
  el.authIdentityAssuranceSelect.addEventListener('change', (e) => {
    state.identityAssuranceId = e.target.value;
    updateIdentityAssuranceDescription();
    updateProctoringModeVisibility();
    setError('');
  });
}

if (el.authProctoringModeSelect) {
  el.authProctoringModeSelect.addEventListener('change', (e) => {
    state.proctoringModeId = e.target.value;
    updateProctoringModeDescription();
    setError('');
  });
}

if (el.authSignInBtn) {
  el.authSignInBtn.addEventListener('click', (e) => {
    console.log('[SIGN IN] Button clicked');
    handleSignIn(e);
  });
} else {
  console.warn('[SIGN IN] Button not found');
}

if (el.authCreateBtn) {
  el.authCreateBtn.addEventListener('click', openCreateAccountModal);
}

if (el.closeCreateModal) {
  el.closeCreateModal.addEventListener('click', closeCreateAccountModal);
}

if (el.submitCreateAccount) {
  el.submitCreateAccount.addEventListener('click', handleCreateAccount);
}

// Close modal when clicking outside of it
if (el.createAccountModal) {
  el.createAccountModal.addEventListener('click', (e) => {
    if (e.target === el.createAccountModal) {
      closeCreateAccountModal();
    }
  });
}

if (el.logoutBtn) {
  el.logoutBtn.addEventListener('click', handleLogout);
}

if (el.authProceedBtn) {
  el.authProceedBtn.addEventListener('click', handleProceed);
}

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  state.authUser = user;
  console.log('[AUTH STATE] User:', user ? user.email : 'not logged in');

  if (el.authSignInBtn && el.authCreateBtn) {
    el.authSignInBtn.hidden = !!user;
    el.authCreateBtn.hidden = !!user;
  }

  // Hide login form when logged in
  const authForm = document.getElementById('authAccountForm');
  if (authForm) {
    authForm.parentElement.style.display = user ? 'none' : 'block';
  }

  // Show/hide logout section
  if (el.loggedInSection) {
    el.loggedInSection.hidden = !user;
    if (user && el.loggedInEmail) {
      el.loggedInEmail.textContent = `Logged in as: ${user.email}`;
    }
  }

  if (el.authEmailInput && user?.email && !el.authEmailInput.value) {
    el.authEmailInput.value = user.email;
  }

  if (user) {
    console.log('[AUTH STATE] Logged in as:', user.email);
    setError(''); // Clear any errors
  }
});
