"""
Young Adult AIP Research Agent — AESOP Intelligence Pipeline
Runs weekly via GitHub Actions (+ manual dispatch).

Generates AI literacy course proposals for learners aged 17-25:
college students, first-job seekers, early-career professionals,
and curious young adults building skills outside the classroom.

Pipeline:
1. Collect signals from general trends (Google Trends + Reddit)
2. Claude synthesizes into YA-appropriate course topic candidates
3. Check Pinecone corpus for existing coverage
4. Generate full course proposals for genuine gaps
5. Save drafts to aip/ya-drafts/ with source attribution
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

sys.path.insert(0, str(Path(__file__).parent))
from signals_google_trends import collect_signals as collect_trends
from signals_reddit import collect_signals as collect_reddit

# ── CONFIG ─────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
VOYAGE_API_KEY    = os.environ.get("VOYAGE_API_KEY", "")
PINECONE_API_KEY  = os.environ.get("PINECONE_API_KEY", "")
PINECONE_HOST     = os.environ.get("PINECONE_HOST", "")
PINECONE_INDEX    = "aesop-academy"
DRAFTS_DIR        = Path("aip/ya-drafts")
DRAFTS_PER_RUN    = int(os.environ.get("DRAFTS_PER_RUN", "20"))
GAP_THRESHOLD     = 0.65

AUDIENCE    = "young-adult"
AGE_RANGE   = "17-25"
CATEGORY    = "Young Adult"


# ── PHASE 1: COLLECT SIGNALS ──────────────────────────────────────────────────

def collect_all_signals():
    print("Phase 1: Collecting signals for Young Adult pipeline\n")
    all_signals = []

    try:
        trends = collect_trends(max_signals=50)
        all_signals.extend(trends)
    except Exception as e:
        print(f"  WARNING: Google Trends collection failed: {e}")

    try:
        reddit = collect_reddit(max_signals=50)
        all_signals.extend(reddit)
    except Exception as e:
        print(f"  WARNING: Reddit collection failed: {e}")

    print(f"\n  Total raw signals collected: {len(all_signals)}")
    return all_signals


# ── PHASE 2: SYNTHESIZE WITH CLAUDE ───────────────────────────────────────────

def synthesize_topics(signals):
    print("\nPhase 2: Synthesizing signals into Young Adult course topics\n")

    if not signals:
        print("  No signals — falling back to static topics.")
        return _fallback_topics()

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)

    signal_text = ""
    for s in signals[:80]:
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

I've collected real-world signals from Google Trends and Reddit showing what people are actively searching for and discussing about AI. Your job is to synthesize these into 40 COURSE TOPIC CANDIDATES for the YOUNG ADULT track — learners aged 17–25: college students, recent graduates, early-career workers, and independent builders.

RAW SIGNALS:
{signal_text}

{existing_context}

LENS FOR YOUNG ADULTS (17-25):
- College coursework and studying with AI
- Job hunting (resumes, cover letters, interview prep with AI)
- Side hustles, freelancing, making money with AI tools
- Creative work: music, art, writing, content creation
- First jobs — how AI is reshaping entry-level work
- Building things without needing to code

MODEL & TOOL PRIORITY (highest demand for this age group):
We need MORE courses on specific AI products framed for young adults. Actively propose from these lists if not already in the draft queue:

CONVERSATIONAL AI (personal use framing):
- Claude — Claude for Writing, Research, and Side Projects
- ChatGPT / GPT-4o — ChatGPT for Students and Freelancers
- Google Gemini — Gemini for College and Personal Productivity
- Perplexity AI — Perplexity: AI Search for Real Life
- DeepSeek — DeepSeek: Free Powerful AI for Everyone
- Model comparisons: "Claude vs ChatGPT: Which One for You?"
- Manus (Meta AI agent) — Manus: Let AI Do the Work for You

CREATIVE & CONTENT AI TOOLS:
- Midjourney, DALL-E, Stable Diffusion — AI Art for Creators
- Suno, Udio — Making Music with AI
- Runway, Pika — AI Video Creation
- ElevenLabs — AI Voice and Audio Production
- Canva AI, Adobe Firefly — AI Design for Creators

PRODUCTIVITY & CAREER TOOLS:
- NotionAI — Using NotionAI for Study and Projects
- GitHub Copilot — AI Pair Programming for Beginners
- Cursor — Building Apps with AI-Assisted Coding

AGENTIC TOOLS (accessible entry points for 17-25):
- Flowise — Build Your Own AI Workflows Visually
- Dify — Create AI Apps Without Code
- n8n — Automate Your Life with AI and n8n
- AgentGPT — Deploy Your First AI Agent
- CrewAI — Build AI Agent Teams (for technically curious)
- OpenClaw — Personal AI Assistant on Your Own Machine
  (NOTE: OpenClaw is already in catalog — only propose if a distinctly different angle)

These tool-specific courses are SHORTER (5 modules) and highly actionable.

RULES:
- Framing must be for a 17–25 audience — not corporate, not childlike
- Avoid purely enterprise/executive topics (those go in Professional track)
- Avoid K-12-style topics (those go in Youth track)
- Merge similar signals into a single coherent topic
- Do NOT propose anything already in the draft queue or catalog listed above

Return a JSON array of 40 objects:
- "topic": clear course-worthy topic name (3-8 words)
- "signals": array of the original signal texts that fed into this topic
- "signal_sources": array of source names (e.g. ["google_trends", "reddit"])
- "demand_score": 1-10 estimated demand for this age group
- "is_model_topic": true if specifically about one or more named AI models

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
    return [
        {"topic": "ChatGPT for Students and Side Hustles", "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 9, "is_model_topic": True},
        {"topic": "Claude for Writing and Research",       "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8, "is_model_topic": True},
        {"topic": "Perplexity: AI Search for Real Life",   "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8, "is_model_topic": True},
        {"topic": "AI for Your Job Search",                "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 9, "is_model_topic": False},
        {"topic": "Making Money With AI Side Hustles",     "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8, "is_model_topic": False},
        {"topic": "Gemini for College Productivity",       "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7, "is_model_topic": True},
        {"topic": "AI and Your Creative Work",             "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7, "is_model_topic": False},
    ]


# ── DRAFT DEDUP HELPERS ───────────────────────────────────────────────────────

def _cosine_sim(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    n1  = sum(a * a for a in v1) ** 0.5
    n2  = sum(b * b for b in v2) ** 0.5
    return dot / (n1 * n2) if n1 and n2 else 0.0


CATALOG_PATH = Path("ai-academy/modules/courses-data.json")


def load_existing_draft_titles():
    """Return titles for pending YA drafts only (for semantic dedup).

    Approved drafts are already in courses-data.json (caught by catalog check).
    Rejected drafts should not block re-proposal indefinitely.
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
    """Return all course names from courses-data.json (the full catalog)."""
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
    Remove gap candidates too close to existing YA drafts OR any course
    already in the catalog. Pinecone only sees built HTML; this catches
    everything else.
    """
    draft_titles   = load_existing_draft_titles()
    catalog_titles = load_catalog_titles()
    all_titles = draft_titles + catalog_titles

    if not all_titles or not VOYAGE_API_KEY:
        return gaps

    print(f"\n  Phase 3b: Dedup against {len(draft_titles)} YA drafts + "
          f"{len(catalog_titles)} catalog courses\n")

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

    # Batch-embed all candidate topics in one API call
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


# ── PHASE 3: CHECK PINECONE FOR GAPS ──────────────────────────────────────────

def embed_query(text):
    if not VOYAGE_API_KEY:
        return None
    resp = requests.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {VOYAGE_API_KEY}", "content-type": "application/json"},
        json={"model": "voyage-3", "input": [text], "input_type": "query"},
        timeout=30,
    )
    if resp.status_code != 200:
        return None
    return resp.json()["data"][0]["embedding"]


def check_gaps(candidates):
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
        for c in candidates:
            c["corpus_score"] = 0.0
            c["nearest_course"] = "none (empty corpus)"
        return candidates

    gaps = []
    for c in candidates:
        topic = c["topic"]
        # Prepend YA context so embeddings reflect the audience framing
        vector = embed_query(f"Young adult AI literacy for ages {AGE_RANGE}: {topic}")

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

    gaps.sort(key=lambda x: (-x.get("demand_score", 0), x["corpus_score"]))
    print(f"\n  Found {len(gaps)} Pinecone gaps out of {len(candidates)} candidates")

    # Phase 3b: also filter against existing draft queue (not in Pinecone)
    gaps = check_draft_coverage(gaps)
    return gaps


# ── PHASE 4: GENERATE PROPOSALS ───────────────────────────────────────────────

def load_existing_draft_ids():
    existing = set()
    if DRAFTS_DIR.exists():
        for f in DRAFTS_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                if isinstance(data, dict):
                    existing.add(data.get("id", ""))
                    existing.add(data.get("title", "").lower())
            except Exception:
                continue
    return existing


BATCH_SIZE = 5  # proposals per API call — keeps JSON output well within max_tokens


def _build_prompt_ya(topics_batch, existing_note):
    topic_details = "\n".join(
        f"- {t['topic']} (demand: {t.get('demand_score','?')}/10, "
        f"corpus similarity: {t['corpus_score']:.2f}, "
        f"nearest existing: '{t['nearest_course']}', "
        f"signals from: {', '.join(t.get('signal_sources', ['unknown']))}"
        + (", ⚑ MODEL TOPIC" if t.get('is_model_topic') else "") + ")"
        for t in topics_batch
    )
    return f"""You are a curriculum designer for AESOP AI Academy — a free AI literacy platform.

Generate {len(topics_batch)} course proposals for learners aged {AGE_RANGE}: college students, recent graduates, early-career workers, and young adults building skills on their own. These courses are UNDERREPRESENTED in the curriculum based on real demand signals.

{topic_details}

Avoid duplicating these existing draft IDs/titles: {existing_note}

IMPORTANT: Each course in this response must cover a DISTINCTLY different theme. Do not generate two courses that are essentially the same topic with different titles. If two proposed topics are very similar, merge them into the single best course.

DESIGN PRINCIPLES FOR YOUNG ADULT COURSES (17-25):
- Tone: smart and direct — like a knowledgeable friend, not a professor or a marketer
- Every course must answer: "What can I DO with this right now?"
- Include at least one module where learners apply the concept to their own life or work
- Career and financial relevance is high — lean into it where appropriate

MODULE COUNT RULES (important):
- Topics marked ⚑ MODEL TOPIC: design a FOCUSED 5-module course (tool-specific, immediately actionable)
- All other topics: design a full 6-module course

For EACH topic, return a JSON object with exactly these fields:
- "id": kebab-case slug (e.g. "ai-for-job-hunting")
- "title": short, compelling course title that a 20-year-old would want to click (max 6 words)
- "mega_group": which Young Adult nav section this belongs in. Pick EXACTLY one of:
    "AI Tools"       — practical use of named AI tools (ChatGPT, Claude, Gemini, Perplexity, Notion AI, etc.)
    "Make & Create"  — building, designing, coding, or making things with AI
    "How AI Works"   — how AI systems function under the hood, demystified for the learner
    "Truth & Safety" — misinformation, ethics, bias, privacy, scams, AI safety
    "Strategy"       — career, productivity, study, life-skill applications of AI
    "Society"        — AI's impact on jobs, healthcare, education, media, social life
    "Business"       — entrepreneurship, freelancing, marketing, side projects with AI
- "modules": array of module objects — 5 objects for ⚑ MODEL TOPIC, 6 objects for everything else.
    Each module object MUST have these three fields:
    {"title": "<short module name, max 8 words>",
     "sub":   "<one-sentence subtitle, 6-12 words, framing what the module covers>",
     "description": "<2-3 sentences explaining what the learner does, builds, or decides in this module>"}
- "synopsis": 2-sentence description written for the learner directly (use "you")
- "tier": "Beginner", "Intermediate", or "Advanced"
- "rationale": 1 sentence on why this gap matters for young adults' AI literacy
- "learning_outcome": 1 sentence — what can the learner DO after this course?
- "is_model_topic": true if the course is specifically about a named AI model, tool, or integration

For topics marked ⚑ MODEL TOPIC: make the course immediately useful — get the learner productive with the tool fast. Cover what it does, how to use it for their goals, tips and tricks, and where it falls short.

Return ONLY a JSON array of objects. No preamble, no markdown fences."""


def _call_claude_ya(client, prompt):
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
    """Generate YA course proposals in batches of BATCH_SIZE to avoid JSON truncation."""
    # Use all gaps found — DRAFTS_PER_RUN is a minimum target, not a cap
    topics_to_draft = gaps
    print(f"\nPhase 4: Generating {len(topics_to_draft)} Young Adult course proposals (batches of {BATCH_SIZE})\n")

    if not gaps:
        print("  No gaps found — skipping generation.")
        return []

    existing_ids = load_existing_draft_ids()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)
    existing_note = ", ".join(list(existing_ids)[:20]) if existing_ids else "none yet"
    all_drafts = []

    for batch_start in range(0, len(topics_to_draft), BATCH_SIZE):
        batch = topics_to_draft[batch_start:batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (len(topics_to_draft) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches}: {len(batch)} topics...")

        prompt = _build_prompt_ya(batch, existing_note)
        try:
            batch_drafts = _call_claude_ya(client, prompt)
        except json.JSONDecodeError as e:
            print(f"  ERROR: JSON decode failed on batch {batch_num}: {e} — skipping batch")
            continue
        except Exception as e:
            print(f"  ERROR: batch {batch_num} failed: {e} — skipping batch")
            continue

        for draft, gap in zip(batch_drafts, batch):
            draft["source_signals"]  = gap.get("signals", [])
            draft["source_names"]    = gap.get("signal_sources", [])
            draft["demand_score"]    = gap.get("demand_score", 0)
            draft["corpus_score"]    = gap.get("corpus_score", 0)
            draft["nearest_existing"] = gap.get("nearest_course", "unknown")
            draft["is_model_topic"]  = gap.get("is_model_topic", False) or draft.get("is_model_topic", False)

        all_drafts.extend(batch_drafts)
        print(f"  Batch {batch_num} done — {len(batch_drafts)} proposals generated")

        if batch_num < total_batches:
            time.sleep(1)

    print(f"  Generated {len(all_drafts)} total proposals")
    return all_drafts


# ── PHASE 5: SAVE DRAFTS ──────────────────────────────────────────────────────

def save_drafts(drafts):
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    saved = []

    for draft in drafts:
        draft["generated"]        = date_str
        draft["status"]           = "pending"
        draft["pipeline_version"] = "1.0-ya"
        draft["audience"]         = AUDIENCE     # "young-adult"
        draft["age_range"]        = AGE_RANGE    # "17-25"
        draft["category"]         = CATEGORY     # "Young Adult"

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


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Young Adult AIP Research Agent v1.0")
    print(f"Audience: Young Adults (ages {AGE_RANGE})")
    print("=" * 60)
    print(f"Run date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n")

    signals    = collect_all_signals()
    candidates = synthesize_topics(signals)
    gaps       = check_gaps(candidates)
    drafts     = generate_drafts(gaps)

    if drafts:
        saved = save_drafts(drafts)
        print(f"\nDone. {len(saved)} new Young Adult draft(s) saved to {DRAFTS_DIR}/")
        print("\nDraft summary:")
        for d in drafts:
            sources = ", ".join(d.get("source_names", ["unknown"]))
            print(f"  {d['title']} | demand={d.get('demand_score','?')}/10 | src=[{sources}]")
    else:
        print("\nNo new Young Adult drafts generated this run.")


if __name__ == "__main__":
    main()
