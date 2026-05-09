"""
K-12 AI Education Research Agent
Runs weekly via GitHub Actions (+ manual dispatch).

Equivalent to aip_research_agent.py but scoped exclusively to AI education
courses for learners aged 8-16. All drafts are tagged audience="youth".

Pipeline:
1. Collect signals from K-12 education communities (Reddit + Google Trends)
2. Use Claude to synthesize signals into youth-appropriate course topics
3. Check Pinecone corpus for existing coverage
4. Generate course proposals designed for 8-16 year old learners
5. Save drafts to aip/k12-drafts/ with full source attribution
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
from signals_k12_education import collect_signals as collect_reddit_k12
from signals_k12_education import collect_trends_signals as collect_trends_k12

# ── CONFIG ─────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
VOYAGE_API_KEY    = os.environ.get("VOYAGE_API_KEY", "")
PINECONE_API_KEY  = os.environ.get("PINECONE_API_KEY", "")
PINECONE_HOST     = os.environ.get("PINECONE_HOST", "")
PINECONE_INDEX    = "aesop-academy"
DRAFTS_DIR        = Path("aip/k12-drafts")
DRAFTS_PER_RUN    = int(os.environ.get("DRAFTS_PER_RUN", "20"))
GAP_THRESHOLD     = 0.65

AUDIENCE    = "youth"
AGE_RANGE   = "8-16"
CATEGORY    = "Youth"


# ── PHASE 1: COLLECT SIGNALS ──────────────────────────────────────────────────

def collect_all_signals():
    print("Phase 1: Collecting K-12 education signals\n")
    all_signals = []

    try:
        reddit = collect_reddit_k12(max_signals=50)
        all_signals.extend(reddit)
    except Exception as e:
        print(f"  WARNING: Reddit K-12 collection failed: {e}")

    try:
        trends = collect_trends_k12(max_signals=30)
        all_signals.extend(trends)
    except Exception as e:
        print(f"  WARNING: Google Trends K-12 collection failed: {e}")

    print(f"\n  Total raw signals collected: {len(all_signals)}")
    return all_signals


# ── PHASE 2: SYNTHESIZE WITH CLAUDE ───────────────────────────────────────────

def synthesize_topics(signals):
    print("\nPhase 2: Synthesizing signals into K-12 course topics\n")

    if not signals:
        print("  No signals — falling back to static topics.")
        return _fallback_topics()

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)

    signal_text = ""
    for s in signals[:80]:
        signal_text += f"- [{s['source']}] {s['topic']} (score: {s['score']})\n"

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

I've collected real-world signals from K-12 education communities showing what topics are most discussed around AI education for young learners. Your job is to synthesize these into 40 COURSE TOPIC CANDIDATES for an AI literacy curriculum aimed at students aged 8-16.

RAW SIGNALS:
{signal_text}

{existing_context}

RULES:
- Each topic must be age-appropriate and meaningful for 8-16 year olds
- Topics should be genuinely educational — not just "AI is cool" but substantive skills
- Think in three age bands: 8-10 (foundational wonder), 11-13 (exploratory, creative), 14-16 (analytical, applied)
- Merge similar signals into a single coherent topic
- Include topics across: AI literacy, critical thinking about AI, creating with AI, AI ethics and safety, AI in everyday life, digital citizenship

AI TOOL TOPICS FOR STUDENTS (high demand, age-appropriate):
Kids and teens are ALREADY using these — they need structured AI literacy around them:

Ages 8-10 (foundational, wonder-driven):
- What AI chatbots actually are and how to talk to them
- AI helpers at school: what they can and can't do
- How AI art is made (simple, visual)

Ages 11-13 (exploratory, questioning):
- ChatGPT and AI assistants: a guide for middle schoolers
- Using AI for homework: what's ok, what's cheating, what's smart
- AI art tools (DALL-E, Canva AI, Adobe Firefly) — making and understanding
- AI music tools (Suno, Udio) — creating and understanding
- Spotting AI-generated content: images, text, video

Ages 14-16 (analytical, applied):
- Prompt engineering basics: getting more from any AI tool
- AI coding assistants (GitHub Copilot, Cursor) — intro for teen coders
- Comparing AI tools: ChatGPT vs Claude vs Gemini for teens
- Building simple AI workflows without code (Flowise, Dify intro)
- AI agents explained: what Manus, AutoGPT, and agents actually do
- AI and your future career: what changes, what doesn't

Propose these only if not already in the draft queue.
- Do NOT propose anything already in the draft queue or catalog listed above

Return a JSON array of 25 objects:
- "topic": clear course-worthy topic name (3-8 words)
- "age_band": "8-10", "11-13", or "14-16" — the primary target range
- "signals": array of the original signal texts that fed into this topic
- "signal_sources": array of source names
- "demand_score": 1-10 estimated demand based on signal strength
- "is_teacher_facing": true if the primary audience is teachers rather than students

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
        {"topic": "How AI Actually Works",              "age_band": "11-13", "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8},
        {"topic": "AI and Fake Information",            "age_band": "11-13", "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8},
        {"topic": "Using ChatGPT for Homework Help",    "age_band": "11-13", "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8},
        {"topic": "Creating with AI Art Tools",         "age_band": "14-16", "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 8},
        {"topic": "AI Chatbots: What Are They Really?", "age_band": "8-10",  "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7},
        {"topic": "AI Bias and Fairness",               "age_band": "14-16", "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7},
        {"topic": "Talking to AI: Prompt Writing",      "age_band": "8-10",  "signals": ["fallback"], "signal_sources": ["static"], "demand_score": 7},
    ]


# ── DRAFT DEDUP HELPERS ───────────────────────────────────────────────────────

def _cosine_sim(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    n1  = sum(a * a for a in v1) ** 0.5
    n2  = sum(b * b for b in v2) ** 0.5
    return dot / (n1 * n2) if n1 and n2 else 0.0


CATALOG_PATH = Path("ai-academy/modules/courses-data.json")


def load_existing_draft_titles():
    """Return titles for pending K-12 drafts only (for semantic dedup).

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
    """Return all course names from courses-data.json (full catalog)."""
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
    Remove K-12 gap candidates too close to existing K-12 drafts OR any
    course already in the full catalog.
    """
    draft_titles   = load_existing_draft_titles()
    catalog_titles = load_catalog_titles()
    all_titles = draft_titles + catalog_titles

    if not all_titles or not VOYAGE_API_KEY:
        return gaps

    print(f"\n  Phase 3b: Dedup against {len(draft_titles)} K-12 drafts + "
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

    # Batch-embed all candidate topics (bare topics, no age prefix — catalog titles are bare too)
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
        # Prepend youth context so embeddings reflect the age-appropriate framing
        vector = embed_query(f"K-12 AI education for students ages {AGE_RANGE}: {topic}")

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
        print(f"  [{status}] {topic} ({c.get('age_band','?')}): score={top_score:.3f} → '{nearest}'")

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


def _build_prompt_k12(topics_batch, existing_note):
    topic_details = "\n".join(
        f"- {t['topic']} (age band: {t.get('age_band','?')}, demand: {t.get('demand_score','?')}/10, "
        f"corpus similarity: {t['corpus_score']:.2f}, nearest existing: '{t['nearest_course']}')"
        for t in topics_batch
    )
    return f"""You are a curriculum designer for AESOP AI Academy — a free AI literacy platform.

Your task: design {len(topics_batch)} complete course proposals for AI education aimed at students aged {AGE_RANGE}. These courses will be delivered through AESOP's story-driven engine, where learners make choices inside a narrative that teaches AI concepts through consequence and judgment — not just reading or watching.

TOPICS TO DEVELOP (with age bands and demand signals):
{topic_details}

Avoid duplicating these existing draft IDs/titles: {existing_note}

IMPORTANT: Each course in this response must cover a DISTINCTLY different theme — do not generate two courses on the same topic with different titles or framings. If two proposed topics overlap significantly, merge them into the best single course.

DESIGN PRINCIPLES FOR YOUTH COURSES:
- Learning happens through story, choice, and creation — not lecture
- Every module should include at least one moment where the learner decides something
- Age 8-10: concrete, playful, wonder-driven — "What is this thing? How does it help me?"
- Age 11-13: exploratory, questioning — "How does it really work? What can I make?"
- Age 14-16: analytical, critical, applied — "What are its limits? What are the risks? How do I use it well?"
- Each course exits with a creation or judgment artifact — something made or decided, not just learned
- Course titles should be direct and compelling for a young person, not academic-sounding

For EACH topic, return a JSON object with exactly these fields:
- "id": kebab-case slug (e.g. "ai-and-fake-news")
- "title": short, compelling title a student would want to click (max 6 words)
- "mega_group": which Youth nav section this course belongs in. Pick EXACTLY one of:
    "How AI Works"   — how AI thinks, learns, perceives, and communicates (mechanism / explanation)
    "Make & Create"  — building, designing, no-code automation, or general creating with AI (excludes coding-as-skill)
    "AI Toolbox"     — getting productive with specific named AI tools (ChatGPT, Claude, Gemini, etc.) and choosing between them
    "AI in School"   — using AI in classroom contexts: tutoring, study skills, homework, teaching, school-specific risks
    "Code with AI"   — programming/coding with AI assistants (Copilot, Cursor, Scratch-to-Python, etc.)
    "Truth & Safety" — bias, misinformation, deepfakes, scams, ethics, privacy, digital citizenship, agentic-risk
- "modules": array of EXACTLY 4 module objects (focused 4-module arc). Each module object MUST have these three fields:
    {"title": "<short, max 6 words>",
     "sub":   "<one-sentence subtitle, 6-12 words, framing what the module covers>",
     "description": "<2-3 sentences explaining what the learner does, decides, or makes in this module>"}
- "synopsis": 2-sentence description written for a student or their teacher
- "tier": "Beginner", "Intermediate", or "Advanced"
- "age_band": "8-10", "11-13", or "14-16"
- "rationale": 1 sentence on why this gap matters for youth AI literacy
- "learning_outcome": 1 sentence — what can the student DO after completing this course?

Return ONLY a JSON array of objects. No preamble, no markdown fences."""


def _call_claude_k12(client, prompt):
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
    """Generate K-12 course proposals in batches of BATCH_SIZE to avoid JSON truncation."""
    # Use all gaps found — DRAFTS_PER_RUN is a minimum target, not a cap
    topics_to_draft = gaps
    print(f"\nPhase 4: Generating {len(topics_to_draft)} K-12 course proposals (batches of {BATCH_SIZE})\n")

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

        prompt = _build_prompt_k12(batch, existing_note)
        try:
            batch_drafts = _call_claude_k12(client, prompt)
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
        draft["pipeline_version"] = "1.0-k12"
        draft["audience"]         = AUDIENCE     # "youth"
        draft["age_range"]        = AGE_RANGE    # "8-16"
        draft["category"]         = CATEGORY     # "Youth"

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
    print("K-12 AI Education Research Agent v1.0")
    print("Audience: Youth (ages 8-16)")
    print("=" * 60)
    print(f"Run date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n")

    signals   = collect_all_signals()
    candidates = synthesize_topics(signals)
    gaps       = check_gaps(candidates)
    drafts     = generate_drafts(gaps)

    if drafts:
        saved = save_drafts(drafts)
        print(f"\nDone. {len(saved)} new K-12 draft(s) saved to {DRAFTS_DIR}/")
        print("\nDraft summary:")
        for d in drafts:
            sources = ", ".join(d.get("source_names", ["unknown"]))
            print(f"  [{d.get('age_band','?')}] {d['title']} | demand={d.get('demand_score','?')}/10 | src=[{sources}]")
    else:
        print("\nNo new K-12 drafts generated this run.")


if __name__ == "__main__":
    main()
