"""
AI Trend Signal Scanner
Collects signals from all sources, clusters and scores them via Claude,
and writes ai-news/trend-data.json for the Signal Desk UI.

Run:  python .github/scripts/build_trend_data.py
Env:  ANTHROPIC_API_KEY  (required)
      YOUTUBE_API_KEY    (optional)
"""

import json
import os
import re
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

# ── Path resolution ───────────────────────────────────────────────────────────
# Works when invoked as:
#   python .github/scripts/build_trend_data.py   (from repo root)
#   python build_trend_data.py                   (from .github/scripts/)

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

import signals_reddit as sr
import signals_k12_education as sk

TREND_DATA_PATH = REPO_ROOT / "ai-news" / "trend-data.json"
ARTICLES_INDEX_PATH = REPO_ROOT / "ai-news" / "articles-index.json"
ARTICLES_DIR = REPO_ROOT / "ai-news" / "articles"

MAX_SIGNALS = 80
MAX_CLUSTERS = 30
MAX_STORIES = 10
MAX_IDEAS = 10
NOVELTY_WINDOW_DAYS = 30


def _dedup_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", title.lower())[:60]


# ── Signal collection ─────────────────────────────────────────────────────────

def collect_all_signals() -> tuple[list[dict], int]:
    """Merge signals from both collectors, dedup globally. Returns (signals, active_source_count)."""
    print("[Trend] Collecting signals...")

    general = sr.collect_signals(max_signals=50)
    k12 = sk.collect_signals(max_signals=30)

    seen: set[str] = set()
    merged: list[dict] = []
    for s in general + k12:
        key = _dedup_key(s["topic"])
        if key not in seen:
            seen.add(key)
            merged.append(s)

    merged.sort(key=lambda x: x["score"], reverse=True)

    # Count distinct source families (split on _ to normalise hacker_news / hacker_news_k12)
    source_families = {s["source"].split("_")[0] for s in merged}
    active_sources = len(source_families)

    result = merged[:MAX_SIGNALS]
    print(f"[Trend] {len(result)} signals after global dedup ({active_sources} source families active)")
    return result, active_sources


# ── Recent article title loader ───────────────────────────────────────────────

def load_recent_article_titles(days: int = NOVELTY_WINDOW_DAYS) -> list[str]:
    """Return titles of articles published in the last N days (for novelty scoring)."""
    if not ARTICLES_INDEX_PATH.exists():
        return []

    try:
        index = json.loads(ARTICLES_INDEX_PATH.read_text(encoding="utf-8"))
        today = datetime.now(timezone.utc).date()
        titles: list[str] = []

        for path_str in index.get("articles", []):
            fname = Path(path_str).stem          # e.g. "2026-05-08-slug"
            parts = fname.split("-")
            if len(parts) < 3:
                continue
            try:
                article_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
                if (today - article_date).days > days:
                    continue
                json_path = REPO_ROOT / "ai-news" / path_str
                if json_path.exists():
                    data = json.loads(json_path.read_text(encoding="utf-8"))
                    title = data.get("title", "").strip()
                    if title:
                        titles.append(title)
            except (ValueError, OSError):
                pass

        print(f"[Trend] Loaded {len(titles)} recent article titles for novelty reference")
        return titles
    except Exception as e:
        print(f"[Trend] Warning: could not load article titles: {e}")
        return []


# ── Claude clustering ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI trend analyst for Aesop AI Academy, a free AI literacy education platform.

Given signals from Hacker News, GitHub, Stack Overflow, RSS feeds, and changelogs, plus recent article titles for novelty reference:

1. Cluster the signals into up to 30 topic groups.
2. Score each cluster on 4 dimensions (integers 0-100):
   - trend: overall relevance and importance right now
   - velocity: how fast this topic is spreading or accelerating
   - novelty: how new/fresh this topic is (high if NOT covered by recent_article_titles; low if heavy overlap)
   - competition: how many other clusters share keywords with this one (high = crowded)
3. Compute composite = round(trend*0.35 + velocity*0.30 + novelty*0.25 + (100-competition)*0.10)
4. Identify up to 10 top stories — the single clearest signal headline per cluster, ranked by overall signal strength.
5. Generate up to 10 article ideas — one per top cluster, skipping clusters whose topic is already well covered by recent_article_titles.

Respond ONLY with a valid JSON object. No markdown fences, no explanation.

Required schema:
{
  "clusters": [
    {
      "id": "kebab-case-unique-id",
      "label": "Short Human-Readable Label",
      "signal_count": <int>,
      "scores": { "trend": <int>, "velocity": <int>, "novelty": <int>, "competition": <int> },
      "composite": <int>,
      "top_signals": ["signal title 1", "signal title 2", "signal title 3"]
    }
  ],
  "top_stories": [
    {
      "rank": <int>,
      "title": "Concise story headline",
      "summary": "One sentence plain-English summary of what is happening.",
      "score": <int 0-1000>,
      "source_count": <int>,
      "cluster_id": "matching-cluster-id"
    }
  ],
  "ideas": [
    {
      "rank": <int>,
      "title": "Article title for Aesop to write",
      "rationale": "One sentence: why this matters for AI literacy readers.",
      "target_cluster": "matching-cluster-id",
      "estimated_readtime": "X min read"
    }
  ]
}

Sort clusters by composite descending. Sort top_stories by score descending. Sort ideas by rank ascending."""


def cluster_and_score(signals: list[dict], recent_titles: list[str]) -> dict | None:
    """Call Claude Haiku to cluster and score signals. Returns parsed dict or None on failure."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("[Trend] ERROR: ANTHROPIC_API_KEY not set")
        return None

    try:
        import anthropic
    except ImportError:
        print("[Trend] ERROR: anthropic package not installed")
        return None

    client = anthropic.Anthropic(api_key=api_key)

    signal_lines = [
        f"{i}. [{s['source']}] {s['topic']} (score={s['score']})"
        for i, s in enumerate(signals, 1)
    ]
    title_block = "\n".join(f"- {t}" for t in recent_titles[:60]) or "(none)"

    user_message = (
        f"Signals ({len(signals)} total):\n"
        + "\n".join(signal_lines)
        + f"\n\nRecent article titles (last 30 days, for novelty scoring):\n{title_block}"
    )

    print(f"[Trend] Calling Claude Haiku with {len(signals)} signals...")

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_message}],
        )

        raw = response.content[0].text.strip()

        # Strip markdown code fences if Claude wraps the JSON
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw.strip())

        parsed = json.loads(raw)
        print(
            f"[Trend] Claude returned {len(parsed.get('clusters', []))} clusters, "
            f"{len(parsed.get('top_stories', []))} stories, "
            f"{len(parsed.get('ideas', []))} ideas"
        )
        return parsed

    except json.JSONDecodeError as e:
        print(f"[Trend] Claude JSON parse error: {e}")
        print(f"[Trend] Raw response snippet: {raw[:400]}")
        return None
    except Exception as e:
        print(f"[Trend] Claude API error: {e}")
        return None


# ── Deterministic fallback ────────────────────────────────────────────────────

KEYWORD_BUCKETS: list[tuple[str, str]] = [
    ("agent",           "ai-agents"),
    ("agentic",         "ai-agents"),
    ("rag",             "rag-retrieval"),
    ("openai",          "openai"),
    ("anthropic",       "anthropic-claude"),
    ("gemini",          "google-ai"),
    ("google",          "google-ai"),
    ("education",       "ai-education"),
    ("k-12",            "ai-education"),
    ("school",          "ai-education"),
    ("student",         "ai-education"),
    ("llm",             "llm-models"),
    ("fine-tun",        "fine-tuning"),
    ("langchain",       "frameworks"),
    ("crewai",          "frameworks"),
    ("cursor",          "ai-coding"),
    ("copilot",         "ai-coding"),
    ("regulation",      "ai-policy"),
    ("policy",          "ai-policy"),
    ("safety",          "ai-safety"),
    ("alignment",       "ai-safety"),
    ("image",           "ai-image-video"),
    ("video",           "ai-image-video"),
    ("voice",           "ai-voice"),
    ("audio",           "ai-voice"),
]


def deterministic_fallback(signals: list[dict], recent_titles: list[str]) -> dict:
    """Keyword-bucket grouping used when Claude is unavailable."""
    print("[Trend] Using deterministic fallback scorer...")

    recent_keys = {_dedup_key(t) for t in recent_titles}

    buckets: dict[str, list[dict]] = {}
    for s in signals:
        topic_lower = s["topic"].lower()
        bucket = "general-ai"
        for kw, bid in KEYWORD_BUCKETS:
            if kw in topic_lower:
                bucket = bid
                break
        buckets.setdefault(bucket, []).append(s)

    clusters: list[dict] = []
    for cid, sigs in sorted(buckets.items(), key=lambda x: -sum(s["score"] for s in x[1])):
        total = sum(s["score"] for s in sigs)
        overlap = sum(1 for s in sigs if _dedup_key(s["topic"]) in recent_keys)
        novelty = max(0, 100 - overlap * 25)
        trend = min(100, total // 10)
        velocity = min(100, len(sigs) * 8)
        competition = min(100, len(clusters) * 5)
        composite = round(trend * 0.35 + velocity * 0.30 + novelty * 0.25 + (100 - competition) * 0.10)

        clusters.append({
            "id": cid,
            "label": cid.replace("-", " ").title(),
            "signal_count": len(sigs),
            "scores": {"trend": trend, "velocity": velocity, "novelty": novelty, "competition": competition},
            "composite": composite,
            "top_signals": [s["topic"][:80] for s in sigs[:3]],
        })

    clusters = sorted(clusters, key=lambda x: -x["composite"])[:MAX_CLUSTERS]

    top_stories: list[dict] = []
    for i, cluster in enumerate(clusters[:MAX_STORIES]):
        sigs = buckets.get(cluster["id"], [])
        top_sig = max(sigs, key=lambda s: s["score"]) if sigs else {"topic": cluster["label"], "score": 0}
        top_stories.append({
            "rank": i + 1,
            "title": top_sig["topic"][:100],
            "summary": f"Trending signals in the {cluster['label'].lower()} space.",
            "score": min(1000, top_sig["score"]),
            "source_count": cluster["signal_count"],
            "cluster_id": cluster["id"],
        })

    ideas: list[dict] = []
    for cluster in clusters:
        if len(ideas) >= MAX_IDEAS:
            break
        sigs = buckets.get(cluster["id"], [])
        overlap = sum(1 for s in sigs if _dedup_key(s["topic"]) in recent_keys)
        if overlap >= 2:
            continue
        ideas.append({
            "rank": len(ideas) + 1,
            "title": f"Understanding {cluster['label']}: What You Need to Know",
            "rationale": f"High signal activity in {cluster['label'].lower()} with limited recent Aesop coverage.",
            "target_cluster": cluster["id"],
            "estimated_readtime": "4 min read",
        })

    return {"clusters": clusters, "top_stories": top_stories, "ideas": ideas}


# ── Orchestration ─────────────────────────────────────────────────────────────

def build_trend_data() -> dict:
    signals, active_sources = collect_all_signals()
    recent_titles = load_recent_article_titles()

    claude_result = cluster_and_score(signals, recent_titles)

    if claude_result and "clusters" in claude_result and "top_stories" in claude_result:
        result = claude_result
    else:
        print("[Trend] Falling back to deterministic scorer")
        result = deterministic_fallback(signals, recent_titles)

    clusters = result.get("clusters", [])[:MAX_CLUSTERS]
    top_stories = result.get("top_stories", [])[:MAX_STORIES]
    ideas = result.get("ideas", [])[:MAX_IDEAS]

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    prev_generated_at = None
    if TREND_DATA_PATH.exists():
        try:
            prev = json.loads(TREND_DATA_PATH.read_text(encoding="utf-8"))
            prev_generated_at = prev.get("generated_at")
        except Exception:
            pass

    return {
        "generated_at": now,
        "window_hours": 24,
        "stats": {
            "items_collected": len(signals),
            "clusters_found": len(clusters),
            "ideas_generated": len(ideas),
            "sources_active": active_sources,
        },
        "top_stories": top_stories,
        "clusters": clusters,
        "ideas": ideas,
        "previous_generated_at": prev_generated_at,
    }


def write_trend_data(data: dict) -> None:
    tmp = TREND_DATA_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(TREND_DATA_PATH)
    size_kb = TREND_DATA_PATH.stat().st_size // 1024
    print(f"[Trend] Wrote {TREND_DATA_PATH} ({size_kb} KB)")


if __name__ == "__main__":
    data = build_trend_data()
    write_trend_data(data)

    stats = data["stats"]
    print(f"\n=== Signal Desk Summary ===")
    print(f"  Items:    {stats['items_collected']}")
    print(f"  Clusters: {stats['clusters_found']}")
    print(f"  Ideas:    {stats['ideas_generated']}")
    print(f"  Sources:  {stats['sources_active']} active")
    print(f"\nTop 5 clusters:")
    for c in data["clusters"][:5]:
        s = c["scores"]
        print(f"  [{c['composite']:3d}] {c['label']} "
              f"(T:{s['trend']} V:{s['velocity']} N:{s['novelty']} C:{s['competition']})")
    print(f"\nTop 3 stories:")
    for story in data["top_stories"][:3]:
        print(f"  {story['rank']}. {story['title'][:70]}")
