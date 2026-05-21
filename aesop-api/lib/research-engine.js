/**
 * Research Engine
 * Queries Pinecone, course registries, and Claude web search to identify:
 * - Audience gaps in course offerings
 * - Topic coverage and gaps
 * - Structural patterns in existing courses
 * - Prerequisites and skill recommendations
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { queryPinecone } from './pinecone-query.js';
import { getAllCourses, getCoverageSummary } from './registry-parser.js';
import { sanitizeConcept } from './sanitize.js';

let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Main research entry point
 * @param {string} courseConcept - The course concept to research
 * @returns {Promise<Object>} researchFindings
 */
export async function runResearch(courseConcept) {
  const safeConcept = sanitizeConcept(courseConcept);
  console.log(`🔍 Researching: "${safeConcept}"\n`);

  const sourcesUsed = [];

  // 1. Query course registries
  const registryCoverage = queryRegistries(safeConcept);
  sourcesUsed.push('course registry (courses-v2.html, courses.html)');
  console.log(`✓ Registry query complete (${registryCoverage.existingCourses.length} related courses found)`);

  // 2. Query Pinecone (optional — degrades gracefully)
  const pineconeResults = await queryPinecone(safeConcept, 5);
  if (pineconeResults.source === 'pinecone') {
    sourcesUsed.push(`Pinecone aesop-academy index (${pineconeResults.count} results)`);
  }
  console.log(`✓ Pinecone: source=${pineconeResults.source}, results=${pineconeResults.count || 0}`);

  // 3. Web search via Claude web_search tool
  const webSearch = await performWebSearch(safeConcept);
  if (webSearch.realSearch) sourcesUsed.push('Claude web search');
  console.log(`✓ Web search complete (real=${webSearch.realSearch})`);

  // 4. Synthesize
  const findings = await synthesizeFindings(safeConcept, registryCoverage, pineconeResults, webSearch, sourcesUsed);
  console.log(`✓ Research synthesis complete\n`);
  return findings;
}

function queryRegistries(concept) {
  const allCourses = getAllCourses();
  const summary = getCoverageSummary();
  const keywords = concept.toLowerCase().split(/\s+/);

  const relevantCourses = allCourses.filter(course => {
    const courseText = `${course.title} ${course.description}`.toLowerCase();
    return keywords.some(kw => kw.length > 2 && courseText.includes(kw));
  });

  return {
    existingCourses: relevantCourses.map(c => ({
      id: c.id,
      title: c.title,
      audience: c.audience,
      topics: c.topics,
      modules: c.moduleCount,
    })),
    totalCoursesInCatalog: allCourses.length,
    coverageSummary: summary,
  };
}

/**
 * Perform web search using Claude's web_search tool.
 * Falls back to empty results if the tool is unavailable.
 */
async function performWebSearch(concept) {
  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content: `Search the web for information about: "${concept}" as an online course topic. Identify: 1) learner demand signals, 2) commonly searched related topics, 3) skill gaps mentioned by learners. Be concise.`,
        },
      ],
    });

    // Collect all text content (Claude may include tool_result + text blocks)
    const textParts = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text);

    return {
      searchResults: textParts.join('\n'),
      model: response.model,
      realSearch: true,
    };
  } catch (error) {
    console.warn(`⚠ Web search failed: ${error.message}`);
    return { searchResults: '', error: error.message, realSearch: false };
  }
}

/**
 * Build the synthesis prompt. Exported for unit testing.
 */
export function buildSynthesisPrompt(concept, registry, pinecone, webSearch) {
  const topPineconeMatches = (pinecone.results || [])
    .slice(0, 5)
    .map(r => `  - "${r.metadata?.title || r.id}" (score: ${(r.score || 0).toFixed(3)})`)
    .join('\n') || '  (none)';

  return `You are analyzing research for a new AI course: "${concept}"

Existing courses on related topics: ${registry.existingCourses.length} of ${registry.totalCoursesInCatalog} total
Audience distribution:
${registry.existingCourses.map(c => `- ${c.title}: ${Array.isArray(c.audience) ? c.audience.join(', ') : c.audience}`).join('\n') || '(none found)'}

Semantically similar courses from vector index (Pinecone):
${topPineconeMatches}

Web research insights:
${webSearch.searchResults || '(web search unavailable)'}

Generate structured findings (JSON only, no markdown):
{
  "audienceGaps": [{ "segment": "string", "currentCoverage": 0, "demand": "high|medium|low" }],
  "topicCoverage": [{ "topic": "string", "existingCourseIds": ["id1"], "gaps": "string" }],
  "structuralPatterns": { "averageModulesPerCourse": 8, "commonMajorTopics": ["string"], "assessmentApproaches": ["string"] },
  "prerequisites": [{ "skill": "string", "recommendedLevel": "foundational|intermediate|advanced" }],
  "researchSources": ["string"]
}`;
}

async function synthesizeFindings(concept, registry, pinecone, webSearch, sourcesUsed) {
  const prompt = buildSynthesisPrompt(concept, registry, pinecone, webSearch);

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const findings = JSON.parse(jsonText);

    return {
      audienceGaps: findings.audienceGaps || [],
      topicCoverage: findings.topicCoverage || [],
      structuralPatterns: findings.structuralPatterns || {},
      prerequisites: findings.prerequisites || [],
      researchSources: sourcesUsed,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`⚠ Synthesis failed: ${error.message}. Returning partial findings.`);
    return {
      audienceGaps: inferAudienceGaps(registry),
      topicCoverage: inferTopicCoverage(registry),
      structuralPatterns: inferStructuralPatterns(registry),
      prerequisites: [],
      researchSources: sourcesUsed,
      timestamp: new Date().toISOString(),
    };
  }
}

function inferAudienceGaps(registry) {
  const audienceCounts = {};
  registry.existingCourses.forEach(course => {
    const audiences = Array.isArray(course.audience) ? course.audience : [course.audience];
    audiences.forEach(aud => {
      audienceCounts[aud] = (audienceCounts[aud] || 0) + 1;
    });
  });

  const potentialAudiences = ['beginner', 'intermediate', 'advanced', 'technical', 'business'];
  return potentialAudiences.map(aud => ({
    segment: aud,
    currentCoverage: audienceCounts[aud] || 0,
    demand: 'medium',
  }));
}

function inferTopicCoverage(registry) {
  const topicMap = {};
  registry.existingCourses.forEach(course => {
    const topics = Array.isArray(course.topics) ? course.topics : [];
    topics.forEach(topic => {
      if (!topicMap[topic]) topicMap[topic] = [];
      topicMap[topic].push(course.id);
    });
  });

  return Object.entries(topicMap).map(([topic, courses]) => ({
    topic,
    existingCourseIds: courses,
    gaps: `Covered by ${courses.length} course(s)`,
  }));
}

function inferStructuralPatterns(registry) {
  const modules = registry.existingCourses.map(c => c.modules).filter(Boolean);
  const avgModules = modules.length > 0 ? modules.reduce((a, b) => a + b, 0) / modules.length : 8;

  return {
    averageModulesPerCourse: Math.round(avgModules),
    commonMajorTopics: ['AI', 'skill development', 'practical application'],
    assessmentApproaches: ['debate', 'skill lab', 'build project'],
  };
}

export default { runResearch, buildSynthesisPrompt };
