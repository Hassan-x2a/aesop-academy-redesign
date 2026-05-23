// Taxonomy mapper — AESOP AI Academy
// Converts assessment signals (aptitude score + interest tags) into a
// structured course pathway. Called by assessment-chat.js after completion.

import {
  COURSE_CATALOGUE,
  TAG_AFFINITY,
  BAND_DIFFICULTY,
  PREREQUISITES,
  getCourse,
} from './taxonomy-parser.js';

import { getAptitudeBand } from './assessment-parser.js';

/**
 * Generate a personalized learning pathway from assessment signals.
 *
 * @param {number}   aptitudeScore  - 0-100 from assessment
 * @param {string[]} interestTags   - ordered list of interest tags (strongest first)
 * @returns {Pathway}
 */
export function generatePathway(aptitudeScore, interestTags) {
  const aptitudeBand = getAptitudeBand(aptitudeScore);
  const eligibleDifficulties = BAND_DIFFICULTY[aptitudeBand] || ['beginner', 'intermediate'];

  // Score every course against the student's profile
  const scored = COURSE_CATALOGUE.map(course => ({
    course,
    score: scoreCourseFit(course, interestTags, eligibleDifficulties),
  }));

  // Sort descending by score, exclude zero-score courses
  const ranked = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return buildFallbackPathway(aptitudeBand);
  }

  const primaryEntry = ranked[0];
  const followUps = ranked
    .slice(1)
    .map(({ course, score }) => buildFollowUpEntry(course, score, interestTags));

  const primaryCourse = buildPrimaryCourseEntry(primaryEntry.course, interestTags, aptitudeBand);

  return {
    generatedAt: new Date().toISOString(),
    aptitudeBand,
    primaryCourse,
    followUpCourses: followUps,
    reasoningBrief: buildReasoningBrief(primaryCourse, aptitudeBand, interestTags),
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────

/**
 * Score a course's fit for a given interest profile and difficulty eligibility.
 * Higher = better fit.
 *
 * @private
 */
function scoreCourseFit(course, interestTags, eligibleDifficulties) {
  // Discard courses outside the learner's eligible difficulty band
  if (!eligibleDifficulties.includes(course.difficulty)) return 0;

  let score = 0;

  // Points per interest tag, weighted by tag position (first tag = strongest signal)
  interestTags.forEach((tag, idx) => {
    const affinity = TAG_AFFINITY[tag];
    if (!affinity) return;

    const position = affinity.indexOf(course.id);
    if (position === -1) return;

    // Closer to top of affinity list = higher points; earlier tag = higher weight
    const affinityPoints = Math.max(0, affinity.length - position); // e.g. 5, 4, 3…
    const tagWeight = Math.max(1, interestTags.length - idx);        // first tag weights most
    score += affinityPoints * tagWeight;
  });

  return score;
}

// ── Entry builders ────────────────────────────────────────────────────────

/** @private */
function buildPrimaryCourseEntry(course, interestTags, aptitudeBand) {
  const prereqs = PREREQUISITES[course.id] || [];
  const prereqNames = prereqs
    .map(id => getCourse(id)?.name)
    .filter(Boolean);

  return {
    courseId: course.id,
    title: course.name,
    difficulty: course.difficulty,
    path: course.path,
    description: course.description,
    skillsFocused: deriveSkillsFocused(course.id, interestTags),
    prerequisites: prereqNames,
  };
}

/** @private */
function buildFollowUpEntry(course, score, interestTags) {
  return {
    courseId: course.id,
    title: course.name,
    difficulty: course.difficulty,
    path: course.path,
    skillsFocused: deriveSkillsFocused(course.id, interestTags),
    reasoning: buildFollowUpReasoning(course, interestTags),
  };
}

/** @private */
function buildFallbackPathway(aptitudeBand) {
  // Default for learners with no matching tags or very low scores
  const fallbackId = aptitudeBand === 'advanced'
    ? 'agents'
    : aptitudeBand === 'intermediate'
      ? 'building-with-ai'
      : 'brainstorming-with-ai';

  const course = getCourse(fallbackId);
  return {
    generatedAt: new Date().toISOString(),
    aptitudeBand,
    primaryCourse: {
      courseId: course.id,
      title: course.name,
      difficulty: course.difficulty,
      path: course.path,
      description: course.description,
      skillsFocused: [],
      prerequisites: [],
    },
    followUpCourses: [],
    reasoningBrief: `Starting with ${course.name} as a foundational path for ${aptitudeBand} learners.`,
  };
}

// ── Text helpers ──────────────────────────────────────────────────────────

/**
 * Return interest tags that match this course's affinity list.
 * @private
 */
function deriveSkillsFocused(courseId, interestTags) {
  return interestTags.filter(tag => {
    const affinity = TAG_AFFINITY[tag];
    return affinity && affinity.includes(courseId);
  });
}

/** @private */
function buildFollowUpReasoning(course, interestTags) {
  const matchingTags = deriveSkillsFocused(course.id, interestTags);
  if (matchingTags.length > 0) {
    return `Aligns with your interest in ${matchingTags.slice(0, 2).join(' and ')}.`;
  }
  return `Good next step after completing the primary course.`;
}

/** @private */
function buildReasoningBrief(primaryCourse, aptitudeBand, interestTags) {
  const tagPhrase = interestTags.length > 0
    ? `your interests in ${interestTags.slice(0, 2).join(' and ')}`
    : 'your learning profile';
  return `Recommended ${primaryCourse.title} based on ${tagPhrase} and ${aptitudeBand} aptitude level.`;
}

/**
 * @typedef {Object} Pathway
 * @property {string}        generatedAt       - ISO timestamp
 * @property {string}        aptitudeBand      - beginner|aware|intermediate|advanced
 * @property {PrimaryCourse} primaryCourse     - top recommended course
 * @property {FollowUp[]}    followUpCourses   - 1-3 follow-up courses
 * @property {string}        reasoningBrief    - one-sentence explanation
 */
