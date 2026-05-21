/**
 * Recommendation Generator
 * Synthesizes research findings into prescriptive course recommendations
 * Each recommendation answers a planning question with reasoning
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { sanitizeConcept } from './sanitize.js';

let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Generate recommendations from research findings
 * @param {string} courseConcept - The course concept
 * @param {Object} researchFindings - Output from research-engine.js
 * @returns {Promise<Object>} recommendations array with reasoning
 */
export async function generateRecommendations(courseConcept, researchFindings) {
  console.log(`💡 Generating recommendations from research...\n`);

  try {
    const prompt = buildPrompt(courseConcept, researchFindings);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (!Array.isArray(parsed.recommendations)) {
      throw new Error('Response missing recommendations array');
    }

    const result = {
      recommendations: parsed.recommendations,
      generatedAt: new Date().toISOString(),
      researchInputHash: hashObject(researchFindings),
    };

    console.log(`✓ Generated ${result.recommendations.length} recommendations\n`);
    return result;
  } catch (error) {
    console.warn(`⚠ Recommendation generation failed: ${error.message}`);
    // Fallback: generate basic recommendations from research data
    return generateFallbackRecommendations(courseConcept, researchFindings);
  }
}

/**
 * Build the prompt for Claude to generate recommendations
 */
function buildPrompt(courseConcept, research) {
  const safeConcept = sanitizeConcept(courseConcept);
  return `
You are a course design expert. Based on the research findings below, generate prescriptive course recommendations.

COURSE CONCEPT: "${safeConcept}"

RESEARCH FINDINGS:
- Audience gaps: ${JSON.stringify(research.audienceGaps)}
- Topic coverage: ${JSON.stringify(research.topicCoverage)}
- Structural patterns: ${JSON.stringify(research.structuralPatterns)}
- Prerequisites: ${JSON.stringify(research.prerequisites)}

PLANNING QUESTIONS TO ANSWER:
1. Target audience (who should take this course?)
2. Core topics (what are the 3-5 main topics?)
3. Module structure (8 modules? Format?)
4. Assessment approach (debate, skill, build labs?)
5. Prerequisites (what skills should students have?)

Generate a JSON response with this structure:
{
  "recommendations": [
    {
      "question": "target_audience",
      "recommendation": "[Specific audience segment, e.g., 'High school students ages 14-18 interested in AI']",
      "reasoning": "[1-2 sentence explanation of why, based on research]"
    },
    {
      "question": "core_topics",
      "recommendation": "[Comma-separated list of 3-5 main topics]",
      "reasoning": "[Why these topics, based on gaps and demand]"
    },
    {
      "question": "module_structure",
      "recommendation": "[e.g., '8 modules: Intro, Scenario, Lesson, Context, Lab']",
      "reasoning": "[Why this structure, based on existing patterns]"
    },
    {
      "question": "assessment_approach",
      "recommendation": "[e.g., 'Debate, Skill, Build labs with portfolio artifacts']",
      "reasoning": "[Why this assessment mix, based on course goals]"
    },
    {
      "question": "prerequisites",
      "recommendation": "[Comma-separated list or 'None' if foundational]",
      "reasoning": "[Why these prerequisites, based on audience and complexity]"
    }
  ]
}

Return ONLY valid JSON, no markdown, no explanation. Each reasoning must be exactly 1-2 sentences.
`;
}

/**
 * Generate basic recommendations as fallback
 */
function generateFallbackRecommendations(courseConcept, research) {
  const recommendations = [
    {
      question: 'target_audience',
      recommendation: inferAudience(research),
      reasoning:
        'Based on gap analysis, this audience segment has minimal existing course coverage.',
    },
    {
      question: 'core_topics',
      recommendation: inferTopics(research, courseConcept),
      reasoning:
        'These topics address identified gaps in the course catalog and match learner demand signals.',
    },
    {
      question: 'module_structure',
      recommendation: `${research.structuralPatterns.averageModulesPerCourse || 8} modules: Intro, Scenario, Lesson, Context, Lab`,
      reasoning:
        'Matches established course structure pattern with active, lab-first learning approach.',
    },
    {
      question: 'assessment_approach',
      recommendation: 'Debate, Skill, Build labs with portfolio artifacts',
      reasoning:
        'Aligns with Aesop framework: debate for critical thinking, skill for hands-on practice, build for real-world application.',
    },
    {
      question: 'prerequisites',
      recommendation: 'Basic familiarity with concepts; no formal prerequisites',
      reasoning:
        'Makes course accessible to learners with diverse backgrounds while maintaining pedagogical rigor.',
    },
  ];

  return {
    recommendations,
    generatedAt: new Date().toISOString(),
    researchInputHash: hashObject(research),
    fallback: true,
  };
}

/**
 * Infer target audience from research gaps
 */
function inferAudience(research) {
  const gaps = research.audienceGaps || [];
  const lowestCoverage = [...gaps].sort((a, b) => a.currentCoverage - b.currentCoverage)[0];

  if (lowestCoverage) {
    const level =
      lowestCoverage.segment === 'beginner' ? 'students new to' : lowestCoverage.segment;
    return `${level} learners interested in applied AI`;
  }

  return 'Intermediate learners seeking practical AI skills';
}

/**
 * Infer core topics from research coverage
 */
function inferTopics(research, courseConcept) {
  const coverage = research.topicCoverage || [];
  const topics = coverage
    .slice(0, 4)
    .map(t => t.topic)
    .join(', ');

  if (topics) {
    return topics;
  }

  // Fallback: extract from course concept
  return courseConcept.split(/\s+/).slice(0, 3).join(', ');
}

/**
 * Simple hash of object for audit trail
 */
function hashObject(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export default {
  generateRecommendations,
};
