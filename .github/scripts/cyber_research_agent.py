"""
Cybersecurity AIP Research Agent — AESOP Intelligence Pipeline
Runs weekly via GitHub Actions (+ manual dispatch).

Generates AI-in-cybersecurity course proposals for two audiences:
  - Professionals: security analysts, IT admins, developers, risk managers
  - General public: anyone wanting to protect themselves from AI-enabled threats

Pipeline:
1. Collect cybersecurity-specific signals (HN, SO, RSS, changelogs, YouTube)
2. Claude synthesizes into candidate course topics
3. Check Pinecone corpus for existing coverage
4. Generate full course proposals for genuine gaps
5. Save drafts to aip/cyber-drafts/ with full source attribution
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
import xml.etree.ElementTree as ET
from pinecone import Pinecone

sys.path.insert(0, str(Path(__file__).parent))

# ── CONFIG ────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
VOYAGE_API_KEY    = os.environ.get("VOYAGE_API_KEY", "")
PINECONE_API_KEY  = os.environ.get("PINECONE_API_KEY", "")
PINECONE_HOST     = os.environ.get("PINECONE_HOST", "")
YOUTUBE_API_KEY   = os.environ.get("YOUTUBE_API_KEY", "").strip()
PINECONE_INDEX    = "aesop-academy"
DRAFTS_DIR        = Path("aip/cyber-drafts")
DRAFTS_PER_RUN    = int(os.environ.get("DRAFTS_PER_RUN", "20"))  # minimum target
GAP_THRESHOLD     = 0.65
BATCH_SIZE        = 5

AUDIENCE    = "cybersecurity"
AGE_RANGE   = "18+"
CATEGORY    = "Cybersecurity"

HEADERS = {
    "User-Agent": "AesopAcademy/1.0 (educational research; contact@aesopacademy.org)",
}

# ── SIGNAL SOURCES ────────────────────────────────────────────────────────────

HN_QUERIES = [
    "AI cybersecurity",
    "LLM security vulnerabilities",
    "AI phishing attacks",
    "prompt injection attack",
    "AI malware detection",
    "deepfake fraud",
    "AI social engineering",
    "zero trust AI security",
    "AI red teaming",
    "generative AI security risks",
    "AI pen testing",
    "AI threat intelligence",
    "LLM jailbreak",
    "AI in SOC security operations",
    "AI identity verification bypass",
]

SO_TAGS = [
    "cybersecurity",
    "information-security",
    "penetration-testing",
    "machine-learning-security",
    "ai-safety",
    "prompt-injection",
    "llm-security",
    "social-engineering",
]

RSS_FEEDS = [
    ("Krebs on Security",    "https://krebsonsecurity.com/feed/"),
    ("Schneier on Security", "https://www.schneier.com/feed/atom/"),
    ("Dark Reading",         "https://www.darkreading.com/rss.xml"),
    ("The Hacker News",      "https://feeds.feedburner.com/TheHackersNews"),
    ("TechCrunch Security",  "https://techcrunch.com/category/security/feed/"),
]

CHANGELOG_FEEDS = [
    ("CISA Alerts",       "https://www.cisa.gov/cybersecurity-advisories/all.xml"),
    ("NIST AI Security",  "https://news.google.com/rss/search?q=NIST+AI+security+vulnerability&hl=en-US&gl=US&ceid=US:en"),
    ("OpenAI Safety",     "https://news.google.com/rss/search?q=OpenAI+safety+security+update&hl=en-US&gl=US&ceid=US:en"),
    ("AI Threat News",    "https://news.google.com/rss/search?q=AI+cybersecurity+threat+2025&hl=en-US&gl=US&ceid=US:en"),
    ("Deepfake Defense",  "https://news.google.com/rss/search?q=deepfake+detection+fraud+AI&hl=en-US&gl=US&ceid=US:en"),
]

YOUTUBE_QUERIES = [
    "AI cybersecurity tutorial 2025",
    "how to detect AI phishing emails",
    "prompt injection attack explained",
    "deepfake detection tools",
    "AI red teaming tutorial",
    "LLM security vulnerabilities explained",
    "AI social engineering attacks",
    "cybersecurity AI tools tutorial",
    "AI malware analysis tutorial",
    "zero trust security AI",
    "AI threat intelligence tutorial",
    "how to protect yourself from AI scams",
    "AI in penetration testing",
    "securing AI applications tutorial",
    "AI identity fraud prevention",
]

CYBER_SIGNALS = [
    "attack", "vulnerability", "exploit", "phishing", "malware", "ransomware",
    "threat", "breach", "hack", "security", "privacy", "fraud", "scam",
    "deepfake", "social engineering", "identity", "authentication", "zero trust",
    "red team", "pen test", "SOC", "SIEM", "incident response", "cyber",
    "encryption", "credential", "bypass", "injection", "jailbreak",
]

AI_TERMS = [
    "ai", "artificial intelligence", "llm", "gpt", "claude", "chatgpt",
    "generative", "machine learning", "deepfake", "automated", "model",
    "prompt", "neural", "algorithm", "bot", "automation",
]


def _is_cyber_relevant(title):
    lower = title.lower()
    return any(t in lower for t in CYBER_SIGNALS) or any(t in lower for t in AI_TERMS)


def _cyber_score(title):
    lower = title.lower()
    return sum(1 for s in CYBER_SIGNALS if s in lower)


def _dedup_key(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())[:60]


# ── PHASE 1: COLLECT SIGNALS ──────────────────────────────────────────────────

def _collect_hn():
    signals = []
    seen = set()
    for query in HN_QUERIES:
        try:
            resp = requests.get(
                "https://hn.algolia.com/api/v1/search",
                params={"query": query, "tags": "story",
                        "numericFilters": "points>10", "hitsPerPage": 8},
                headers=HEADERS, timeout=15,
            )
            if resp.status_code != 200:
                continue
            for hit in resp.json().get("hits", []):
                title = (hit.get("title") or "").strip()
                if not title or not _is_cyber_relevant(title):
                    continue
                key = _dedup_key(title)
                if key in seen:
                    continue
                seen.add(key)
                pts = hit.get("points", 0) or 0
                cmts = hit.get("num_comments", 0) or 0
                signals.append({
                    "topic": title,
                    "score": pts + cmts * 3 + _cyber_score(title) * 50,
                    "source": "hacker_news_cyber",
                    "source_detail": f"HN: {query}",
                    "signal_type": "community_discussion",
                    "metadata": {"points": pts, "comments": cmts},
                })
            time.sleep(0.4)
        except Exception as e:
            print(f"    [HN Cyber] warning ({query}): {e}")
    print(f"    [HN Cyber] {len(signals)} raw signals")
    return signals


def _collect_so():
    signals = []
    seen = set()
    for tag in SO_TAGS:
        try:
            resp = requests.get(
                "https://api.stackexchange.com/2.3/questions",
                params={"order": "desc", "sort": "hot", "tagged": tag,
                        "site": "stackoverflow", "pagesize": 10},
                headers=HEADERS, timeout=15,
            )
            if resp.status_code != 200:
                continue
            for q in resp.json().get("items", []):
                title = (q.get("title") or "").strip()
                if not title:
                    continue
                key = _dedup_key(title)
                if key in seen:
                    continue
                seen.add(key)
                score = q.get("score", 0) or 0
                answers = q.get("answer_count", 0) or 0
                views = q.get("view_count", 0) or 0
                signals.append({
                    "topic": title,
                    "score": score * 5 + answers * 10 + min(views // 100, 200) + _cyber_score(title) * 40,
                    "source": "stackoverflow_cyber",
                    "source_detail": f"SO tag: {tag}",
                    "signal_type": "learning_gap",
                    "metadata": {"score": score, "answers": answers, "views": views},
                })
            time.sleep(0.5)
        except Exception as e:
            print(f"    [SO Cyber] warning ({tag}): {e}")
    print(f"    [SO Cyber] {len(signals)} raw signals")
    return signals


def _collect_rss():
    signals = []
    seen = set()
    for source_name, url in RSS_FEEDS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            items = root.findall(".//item")
            if not items:
                ns = {"a": "http://www.w3.org/2005/Atom"}
                items = root.findall(".//a:entry", ns)
            for item in items[:15]:
                el = item.find("title")
                title = (el.text or "").strip() if el is not None else ""
                if not title or not _is_cyber_relevant(title):
                    continue
                key = _dedup_key(title)
                if key in seen:
                    continue
                seen.add(key)
                signals.append({
                    "topic": title,
                    "score": 120 + _cyber_score(title) * 40,
                    "source": "rss_cyber",
                    "source_detail": source_name,
                    "signal_type": "news",
                    "metadata": {"feed": source_name},
                })
        except Exception as e:
            print(f"    [RSS Cyber] {source_name} warning: {e}")
    print(f"    [RSS Cyber] {len(signals)} raw signals")
    return signals


def _collect_changelogs():
    signals = []
    seen = set()
    for source_name, url in CHANGELOG_FEEDS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            items = root.findall(".//item")
            if not items:
                ns = {"a": "http://www.w3.org/2005/Atom"}
                items = root.findall(".//a:entry", ns)
            for item in items[:20]:
                el = item.find("title")
                title = (el.text or "").strip() if el is not None else ""
                if not title or not _is_cyber_relevant(title):
                    continue
                key = _dedup_key(title)
                if key in seen:
                    continue
                seen.add(key)
                signals.append({
                    "topic": title,
                    "score": 200 + _cyber_score(title) * 50,
                    "source": "changelog_cyber",
                    "source_detail": source_name,
                    "signal_type": "threat_advisory",
                    "metadata": {"feed": source_name},
                })
        except Exception as e:
            print(f"    [Changelog Cyber] {source_name} warning: {e}")
    print(f"    [Changelog Cyber] {len(signals)} raw signals")
    return signals


def _collect_youtube():
    if not YOUTUBE_API_KEY:
        print("    [YouTube Cyber] YOUTUBE_API_KEY not set — skipping")
        return []
    signals = []
    seen = set()
    for query in YOUTUBE_QUERIES:
        try:
            resp = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "order": "viewCount",
                    "relevanceLanguage": "en",
                    "publishedAfter": "2024-01-01T00:00:00Z",
                    "maxResults": 5,
                    "key": YOUTUBE_API_KEY,
                },
                timeout=15,
            )
            if resp.status_code != 200:
                print(f"    [YouTube Cyber] '{query}' returned {resp.status_code}")
                continue
            for item in resp.json().get("items", []):
                title = (item.get("snippet", {}).get("title") or "").strip()
                if not title or not _is_cyber_relevant(title):
                    continue
                key = _dedup_key(title)
                if key in seen:
                    continue
                seen.add(key)
                signals.append({
                    "topic": title,
                    "score": 250 + _cyber_score(title) * 60,
                    "source": "youtube_cyber",
                    "source_detail": f"YouTube: {query}",
                    "signal_type": "tutorial_demand",
                    "metadata": {
                        "video_id": item.get("id", {}).get("videoId", ""),
                        "channel": item.get("snippet", {}).get("channelTitle", ""),
                    },
                })
            time.sleep(0.3)
        except Exception as e:
            print(f"    [YouTube Cyber] warning ({query}): {e}")
    print(f"    [YouTube Cyber] {len(signals)} raw signals")
    return signals


def collect_all_signals():
    print("Phase 1: Collecting cybersecurity signals\n")
    all_signals = []
    all_signals.extend(_collect_hn())
    all_signals.extend(_collect_so())
    all_signals.extend(_collect_rss())
    all_signals.extend(_collect_changelogs())
    all_signals.extend(_collect_youtube())

    seen = set()
    deduped = []
    for s in all_signals:
        key = _dedup_key(s["topic"])
        if key not in seen:
            seen.add(key)
            deduped.append(s)

    deduped.sort(key=lambda x: x["score"], reverse=True)
    result = deduped[:50]
    print(f"\n  Total raw signals collected: {len(result)}")
    return result


# ── PHASE 2: SYNTHESIZE WITH CLAUDE ──────────────────────────────────────────

def load_existing_draft_titles():
    titles = []
    if DRAFTS_DIR.exists():
        for f in DRAFTS_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                t = data.get("title", "")
                if t:
                    titles.append(t)
            except Exception:
                continue
    return titles


def load_catalog_titles():
    titles = []
    for p in [Path("ai-academy/courses-data.json"), Path("ai-academy/courses.json")]:
        if p.exists():
            try:
                data = json.loads(p.read_text())
                courses = data if isinstance(data, list) else data.get("courses", [])
                for c in courses:
                    t = c.get("title", "")
                    if t:
                        titles.append(t)
            except Exception:
                continue
    return titles


def synthesize_topics(signals):
    print("\nPhase 2: Synthesizing signals into cybersecurity course topics\n")

    if not signals:
        print("  No signals collected — aborting.")
        return []

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)

    signal_text = "".join(
        f"- [{s['source']}] {s['topic']} (score: {s['score']})\n"
        for s in signals[:80]
    )

    existing_draft_titles = load_existing_draft_titles()
    catalog_titles        = load_catalog_titles()

    already_lines = []
    if existing_draft_titles:
        already_lines.append("Draft queue (do NOT propose anything similar):")
        already_lines.extend(f"  - {t}" for t in existing_draft_titles[:40])
    if catalog_titles:
        already_lines.append("Already published (do NOT propose anything similar):")
        already_lines.extend(f"  - {t}" for t in catalog_titles[:80])

    existing_context = (
        "ALREADY EXISTS — do not propose anything similar:\n" + "\n".join(already_lines)
        if already_lines else ""
    )

    prompt = f"""You are a curriculum analyst for AESOP AI Academy — a free AI literacy platform.

I've collected real-world signals from cybersecurity news, Hacker News, Stack Overflow, YouTube, and threat advisories. Synthesize these into 40 distinct COURSE TOPIC CANDIDATES for the CYBERSECURITY track.

These courses serve two audiences:
1. Professionals: security analysts, IT admins, developers, DevSecOps, risk/compliance roles
2. General public: everyday people who want to protect themselves from AI-enabled threats

RAW SIGNALS:
{signal_text}

{existing_context}

SYNTHESIS RULES:
- Prioritize topics where AI is specifically changing the threat landscape or defensive tooling
- Cover both offensive awareness (how attacks work) and defensive skills (how to protect)
- Include topics relevant to everyday users, not just security professionals
- Flag topics about specific AI security tools/frameworks as "is_model_topic": true
- Each topic must be distinct — no near-duplicates

Return a JSON array of 40 objects:
- "topic": clear course-worthy topic name (3-8 words)
- "signals": array of the original signal texts that fed into this topic
- "signal_sources": array of source names
- "demand_score": 1-10 estimated demand
- "audience": "professional", "general", or "both"
- "is_model_topic": true if specifically about a named AI security tool or framework

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
                print(f"  Anthropic API error {e.status_code} — retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise
    else:
        raise RuntimeError("Anthropic API unavailable after 4 attempts.")

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    candidates = json.loads(raw)
    print(f"  Synthesized {len(candidates)} candidate topics")
    return candidates


# ── PHASE 3: PINECONE GAP CHECK ───────────────────────────────────────────────

def check_gaps(candidates):
    print("\nPhase 3: Checking corpus coverage via Pinecone\n")

    if not PINECONE_API_KEY or not PINECONE_HOST:
        print("  ERROR: Pinecone not configured — corpus check required; skipping")
        return []

    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX, host=PINECONE_HOST)
        stats = index.describe_index_stats()
        total_vectors = stats.get("total_vector_count", stats.get("totalVectorCount", 0))
    except Exception as e:
        print(f"  ERROR: Pinecone init failed ({e}) — skipping")
        return []

    if total_vectors == 0:
        print("  WARNING: Pinecone index empty — treating all as gaps")
        for c in candidates:
            c["corpus_score"] = 0.0
            c["nearest_course"] = "none (empty corpus)"
        return candidates

    gaps = []
    for c in candidates:
        topic = c["topic"]
        try:
            embed_resp = requests.post(
                "https://api.voyageai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {VOYAGE_API_KEY}",
                         "content-type": "application/json"},
                json={"model": "voyage-3", "input": [topic], "input_type": "query"},
                timeout=30,
            )
            if embed_resp.status_code != 200:
                print(f"  WARNING: embed failed for '{topic}' — skipping")
                continue

            vec = embed_resp.json()["data"][0]["embedding"]
            result = index.query(vector=vec, top_k=1, include_metadata=True)
            matches = result.get("matches", [])
            score   = matches[0]["score"] if matches else 0.0
            nearest = (matches[0].get("metadata") or {}).get("title", "unknown") if matches else "none"

            print(f"  [{'GAP' if score < GAP_THRESHOLD else 'COVERED'}] {topic}: "
                  f"score={score:.3f} → '{nearest}'")

            if score < GAP_THRESHOLD:
                c["corpus_score"] = score
                c["nearest_course"] = nearest
                gaps.append(c)

            time.sleep(0.2)
        except Exception as e:
            print(f"  WARNING: gap check failed for '{topic}': {e} — skipping")
            continue

    gaps.sort(key=lambda x: (-x.get("demand_score", 0), x["corpus_score"]))
    print(f"\n  Found {len(gaps)} Pinecone gaps out of {len(candidates)} candidates")
    return gaps


# ── PHASE 4: GENERATE PROPOSALS ──────────────────────────────────────────────

def load_existing_draft_ids():
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


def _build_prompt_cyber(topics_batch, existing_note):
    topic_details = "\n".join(
        f"- {t['topic']} (demand: {t.get('demand_score','?')}/10, "
        f"audience: {t.get('audience','both')}, "
        f"corpus similarity: {t['corpus_score']:.2f}, "
        f"nearest existing: '{t['nearest_course']}', "
        f"signals from: {', '.join(t.get('signal_sources', ['unknown']))}"
        + (", ⚑ MODEL TOPIC" if t.get('is_model_topic') else "") + ")"
        for t in topics_batch
    )
    return f"""You are a curriculum designer for AESOP AI Academy — a free AI literacy platform.

Generate {len(topics_batch)} course proposals for the CYBERSECURITY track. These courses teach how AI is changing the threat landscape and how to protect against it. Topics are UNDERREPRESENTED in our curriculum.

{topic_details}

Avoid duplicating these existing draft IDs/titles: {existing_note}

IMPORTANT: Each course must cover a DISTINCTLY different theme — no near-duplicates.

AUDIENCE NOTES:
- "professional": security analysts, IT admins, developers, DevSecOps, risk/compliance roles
- "general": everyday users — employees, consumers, parents — facing AI-enabled threats
- "both": accessible to general users with depth for professionals

DESIGN PRINCIPLES:
- Lead with real-world consequences — what goes wrong when people don't know this
- Balance theory with hands-on practice (tool demos, case studies, exercises)
- Professional courses: assume security literacy, go deep on AI-specific dimensions
- General courses: accessible language, clear protective actions, no jargon
- Each course must answer: "What can I DO differently after this?"

MODULE COUNT RULES:
- Topics marked ⚑ MODEL TOPIC: 5 focused modules (tool-specific, immediately practical)
- All other topics: 7 modules

For EACH topic, return a JSON object with exactly these fields:
- "id": kebab-case slug (e.g. "ai-phishing-defense")
- "title": short, compelling course title (max 6 words)
- "mega_group": always "Cybersecurity" — every course this agent produces belongs in the 🔒 Cybersecurity nav section.
- "modules": array of module objects — 5 objects for ⚑ MODEL TOPIC, 7 objects for everything else.
    Each module object MUST have these three fields:
    {"title": "<short module name, max 8 words>",
     "sub":   "<one-sentence subtitle, 6-14 words, framing what the module covers>",
     "description": "<2-4 sentences describing what the learner does, detects, or defends against in this module>"}
- "synopsis": 2-sentence description that makes the stakes clear
- "tier": "Beginner", "Intermediate", or "Advanced"
- "audience": "professional", "general", or "both"
- "rationale": 1 sentence on why this gap matters now
- "learning_outcome": 1 sentence — what can the learner DO or DETECT after this course?
- "is_model_topic": true if specifically about a named AI security tool or framework

Return ONLY a JSON array of objects. No preamble, no markdown fences."""


def _call_claude_cyber(client, prompt):
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
        raise RuntimeError("Anthropic API unavailable after 4 attempts.")
    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def generate_drafts(gaps):
    """Generate cybersecurity course proposals in batches of BATCH_SIZE.
    No cap — generates all gaps found (DRAFTS_PER_RUN is a minimum target).
    """
    topics_to_draft = gaps
    print(f"\nPhase 4: Generating {len(topics_to_draft)} cybersecurity course proposals "
          f"(batches of {BATCH_SIZE})\n")

    if not gaps:
        print("  No gaps found — skipping generation.")
        return []

    existing_ids  = load_existing_draft_ids()
    client        = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=300)
    existing_note = ", ".join(list(existing_ids)[:20]) if existing_ids else "none yet"
    all_drafts    = []

    for batch_start in range(0, len(topics_to_draft), BATCH_SIZE):
        batch        = topics_to_draft[batch_start:batch_start + BATCH_SIZE]
        batch_num    = batch_start // BATCH_SIZE + 1
        total_batches = (len(topics_to_draft) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches}: {len(batch)} topics...")

        prompt = _build_prompt_cyber(batch, existing_note)
        try:
            batch_drafts = _call_claude_cyber(client, prompt)
        except json.JSONDecodeError as e:
            print(f"  ERROR: JSON decode failed on batch {batch_num}: {e} — skipping batch")
            continue
        except Exception as e:
            print(f"  ERROR: batch {batch_num} failed: {e} — skipping batch")
            continue

        for draft, gap in zip(batch_drafts, batch):
            draft["source_signals"]   = gap.get("signals", [])
            draft["source_names"]     = gap.get("signal_sources", [])
            draft["demand_score"]     = gap.get("demand_score", 0)
            draft["corpus_score"]     = gap.get("corpus_score", 0)
            draft["nearest_existing"] = gap.get("nearest_course", "unknown")
            draft["is_model_topic"]   = gap.get("is_model_topic", False) or draft.get("is_model_topic", False)
            draft["cyber_audience"]   = gap.get("audience", "both")

        all_drafts.extend(batch_drafts)
        print(f"  Batch {batch_num} done — {len(batch_drafts)} proposals generated")

        if batch_num < total_batches:
            time.sleep(1)

    print(f"  Generated {len(all_drafts)} total proposals")
    return all_drafts


# ── PHASE 5: SAVE DRAFTS ─────────────────────────────────────────────────────

def save_drafts(drafts):
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    saved = []

    for draft in drafts:
        draft["generated"]        = date_str
        draft["status"]           = "pending"
        draft["pipeline_version"] = "1.0-cyber"
        draft["audience"]         = AUDIENCE
        draft["age_range"]        = AGE_RANGE
        draft["category"]         = CATEGORY

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
    print("Cybersecurity Research Agent v1.0 — Signal-Driven Pipeline")
    print("=" * 60)
    print(f"Run date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n")

    signals    = collect_all_signals()
    candidates = synthesize_topics(signals)

    if not candidates:
        print("No candidates synthesized — exiting.")
        return

    gaps = check_gaps(candidates)

    if not gaps:
        print("\nNo genuine gaps found — corpus fully covers all candidates.")
        return

    drafts = generate_drafts(gaps)

    if not drafts:
        print("\nNo drafts generated.")
        return

    print(f"\nPhase 5: Saving {len(drafts)} drafts\n")
    saved = save_drafts(drafts)
    print(f"\n✓ Done — {len(saved)} new drafts saved to {DRAFTS_DIR}/")


if __name__ == "__main__":
    main()
