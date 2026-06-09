import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
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

const el = {
  authEmailInput: document.getElementById('authEmailInput'),
  authPasswordInput: document.getElementById('authPasswordInput'),
  authSignInBtn: document.getElementById('authSignInBtn'),
  authCreateBtn: document.getElementById('authCreateBtn'),
  authGoogleBtn: document.getElementById('authGoogleBtn'),
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
  setError('');
  const email = el.authEmailInput?.value?.trim();
  const password = el.authPasswordInput?.value;

  if (!email || !password) {
    setError('Please enter email and password.');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    setError('');
  } catch (error) {
    setError(`Sign in failed: ${error.message}`);
  }
}

async function handleCreateAccount() {
  setError('');
  const email = el.authEmailInput?.value?.trim();
  const password = el.authPasswordInput?.value;

  if (!email || !password) {
    setError('Please enter email and password.');
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    setError('');
  } catch (error) {
    setError(`Account creation failed: ${error.message}`);
  }
}

async function handleGoogleSignIn() {
  console.log('[Google Sign-In] Button clicked');
  setError('');
  try {
    console.log('[Google Sign-In] Creating provider and redirecting...');
    const provider = new GoogleAuthProvider();
    console.log('[Google Sign-In] Calling signInWithRedirect...');
    await signInWithRedirect(auth, provider);
    console.log('[Google Sign-In] Redirect initiated');
    // Page will redirect to Google, then return here after sign-in
  } catch (error) {
    console.error('[Google Sign-In] Error:', error);
    setError(`Google sign in failed: ${error.message}`);
  }
}

// Handle redirect result when page loads (after returning from Google Sign-In)
async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      setError(''); // Sign-in successful, clear any errors
    }
  } catch (error) {
    setError(`Google sign in failed: ${error.message}`);
  }
}

function handleProceed() {
  // Validate required fields
  const selectedLevel = IDENTITY_ASSURANCE_LEVELS.find(l => l.id === state.identityAssuranceId);

  if (!state.identityAssuranceId) {
    setError('Please select an identity assurance level.');
    return;
  }

  if (selectedLevel?.proctoringRequired && !state.proctoringModeId) {
    setError('Please select a proctoring method for the selected assurance level.');
    return;
  }

  if (!el.authIdentityAttestationCheck?.checked) {
    setError('Please confirm that you will take this certification attempt yourself.');
    return;
  }

  // Save selections to localStorage
  localStorage.setItem(LS_IDENTITY_ASSURANCE, state.identityAssuranceId);
  localStorage.setItem(LS_PROCTORING_MODE, state.proctoringModeId);

  // Redirect back to the ladder page
  window.location.href = '/theladder/';
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

// Handle redirect result from Google Sign-In (if returning from redirect)
handleRedirectResult();

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
  el.authSignInBtn.addEventListener('click', handleSignIn);
}

if (el.authCreateBtn) {
  el.authCreateBtn.addEventListener('click', handleCreateAccount);
}

if (el.authGoogleBtn) {
  console.log('[Init] Google Sign-In button found, attaching listener');
  el.authGoogleBtn.addEventListener('click', handleGoogleSignIn);
} else {
  console.warn('[Init] Google Sign-In button NOT found');
}

if (el.authProceedBtn) {
  el.authProceedBtn.addEventListener('click', handleProceed);
}

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  state.authUser = user;
  if (el.authSignInBtn && el.authCreateBtn) {
    el.authSignInBtn.hidden = !!user;
    el.authCreateBtn.hidden = !!user;
  }
  if (el.authEmailInput && user?.email && !el.authEmailInput.value) {
    el.authEmailInput.value = user.email;
  }
});
