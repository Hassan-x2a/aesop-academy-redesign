// Pathway display — AESOP AI Academy
// Renders a recommended learning pathway on the student dashboard.
// Called from students.html after loading the learner's Firestore record.

const DIFFICULTY_LABEL = {
  beginner:     { text: 'Beginner',     color: '#2ba898' },
  intermediate: { text: 'Intermediate', color: '#9a5fb0' },
  advanced:     { text: 'Advanced',     color: '#c0384f' },
};

// Only allow relative paths within ai-academy to guard against open-redirect injection
function safeCourseHref(path) {
  if (typeof path === 'string' && /^\/ai-academy\/[a-zA-Z0-9/_-]+\.html$/.test(path)) {
    return path;
  }
  return '/ai-academy/courses.html';
}

/**
 * Render pathway into a container element.
 *
 * @param {string}  containerId  - DOM element ID to render into
 * @param {Object}  pathway      - recommendedPathway from Firestore
 */
export function renderPathway(containerId, pathway) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.textContent = '';

  if (!pathway || !pathway.primaryCourse) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--ink-muted,#718096);font-size:0.9rem;margin:0';
    p.textContent = 'No pathway yet. ';
    const a = document.createElement('a');
    a.href = '/ai-academy/assessment.html';
    a.style.color = 'var(--teal-dark,#2ba898)';
    a.textContent = 'Take the assessment';
    p.appendChild(a);
    p.appendChild(document.createTextNode(' to get a personalized recommendation.'));
    container.appendChild(p);
    return;
  }

  const { primaryCourse, followUpCourses = [], reasoningBrief = '', aptitudeBand = '' } = pathway;

  const wrapper = document.createElement('div');

  if (reasoningBrief) {
    const reasonP = document.createElement('p');
    reasonP.style.cssText = 'font-size:0.85rem;color:var(--ink-light,#4a5568);margin:0 0 1rem 0;line-height:1.6';
    reasonP.textContent = reasoningBrief;

    if (aptitudeBand) {
      const badge = document.createElement('span');
      badge.style.cssText = [
        'display:inline-block;padding:2px 10px;border-radius:12px;',
        'font-size:0.72rem;font-weight:700;letter-spacing:0.04em;',
        'background:var(--gold-pale,#f5e9d0);color:var(--ink-mid,#2c3e50);',
        'margin-left:0.5rem;vertical-align:middle;',
      ].join('');
      badge.textContent = aptitudeBand.charAt(0).toUpperCase() + aptitudeBand.slice(1);
      reasonP.appendChild(badge);
    }

    wrapper.appendChild(reasonP);
  }

  wrapper.appendChild(renderCourseCard(primaryCourse, true));

  if (followUpCourses.length > 0) {
    const followSection = document.createElement('div');
    followSection.style.marginTop = '1rem';

    const label = document.createElement('div');
    label.style.cssText = 'font-size:0.78rem;color:var(--ink-muted,#718096);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:0.6rem';
    label.textContent = 'Suggested Next';
    followSection.appendChild(label);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem';
    followUpCourses.forEach(c => list.appendChild(renderCourseCard(c, false)));
    followSection.appendChild(list);

    wrapper.appendChild(followSection);
  }

  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border-light,#ede8df)';
  const retakeLink = document.createElement('a');
  retakeLink.href = '/ai-academy/assessment.html';
  retakeLink.style.cssText = 'font-size:0.8rem;color:var(--ink-muted,#718096);text-decoration:none';
  retakeLink.textContent = 'Retake assessment to update pathway →';
  footer.appendChild(retakeLink);
  wrapper.appendChild(footer);

  container.appendChild(wrapper);
}

/** @private */
function renderCourseCard(course, isPrimary) {
  const diff = DIFFICULTY_LABEL[course.difficulty] || DIFFICULTY_LABEL.beginner;
  const skills = (course.skillsFocused || []).slice(0, 3);
  const prereqs = course.prerequisites || [];

  const card = document.createElement('a');
  card.href = safeCourseHref(course.path);
  card.style.cssText = [
    'display:block;text-decoration:none;border-radius:8px;',
    `padding:${isPrimary ? '1rem' : '0.65rem 0.85rem'};`,
    `background:${isPrimary ? 'var(--cream,#faf8f4)' : 'white'};`,
    `border:${isPrimary ? '2px solid var(--teal-dark,#2ba898)' : '1px solid var(--border,#e2d9cc)'};`,
    'transition:border-color 0.15s,box-shadow 0.15s;',
  ].join('');
  card.addEventListener('mouseover', () => { card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; });
  card.addEventListener('mouseout',  () => { card.style.boxShadow = ''; });

  // Title + difficulty row
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem';

  const title = document.createElement('div');
  title.style.cssText = `font-weight:${isPrimary ? 700 : 600};font-size:${isPrimary ? '1rem' : '0.9rem'};color:var(--navy,#0d1b2a)`;
  title.textContent = course.title || '';
  header.appendChild(title);

  const diffBadge = document.createElement('span');
  diffBadge.style.cssText = `flex-shrink:0;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:700;color:white;background:${diff.color}`;
  diffBadge.textContent = diff.text;
  header.appendChild(diffBadge);
  card.appendChild(header);

  // Description (primary only)
  if (isPrimary && course.description) {
    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:0.82rem;color:var(--ink-light,#4a5568);margin-top:0.35rem;line-height:1.55';
    desc.textContent = course.description;
    card.appendChild(desc);
  }

  // Skill pills
  if (skills.length > 0) {
    const pillRow = document.createElement('div');
    pillRow.style.marginTop = '0.5rem';
    skills.forEach(s => {
      const pill = document.createElement('span');
      pill.style.cssText = 'display:inline-block;padding:1px 8px;border-radius:10px;font-size:0.72rem;background:rgba(61,214,192,0.1);color:var(--teal-dark,#2ba898);margin-right:4px';
      pill.textContent = s;
      pillRow.appendChild(pill);
    });
    card.appendChild(pillRow);
  }

  // Prerequisites
  if (prereqs.length > 0) {
    const prereqDiv = document.createElement('div');
    prereqDiv.style.cssText = 'font-size:0.75rem;color:var(--ink-muted,#718096);margin-top:0.3rem';
    prereqDiv.textContent = 'Prereq: ' + prereqs.join(', ');
    card.appendChild(prereqDiv);
  }

  // CTA (primary only)
  if (isPrimary) {
    const cta = document.createElement('div');
    cta.style.cssText = 'margin-top:0.75rem;font-size:0.85rem;font-weight:700;color:var(--teal-dark,#2ba898)';
    cta.textContent = 'Start Course →';
    card.appendChild(cta);
  }

  return card;
}

/**
 * Check localStorage for a completed assessment flag.
 * Returns true if the learner has taken the assessment.
 * Lightweight check for the homepage (no Firebase round-trip).
 *
 * @returns {boolean}
 */
export function hasCompletedAssessment() {
  try {
    return localStorage.getItem('aesop-assessment-complete') === '1';
  } catch (_) {
    return false;
  }
}

/**
 * Mark assessment as complete in localStorage.
 * Called from assessment-chat.js after handleAssessmentComplete.
 */
export function markAssessmentComplete() {
  try {
    localStorage.setItem('aesop-assessment-complete', '1');
  } catch (_) {}
}
