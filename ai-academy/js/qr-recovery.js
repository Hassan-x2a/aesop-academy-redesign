// QR Recovery — AESOP AI Academy
// Restores learner ID from a manually-entered recovery token.
// Rendered into students.html and assessment.html recovery sections.

const LEARNER_ID_KEY = 'aesop-learner-id';

/**
 * Attempt to restore a learner record using a manually-typed recovery token.
 * The token is in the format "XXXXXXXX-XXXXXX" (first 8 chars of UUID + 6-char suffix).
 * We use it to query Firestore for the matching learner.
 *
 * @param {string} token - Recovery token entered by the user
 * @returns {Promise<{success: boolean, learnerId?: string, error?: string}>}
 */
export async function recoverByToken(token) {
  if (!token || token.trim().length === 0) {
    return { success: false, error: 'Please enter your recovery token.' };
  }

  const normalized = token.trim();

  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const FIREBASE_CONFIG = {
      apiKey:            'AIzaSyC0-J6BVarJ0_lnSBkdtBDCbCHVoABUTrU',
      authDomain:        'playagame-f733d.firebaseapp.com',
      projectId:         'playagame-f733d',
      storageBucket:     'playagame-f733d.appspot.com',
      messagingSenderId: '610508714644',
      appId:             '1:610508714644:web:63ca4374e5d5be1c81ba81'
    };

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const db  = getFirestore(app);

    const learnersRef = collection(db, 'learners');
    const q = query(learnersRef, where('qrRecoveryToken.token', '==', normalized));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: 'No record found for that token. Double-check and try again.' };
    }

    const learnerId = snap.docs[0].id;
    localStorage.setItem(LEARNER_ID_KEY, learnerId);
    return { success: true, learnerId };

  } catch (err) {
    console.error('QR recovery failed:', err);
    return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

/**
 * Render a recovery widget into a container element.
 * On success, calls onRecovered(learnerId) so the host page can update its UI.
 *
 * @param {string}   containerId  - ID of the host element
 * @param {Function} onRecovered  - Called with learnerId string on success
 */
export function renderRecoveryWidget(containerId, onRecovered) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="padding:1.25rem;background:var(--cream,#faf8f4);border:1px solid var(--border,#e2d9cc);border-radius:10px;">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--gold,#c9a05a);margin-bottom:0.75rem;">
        Recover Your Learner ID
      </div>
      <p style="font-size:0.85rem;color:var(--ink-light,#4a5568);margin:0 0 0.85rem;line-height:1.55;">
        If you lost your ID, enter the recovery token from your assessment QR code or completion screen.
      </p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <input
          id="recovery-token-input"
          type="text"
          placeholder="e.g. a1b2c3d4-XYZ789"
          maxlength="40"
          style="
            flex:1;min-width:180px;
            padding:0.5rem 0.9rem;border-radius:2rem;
            border:1.5px solid var(--border,#e2d9cc);
            font-size:0.85rem;background:white;
            color:var(--ink,#222);font-family:monospace;
          "
        />
        <button
          id="recovery-submit-btn"
          onclick="window._aesopRecoverSubmit()"
          style="
            background:var(--teal-dark,#2ba898);color:white;
            font-weight:700;font-size:0.85rem;padding:0.5rem 1.1rem;
            border-radius:2rem;border:none;cursor:pointer;
          "
        >Recover</button>
      </div>
      <div id="recovery-status" style="font-size:0.82rem;min-height:1.2rem;margin-top:0.5rem;"></div>
    </div>`;

  window._aesopRecoverSubmit = async () => {
    const input   = document.getElementById('recovery-token-input');
    const status  = document.getElementById('recovery-status');
    const btn     = document.getElementById('recovery-submit-btn');
    if (!input || !status || !btn) return;

    const token = input.value.trim();
    btn.disabled = true;
    btn.textContent = 'Checking…';
    status.style.color = 'var(--ink-muted,#718096)';
    status.textContent = '';

    const result = await recoverByToken(token);

    if (result.success) {
      status.style.color = 'var(--teal-dark,#2ba898)';
      status.textContent = 'Learner ID restored successfully.';
      btn.textContent = 'Done';
      if (typeof onRecovered === 'function') onRecovered(result.learnerId);
    } else {
      status.style.color = '#c0384f';
      status.textContent = result.error || 'Recovery failed.';
      btn.disabled = false;
      btn.textContent = 'Recover';
    }
  };

  const input = document.getElementById('recovery-token-input');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') window._aesopRecoverSubmit();
    });
  }
}
