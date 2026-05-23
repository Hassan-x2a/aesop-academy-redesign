// Assessment Chat — AESOP AI Academy
// Drives the student assessment conversation and completion flow

import { getOrCreateLearnerId, initializeLearnerRecord, addAssessmentMessage, updateAssessmentResults, updateQRRecoveryToken, updateRecommendedPathway, setupOfflineSync } from './firebase-helpers.js';
import { generateQRCode, displayQRCode } from './qr-generator.js';
import { ASSESSMENT_SYSTEM_PROMPT, FALLBACK_REPLIES } from './assessment-prompts.js';
import { parseAssessmentResponse, buildProfileSummary } from './assessment-parser.js';
import { generatePathway } from './taxonomy-mapper.js';
import { markAssessmentComplete } from './pathway-display.js';

const PROXY_URL = '/aesop-api/assessment-proxy.php';

// Session state
let conversationHistory = [];
let exchangeCount = 0;
let isOffline = false;
let assessmentComplete = false;
let learnerId = null;
const COMPLETION_THRESHOLD = 5; // min exchanges before completion

/**
 * Initialize the assessment session
 */
export async function initAssessment() {
  setupOfflineSync();

  learnerId = getOrCreateLearnerId();
  await initializeLearnerRecord(learnerId);

  renderOpenerMessage();
}

/**
 * Render the AI opener message
 */
function renderOpenerMessage() {
  const opener = "Hi! I'm here to help you figure out the best AI learning path for you. This will take about 5 minutes — just a friendly conversation, no right or wrong answers. To start: how would you describe your relationship with technology so far? Are you someone who loves diving into new tech, or more of a cautious observer?";
  addMsgToUI('ai', opener);

  conversationHistory.push({ role: 'assistant', content: opener });
}

/**
 * Send a student message
 */
export async function assessmentSend() {
  const input = document.getElementById('assessment-input');
  const sendBtn = document.getElementById('assessment-send');
  if (!input || !sendBtn) return;

  const text = input.value.trim();
  if (!text || assessmentComplete) return;

  input.value = '';
  sendBtn.disabled = true;

  conversationHistory.push({ role: 'user', content: text });
  addMsgToUI('user', text);

  // Persist to Firebase (non-blocking)
  addAssessmentMessage(learnerId, 'user', text).catch(() => {});

  // Offline fallback
  if (isOffline) {
    const reply = fallbackReply();
    conversationHistory.push({ role: 'assistant', content: reply });
    addMsgToUI('ai', reply);
    addAssessmentMessage(learnerId, 'assistant', reply).catch(() => {});
    exchangeCount++;
    updateProgress();
    sendBtn.disabled = false;
    input.focus();
    return;
  }

  const thinkingEl = addMsgToUI('thinking', 'Thinking...');

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 500,
          system: ASSESSMENT_SYSTEM_PROMPT,
          messages: conversationHistory,
        }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const rawText = (data.content && data.content[0] && data.content[0].text) || '';

      if (thinkingEl && thinkingEl.parentNode) thinkingEl.remove();

      // Extract completion signal via parser; strip it from visible text
      const { signals, visibleText } = parseAssessmentResponse(rawText);

      conversationHistory.push({ role: 'assistant', content: visibleText });
      addMsgToUI('ai', visibleText);
      addAssessmentMessage(learnerId, 'assistant', visibleText).catch(() => {});
      exchangeCount++;
      updateProgress();

      if (signals && signals.completionFlag) {
        await handleAssessmentComplete(signals);
      }

      sendBtn.disabled = false;
      input.focus();
      return;

    } catch (e) {
      if (attempt < 1) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      if (thinkingEl && thinkingEl.parentNode) thinkingEl.remove();
      isOffline = true;
      addMsgToUI('error', '⚠ AI is temporarily unavailable. You can still complete this assessment in practice mode.');

      const reply = fallbackReply();
      conversationHistory.push({ role: 'assistant', content: reply });
      addMsgToUI('ai', reply);
      exchangeCount++;
      updateProgress();
    }
  }

  sendBtn.disabled = false;
  input.focus();
}

/**
 * Handle assessment completion — save signals, generate QR
 */
async function handleAssessmentComplete(signals) {
  assessmentComplete = true;

  const { aptitudeScore = 0, interestTags = [], completionFlag = true, reasoning = '', aptitudeBand = 'beginner' } = signals;

  console.info('Assessment complete:', buildProfileSummary(signals));

  // Disable input
  const input = document.getElementById('assessment-input');
  const sendBtn = document.getElementById('assessment-send');
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  // Save assessment results
  await updateAssessmentResults(learnerId, {
    completed: true,
    completedAt: new Date().toISOString(),
    conversationHistory,
    aptitudeScore,
    aptitudeBand,
    interestTags,
    completionFlag,
    reasoning,
  });

  // Generate personalized pathway from taxonomy mapper
  const pathway = generatePathway(aptitudeScore, interestTags);
  await updateRecommendedPathway(learnerId, pathway);

  // Generate QR recovery token
  const recoveryToken = generateRecoveryToken(learnerId);
  const qrResult = await generateQRCode(learnerId, recoveryToken);

  if (qrResult && !qrResult.errorMessage) {
    await updateQRRecoveryToken(learnerId, {
      token: recoveryToken,
      generatedAt: new Date().toISOString(),
      qrCodeSvg: qrResult.svg || qrResult.dataUrl,
      expiresAt: null,
    });
  }

  // Mark assessment complete in localStorage (drives homepage CTA)
  markAssessmentComplete();

  // Show completion UI
  showCompletionCard(qrResult, recoveryToken, { aptitudeScore, interestTags, pathway });
}

/**
 * Show the completion card with QR code
 */
function showCompletionCard(qrResult, recoveryToken, signals) {
  const card = document.getElementById('assessment-complete');
  if (!card) return;

  // Populate pathway hint with actual recommendation
  const pathwayEl = document.getElementById('completion-pathway-hint');
  if (pathwayEl) {
    const { pathway, interestTags } = signals;
    if (pathway && pathway.primaryCourse) {
      pathwayEl.innerHTML =
        `Your recommended starting course: <strong>${pathway.primaryCourse.title}</strong>. ` +
        `${pathway.reasoningBrief}`;
    } else if (interestTags && interestTags.length > 0) {
      pathwayEl.textContent =
        `Based on your interests in ${interestTags.slice(0, 2).join(' and ')}, we've built your learning path.`;
    }
  }

  // Populate the "View My Pathway" link with real course URL if available
  const ctaLink = card.querySelector('a.btn-primary');
  if (ctaLink && signals.pathway && signals.pathway.primaryCourse) {
    ctaLink.href = signals.pathway.primaryCourse.path;
    ctaLink.textContent = `Start ${signals.pathway.primaryCourse.title} →`;
  }

  // Show QR code
  if (qrResult && qrResult.dataUrl) {
    const qrContainer = document.getElementById('qr-code-display');
    if (qrContainer) {
      displayQRCode('qr-code-display', qrResult.dataUrl, {
        width: '200px',
        height: '200px',
        showLabel: true,
        label: 'Screenshot this to recover your learner ID later',
      });
    }
  }

  // Show learner ID for manual backup
  const idEl = document.getElementById('learner-id-display');
  if (idEl) idEl.textContent = learnerId;

  card.classList.add('visible');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Add a message to the chat UI
 * @returns {HTMLElement} the created element
 */
function addMsgToUI(role, text) {
  const container = document.getElementById('assessment-messages');
  if (!container) return null;

  const div = document.createElement('div');
  div.className = `assessment-msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

/**
 * Update progress bar
 */
function updateProgress() {
  const fill = document.getElementById('assessment-progress-fill');
  const label = document.getElementById('assessment-progress-label');
  if (!fill) return;

  const pct = Math.min(Math.round((exchangeCount / COMPLETION_THRESHOLD) * 100), 100);
  fill.style.width = pct + '%';
  if (label) label.textContent = assessmentComplete ? 'Complete!' : `${exchangeCount} of ~${COMPLETION_THRESHOLD} exchanges`;
}

/**
 * Generate a simple recovery token
 * @private
 */
function generateRecoveryToken(learnerId) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${learnerId.slice(0, 8)}-${suffix}`;
}

/**
 * Get a fallback reply in offline mode
 * @private
 */
function fallbackReply() {
  return FALLBACK_REPLIES[Math.min(exchangeCount, FALLBACK_REPLIES.length - 1)];
}
