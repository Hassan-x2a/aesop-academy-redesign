# AESOP Course Audit Report

**Generated:** 2026-06-05 14:11 UTC
**Status:** 🔴 ISSUES FOUND
**Errors:** 12 · **Warnings:** 26

---

## Auditor Notes

- electives-hub.html has no hardcoded `BASE_COURSES` array — it loads every `status:"live"` entry from `course-registry.json` via `loadCourseRegistry()` (`electives-hub.html:2149-2171`). For audit purposes the effective BASE_COURSES set is every registry entry where `status === "live"`; checks H-1 and H-2 collapse into the registry directory checks already performed in Step 1.

## Course Registry (course-registry.json)

### Errors (1)
- 🔴 **MISSING_DIR**: eval-benchmark (directory `ai-academy/modules/eval-benchmark/` not found)

### Warnings (23)
- 🟡 **EXTRA_MODULES**: `ai-and-education` has 7 module files but registry defines 6
- 🟡 **EXTRA_MODULES**: `ai-leadership` has 7 module files but registry defines 6
- 🟡 **EXTRA_MODULES**: `gpt-vs-claude-vs-gemini` has 9 module files but registry defines 8
- 🟡 **EXTRA_MODULES**: `ai-side-hustle-money` has 8 module files but registry defines 6
- 🟡 **EXTRA_MODULES**: `deploying-and-monitoring-ai` has 8 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `truth-detectives-ai-and-fake-info` has 6 module files but registry defines 2
- 🟡 **EXTRA_MODULES**: `voice-and-real-time-ai` has 8 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `ai-network-pentesting` has 8 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `pentesting-ai-agents` has 8 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `what-s-coming-next` has 8 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `ai-in-science` has 8 module files but registry defines 7
- 🟡 **EXTRA_MODULES**: `ai-and-the-writer-s-voice` has 8 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `ap-7` has 8 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `ai-work-and-automation-deep-dive` has 8 module files but registry defines 7
- 🟡 **EXTRA_MODULES**: `ai-agent-risk-and-oversight` has 8 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `ai-hype-critical-thinking` has 8 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `deep-learning-for-builders` has 8 module files but registry defines 5
- 🟡 **EXTRA_MODULES**: `build-ai-workflows-no-code` has 6 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `gemini-for-college-life` has 5 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `agile-ai-side-projects` has 8 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `prompt-engineering-that-works` has 8 module files but registry defines 1
- 🟡 **EXTRA_MODULES**: `ai-in-gaming-and-interactive-media` has 6 module files but registry defines 3
- 🟡 **EXTRA_MODULES**: `is-the-robot-being-fair` has 4 module files but registry defines 1

## courses.html

### Errors (11)
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-misinformation/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/gpt-vs-claude-vs-gemini/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-agents-in-the-wild/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-autonomous-systems/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-in-game-design-i/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/building-an-ai-first-business/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/building-ai-agents-v-optimization/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/working-with-the-anthropic-api/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/vertex-ai-data-agents/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-side-hustle-money/` but directory has no `index.html`
- 🔴 **DEAD_LINK**: courses.html links to `/ai-academy/modules/ai-job-market-impact/` but directory has no `index.html`

## Electives Hub (electives-hub.html)

✅ No issues found.

## Cross-References

### Warnings (3)
- 🟡 **NOT_IN_COURSES_HTML**: registry course "ar-8" has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course "ap-7" has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course "eval-benchmark" has no link from courses.html

---

## Summary

**12 error(s) require attention:**
1. MISSING_DIR: eval-benchmark (directory `ai-academy/modules/eval-benchmark/` not found)
2. DEAD_LINK: courses.html links to `/ai-academy/modules/ai-misinformation/` but directory has no `index.html`
3. DEAD_LINK: courses.html links to `/ai-academy/modules/gpt-vs-claude-vs-gemini/` but directory has no `index.html`
4. DEAD_LINK: courses.html links to `/ai-academy/modules/ai-agents-in-the-wild/` but directory has no `index.html`
5. DEAD_LINK: courses.html links to `/ai-academy/modules/ai-autonomous-systems/` but directory has no `index.html`
6. DEAD_LINK: courses.html links to `/ai-academy/modules/ai-in-game-design-i/` but directory has no `index.html`
7. DEAD_LINK: courses.html links to `/ai-academy/modules/building-an-ai-first-business/` but directory has no `index.html`
8. DEAD_LINK: courses.html links to `/ai-academy/modules/building-ai-agents-v-optimization/` but directory has no `index.html`
9. DEAD_LINK: courses.html links to `/ai-academy/modules/working-with-the-anthropic-api/` but directory has no `index.html`
10. DEAD_LINK: courses.html links to `/ai-academy/modules/vertex-ai-data-agents/` but directory has no `index.html`
11. DEAD_LINK: courses.html links to `/ai-academy/modules/ai-side-hustle-money/` but directory has no `index.html`
12. DEAD_LINK: courses.html links to `/ai-academy/modules/ai-job-market-impact/` but directory has no `index.html`

### Stats
- Registry courses: 131 (126 live, 3 coming soon, 2 retired)
- courses.html internal links checked: 21
- courses.html `?course=` references: 123
- Electives hub effective BASE_COURSES: 126 (loaded dynamically from registry where `status === "live"`)
- Module files verified: 764
