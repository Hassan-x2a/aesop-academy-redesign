# Task #1 Planning — Modify Course Development Engine to Do Research

## DESIGN DISCUSSION — Research & Recommendations for Course Planning

### User Problem

When building courses directly (without AIP), the `/aesop-course-builder` skill enters a planning phase that asks questions (target audience, core topics, module structure, assessment approach, prerequisites). Today, you must answer from intuition/memory with no data backing. With research + recommendations, the skill should research answers first, present backed-by-data suggestions with brief reasoning, and let you approve, reject, or modify them before proceeding to course generation.

### End-to-End Reachability

**Journey:**
1. Invoke `/aesop-course-builder` with a course concept
2. Skill researches answers to planning questions via Corpus Registry + global web search
3. Skill presents recommendations with reasoning (1-2 sentences per recommendation)
4. You approve, reject, or modify each recommendation
5. Skill generates course using approved parameters

**Gaps closed by this feature:**
- No current Corpus Registry access in the skill
- No research phase before planning questions
- No way to feed research data into recommendations
- All answers are manual/prose-based today

### System Components

**Data Sources:**
- Pinecone corpus (via project credentials)
- courses.html (v1 course registry)
- courses-v2.html (v2 course registry)
- Global web search (topic research only; NOT AIP signals like Google Trends/Reddit)

**Processing Flow:**
1. **Research Module** — Calls Claude (Sonnet) to synthesize research from Pinecone, course registries, and web search. Outputs: audience gaps, existing topic coverage, structural patterns, prerequisite analysis.
2. **Recommendation Generator** — Claude synthesizes research into specific answers (audience, topics, structure, prerequisites, assessment) with brief reasoning (1-2 sentences per recommendation).
3. **Planning Phase UI** — Presents recommendations with reasoning; accepts approval/modification.
4. **Course Builder** — Uses approved parameters to generate course (minimal change).

**Synchronous flow:** Research → Recommendations → Planning Questions → Approval/Modification → Build

**Recommendation style:** Prescriptive (one strong recommendation per question) with brief reasoning explaining why.

### Architectural Dependencies

1. **Web Search** — Implementation-agnostic; Claude's WebSearch tool is acceptable.
2. **Pinecone & Registry Access** — Pinecone credentials already in project. Skill may access via aesop-api proxy or directly (TBD in build phase). Graceful degradation: if Pinecone unavailable, warn user but continue with web search + courses.html/courses-v2.html only.
3. **Explanation Style** — Short (1-2 sentences), cite sources implicitly.
4. **Claude Model** — Use Sonnet (not Haiku) for better research quality. Same model/token budget used for recommendations as for course generation.

### Scope of Changes

1. **New Research Module** — Queries Pinecone, parses courses.html/courses-v2.html, runs web search. Input: course concept. Output: research findings (audience, topic coverage, structure patterns).
2. **New Recommendation Generator** — Synthesizes research into answers for each planning question with 1-2 sentence reasoning per answer.
3. **Modified Planning Phase** — Present recommendations first, then ask for approval/modification.
4. **Minimal Change to Course Builder** — Accept researched/approved parameters and proceed as normal.

All research done via Claude (Sonnet) + Anthropic SDK. No separate API keys or credentials needed.

### Key Risk

**Primary concern:** Course development becomes incorrect or takes excessive time due to poor research/recommendations.

**Mitigations:**
- Recommendations must map cleanly to actual planning questions (no mismatch).
- Graceful degradation if Pinecone unavailable.
- Use Sonnet (better quality) for research synthesis.
- User can manually correct/override recommendations; design expects some manual review to be part of the workflow.

**Assumption to validate:** Claude's research (via web search + Pinecone + course registries) is accurate and relevant enough to accelerate course development without creating delays or content errors.

### Design Verdict

✅ **This design serves the persona.** You get research-backed recommendations upfront, reducing cold-start friction on planning questions. No architectural blockers. Graceful degradation if Pinecone is unavailable. Next step: outline phases and dependencies in Phase 2.

---

*Saved: 2026-05-20 Design Discussion locked. Ready for Outline Plan.*

## OUTLINE PLAN — Modify Course Development Engine to Do Research

### Phases

1. **Infrastructure & Data Access Setup**
   Build Pinecone integration, web search setup, and context aggregation. Load courses.html and courses-v2.html data for research queries. Set up Claude (Sonnet) connection via Anthropic SDK.

2. **Research Module Implementation**
   Create the research engine that queries Pinecone (audience/topic gaps), parses existing course registries, and runs web search. Output: structured research findings (gaps, coverage, patterns, prerequisites).

3. **Recommendation Generator**
   Build Claude synthesis layer that takes research findings and generates prescriptive recommendations (audience, topics, structure, prerequisites, assessment) with 1-2 sentence reasoning per recommendation. Includes graceful degradation if Pinecone unavailable.

4. **Planning Phase Integration**
   Modify `/aesop-course-builder` planning phase to present recommendations upfront with reasoning, collect user approval/modification, and feed approved parameters to course generation.

5. **End-to-End Testing & Validation**
   Test research → recommendations → approval → build flow. Validate recommendation accuracy, error handling, graceful degradation, and that recommendations map cleanly to planning questions.

### Phase Dependencies

- Phase 1 (Infrastructure) blocks Phase 2 (Research): Pinecone + web search must be accessible before research module can query them.
- Phase 2 (Research) blocks Phase 3 (Recommendation Generator): Recommendations depend on research data output.
- Phase 3 (Recommendation Generator) blocks Phase 4 (Planning Integration): Planning phase needs recommendations to display.
- Phase 4 (Planning Integration) blocks Phase 5 (Testing): Testing validates the full workflow.

### Components Modified

- **New: Research Module** — Queries Pinecone, parses courses.html/courses-v2.html, executes web search. Files: new module in aesop-course-builder or aesop-api.
- **New: Recommendation Generator** — Claude synthesis engine with graceful degradation. Integrated into research module or as separate layer.
- **Modified: Planning Phase** (`/aesop-course-builder`) — Add recommendation presentation and user approval flow before asking planning questions.
- **Minimal: Course Builder** — Accept approved parameters; no logic changes.

### Scope Boundaries

**IN SCOPE:**
- Research module (Pinecone + web search + courses.html/v2.html queries)
- Recommendation generator (Claude/Sonnet synthesis with brief reasoning)
- Planning phase UI modifications (display recommendations, accept approval/modification)
- Graceful degradation if Pinecone unavailable (warn + continue with web search only)
- Full Claude API integration (model, token usage, error handling)
- Test suite for research accuracy and end-to-end workflow

**OUT OF SCOPE (defer to later):**
- Course generation logic changes (course builder stays minimal)
- AIP feature integration or comparison
- Course registry schema changes or courses.html redesign
- UI styling/design (functional presentation only)
- Offline/batch research (synchronous only per design)

### Key Assumptions & Risks

- **Research Quality Risk:** If Claude's research (via web search + Pinecone + registries) is inaccurate or irrelevant, recommendations could mislead course development.
  - Mitigation: Use Sonnet (higher quality), manual override allowed, validate in testing phase.

- **Pinecone Access Risk:** If Pinecone credentials aren't accessible to the skill, research will be incomplete.
  - Mitigation: Graceful degradation (warn user, continue with web search + courses.html/v2.html only).

- **Question Mapping Risk:** Recommendations might not map cleanly to the actual planning questions the skill asks.
  - Mitigation: During Phase 4 integration, audit question list and ensure each recommendation answers a specific question.

- **Performance Risk:** Synchronous research → recommendation → display could timeout or be slow.
  - Mitigation: Implement timeout handling, optional async research in future (out of scope).

### Estimate

Phases: 5  
Estimated complexity: **Medium**
- No architectural blockers
- Straightforward component additions (research + recommendation)
- Moderate Claude API integration (Sonnet, tool use)
- Risk mitigated by graceful degradation and user override

---

*Saved: 2026-05-20 Outline Plan locked. Ready for Detailed Plan.*

## DETAILED PLAN — Modify Course Development Engine to Do Research

### Tasks by Phase

#### Phase 1: Infrastructure & Data Access Setup

**Task 1.1: Set up Claude (Sonnet) connection via Anthropic SDK**
- What: Add Anthropic SDK to the course builder skill, configure Sonnet model access, and test API connectivity.
- Files modified: `.claude/skills/aesop-course-builder/` (new or existing), environment/config files for API key reference
- Depends on: none
- Effort: S

**Task 1.2: Load and parse courses.html and courses-v2.html registries**
- What: Create utility function to fetch and parse both course registry HTML files, extract course metadata (audience, topics, structure, prerequisites).
- Files modified: `aesop-api/` (new research utility module) or `.claude/skills/aesop-course-builder/lib/`
- Depends on: none
- Effort: M

**Task 1.3: Set up Pinecone query integration**
- What: Create wrapper function to query Pinecone corpus using project credentials, with error handling and graceful degradation.
- Files modified: `aesop-api/` or course builder lib (same module as 1.2)
- Depends on: Task 1.1 (need API infrastructure in place)
- Effort: M

#### Phase 2: Research Module Implementation

**Task 2.1: Build research engine that queries all data sources**
- What: Create research module that takes course concept as input, queries Pinecone (with graceful degradation), parses course registries, and runs web search to identify audience gaps, topic coverage, structural patterns, and prerequisites.
- Files modified: `aesop-api/research-engine.js` (new) or course builder lib
- Depends on: Task 1.2, Task 1.3 (needs registry parsing and Pinecone access)
- Effort: L

**Task 2.2: Structure research output into standardized findings**
- What: Define and implement research findings format (gaps, coverage, patterns, prerequisites) that will be consumed by the recommendation generator.
- Files modified: `aesop-api/research-engine.js` (or lib module)
- Depends on: Task 2.1
- Effort: S

#### Phase 3: Recommendation Generator

**Task 3.1: Build Claude synthesis prompt for recommendations**
- What: Create prompt that takes research findings and generates prescriptive recommendations (audience, topics, structure, prerequisites, assessment) with 1-2 sentence reasoning per recommendation.
- Files modified: `aesop-api/recommendation-generator.js` (new) or course builder lib
- Depends on: Task 1.1 (Claude API), Task 2.2 (research findings format)
- Effort: M

**Task 3.2: Implement graceful degradation when Pinecone unavailable**
- What: Add error handling and fallback logic so recommendations can be generated using only web search + course registry data if Pinecone is unavailable; warn user of degraded mode.
- Files modified: `aesop-api/recommendation-generator.js`
- Depends on: Task 3.1
- Effort: M

#### Phase 4: Planning Phase Integration

**Task 4.1: Audit current planning phase questions in /aesop-course-builder**
- What: Review existing planning phase to identify all questions asked (audience, topics, structure, prerequisites, assessment, etc.) and ensure recommendations map 1:1.
- Files modified: None (audit only; document findings)
- Depends on: none
- Effort: S

**Task 4.2: Modify planning phase to present recommendations upfront**
- What: Update /aesop-course-builder skill to call research engine and recommendation generator before asking planning questions; present recommendations with reasoning and collect approval/modification.
- Files modified: `.claude/skills/aesop-course-builder/` (main skill file)
- Depends on: Task 4.1 (question audit), Task 2.1 (research ready), Task 3.1 (recommendation ready)
- Effort: L

**Task 4.3: Wire approved recommendations into course generation**
- What: Update course builder to accept and use approved (or modified) recommendations as parameters for course generation; minimal logic changes to builder itself.
- Files modified: `.claude/skills/aesop-course-builder/` (same as 4.2, or separate module if using aesop-api)
- Depends on: Task 4.2
- Effort: M

#### Phase 5: End-to-End Testing & Validation

**Task 5.1: Write test suite for research engine accuracy**
- What: Create tests that validate research findings (gaps identified, topic coverage, patterns detected) against known course corpus; test graceful degradation when Pinecone unavailable.
- Files modified: `aesop-api/tests/research-engine.test.js` or similar
- Depends on: Task 2.1
- Effort: M

**Task 5.2: Write test suite for recommendation generator**
- What: Create tests that validate recommendations map cleanly to planning questions, reasoning is present, output format is correct, graceful degradation works.
- Files modified: `aesop-api/tests/recommendation-generator.test.js`
- Depends on: Task 3.1
- Effort: M

**Task 5.3: End-to-end manual walkthrough**
- What: Build a test course from start (invoke /aesop-course-builder) to finish (course generated with approved recommendations). Validate research quality, recommendation accuracy, approval flow, and final course structure.
- Files modified: None (manual testing)
- Depends on: Task 4.3 (full integration ready)
- Effort: M

---

### Task Execution Order

1. Task 1.1 — Claude (Sonnet) setup (no dependencies)
2. Task 1.2 — Parse course registries (no dependencies)
3. Task 1.3 — Pinecone integration (depends on 1.1)
4. Task 2.1 — Research engine (depends on 1.2, 1.3)
5. Task 2.2 — Structure research findings (depends on 2.1)
6. Task 3.1 — Recommendation synthesis prompt (depends on 1.1, 2.2)
7. Task 3.2 — Graceful degradation (depends on 3.1)
8. Task 4.1 — Audit planning questions (no dependencies)
9. Task 4.2 — Modify planning phase (depends on 4.1, 2.1, 3.1)
10. Task 4.3 — Wire recommendations to course builder (depends on 4.2)
11. Task 5.1 — Test research engine (depends on 2.1)
12. Task 5.2 — Test recommendation generator (depends on 3.1)
13. Task 5.3 — E2E manual walkthrough (depends on 4.3)

---

### Key Unknowns & Blockers

- **Pinecone credential access:** Confirm that the skill environment can access Pinecone credentials from project config before Task 1.3 starts.
- **Planning question inventory:** Task 4.1 audit may uncover questions we haven't anticipated; scope may shift slightly.
- **Research quality validation:** Task 5.1 will reveal if Sonnet + web search + Pinecone produces recommendations of sufficient quality. If not, may need to adjust synthesis prompt or data sources.
- **Performance/timeout:** Task 5.3 will reveal if synchronous research → recommendation → display is acceptable latency. If too slow, may need async fallback (out of scope for now).

---

### Estimated Total Effort

- Phase 1: 3 tasks (S + M + M) = ~2 days
- Phase 2: 2 tasks (L + S) = ~2 days
- Phase 3: 2 tasks (M + M) = ~2 days
- Phase 4: 3 tasks (S + L + M) = ~2.5 days
- Phase 5: 3 tasks (M + M + M) = ~2.5 days

**Total: ~11 days solo** (or ~5-6 days with focused effort)

---

### Success Criteria

✅ User can invoke `/aesop-course-builder` with a course concept  
✅ Skill researches answers (via Pinecone + course registries + web search) without user input  
✅ Skill presents recommendations with 1-2 sentence reasoning for each planning question (audience, topics, structure, prerequisites, assessment)  
✅ User can approve, reject, or modify each recommendation  
✅ Approved recommendations feed cleanly into course generation  
✅ Research degrades gracefully if Pinecone unavailable (warns user, continues with web search + registries)  
✅ End-to-end test validates research quality, recommendation accuracy, and course generation works as expected  
✅ No course generation logic changed (course builder stays minimal)

---

## PROOF UNITS — Modify Course Development Engine to Do Research

### Proof Unit 1: Claude (Sonnet) API Connection

**Expected behavior:**
Skill can make a synchronous Claude (Sonnet) API call and receive a response without errors.

**Preferred proof type:**
smoke-command

**Exact command/check/manual path:**
```bash
cd .claude/skills/aesop-course-builder
node -e "const { Anthropic } = require('@anthropic-ai/sdk'); const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY}); client.messages.create({model: 'claude-sonnet-4-20250514', max_tokens: 100, messages: [{role: 'user', content: 'test'}]}).then(r => console.log('✓ Connection OK')).catch(e => console.error('✗ Failed:', e.message))"
```

**Expected initial failure (RED):**
`✗ Failed: API key not configured` or similar error.

**Expected passing evidence (GREEN):**
`✓ Connection OK` and no errors.

**Waiver guidance:**
N/A

---

### Proof Unit 2: Course Registry Parsing

**Expected behavior:**
Utility function successfully parses courses.html and courses-v2.html, extracts course metadata (at least 5 courses from each), and returns structured data (course ID, title, audience, topics).

**Preferred proof type:**
failing-test

**Exact command/check/manual path:**
`npm test -- aesop-api/tests/registry-parser.test.js` (or equivalent path)

**Expected initial failure (RED):**
Test files do not exist; or parsing function does not exist; or tests fail because metadata is not extracted.

**Expected passing evidence (GREEN):**
All tests pass. Output includes: "5+ v1 courses parsed", "5+ v2 courses parsed", "metadata fields present (id, title, audience, topics)".

**Waiver guidance:**
If no test framework exists, waiver to: manual verification with `console.log(registryData)` output showing 10+ courses with all expected fields. Scott approves output.

---

### Proof Unit 3: Pinecone Query Integration

**Expected behavior:**
Pinecone query function executes successfully when credentials are available; fails gracefully with warning when unavailable.

**Preferred proof type:**
smoke-command

**Exact command/check/manual path:**
```bash
node aesop-api/lib/pinecone-query.js --test --concept "AI Ethics"
```

**Expected initial failure (RED):**
Function does not exist; or Pinecone call fails with unclear error; or no graceful degradation message.

**Expected passing evidence (GREEN):**
Either "✓ Pinecone query returned X results" OR "⚠ Pinecone unavailable, continuing with web search" (graceful degradation).

**Waiver guidance:**
N/A

---

### Proof Unit 4: Research Engine Output

**Expected behavior:**
Research engine takes course concept as input and returns structured findings (identified gaps, existing topic coverage, structural patterns, prerequisite recommendations).

**Preferred proof type:**
failing-test

**Exact command/check/manual path:**
`npm test -- aesop-api/tests/research-engine.test.js`

**Expected initial failure (RED):**
Test does not exist; or research engine returns unstructured data; or fields are missing (gaps, coverage, patterns, prerequisites).

**Expected passing evidence (GREEN):**
All tests pass. Output includes structured findings with keys: "gaps" (array), "existingCoverage" (array), "structuralPatterns" (array), "prerequisites" (array).

**Waiver guidance:**
If automated testing difficult, waiver to: manual run with `node aesop-api/research-engine.js --concept "AI Ethics"` and inspect output. Scott verifies output has all expected fields and is coherent.

---

### Proof Unit 5: Recommendation Generator with Reasoning

**Expected behavior:**
Recommendation generator takes research findings and produces prescriptive recommendations (one per planning question: audience, topics, structure, prerequisites, assessment) each with 1-2 sentence reasoning.

**Preferred proof type:**
failing-test

**Exact command/check/manual path:**
`npm test -- aesop-api/tests/recommendation-generator.test.js`

**Expected initial failure (RED):**
Function does not exist; or recommendations are empty; or reasoning is missing; or format is wrong.

**Expected passing evidence (GREEN):**
All tests pass. Output includes 5+ recommendations, each with: "question" (string), "recommendation" (string), "reasoning" (1-2 sentences). Example:
```json
{
  "question": "target_audience",
  "recommendation": "High school students (ages 14-18) interested in AI basics",
  "reasoning": "Pinecone shows gaps in beginner-level AI content for high school audience. Web search confirms demand."
}
```

**Waiver guidance:**
N/A

---

### Proof Unit 6: Graceful Degradation (Pinecone unavailable)

**Expected behavior:**
When Pinecone is unavailable (simulated by removing credentials), research and recommendations still work using web search + course registry data. User sees clear warning message.

**Preferred proof type:**
manual-script

**Exact command/check/manual path:**
1. Temporarily unset Pinecone credentials: `unset PINECONE_API_KEY` (or set to invalid value)
2. Run `/aesop-course-builder` with a test course concept
3. Verify: Warning message appears ("⚠ Pinecone unavailable, using web search + course registry")
4. Verify: Research and recommendations complete without error
5. Verify: Recommendations are still relevant (even if less precise)
6. Restore credentials: `export PINECONE_API_KEY=<value>`

**Expected initial failure (RED):**
No graceful degradation; error thrown; process hangs; or no warning message.

**Expected passing evidence (GREEN):**
Warning message appears, process completes, recommendations generated, user can proceed.

**Waiver guidance:**
Manual verification by Scott. If Pinecone always unavailable in test environment, confirm design aligns with fallback approach and Scott approves.

---

### Proof Unit 7: Planning Phase Question Audit

**Expected behavior:**
Audit document lists all planning phase questions (e.g., "target audience?", "core topics?", "module structure?", etc.) and confirms each maps to a recommendation.

**Preferred proof type:**
manual-script

**Exact command/check/manual path:**
1. Open `.claude/skills/aesop-course-builder/` and locate planning phase code
2. Extract all user-facing questions
3. Create audit document: docs/planning-questions-audit.md
4. For each question, note: question text, mapped recommendation field, status (✓ maps / ⚠ unclear / ✗ no mapping)
5. Result: 100% of questions have a mapped recommendation

**Expected initial failure (RED):**
No audit exists; or planning questions don't map 1:1 to recommendations; or audit is incomplete.

**Expected passing evidence (GREEN):**
Audit document exists, 100% of questions mapped, all statuses are ✓ (maps), or any ⚠ unclear items have notes for resolution.

**Waiver guidance:**
Audit is manual; Scott reviews and confirms mapping is correct.

---

### Proof Unit 8: Planning Phase Integration

**Expected behavior:**
When `/aesop-course-builder` is invoked with a course concept, it first displays research-backed recommendations (with reasoning), then asks for approval/modification of each before proceeding to course generation.

**Preferred proof type:**
manual-script

**Exact command/check/manual path:**
1. Invoke skill: `/aesop-course-builder "AI Ethics Course for High School"`
2. Verify: Recommendations appear immediately (not planning questions)
3. Verify: Each recommendation has 1-2 sentence reasoning
4. Verify: Prompt allows "approve", "reject", "modify [field]" responses
5. Provide approval (e.g., "approve all" or specific modifications)
6. Verify: Modified recommendations are accepted
7. Verify: After approval, planning phase proceeds to course generation (or next phase)

**Expected initial failure (RED):**
Skill asks planning questions immediately (no research phase); or recommendations don't appear; or no approval mechanism.

**Expected passing evidence (GREEN):**
Full workflow: research → recommendations → approval → course generation. User can read recommendations, modify them, and see them used in the final course.

**Waiver guidance:**
Manual walkthrough by Scott. Screenshot or transcript confirms all steps.

---

### Proof Unit 9: End-to-End Course Generation with Approved Recommendations

**Expected behavior:**
Full flow from `/aesop-course-builder` invocation to completed course HTML. Course structure, content, modules, and metadata reflect the approved (or modified) recommendations.

**Preferred proof type:**
manual-script

**Exact command/check/manual path:**
1. Invoke `/aesop-course-builder` with test concept (e.g., "Python Basics for Beginners")
2. Review research-backed recommendations
3. Approve recommendations (or modify specific fields)
4. Course builder generates complete course (HTML files in expected location)
5. Verify course metadata matches approved recommendations (audience, topics, structure, assessment approach)
6. Verify course is properly registered in courses.html or courses-v2.html
7. Manual spot-check: course is readable, modules are in expected order, at least one lab is present

**Expected initial failure (RED):**
Course generation fails after approval; or generated course doesn't match recommendations; or course is not registered.

**Expected passing evidence (GREEN):**
Course generated successfully, files created, metadata matches approved recommendations, course is accessible and functional.

**Waiver guidance:**
Full manual walkthrough by Scott. Course structure and content must match approved recommendations. Scott signs off on quality.

---

### Proof Unit 10: Research Accuracy Validation

**Expected behavior:**
Research findings (gaps, topic coverage, patterns, prerequisites) are accurate and relevant to the course concept. Recommendations informed by research are credible and actionable.

**Preferred proof type:**
manual-script

**Exact command/check/manual path:**
1. Run research engine on 3 test course concepts (e.g., "AI Ethics", "Python Basics", "Cybersecurity")
2. For each, manually review research findings against known course corpus
3. Verify: Identified gaps are real (courses missing from Pinecone/registry)
4. Verify: Topic coverage accurately reflects existing courses
5. Verify: Structural patterns match patterns in similar courses
6. Verify: Prerequisites are reasonable for the audience
7. Document: How many findings are accurate (aim for 80%+)

**Expected initial failure (RED):**
Research is vague, inaccurate, or doesn't reference actual courses/topics.

**Expected passing evidence (GREEN):**
80%+ of research findings are verifiably accurate. Recommendations feel credible and informed. Scott confirms findings are useful and would guide course development.

**Waiver guidance:**
Manual review by Scott. If some findings are hallucinated, note refinement needed for synthesis prompt (future iteration).

---

*All proof units ready for verification during /start-build and /finish-build phases.*
