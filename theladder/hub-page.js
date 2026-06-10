// theladder-v0.2.0 | 2026-06-10
// hub-page.js — page entry module for /theladder/ladder.html (BUILD §6.2).
// Binds only hub-specific UI (summary card, tier accordion, avatar); all
// shared behavior (search, language, education focus, progress stats,
// ribbons) is rendered by ladder-core.js against this page's ids.
import {
  initCore,
  registerPageRenderer,
  state,
  escapeHtml,
  topicKey,
  allTopics,
  completedCount,
  completedTierCount,
  getActiveTier,
  getActiveTopic,
  tierProgress,
  climbUrlFor
} from './ladder-core.js?v=1';
import { LADDER_TIERS } from './ladder-data.js?v=2';

const els = {
  eyebrow: document.getElementById('climbEyebrow'),
  subline: document.getElementById('climbSubline'),
  pct: document.getElementById('summaryPct'),
  rungsDone: document.getElementById('summaryRungsDone'),
  rungsTotal: document.getElementById('summaryRungsTotal'),
  resume: document.getElementById('resumeRungBtn'),
  tiersComplete: document.getElementById('summaryTiersComplete'),
  tierOf: document.getElementById('summaryTierOf'),
  tierList: document.getElementById('tierList'),
  avatar: document.getElementById('navAvatar')
};

const pad = (n) => String(n).padStart(2, '0');

let expandedTierId = null;
let expandedInitialized = false;

function hasAnyProgress() {
  return completedCount() > 0
    || Boolean(state.progress.placement)
    || (state.progress.assessmentMessages || []).length > 0;
}

function nextTopicInTier(tier) {
  return tier.topics.find((topic) => !state.progress.completedTopics[topicKey(topic.id)]) || tier.topics[0];
}

function tierStatus(tier, info) {
  if (info.complete) return 'done';
  if (tier.id === state.activeTierId || info.done > 0) return 'current';
  return 'locked';
}

function renderSummary() {
  const started = hasAnyProgress();
  const tier = getActiveTier();
  const topic = getActiveTopic();
  const count = completedCount();
  const total = allTopics().length;
  const pct = total ? Math.round((count / total) * 100) : 0;
  const tiersDone = completedTierCount();

  if (els.eyebrow) {
    els.eyebrow.textContent = state.learnerId
      ? `Your climb · Welcome back, ${state.learnerId}`
      : 'Your climb';
  }
  if (els.subline) {
    els.subline.innerHTML = started
      ? `You're on Tier ${tier.order} — <span class="flair">${escapeHtml(tier.name)}</span>. ${count} ${count === 1 ? 'rung' : 'rungs'} in.`
      : 'Find your rung and start climbing.';
  }
  if (els.pct) els.pct.textContent = `${pct}%`;
  if (els.rungsDone) els.rungsDone.textContent = String(count);
  if (els.rungsTotal) els.rungsTotal.textContent = String(total);
  if (els.resume) {
    els.resume.textContent = started ? `Resume rung ${topic.order}` : 'Start climbing';
    els.resume.href = climbUrlFor(topic);
  }
  if (els.tiersComplete) els.tiersComplete.textContent = `${tiersDone} ${tiersDone === 1 ? 'tier' : 'tiers'} complete`;
  if (els.tierOf) els.tierOf.textContent = `Tier ${tier.order} of ${LADDER_TIERS.length}`;
  if (els.avatar) {
    const initials = (state.learnerId || '').replace(/^AESOP-/, '').slice(0, 2);
    els.avatar.hidden = !initials;
    els.avatar.textContent = initials;
    els.avatar.title = state.learnerId || '';
  }
}

function rungSquares(tier, info, status) {
  const next = nextTopicInTier(tier);
  return tier.topics.map((topic) => {
    const done = Boolean(state.progress.completedTopics[topicKey(topic.id)]);
    const cls = done ? 'done' : (status === 'current' && topic.id === next.id ? 'current' : 'locked');
    return `<span class="rung ${cls}" title="${escapeHtml(`Rung ${topic.order} · ${topic.title}`)}"></span>`;
  }).join('');
}

function tierPanel(tier, info, status) {
  const next = nextTopicInTier(tier);
  let nextLabel;
  let actionLabel;
  let actionClass = 'btn btn-sm btn-ghost';
  if (status === 'done') {
    nextLabel = `All ${info.total} rungs complete${info.placedOut ? ' · placed out by assessment' : ''}`;
    actionLabel = 'Review tier';
  } else if (status === 'current') {
    nextLabel = `Next — Rung ${next.order} · ${next.title}`;
    actionLabel = `Resume rung ${next.order}`;
    actionClass = 'btn btn-sm btn-primary';
  } else {
    nextLabel = `Begin with Rung 1 · ${tier.topics[0].title}`;
    actionLabel = 'Start tier';
  }
  return `
    <div class="rung-grid">${rungSquares(tier, info, status)}</div>
    <div class="tier-panel-foot">
      <span class="tier-next">${escapeHtml(nextLabel)}</span>
      <a class="${actionClass}" href="${climbUrlFor(status === 'done' ? tier.topics[0] : next)}">${escapeHtml(actionLabel)}</a>
    </div>`;
}

function tierMeta(tier, info, status) {
  if (info.placedOut) return `${info.total} / ${info.total} rungs · placed out`;
  if (status === 'done') return `${info.done} / ${info.total} rungs · complete`;
  if (status === 'current') {
    const assigned = info.assignedCount ? ` · ${info.assignedCount} assigned` : '';
    return `${info.done} / ${info.total} rungs · in progress${assigned}`;
  }
  const assigned = info.assignedCount ? ` · ${info.assignedCount} assigned` : '';
  return `${info.total} rungs · not started${assigned}`;
}

function renderAccordion() {
  if (!els.tierList) return;
  if (!expandedInitialized) {
    expandedTierId = state.activeTierId;
    expandedInitialized = true;
  }
  els.tierList.innerHTML = LADDER_TIERS.map((tier) => {
    const info = tierProgress(tier);
    const status = tierStatus(tier, info);
    const pct = info.total ? Math.round((info.done / info.total) * 100) : 0;
    const isOpen = expandedTierId === tier.id;
    return `
      <div class="tier-item">
        <button type="button" class="tier-row${status === 'locked' ? ' is-locked' : ''}" data-tier-toggle="${tier.id}" aria-expanded="${isOpen}">
          <span class="tier-badge ${status}">${pad(tier.order)}</span>
          <span class="tier-row-meta">
            <span class="tier-name">Tier ${pad(tier.order)} — ${escapeHtml(tier.name)}</span>
            <span class="tier-sub">${escapeHtml(tierMeta(tier, info, status))}</span>
          </span>
          <span class="tier-bar"><span class="bar"><span class="bar-fill" style="width: ${info.placedOut ? 100 : pct}%;"></span></span></span>
          <span class="tier-chev">&darr;</span>
        </button>
        <div class="tier-panel" ${isOpen ? '' : 'hidden'}>${tierPanel(tier, info, status)}</div>
      </div>`;
  }).join('');
}

function renderHub() {
  renderSummary();
  renderAccordion();
}

els.tierList?.addEventListener('click', (event) => {
  const row = event.target.closest('[data-tier-toggle]');
  if (!row) return;
  const tierId = row.dataset.tierToggle;
  expandedTierId = expandedTierId === tierId ? null : tierId;
  renderAccordion();
});

registerPageRenderer(renderHub);
initCore();
