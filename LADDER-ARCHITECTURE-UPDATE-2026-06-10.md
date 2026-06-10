# Ladder Certification Architecture — Major Update (2026-06-10)

## Key Changes Summary

This document outlines the major restructuring of the Ladder certification system implemented on 2026-06-10:

1. **Tier Naming Restructure** — Tiers 1-15 reorganized as pure functions, not roles
2. **Professional Role System** — New role-based certifications with O*NET & WEF references
3. **Test Depth Levels** — Four-level depth system: CORE → Certification → Expert → Master
4. **Education vs. Role Certification** — K-12 certifies by function; post-secondary certifies by role
5. **Role Specification Injection** — Exam prompts now include role requirements from O*NET/WEF

---

## Tier Naming Structure (Tiers 1-15)

All tiers now use function-based names that describe **what you can do**, not **who you are**.

### Foundational Tiers (K-12 Education Levels)

| Tier | Previous Name | New Name | Title | Focus |
|------|---------------|----------|-------|-------|
| 1 | Beginner | General AI Literacy | AI Orientation | Core AI concepts at grade level |
| 2 | Novice | Chat Mastery | Prompting and Chatbot Fluency | Conversational AI skills |
| 3 | Capable Learner | Information Fluency | Research, Study, and Information Literacy | Learning with AI |
| 4 | Knowledge Worker | Business Process Design | Productivity and Professional Workflows | Applying AI to work |

### Applied Function Tiers (Professional Development)

| Tier | Previous Name | New Name | Title |
|------|---------------|----------|-------|
| 5 | Creative User | Visual & Audio Creation | Multimodal, Media, and Content Creation |
| 6 | Business Practitioner | Business Function Mastery | Function-Specific AI Use |
| 7 | Workflow Designer | Workflow Automation & Integration | No-Code, Automation, and Team Systems |
| 8 | Applied Builder | Application Development | APIs, Structured Outputs, and AI App Basics |
| 9 | Knowledge Systems Builder | Knowledge Systems & Retrieval | Data, Embeddings, Search, and RAG |
| 10 | Agent Builder | Agentic Systems & Orchestration | Agents, Tools, MCP, and Orchestration |
| 11 | AI Engineer | System Reliability & Operations | Evaluation, Reliability, Deployment, and Operations |
| 12 | AI Security Practitioner | Security & Threat Mitigation | Security, Privacy, Abuse, and Red Teaming |
| 13 | AI Governance Practitioner | Legal, Ethics & Compliance | Law, Ethics, Policy, and Compliance |
| 14 | AI Specialist | Model Science & Advanced Techniques | Model Science, ML, and Advanced AI Domains |
| 15 | AI Strategist | Strategic Planning & Adoption | Product, Market, Adoption, and Frontier Planning |

**Key Principle:** Tier names describe functions (what you can demonstrate) independent of profession. This allows learners to certify in tiers at any education level, while professional credentials combine role + tier + depth.

---

## Education Tiers vs. Professional Roles

### Education Tiers (K-12)

Learners certify in **any tier at any education level** based on their age/grade:

- **Elementary** — AI4K12, ISTE, UNESCO standards
- **Middle School** — AI4K12, ISTE, CSTA, UNESCO standards
- **High School** — AI4K12, ISTE, CSTA, UNESCO standards

Example: "Certified in Application Development at High School level"

### Professional Roles (Post-Secondary)

After high school, learners certify **in a professional role plus a tier function**:

#### Role Registry (O*NET & WEF Sources)

| Role | O*NET Code | WEF | Description |
|------|-----------|-----|-------------|
| **AI Developer** | 15-1255+ | — | Develop AI applications, implement models |
| **Machine Learning Engineer** | 15-1255+ | — | Design ML systems, train & optimize models |
| **Data Scientist** | 15-2051.00 | — | Analyze data, develop predictive models |
| **AI Operations Engineer** | — | 2025 | Deploy, monitor, maintain production AI systems |
| **AI Product Manager** | 13-1082.00 | 2025 | Define AI strategy, prioritize features, roadmap |
| **AI Educator** | 25-1021.00 | — | Teach AI/ML, develop curricula, train learners |
| **AI Security Specialist** | 15-3121.00 | — | Threat modeling, red teaming, secure design |
| **AI Governance Officer** | 13-1099.00 | 2025 | Policy, compliance, ethics, responsible AI |
| **AI Consultant** | 13-1111.00 | — | Advise on AI adoption, strategy, implementation |
| **Executive Leadership** | — | 2025 | Strategic AI leadership, organizational transformation |

Each role includes a **Role Specification** document that defines:
- Core responsibilities and competencies
- Technical and soft skills required
- Knowledge areas and standards
- This spec is **injected into exam prompts** so the examiner evaluates against real job requirements

Example: "Data Scientist Certification in Knowledge Systems & Retrieval"

---

## Test Depth Levels (4 Levels)

Replaced single "Certification" with four progressive depth levels for both tiers and roles:

| Depth | Label | Outcome | Evidence Standard | Review |
|-------|-------|---------|-------------------|--------|
| 1 | **CORE** | Foundational competency | Clear foundational understanding | AI-assessed, auditable |
| 2 | **Certification** | Professional competency | Professional-level evidence for role + function | AI-assessed, auditable |
| 3 | **Expert Certification** | Advanced competency | Transfer to novel scenarios, edge cases, tradeoffs | AI-assessed, human review recommended |
| 4 | **Master Certification** | Mastery + portfolio | Original synthesis, portfolio-grade artifact | AI-assessed, panel review recommended |

### Certification Naming Convention

**Tier Certifications:** `[Tier Name] [Depth Level]`
- "Application Development CORE"
- "Security & Threat Mitigation Expert Certification"
- "Knowledge Systems & Retrieval Master Certification"

**Role Certifications:** `[Role] [Depth Level] in [Tier Name]`
- "Data Scientist Certification in Knowledge Systems & Retrieval"
- "AI Developer Expert Certification in Application Development"
- "Machine Learning Engineer Master Certification in System Reliability & Operations"

---

## Role Specification Injection System

### How It Works

When a learner attempts a **professional role certification**, the examiner system prompt includes:

1. **Role Specification Block** — Detailed requirements from O*NET or WEF
   - Core competencies for that role
   - Technical and soft skills
   - Knowledge areas
   - Standards frameworks

2. **Tier Function Block** — Function requirements from selected tier
   - Vocabulary and concepts
   - Applied judgment scenarios
   - Evidence expectations
   - Standards alignment

3. **Depth Block** — Rigor level for selected depth (CORE/Certification/Expert/Master)
   - Outcome definition
   - Evidence requirements
   - Passing standard
   - Review expectations

### Example: Exam Prompt Structure

```
PROFESSIONAL ROLE SPECIFICATION
You are evaluating a Data Scientist candidate. The Data Scientist role requires:
- Proficiency in statistical analysis, data manipulation, and programming (Python, R, SQL)
- Ability to analyze large datasets and identify trends, patterns, and relationships
- Experience developing predictive and prescriptive models
- Knowledge of data visualization tools and techniques
...

Tier Function: Knowledge Systems & Retrieval
- Embeddings and vector search concepts
- Retrieval-augmented generation (RAG) patterns
- Citation and grounding design
- Knowledge base and knowledge graph concepts
...

Depth: Certification (professional-level)
- Clear competency evidence for professional role and function
- Solid rubric performance with no critical failures
- AI-assessed, auditable, and challengeable
...
```

---

## Learner Certification Paths

### K-12 Path (Education Level Based)

1. Learner selects **education tier** (Elementary, Middle School, High School)
2. Learner selects **function tier** (any of 1-15)
3. Learner selects **depth** (CORE, Expert, Mastery for K-12)
4. Result: "Application Development Expert Certification at High School level"

### Post-Secondary Path (Role Based)

1. Learner selects **professional role** (AI Developer, Data Scientist, etc.)
   - Dropdown shows: "Role Name [O*NET Code]" or "Role Name [WEF 2025]"
2. Learner selects **function tier** (any of 5-15, or foundational 1-4)
3. Learner selects **depth** (Certification, Expert Certification, Master Certification)
4. Result: "Data Scientist Expert Certification in Knowledge Systems & Retrieval"

---

## UI Display Updates

### Dropdown Format

**Education Tiers:**
```
Elementary
Middle School
High School
```

**Professional Roles:**
```
AI Developer [O*NET 15-1255+]
Machine Learning Engineer [O*NET 15-1255+]
Data Scientist [O*NET 15-2051.00]
AI Operations Engineer [WEF 2025]
AI Product Manager [WEF 2025]
AI Educator [O*NET 25-1021.00]
AI Security Specialist [O*NET 15-3121.00]
AI Governance Officer [WEF 2025]
AI Consultant [O*NET 13-1111.00]
Executive Leadership [WEF 2025]
```

### Certification Result Display

**Format:** `[Role/Tier Name] [Depth Level] in [Function/Topic]`

Examples:
- "✓ Certified: Data Scientist in Knowledge Systems & Retrieval"
- "✓ Certified: Application Development (Expert) at High School"
- "✓ Certified: AI Developer Expert Certification in System Reliability & Operations"

---

## Rubric Evaluation (Unchanged)

The 7-dimension rubric remains the same for all certifications:

1. **Conceptual Accuracy** — Understand key ideas correctly
2. **Vocabulary Fluency** — Use relevant technical terms
3. **Applied Judgment** — Apply to real scenarios
4. **Evidence Quality** — Provide/cite strong evidence
5. **Reasoning Defense** — Explain and defend thinking
6. **Risk Awareness** — Identify limitations and risks
7. **Standards Alignment** — Meet standards for tier/role

Each dimension receives PASS/FAIL with explanation, stored with certification result.

---

## Data Storage Updates

### Certification Result Schema

```json
{
  "id": "cert_timestamp_random",
  "timestamp": "ISO8601",
  
  "certificationType": "tier" | "role",
  
  "ladderTierId": "tier-05",
  "ladderTierLabel": "Visual & Audio Creation",
  
  "roleId": "data-scientist",  // null if tier certification
  "roleLabel": "Data Scientist",
  "roleSource": "O*NET 15-2051.00",
  
  "testDepthId": "certification",
  "testDepthLabel": "Certification",
  
  "educationTierId": "high-school",
  "educationTierLabel": "High School",
  
  "overallResult": "certified" | "not_certified",
  "overallScore": 85,
  
  "rubricDimensions": [
    {
      "dimension": "Conceptual accuracy",
      "status": "pass" | "fail",
      "reason": "explanation"
    },
    // ... 6 more dimensions
  ],
  
  "learnerId": "user-id",
  "timestamp": "2026-06-10T14:30:00Z"
}
```

---

## Implementation Timeline

| Phase | Status | Date | Details |
|-------|--------|------|---------|
| 1 | ✅ Complete | 2026-06-10 | Tier naming, role registry, depth levels |
| 2 | ✅ Complete | 2026-06-10 | Role spec injection, UI dropdown updates |
| 3 | In Progress | — | Multi-voice evaluation (Domain Expert, ELE, CLE) |
| 4 | Planned | — | Admin analytics dashboard by role |
| 5 | Planned | — | Public credential display with role badge |
| 6 | Planned | — | Employer API for credential verification |

---

## Standards Mapping

Each professional role maps to standards frameworks:

- **O*NET:** U.S. Department of Labor occupational classifications
- **WEF Future of Jobs 2025:** World Economic Forum emerging role definitions
- **NIST AI RMF:** Risk management framework for trustworthy AI
- **ISO/IEC 42001:** AI management systems standard
- **EU AI Act:** Regulatory compliance requirements

Certifications store which standards were assessed and met.

---

## Notes for Future Work

1. **Three-Voice Evaluation System** — Designed but not yet implemented
   - Domain Expert voice for subject matter
   - Education-Level Expert voice for age-appropriate rigor
   - Certification-Level Expert voice for credential depth
   - Would provide richer assessment for professional roles

2. **Role Bundling** — Future feature to allow learners to certify in "Professional Credential Bundles"
   - Example: "Full-Stack AI Engineer" = Tiers 8 + 11 + 12
   - Example: "AI Product Leader" = Tiers 15 + 6 + role of AI Product Manager

3. **Longitudinal Analytics** — Track role certification rates by dimension to identify skill gaps in professional training

4. **Employer Feedback Loop** — Collect feedback from employers on which role certifications predict job performance

---

## Git Commits

- `16eca433` — Fix: ACCOUNT_REQUIRED_ROLES reference
- `6776f7e8` — Feat: Professional role certifications with O*NET/WEF specifications
- `0d71a29c` — Fix: Store and display complete certification metadata
- `743c92af` — Fix: Scroll to prompt window immediately on Start Certification
- `fee00a2a` — Refactor: Remove skill-level implications from tier names

All changes deployed to production as of 2026-06-10.
