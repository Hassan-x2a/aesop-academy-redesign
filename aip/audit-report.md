# AESOP Course Audit Report

**Generated:** 2026-06-03 14:09 UTC  
**Status:** 🔴 ISSUES FOUND  
**Errors:** 12 · **Warnings:** 27

---

## Course Registry (course-registry.json)

### Errors (1)

- 🔴 **MISSING_DIR**: Registry course `eval-benchmark` references `/ai-academy/modules/eval-benchmark/` which does not exist

### Warnings (24)

- 🟡 **EXTRA_MODULES**: `ai-in-society` has 9 module file(s) but registry defines 8 module(s)
- 🟡 **EXTRA_MODULES**: `ai-and-education` has 7 module file(s) but registry defines 6 module(s)
- 🟡 **EXTRA_MODULES**: `ai-leadership` has 7 module file(s) but registry defines 6 module(s)
- 🟡 **EXTRA_MODULES**: `gpt-vs-claude-vs-gemini` has 9 module file(s) but registry defines 8 module(s)
- 🟡 **EXTRA_MODULES**: `ai-side-hustle-money` has 8 module file(s) but registry defines 6 module(s)
- 🟡 **EXTRA_MODULES**: `deploying-and-monitoring-ai` has 8 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `truth-detectives-ai-and-fake-info` has 6 module file(s) but registry defines 2 module(s)
- 🟡 **EXTRA_MODULES**: `voice-and-real-time-ai` has 8 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `ai-network-pentesting` has 8 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `pentesting-ai-agents` has 8 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `what-s-coming-next` has 8 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `ai-in-science` has 8 module file(s) but registry defines 7 module(s)
- 🟡 **EXTRA_MODULES**: `ai-and-the-writer-s-voice` has 8 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `ap-7` has 8 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `ai-work-and-automation-deep-dive` has 8 module file(s) but registry defines 7 module(s)
- 🟡 **EXTRA_MODULES**: `ai-agent-risk-and-oversight` has 8 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `ai-hype-critical-thinking` has 8 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `deep-learning-for-builders` has 8 module file(s) but registry defines 5 module(s)
- 🟡 **EXTRA_MODULES**: `build-ai-workflows-no-code` has 6 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `gemini-for-college-life` has 5 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `agile-ai-side-projects` has 8 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `prompt-engineering-that-works` has 8 module file(s) but registry defines 1 module(s)
- 🟡 **EXTRA_MODULES**: `ai-in-gaming-and-interactive-media` has 6 module file(s) but registry defines 3 module(s)
- 🟡 **EXTRA_MODULES**: `is-the-robot-being-fair` has 4 module file(s) but registry defines 1 module(s)

## courses.html

### Errors (11)

- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-misinformation/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/gpt-vs-claude-vs-gemini/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-agents-in-the-wild/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-autonomous-systems/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-in-game-design-i/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/building-an-ai-first-business/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/building-ai-agents-v-optimization/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/working-with-the-anthropic-api/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/vertex-ai-data-agents/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-side-hustle-money/` (directory) but it has no index.html
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-job-market-impact/` (directory) but it has no index.html

## Electives Hub (electives-hub.html)

_Note: electives-hub.html is registry-only (v1.1.0+) — no `BASE_COURSES` array; courses are loaded directly from `course-registry.json`. Checks H-1/H-2 are not applicable._

✅ No issues found.

## Cross-References

_Note: X-2 and X-3 depend on BASE_COURSES, which the hub no longer defines (registry-only). Only X-1 is evaluated._

### Warnings (3)

- 🟡 **NOT_IN_COURSES_HTML**: registry course `ar-8` has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course `ap-7` has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course `eval-benchmark` has no link from courses.html

---

## Summary

**12 error(s) require attention:**
1. **MISSING_DIR**: Registry course `eval-benchmark` references `/ai-academy/modules/eval-benchmark/` which does not exist
2. **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-misinformation/` (directory) but it has no index.html
3. **DEAD_LINK**: courses.html links to `/ai-academy/modules/gpt-vs-claude-vs-gemini/` (directory) but it has no index.html
4. **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-agents-in-the-wild/` (directory) but it has no index.html
5. **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-autonomous-systems/` (directory) but it has no index.html
6. **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-in-game-design-i/` (directory) but it has no index.html
7. **DEAD_LINK**: courses.html links to `/ai-academy/modules/building-an-ai-first-business/` (directory) but it has no index.html
8. **DEAD_LINK**: courses.html links to `/ai-academy/modules/building-ai-agents-v-optimization/` (directory) but it has no index.html
9. **DEAD_LINK**: courses.html links to `/ai-academy/modules/working-with-the-anthropic-api/` (directory) but it has no index.html
10. **DEAD_LINK**: courses.html links to `/ai-academy/modules/vertex-ai-data-agents/` (directory) but it has no index.html

### Stats
- Registry courses: 131 (126 live, 3 coming soon)
- courses.html internal links checked: 21
- Electives hub BASE_COURSES: 0 _(registry-only hub — no BASE_COURSES array)_
- Module files verified: 780
