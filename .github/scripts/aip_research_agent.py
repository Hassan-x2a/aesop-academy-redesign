"""
AIP Research Agent — AESOP Intelligence Pipeline
Runs weekly via GitHub Actions (+ manual dispatch).

Pipeline:
1. Collect real-world signals from Google Trends + Reddit
2. Use Claude to synthesize signals into candidate topics
3. Check Pinecone corpus for existing coverage
4. Generate course proposals for genuine gaps
5. Save drafts with full source attribution

Every draft tracks WHERE the idea came from.
"""

import os
import sys
import json
import re
import time
from datetime import datetime
from pathlib import Path
import anthropic
import requests
from pinecone import Pinecone

# Add scripts dir to path for signal imports
sys.path.insert(0, str(Path(__file__).parent))
from signals_google_trends import collect_signals as collect_trends
from signals_reddit import collect_signals as collect_reddit

# ── CONFIG ────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
VOYAGE_API_KEY    = os.environ["VOYAGE_API_KEY"]
PINECONE_API_KEY  = os.environ["PINECONE_API_KEY"]
PINECONE_HOST     = os.environ["PINECONE_HOST"]
PINECONE_INDEX    = "aesop-academy"
DRAFTS_DIR        = Path("aip/drafts")
DRAFTS_PER_RUN    = int(os.environ.get("DRAFTS_PER_RUN", "20"))
GAP_THRESHOLD     = 0.65

AUDIENCE    = "professional"
AGE_RANGE   = "25+"
CATEGORY    = "Professional"


# ── PHASE 1: COLLECT SIGNALS ─────────────────────────────────────────────────

def collect_all_signals():
    """Gather signals from all sources."""
    print("Phase 1: Collecting real-world signals\n")

    all_signals = []

    # Google Trends
    try:
        trends = collect_trends(max_signals=50)
        all_signals.extend(trends)
    except Exception as e:
        print(f"  WARNING: Google Trends collection failed: {e}")

    # Reddit
    try:
        reddit = collect_reddit(max_signals=50)
        all_signals.extend(reddit)
    except Exception as e:
        print(f"  WARNING: Reddit collection failed: {e}")

    print(f"\n  Total raw signals collected: {len(all_signals)}")
    return all_signals


# ── PHASE 2: SYNTHESIZE WITH CLAUDE ──────────────────────────────────────────

def synthesize_topics(signals):
    """Use Claude to distill raw signals into candidate course topics."""
    print("\nPhase 2: Synthesizing signals into candidate topics\n")

    if not signals:
        print("  No signals to synthesize — falling back to static topics.")
        return _fallback_topics()

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)

    # Format signals for Claude
    signal_text = ""
    for s in signals[:80]:  # Cap context size
        source_tag = f"[{s['source']}]"
        signal_text += f"- {source_tag} {s['topic']} (score: {s['score']})\n"

    existing_draft_titles = load_existing_draft_titles()
    catalog_titles        = load_catalog_titles()

    already_lines = []
    if existing_draft_titles:
        already_lines.append("Draft queue (pending review — do NOT propose anything similar):")
        already_lines.extend(f"  - {t}" for t in existing_draft_titles[:60])
    if catalog_titles:
        already_lines.append("Already built and published (in catalog — do NOT propose anything similar):")
        already_lines.extend(f"  - {t}" for t in catalog_titles[:120])

    existing_context = (
        "ALREADY EXISTS — do not propose anything similar to the following:\n"
        + "\n".join(already_lines)
        if already_lines else ""
    )

    prompt = f"""You are a curriculum analyst for AESOP AI Academy — a free AI literacy platform.

I've collected real-world signals from Google Trends and Reddit showing what people are actively searching for and discussing about AI. Your job is to synthesize these into 40 distinct COURSE TOPIC CANDIDATES for the PROFESSIONAL track — courses aimed at working adults, career professionals, managers, and domain experts (ages 25+).

RAW SIGNALS:
{signal_text}

{existing_context}

LENS FOR PROFESSIONALS (25+):
- Using AI effectively in their specific industry or role
- Managing AI tools and teams that use AI
- AI strategy, ROI, and business cases
- Legal, ethical, and regulatory considerations at work
- Enterprise AI integration and governance

MODEL & TOOL PRIORITY (these are the highest-demand gaps right now):
We need MORE courses on specific AI products, frameworks, and integration tools. Actively propose from these lists if not already in the draft queue:

CONVERSATIONAL AI MODELS (professional framing):
- Claude (Anthropic) — Getting the Most from Claude at Work
- ChatGPT / GPT-4o — Mastering ChatGPT for Business
- Google Gemini — Gemini for Google Workspace Professionals
- Perplexity AI — Perplexity vs Search: A Professional Guide
- Microsoft Copilot — Copilot for Microsoft 365
- DeepSeek — DeepSeek for Cost-Effective AI Workloads
- Grok (xAI) — Grok AI for Professionals
- Model comparison — "Choosing Your AI Stack: Claude vs GPT vs Gemini"

AGENTIC FRAMEWORKS (open-source, local-capable — HIGH DEMAND):
Note: OpenClaw is already in our catalog. Focus on these gaps:
- CrewAI — Building Multi-Agent Teams with CrewAI (247K stars, Fortune 500 adoption)
- LangGraph — Stateful AI Agents with LangGraph
- LangChain — LLM Application Development with LangChain
- LlamaIndex — RAG and Agent Workflows with LlamaIndex
- Haystack (deepset) — Production AI Pipelines with Haystack
- MetaGPT — Autonomous Software Development with MetaGPT
- Agent Zero — Sandboxed AI Automation with Agent Zero
- Microsoft Semantic Kernel — Enterprise AI with Semantic Kernel
- Microsoft Agent Framework (MAF) — Microsoft's successor to AutoGen

VISUAL / NO-CODE AGENT BUILDERS:
- Flowise — Visual AI Workflow Builder (acquired by Workday)
- Dify — No-Code LLM App Development with Dify (138K stars)
- n8n — AI Workflow Automation with n8n
- AgentGPT — Browser-Based AI Agent Building

CLOUD AGENT PRODUCTS:
- Manus (Meta-owned) — Working with Manus: Autonomous AI Agents
- OpenAI Agents SDK — Building Agents with OpenAI's Agents SDK

PROFESSIONAL AI TOOLS:
- Zapier AI, Make (Integromat) — connecting AI to business workflows
- GitHub Copilot, Cursor — AI for Software Development Teams
- Figma AI, Adobe Firefly — AI for Design Professionals
- Runway, ElevenLabs — AI Video and Audio for Creators
- NotionAI, HubSpot AI, Salesforce Einstein — AI in specific platforms

These tool-specific courses are SHORTER (5 modules) and highly actionable.

RULES:
- Merge similar signals into a single coherent topic
- Each topic should be specific enough for a focused course
- Avoid purely consumer/teen topics (those go in the Youth or Young Adult tracks)
- Do NOT propose anything already in the draft queue or catalog listed above

Return a JSON array of 40 objects:
- "topic": clear course-worthy topic name (3-8 words)
- "signals": array of the original signal texts that fed into this topic
- "signal_sources": array of source names (e.g. ["google_trends", "reddit"])
- "demand_score": 1-10 estimated demand based on signal strength
- "is_model_topic": true if this topic is specifically about one or more named AI models, false otherwise

Return ONLY the JSON array. No preamble, no markdown fences."""

    for attempt in range(4):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=8000,
                messages=[{"role": "user", "content": prompt}]
            )
            break
        except anthropic.APIStatusError as e:
            if e.status_code in (529, 500, 503):
                wait = 30 * (attempt + 1)
                print(f"  Anthropic API error {e.status_code} — retrying in {wait}s (attempt {attempt+1}/4)...")
                time.sleep(wait)
            else:
                raise
    else:
        raise RuntimeError("Anthropic API unavailable after 4 attempts — try again later.")

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    candidates = json.loads(raw)
    print(f"  Synthesized {len(candidates)} candidate topics")
    return candidates


def _fallback_topics():
    """Static fallback if all signal sources fail."""
    return [
        # Conversational AI models
        {"topic": "Getting the Most from Claude at Work",          "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 9,  "is_model_topic": True},
        {"topic": "Mastering ChatGPT for Business",                "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 9,  "is_model_topic": True},
        {"topic": "Gemini for Google Workspace Professionals",     "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8,  "is_model_topic": True},
        {"topic": "Perplexity AI for Professional Research",       "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8,  "is_model_topic": True},
        {"topic": "Microsoft Copilot for Microsoft 365",           "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8,  "is_model_topic": True},
        # Agentic frameworks
        {"topic": "Building Multi-Agent Teams with CrewAI",        "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8,  "is_model_topic": True},
        {"topic": "Stateful AI Agents with LangGraph",             "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        {"topic": "RAG and Agents with LlamaIndex",                "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        {"topic": "No-Code AI App Development with Dify",          "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        {"topic": "Visual AI Workflows with Flowise",              "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        {"topic": "Enterprise AI with Microsoft Semantic Kernel",  "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        {"topic": "Autonomous Agents with Manus",                  "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        # Integration tools
        {"topic": "AI Workflow Automation with n8n",               "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": True},
        {"topic": "AI Workflow Automation with Zapier",            "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7,  "is_model_topic": False},
        # General professional
        {"topic": "Choosing Your AI Stack: Models and Tools",      "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8,  "is_model_topic": True},
    ]


# ── DRAFT DEDUP HELPERS ──────────────────────────────────────────────────────

def _cosine_sim(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    n1  = sum(a * a for a in v1) ** 0.5
    n2  = sum(b * b for b in v2) ** 0.5
    return dot / (n1 * n2) if n1 and n2 else 0.0


CATALOG_PATH = Path("ai-academy/modules/courses-data.json")


def load_existing_draft_titles():
    """Return titles for pending drafts only (for semantic dedup).

    Approved drafts are already in courses-data.json and will be caught by the
    catalog check. Rejected drafts should not block re-proposal indefinitely.
    Only pending items represent true in-flight work we must not duplicate.
    """
    titles = []
    if DRAFTS_DIR.exists():
        for f in sorted(DRAFTS_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("title") and data.get("status") == "pending":
                    titles.append(data["title"])
            except Exception:
                continue
    return titles


def load_catalog_titles():
    """Return all course names from courses-data.json (the built + in-dev catalog)."""
    if not CATALOG_PATH.exists():
        return []
    try:
        data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        return [c["name"] for c in data.get("courses", []) if c.get("name")]
    except Exception as e:
        print(f"  WARNING: Could not load catalog titles: {e}")
        return []


def check_draft_coverage(gaps):
    """
    Remove gap candidates that are semantically too close to:
      (a) existing drafts in the pipeline queue, OR
      (b) courses already in the catalog (courses-data.json)

    Pinecone only indexes BUILT module HTML content, which is unreliable
    for course-title-level dedup. Comparing short candidate titles against
    short course/draft titles via Voyage gives much tighter signal.
    """
    draft_titles   = load_existing_draft_titles()
    catalog_titles = load_catalog_titles()
    all_titles = draft_titles + catalog_titles

    if not all_titles or not VOYAGE_API_KEY:
        return gaps

    print(f"\n  Phase 3b: Dedup against {len(draft_titles)} drafts + "
          f"{len(catalog_titles)} catalog courses\n")

    # Batch-embed all known titles (drafts + catalog) — cap at 200 to stay under limits
    try:
        resp = requests.post(
            "https://api.voyageai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {VOYAGE_API_KEY}", "content-type": "application/json"},
            json={"model": "voyage-3", "input": all_titles[:200], "input_type": "document"},
            timeout=90,
        )
        if resp.status_code != 200:
            print(f"  WARNING: catalog-dedup embed failed ({resp.status_code}) — skipping")
            return gaps
        known_vecs = [item["embedding"] for item in resp.json()["data"]]
    except Exception as e:
        print(f"  WARNING: catalog-dedup failed: {e} — skipping")
        return gaps

    # Batch-embed all candidate topics in one API call (instead of N individual calls)
    candidate_topics = [c["topic"] for c in gaps]
    try:
        resp2 = requests.post(
            "https://api.voyageai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {VOYAGE_API_KEY}", "content-type": "application/json"},
            json={"model": "voyage-3", "input": candidate_topics, "input_type": "query"},
            timeout=90,
        )
        if resp2.status_code != 200:
            print(f"  WARNING: candidate embed failed ({resp2.status_code}) — skipping catalog dedup")
            return gaps
        candidate_vecs = [item["embedding"] for item in resp2.json()["data"]]
    except Exception as e:
        print(f"  WARNING: candidate embed failed: {e} — skipping catalog dedup")
        return gaps

    filtered = []
    filtered_vecs = []   # vecs for already-accepted candidates (within-batch dedup)
    for c, vec in zip(gaps, candidate_vecs):
        # 1. Check against known catalog+draft titles
        max_sim = max((_cosine_sim(vec, kv) for kv in known_vecs), default=0.0)
        if max_sim >= GAP_THRESHOLD:
            best_idx = max(range(len(known_vecs)), key=lambda i: _cosine_sim(vec, known_vecs[i]))
            matched = all_titles[best_idx] if best_idx < len(all_titles) else "?"
            print(f"  [DUP] {c['topic']}: sim={max_sim:.3f} → '{matched}'")
            continue

        # 2. Check against already-accepted candidates in this same batch
        batch_sim = max((_cosine_sim(vec, kv) for kv in filtered_vecs), default=0.0)
        if batch_sim >= GAP_THRESHOLD:
            best_idx = max(range(len(filtered_vecs)), key=lambda i: _cosine_sim(vec, filtered_vecs[i]))
            print(f"  [BATCH-DUP] {c['topic']}: sim={batch_sim:.3f} → '{filtered[best_idx]['topic']}'")
            continue

        c["catalog_sim"] = round(max_sim, 3)
        filtered.append(c)
        filtered_vecs.append(vec)

    removed = len(gaps) - len(filtered)
    print(f"  Catalog+draft dedup: removed {removed}, {len(filtered)} true gaps remain")
    return filtered


# ── PHASE 3: CHECK PINECONE FOR GAPS ────────────────────────────────────────

def embed_query(text):
    """Embed a single query using Voyage-3."""
    resp = requests.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={
            "Authorization": f"Bearer {VOYAGE_API_KEY}",
            "content-type": "application/json",
        },
        json={
            "model": "voyage-3",
            "input": [text],
            "input_type": "query",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"    Embedding failed ({resp.status_code}): {resp.text[:200]}")
        return None
    return resp.json()["data"][0]["embedding"]


def check_gaps(candidates):
    """Check each candidate against Pinecone corpus — return real gaps."""
    print("\nPhase 3: Checking corpus coverage via Pinecone\n")

    if not PINECONE_API_KEY or not PINECONE_HOST:
        print("  ERROR: Pinecone not configured — corpus check required; skipping draft generation")
        return []

    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX, host=PINECONE_HOST)
        stats = index.describe_index_stats()
        total_vectors = stats["total_vector_count"]
    except Exception as e:
        print(f"  ERROR: Pinecone initialization failed ({e}) — corpus check required; skipping draft generation")
        return []

    print(f"  Corpus size: {total_vectors} vectors")

    if total_vectors == 0:
        print("  WARNING: Corpus is empty — all candidates are gaps by default")
        for c in candidates:
            c["corpus_score"] = 0.0
            c["nearest_course"] = "none (empty corpus)"
        return candidates

    gaps = []
    for c in candidates:
        topic = c["topic"]
        vector = embed_query(topic)

        if vector is None:
            c["corpus_score"] = 0.0
            c["nearest_course"] = "embedding_error"
            gaps.append(c)
            continue

        result = index.query(vector=vector, top_k=3, include_metadata=True)
        matches = result.get("matches", [])
        top_score = matches[0]["score"] if matches else 0.0
        nearest = matches[0].get("metadata", {}).get("title", "?") if matches else "none"

        c["corpus_score"] = round(top_score, 3)
        c["nearest_course"] = nearest

        status = "GAP" if top_score < GAP_THRESHOLD else "COVERED"
        print(f"  [{status}] {topic}: score={top_score:.3f} → '{nearest}'")

        if top_score < GAP_THRESHOLD:
            gaps.append(c)

    # Sort by demand (high) then corpus score (low = bigger gap)
    gaps.sort(key=lambda x: (-x.get("demand_score", 0), x["corpus_score"]))
    print(f"\n  Found {len(gaps)} Pinecone gaps out of {len(candidates)} candidates")

    # Phase 3b: also filter against existing draft queue (not in Pinecone)
    gaps = check_draft_coverage(gaps)
    return gaps


# ── PHASE 4: GENERATE PROPOSALS ──────────────────────────────────────────────

def load_existing_draft_ids():
    """Get IDs of all existing drafts to avoid duplicates."""
    existing = set()
    if DRAFTS_DIR.exists():
        for f in DRAFTS_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                existing.add(data.get("id", ""))
                existing.add(data.get("title", "").lower())
            except Exception:
                continue
    return existing


BATCH_SIZE = 5  # proposals per API call — keeps JSON output well within max_tokens


def _build_prompt(topics_batch, existing_note):
    """Build the generation prompt for a batch of topics."""
    topic_details = "\n".join(
        f"- {t['topic']} (demand: {t.get('demand_score', '?')}/10, "
        f"corpus similarity: {t['corpus_score']:.2f}, "
        f"nearest existing: '{t['nearest_course']}', "
        f"signals from: {', '.join(t.get('signal_sources', ['unknown']))}"
        + (", ⚑ MODEL TOPIC" if t.get('is_model_topic') else "") + ")"
        for t in topics_batch
    )
    return f"""You are a curriculum designer for AESOP AI Academy — a free AI literacy platform.

Generate {len(topics_batch)} course proposals for the PROFESSIONAL track — courses aimed at working adults, career professionals, managers, and domain experts (ages 25+). These topics are UNDERREPRESENTED in our curriculum based on real demand signals:

{topic_details}

Avoid duplicating these existing draft IDs/titles: {existing_note}

IMPORTANT: Each course in this response must cover a DISTINCTLY different theme. Do not generate two courses that are essentially the same topic with different titles (e.g. two courses both about AI bias, or two courses both about AI writing tools). If two proposed topics are very similar, merge them into the best single course.

DESIGN PRINCIPLES FOR PROFESSIONAL COURSES:
- Tone: authoritative and direct — respect the learner's time and expertise
- Each course should deliver tangible professional value: a skill, a decision framework, or a workflow improvement
- Include at least one module where learners apply concepts to their own work context
- Avoid condescending "AI 101" framing — assume professional intelligence, focus on AI-specific knowledge

MODULE COUNT RULES (important):
- Topics marked ⚑ MODEL TOPIC: design a FOCUSED 5-module course (tool-specific, highly actionable)
- All other topics: design a comprehensive 8-module course

For EACH topic, return a JSON object with exactly these fields:
- "id": kebab-case slug (e.g. "ai-in-healthcare")
- "title": short, compelling course title (max 6 words)
- "mega_group": which Professional nav section this course belongs in. Pick EXACTLY one of:
    "AI Tools"       — courses about specific named AI tools, models, or integrations
    "Strategy"       — leadership, governance, risk, organizational AI, careers
    "AI Models"      — how foundation models work, comparisons, evaluation, benchmarks
    "AI Frontier"    — emerging research, hardware, reasoning, what's coming next
    "Development"    — building, deploying, integrating, agentic systems, prompt engineering
    "Society"        — AI's domain impact: healthcare, education, finance, media, etc.
    "Applied"        — applied-AI fundamentals, building blocks, end-to-end
    "Business"       — business strategy, marketing, ventures, executive readiness
    "Cybersecurity"  — only when squarely about security (most security courses go through cyber_research_agent.py instead)
- "modules": array of module objects — 5 objects for ⚑ MODEL TOPIC, 8 objects for everything else.
    Each module object MUST have these three fields:
    {"title": "<short module name, max 8 words>",
     "sub":   "<one-sentence subtitle, 6-14 words, framing what the module covers>",
     "description": "<2-4 sentences describing what the professional does, decides, or produces in this module>"}
- "synopsis": 2-sentence course description written for a professional audience
- "tier": "Beginner", "Intermediate", or "Advanced"
- "rationale": 1 sentence on why this gap matters for professional AI literacy
- "learning_outcome": 1 sentence — what can the professional DO or DECIDE after taking this course?
- "is_model_topic": true if the course is specifically about one or more named AI models, tools, or integrations

For topics marked ⚑ MODEL TOPIC: design hands-on courses that get professionals productive with the specific tool immediately. Cover: what it does and doesn't do, how it compares, practical workflows, real use cases, limitations, and either advanced features or integration with other tools.

Return ONLY a JSON array of objects. No preamble, no markdown fences."""


def _call_claude(client, prompt):
    """Call Claude with retry logic. Returns parsed list of draft dicts."""
    for attempt in range(4):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            break
        except anthropic.APIStatusError as e:
            if e.status_code in (529, 500, 503):
                wait = 30 * (attempt + 1)
                print(f"  Anthropic API error {e.status_code} — retrying in {wait}s (attempt {attempt+1}/4)...")
                time.sleep(wait)
            else:
                raise
    else:
        raise RuntimeError("Anthropic API unavailable after 4 attempts — try again later.")

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def generate_drafts(gaps):
    """Use Claude to generate full course proposals for top gaps.

    Generates in batches of BATCH_SIZE to stay within max_tokens per call.
    20 proposals × 8 modules each exceeds 4000 tokens in one shot — batching
    keeps each response to ~3 courses worth of JSON, well within limits.
    """
    # Use all gaps found — DRAFTS_PER_RUN is a minimum target, not a cap
    topics_to_draft = gaps
    print(f"\nPhase 4: Generating {len(topics_to_draft)} course proposals (batches of {BATCH_SIZE})\n")

    if not gaps:
        print("  No gaps found — skipping generation.")
        return []

    existing_ids = load_existing_draft_ids()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)
    existing_note = ", ".join(list(existing_ids)[:20]) if existing_ids else "none yet"
    all_drafts = []

    # Process in batches so JSON output never exceeds max_tokens
    for batch_start in range(0, len(topics_to_draft), BATCH_SIZE):
        batch = topics_to_draft[batch_start:batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (len(topics_to_draft) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches}: {len(batch)} topics...")

        prompt = _build_prompt(batch, existing_note)
        try:
            batch_drafts = _call_claude(client, prompt)
        except json.JSONDecodeError as e:
            print(f"  ERROR: JSON decode failed on batch {batch_num}: {e} — skipping batch")
            continue
        except Exception as e:
            print(f"  ERROR: batch {batch_num} failed: {e} — skipping batch")
            continue

        # Attach source tracking to each draft in this batch
        for draft, gap in zip(batch_drafts, batch):
            draft["source_signals"] = gap.get("signals", [])
            draft["source_names"] = gap.get("signal_sources", [])
            draft["demand_score"] = gap.get("demand_score", 0)
            draft["corpus_score"] = gap.get("corpus_score", 0)
            draft["nearest_existing"] = gap.get("nearest_course", "unknown")
            draft["is_model_topic"] = gap.get("is_model_topic", False) or draft.get("is_model_topic", False)

        all_drafts.extend(batch_drafts)
        print(f"  Batch {batch_num} done — {len(batch_drafts)} proposals generated")

        if batch_num < total_batches:
            time.sleep(1)  # brief pause between batches

    print(f"  Generated {len(all_drafts)} total proposals")
    return all_drafts


# ── PHASE 5: SAVE DRAFTS ────────────────────────────────────────────────────

def save_drafts(drafts):
    """Save each draft as a JSON file with full provenance."""
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    saved = []

    for draft in drafts:
        draft["generated"]        = date_str
        draft["status"]           = "pending"
        draft["pipeline_version"] = "2.0"
        draft["audience"]         = AUDIENCE   # "professional"
        draft["age_range"]        = AGE_RANGE  # "25+"
        draft["category"]         = CATEGORY   # "Professional"

        filename = f"{date_str}-{draft['id']}.json"
        filepath = DRAFTS_DIR / filename

        if filepath.exists():
            print(f"  Skipping (exists): {filename}")
            continue

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(draft, f, indent=2, ensure_ascii=False)

        print(f"  Saved: {filename}")
        saved.append(filename)

    return saved


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("AIP Research Agent v2.0 — Signal-Driven Pipeline")
    print("=" * 60)
    print(f"Run date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n")

    # 1. Collect real-world signals
    signals = collect_all_signals()

    # 2. Synthesize into candidate topics
    candidates = synthesize_topics(signals)

    # 3. Check Pinecone for coverage gaps
    gaps = check_gaps(candidates)

    # 4. Generate course proposals for real gaps
    drafts = generate_drafts(gaps)

    # 5. Save with source tracking
    if drafts:
        saved = save_drafts(drafts)
        print(f"\nDone. {len(saved)} new draft(s) saved to aip/drafts/")
        print("\nDraft source attribution:")
        for d in drafts:
            sources = ", ".join(d.get("source_names", ["unknown"]))
            print(f"  {d['title']}: sources=[{sources}], demand={d.get('demand_score', '?')}/10")
    else:
        print("\nNo new drafts generated this run.")


if __name__ == "__main__":
    main()
