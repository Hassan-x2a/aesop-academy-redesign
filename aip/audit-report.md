# AESOP Course Audit Report

**Generated:** 2026-05-29 14:10 UTC
**Status:** 🔴 ISSUES FOUND
**Errors:** 1 · **Warnings:** 63
**Hub mode:** registry-driven (no hardcoded `BASE_COURSES`; H-1/H-2/X-2/X-3 fall back to the JSON-LD ItemList in `electives-hub.html`).

---

## Course Registry (course-registry.json)

### Errors (1)

- 🔴 **MISSING_DIR**: Registry course `eval-benchmark` references `/ai-academy/modules/eval-benchmark/` which does not exist

### Warnings (23)

- 🟡 **EXTRA_MODULES**: `ai-and-education` (slug `ai-and-education`) has 7 module files but registry defines 6 modules
- 🟡 **EXTRA_MODULES**: `ai-leadership` (slug `ai-leadership`) has 7 module files but registry defines 6 modules
- 🟡 **EXTRA_MODULES**: `gpt-vs-claude-vs-gemini` (slug `gpt-vs-claude-vs-gemini`) has 9 module files but registry defines 8 modules
- 🟡 **EXTRA_MODULES**: `ai-side-hustle-money` (slug `ai-side-hustle-money`) has 8 module files but registry defines 6 modules
- 🟡 **EXTRA_MODULES**: `deploying-and-monitoring-ai` (slug `deploying-and-monitoring-ai`) has 8 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `truth-detectives-ai-and-fake-info` (slug `truth-detectives-ai-and-fake-info`) has 6 module files but registry defines 2 modules
- 🟡 **EXTRA_MODULES**: `voice-and-real-time-ai` (slug `voice-and-real-time-ai`) has 8 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `ai-network-pentesting` (slug `ai-network-pentesting`) has 8 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `pentesting-ai-agents` (slug `pentesting-ai-agents`) has 8 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `what-s-coming-next` (slug `what-s-coming-next`) has 8 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `ai-in-science` (slug `ai-in-science`) has 8 module files but registry defines 7 modules
- 🟡 **EXTRA_MODULES**: `ai-and-the-writer-s-voice` (slug `ai-and-the-writer-s-voice`) has 8 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `ap-7` (slug `ap-7`) has 8 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `ai-work-and-automation-deep-dive` (slug `ai-work-and-automation-deep-dive`) has 8 module files but registry defines 7 modules
- 🟡 **EXTRA_MODULES**: `ai-agent-risk-and-oversight` (slug `ai-agent-risk-and-oversight`) has 8 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `ai-hype-critical-thinking` (slug `ai-hype-critical-thinking`) has 8 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `deep-learning-for-builders` (slug `deep-learning-for-builders`) has 8 module files but registry defines 5 modules
- 🟡 **EXTRA_MODULES**: `build-ai-workflows-no-code` (slug `build-ai-workflows-no-code`) has 6 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `gemini-for-college-life` (slug `gemini-for-college-life`) has 5 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `agile-ai-side-projects` (slug `agile-ai-side-projects`) has 8 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `prompt-engineering-that-works` (slug `prompt-engineering-that-works`) has 8 module files but registry defines 1 modules
- 🟡 **EXTRA_MODULES**: `ai-in-gaming-and-interactive-media` (slug `ai-in-gaming-and-interactive-media`) has 6 module files but registry defines 3 modules
- 🟡 **EXTRA_MODULES**: `is-the-robot-being-fair` (slug `is-the-robot-being-fair`) has 4 module files but registry defines 1 modules

## courses.html

✅ No issues found.

## Electives Hub (electives-hub.html)

✅ No issues found.

## Cross-References

### Warnings (40)

- 🟡 **NOT_IN_COURSES_HTML**: registry course "ar-8" has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course "ap-7" has no link from courses.html
- 🟡 **NOT_IN_COURSES_HTML**: registry course "eval-benchmark" has no link from courses.html
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "claude-ai-chat" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "claude-cowork" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "claude-code" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-tutor-under-the-hood" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-lens-on-the-world" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "how-ai-actually-works" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "prompt-engineering-that-works" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-in-gaming-and-interactive-media" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-ethics-foundations" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-safety-for-everyone" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-tools-for-real-teaching" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "is-the-robot-being-fair" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "pick-the-right-ai-tool" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "wispr-flow" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "how-machines-learn" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-and-architecture" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "ai-safety-and-alignment" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "real-or-rendered" missing from electives-hub
- 🟡 **NOT_IN_ELECTIVES_HUB**: registry course "eval-benchmark" missing from electives-hub
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-and-architecture" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-ethics-foundations" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-in-gaming-and-interactive-media" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-lens-on-the-world" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-safety-and-alignment" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-safety-for-everyone" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-tools-for-real-teaching" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "ai-tutor-under-the-hood" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "claude-ai-chat" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "claude-code" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "claude-cowork" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "how-ai-actually-works" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "how-machines-learn" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "is-the-robot-being-fair" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "pick-the-right-ai-tool" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "prompt-engineering-that-works" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "real-or-rendered" but electives-hub does not define it
- 🟡 **COURSES_HUB_MISMATCH**: courses.html links to "wispr-flow" but electives-hub does not define it

---

## Summary

**1 error(s) require attention:**

1. MISSING_DIR: Registry course `eval-benchmark` references `/ai-academy/modules/eval-benchmark/` which does not exist

### Stats
- Registry courses: 131 (126 live, 3 coming soon, 2 retired)
- courses.html internal links checked: 21
- Electives hub courses (JSON-LD ItemList): 109
- Module files verified: 764