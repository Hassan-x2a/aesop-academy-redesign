#!/usr/bin/env node
/**
 * CLI wrapper for the course development research pipeline.
 * Usage: node aesop-api/run-research.js "AI Ethics for High School"
 * Called by the /aesop-course-builder skill during Stage 0.
 */

import path from 'path';
import { developCoursePlanning, displayRecommendations } from './lib/course-development-assistant.js';

const concept = process.argv.slice(2).join(' ').trim();

if (!concept) {
  console.error('Usage: node run-research.js "<course concept>"');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠ Note: Some recommendations are based on fallback logic (ANTHROPIC_API_KEY not set — using course registry only)');
}

(async () => {
  try {
    const planningPackage = await developCoursePlanning(concept);
    console.log(displayRecommendations(planningPackage));

    // Write machine-readable JSON to a temp file the skill can read
    const { writeFile } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const outPath = path.join(tmpdir(), 'aesop-research-output.json');
    await writeFile(outPath, JSON.stringify(planningPackage, null, 2), 'utf8');
    console.log(`\n[Research output saved to ${outPath}]\n`);
  } catch (error) {
    console.error(`✗ Research failed: ${error.message}`);
    process.exit(1);
  }
})();
