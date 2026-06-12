# AESOP Course Audit Report

**Generated:** 2026-06-12 14:09 UTC
**Status:** 🔴 ISSUES FOUND
**Errors:** 1 · **Warnings:** 27

---

## Course Registry (course-registry.json)

### Errors (1)
- 🔴 **MISSING_DIR**: `eval-benchmark` references `/ai-academy/modules/eval-benchmark/` which does not exist

### Warnings (24)
- 🟡 **EXTRA_MODULES**: `society` has 9 files but registry defines 8 modules
- 🟡 **EXTRA_MODULES**: `ai-and-education` has 7 files but registry defines 6 modules
- 🟡 **EXTRA_MODULES**: `ai-leadership` has 7 files but registry defines 6 modules
- 🟡 **EXTRA_MODULES**: `gpt-vs-claude-vs-gemini` has 9 files but registry defines 8 modules
- 🟡 **EXTRA_MODULES**: `ai-side-hustle-money` has 8 files but registry defines 6 modules
- 🟡 **EXTRA_MODULES**: `deploying-and-monitoring-ai` has 8 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `truth-detectives-ai-and-fake-info` has 6 files but registry defines 2 modules
- 🟡 **EXTRA_MODULES**: `voice-and-real-time-ai` has 8 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `ai-network-pentesting` has 8 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `pentesting-ai-agents` has 8 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `what-s-coming-next` has 8 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `ai-in-science` has 8 files but registry defines 7 modules
- 🟡 **EXTRA_MODULES**: `ai-and-the-writer-s-voice` has 8 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `ap-7` has 8 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `ai-work-and-automation-deep-dive` has 8 files but registry defines 7 modules
- 🟡 **EXTRA_MODULES**: `ai-agent-risk-and-oversight` has 8 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `ai-hype-critical-thinking` has 8 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `deep-learning-for-builders` has 8 files but registry defines 5 modules
- 🟡 **EXTRA_MODULES**: `build-ai-workflows-no-code` has 6 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `gemini-for-college-life` has 5 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `agile-ai-side-projects` has 8 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `prompt-engineering-that-works` has 8 files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `ai-in-gaming-and-interactive-media` has 6 files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `is-the-robot-being-fair` has 4 files but registry defines 1 modules

## courses.html

✅ No issues found.

## Electives Hub (electives-hub.html)

✅ No issues found. Hub is registry-driven (no hardcoded `BASE_COURSES`); course data is loaded from `course-registry.json` at runtime, so H-1/H-2 checks are not applicable.

## Cross-References

### Warnings (3)
- 🟡 **NOT_IN_COURSES_HTML**: registry course "ar-8" has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course "ap-7" has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course "eval-benchmark" has no link from courses.html

---

## Summary

**1 error(s) require attention:**
1. **MISSING_DIR**: `eval-benchmark` references `/ai-academy/modules/eval-benchmark/` which does not exist

### Stats
- Registry courses: 131 (126 live, 3 coming soon, 2 retired)
- courses.html internal links checked: 163
- courses.html ?course= references: 123
- Electives hub: registry-driven (no hardcoded `BASE_COURSES`)
- Module files verified: 780
