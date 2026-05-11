#!/usr/bin/env python3
"""
Generate daily AI News article JSON files from the repository's signal feeds.

This is a repo-native fallback for the external Daily AI News routine. It keeps
the public news page moving when the outside routine misses a day.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
AI_NEWS_DIR = REPO_ROOT / "ai-news"
ARTICLES_DIR = AI_NEWS_DIR / "articles"
INDEX_PATH = AI_NEWS_DIR / "articles-index.json"

sys.path.insert(0, str(SCRIPT_DIR))
from signals_reddit import collect_signals as collect_general_signals  # noqa: E402
from signals_k12_education import collect_signals as collect_k12_signals  # noqa: E402

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
DEFAULT_COUNT = int(os.environ.get("AI_NEWS_ARTICLE_COUNT", "5"))


def slugify(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:72].strip("-") or "ai-news"


def existing_article_paths() -> list[str]:
    if not INDEX_PATH.exists():
        return []
    try:
        data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        return list(data.get("articles", []))
    except Exception:
        return []


def existing_titles() -> set[str]:
    titles: set[str] = set()
    for path_str in existing_article_paths():
        path = AI_NEWS_DIR / path_str
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            title = str(data.get("title", "")).strip().lower()
            if title:
                titles.add(title)
        except Exception:
            continue
    return titles


def has_articles_for_date(date_str: str) -> bool:
    return any(path.name.startswith(f"{date_str}-") and path.suffix == ".json" for path in ARTICLES_DIR.glob("*.json"))


def source_url(signal: dict) -> str:
    metadata = signal.get("metadata") or {}
    url = metadata.get("url") or ""
    if url:
        return url
    video_id = metadata.get("video_id")
    if video_id:
        return f"https://www.youtube.com/watch?v={video_id}"
    return ""


def collect_candidates(limit: int) -> list[dict]:
    signals = []
    signals.extend(collect_general_signals(max_signals=80))
    signals.extend(collect_k12_signals(max_signals=40))

    seen: set[str] = set()
    candidates: list[dict] = []
    for signal in sorted(signals, key=lambda s: s.get("score", 0), reverse=True):
        title = str(signal.get("topic", "")).strip()
        if not title:
            continue
        key = slugify(title)
        if key in seen:
            continue
        seen.add(key)
        candidates.append({
            "title": title,
            "score": signal.get("score", 0),
            "source": signal.get("source", "signal"),
            "source_detail": signal.get("source_detail", ""),
            "signal_type": signal.get("signal_type", "news"),
            "url": source_url(signal),
            "metadata": signal.get("metadata", {}),
        })
        if len(candidates) >= limit:
            break
    return candidates


def fallback_article(date_str: str, candidate: dict) -> dict:
    title = candidate["title"][:96]
    slug = f"{date_str}-{slugify(title)}"
    source_name = candidate.get("source_detail") or candidate.get("source") or "AI signal feed"
    url = candidate.get("url") or "https://aesopacademy.org/ai-news/"
    category = "Education" if "education" in title.lower() or "student" in title.lower() else "Industry"
    tags = [candidate.get("source", "ai"), candidate.get("signal_type", "news"), "ai"]

    return {
        "id": slug,
        "title": title,
        "subtitle": f"Aesop's signal desk flagged this as a high-priority AI story from {source_name}.",
        "date": date_str,
        "author": "AESOP AI Engine",
        "category": category,
        "tags": [slugify(tag).replace("-", " ") for tag in tags if tag][:5],
        "readTime": "3 min read",
        "heroEmoji": "📰",
        "body": [
            f"The Aesop signal desk surfaced '{title}' as one of today's strongest AI signals. The item ranked highly because it appeared in active public feeds and matched the platform's AI literacy, tools, education, or governance focus.",
            "The important learner question is not only what happened, but what capability or risk it points toward. Stories about agents, AI education, model launches, infrastructure, and regulation are all early clues about the workflows people will need to understand next.",
            "For learners: treat a headline like this as a prompt to ask three practical questions. What changed? Who has to make a decision because of it? And what concept would help a non-expert understand the stakes without drowning in product language?",
        ],
        "sources": [{"title": source_name, "url": url}],
        "status": "published",
    }


def build_prompt(date_str: str, candidates: list[dict], count: int, recent_titles: set[str]) -> str:
    compact = [
        {
            "title": c["title"],
            "source": c["source"],
            "source_detail": c["source_detail"],
            "signal_type": c["signal_type"],
            "url": c["url"],
            "score": c["score"],
        }
        for c in candidates[:20]
    ]
    recent = sorted(list(recent_titles))[:80]
    return f"""You are the AESOP AI News editor.

Create {count} short, factual AI news article JSON objects for {date_str}.

Use ONLY the supplied signal candidates. Do not invent numbers, deals, dates, quotes, sources, or claims not supported by the candidate title/source. If a candidate is vague, write a careful signal-analysis article that explains why the topic matters instead of pretending to know more.

Recent titles to avoid duplicating:
{json.dumps(recent, ensure_ascii=False)}

Signal candidates:
{json.dumps(compact, ensure_ascii=False, indent=2)}

Return ONLY a JSON array. Each object must have exactly these fields:
- id: "{date_str}-" plus a unique kebab-case slug
- title: concise headline
- subtitle: one sentence
- date: "{date_str}"
- author: "AESOP AI Engine"
- category: one of "Tools", "Education", "Industry", "Policy", "Research", "Security"
- tags: 3 to 6 lowercase tags
- readTime: "3 min read"
- heroEmoji: one emoji
- body: array of 3 or 4 paragraphs
- sources: array with at least one object containing title and url
- status: "published"
"""


def call_claude(date_str: str, candidates: list[dict], count: int, recent_titles: set[str]) -> list[dict] | None:
    if not ANTHROPIC_API_KEY:
        print("[News] ANTHROPIC_API_KEY missing; using deterministic fallback.")
        return None

    import anthropic

    prompt = build_prompt(date_str, candidates, count, recent_titles)
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=180)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=7000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def normalize_article(article: dict, date_str: str, used_ids: set[str]) -> dict:
    title = str(article.get("title", "AI News Update")).strip()[:120]
    base_id = str(article.get("id") or f"{date_str}-{slugify(title)}")
    if not base_id.startswith(f"{date_str}-"):
        base_id = f"{date_str}-{slugify(base_id)}"
    article_id = slugify(base_id)
    if not article_id.startswith(f"{date_str}-"):
        article_id = f"{date_str}-{article_id}"
    original = article_id
    suffix = 2
    while article_id in used_ids:
        article_id = f"{original}-{suffix}"
        suffix += 1
    used_ids.add(article_id)

    sources = article.get("sources") or []
    clean_sources = []
    for source in sources:
        if not isinstance(source, dict):
            continue
        url = str(source.get("url", "")).strip() or "https://aesopacademy.org/ai-news/"
        clean_sources.append({"title": str(source.get("title", "Source")).strip()[:140], "url": url})
    if not clean_sources:
        clean_sources = [{"title": "Aesop signal desk", "url": "https://aesopacademy.org/ai-news/"}]

    body = article.get("body") if isinstance(article.get("body"), list) else []
    body = [str(p).strip() for p in body if str(p).strip()]
    if len(body) < 3:
        body = fallback_article(date_str, {"title": title, "source_detail": "Aesop signal desk"})["body"]

    tags = article.get("tags") if isinstance(article.get("tags"), list) else ["ai", "news"]
    return {
        "id": article_id,
        "title": title,
        "subtitle": str(article.get("subtitle", "")).strip()[:240] or "Aesop's AI signal desk flagged this story for learners.",
        "date": date_str,
        "author": "AESOP AI Engine",
        "category": str(article.get("category", "Industry")).strip() or "Industry",
        "tags": [str(tag).strip().lower() for tag in tags if str(tag).strip()][:6] or ["ai", "news"],
        "readTime": "3 min read",
        "heroEmoji": str(article.get("heroEmoji", "📰")).strip()[:2] or "📰",
        "body": body[:4],
        "sources": clean_sources,
        "status": "published",
    }


def update_index(new_files: list[str], date_str: str) -> None:
    current = existing_article_paths()
    merged = []
    seen = set()
    for path in new_files + current:
        if path in seen:
            continue
        seen.add(path)
        merged.append(path)
    INDEX_PATH.write_text(
        json.dumps({"lastUpdated": date_str, "articles": merged}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT)
    parser.add_argument("--force", action="store_true", help="Generate even if this date already has articles.")
    args = parser.parse_args()

    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)
    if has_articles_for_date(args.date) and not args.force:
        print(f"[News] Articles already exist for {args.date}; skipping.")
        return 0

    recent_titles = existing_titles()
    candidates = [c for c in collect_candidates(40) if c["title"].lower() not in recent_titles]
    if not candidates:
        print("[News] No novel candidates found.")
        return 0

    try:
        generated = call_claude(args.date, candidates, args.count, recent_titles)
    except Exception as exc:
        print(f"[News] Claude generation failed: {exc}; using deterministic fallback.")
        generated = None

    if not generated:
        generated = [fallback_article(args.date, c) for c in candidates[:args.count]]

    used_ids = {path.stem for path in ARTICLES_DIR.glob("*.json")}
    new_files: list[str] = []
    for raw in generated[:args.count]:
        article = normalize_article(raw, args.date, used_ids)
        out_path = ARTICLES_DIR / f"{article['id']}.json"
        out_path.write_text(json.dumps(article, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        rel = f"articles/{out_path.name}"
        new_files.append(rel)
        print(f"[News] Wrote {rel}")

    update_index(new_files, args.date)
    print(f"[News] Generated {len(new_files)} article JSON file(s) for {args.date}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
