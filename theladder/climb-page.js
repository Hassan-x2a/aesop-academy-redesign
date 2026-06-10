// theladder-v0.2.0 | 2026-06-10
// climb-page.js — page entry module for /theladder/climb.html (BUILD §6.5).
// Handles the ?tier=&rung= deep link, the climb header (tier eyebrow, rung
// position, prev/next), and the empty state. Conversation, certification,
// vocabulary, resources, and the guide dialog are rendered by ladder-core.js
// against this page's ids.
import {
  initCore,
  registerPageRenderer,
  state,
  allTopics,
  completedCount,
  getActiveTier,
  getActiveTopic,
  setActiveTopic
} from './ladder-core.js?v=1';
import { LADDER_TIERS } from './ladder-data.js?v=2';

const els = {
  eyebrow: document.getElementById('climbTierEyebrow'),
  rungPosition: document.getElementById('rungPosition'),
  prev: document.getElementById('prevRungBtn'),
  next: document.getElementById('nextRungBtn'),
  emptyState: document.getElementById('climbEmptyState'),
  avatar: document.getElementById('navAvatar')
};

const pad = (n) => String(n).padStart(2, '0');

// Apply ?tier=&rung= (accepts tier order or tier id, rung order or topic id).
// Runs after the local load and again after the remote load so the deep link
// wins over whichever active topic was persisted (BUILD §6.5).
function applyDeepLink() {
  const params = new URLSearchParams(location.search);
  const tierParam = params.get('tier');
  if (!tierParam) return;
  const tier = LADDER_TIERS.find((item) => (
    item.id === tierParam || item.order === parseInt(tierParam, 10)
  ));
  if (!tier) return;
  const rungParam = params.get('rung');
  const topic = tier.topics.find((item) => (
    item.id === rungParam || item.order === parseInt(rungParam, 10)
  )) || tier.topics[0];
  if (state.activeTierId === tier.id && state.activeTopicId === topic.id) return;
  state.activeTierId = tier.id;
  state.activeTopicId = topic.id;
  // Same reset the old tier-rail / topic-strip clicks performed.
  state.evaluationContext = null;
  state.trainingMessages = [];
  state.messages = [];
}

function hasAnyState() {
  return Boolean(state.progress.placement)
    || completedCount() > 0
    || (state.progress.assessmentMessages || []).length > 0
    || state.messages.length > 0;
}

function renderClimb() {
  const tier = getActiveTier();
  const topic = getActiveTopic();
  if (els.eyebrow) els.eyebrow.textContent = `Tier ${pad(tier.order)} · ${tier.name}`;
  if (els.rungPosition) els.rungPosition.textContent = `Rung ${topic.order} of ${tier.topics.length}`;
  const topics = allTopics();
  const index = topics.findIndex((item) => item.id === topic.id);
  if (els.prev) els.prev.disabled = index <= 0;
  if (els.next) els.next.disabled = index < 0 || index >= topics.length - 1;
  if (els.emptyState) els.emptyState.hidden = hasAnyState();
  if (els.avatar) {
    const initials = (state.learnerId || '').replace(/^AESOP-/, '').slice(0, 2);
    els.avatar.hidden = !initials;
    els.avatar.textContent = initials;
    els.avatar.title = state.learnerId || '';
  }
  // Keep the URL shareable as the active rung changes (strip/search/prev/next).
  const expected = `?tier=${tier.order}&rung=${topic.order}`;
  if (window.location.search !== expected) {
    history.replaceState(null, '', `${window.location.pathname}${expected}`);
  }
}

async function stepRung(direction) {
  const topics = allTopics();
  const index = topics.findIndex((item) => item.id === state.activeTopicId);
  const target = topics[index + direction];
  if (!target) return;
  await setActiveTopic(target.tierId, target.id);
}

els.prev?.addEventListener('click', () => stepRung(-1));
els.next?.addEventListener('click', () => stepRung(1));

registerPageRenderer(renderClimb);
initCore({ afterLoad: applyDeepLink });
