#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_course_outcomes.py — Insert a "By the end of this course" learner-
outcomes block on every course's intro page, immediately after the
narrative story-scene and before the next-page nav.

For each m1.html under ai-academy/modules/<slug>/, this script:
  1. Extracts the course title and the intro-page narrative paragraphs.
  2. Loads the matching course's module list (titles + subtitles where
     available) from ai-academy/modules/courses-data.json.
  3. Calls Claude once per course to produce 5–7 bullets answering:
       - What will the learner KNOW after completing every module?
       - What will the learner LOOK LIKE / be able to DO?
       - Who are they BECOMING?
  4. Inserts a structured outcomes block into m1.html, sandwiched
     between the closing </div> of the .story-scene and the next
     <div class="pnav">. Idempotent — files that already contain a
     <div class="learner-outcomes"> block are skipped.

The inserted block uses the existing page-design vocabulary (story-
scene, story-text) plus a new ``learner-outcomes`` class so it can be
styled site-wide without touching individual files.

Usage:
    python .github/scripts/add_course_outcomes.py             # dry-run
    python .github/scripts/add_course_outcomes.py --apply     # write
    python .github/scripts/add_course_outcomes.py --apply --limit 3
    python .github/scripts/add_course_outcomes.py --apply --slug ai-governance

Cost: ~$0.005 per course × 115 courses ≈ $0.60.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO         = Path(__file__).resolve().parents[2]
MODULES_DIR  = REPO / "ai-academy" / "modules"
COURSES_DATA = MODULES_DIR / "courses-data.json"

# ── Marker that signals "this file already has an outcomes block" ─────
ALREADY_PATCHED_MARKER = 'class="learner-outcomes"'


# ── HTML extraction ────────────────────────────────────────────────────

INTRO_RE = re.compile(
    r'(<div\s+class="page[^"]*"\s+id="p-intro">)(.*?)(</div>\s*<!--)',
    re.DOTALL,
)
STORY_TEXT_RE = re.compile(
    r'<p class="story-text">(.*?)</p>',
    re.DOTALL,
)
LESSON_KICKER_RE = re.compile(
    r'<div class="lesson-kicker">([^<]+)</div>',
)
LESSON_H1_RE = re.compile(
    r'<div class="lesson-hero">.*?<h1>(.*?)</h1>',
    re.DOTALL,
)
TAGLINE_RE = re.compile(
    r'<div class="tagline">(.*?)</div>',
    re.DOTALL,
)


def strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


def extract_intro_context(html: str) -> dict | None:
    """Return {kicker, headline, tagline, narrative_paras} or None."""
    intro = INTRO_RE.search(html)
    if not intro:
        return None
    block = intro.group(2)
    paras = [strip_tags(m.group(1)) for m in STORY_TEXT_RE.finditer(block)]
    paras = [p for p in paras if p]
    if not paras:
        return None
    kicker_m   = LESSON_KICKER_RE.search(block)
    h1_m       = LESSON_H1_RE.search(block)
    tagline_m  = TAGLINE_RE.search(block)
    return {
        "kicker":          strip_tags(kicker_m.group(1)) if kicker_m else "",
        "headline":        strip_tags(h1_m.group(1)) if h1_m else "",
        "tagline":         strip_tags(tagline_m.group(1)) if tagline_m else "",
        "narrative_paras": paras,
    }


def load_courses_data_lookup() -> dict[str, dict]:
    """Map slug → courses-data.json entry."""
    out: dict[str, dict] = {}
    try:
        data = json.loads(COURSES_DATA.read_text(encoding="utf-8"))
    except Exception:
        return out
    for c in data.get("courses", []) or []:
        if isinstance(c, dict) and c.get("id"):
            out[c["id"]] = c
    return out


def module_summary_for(slug: str, lookup: dict[str, dict]) -> str:
    """Return a 'M1: <title> — <sub>' style multi-line summary, or ''."""
    c = lookup.get(slug)
    if not c:
        return ""
    mods = c.get("modules", []) or []
    if not mods:
        return ""
    lines = []
    for m in mods:
        n     = m.get("n", "?")
        title = (m.get("title") or "").strip()
        sub   = (m.get("sub") or "").strip()
        line = f"  M{n}: {title}"
        if sub:
            line += f" — {sub}"
        lines.append(line)
    return "\n".join(lines)


# ── Claude ────────────────────────────────────────────────────────────

def build_prompt(slug: str, ctx: dict, modules_block: str) -> str:
    narrative = "\n\n".join(ctx["narrative_paras"])
    headline  = ctx["headline"]
    tagline   = ctx["tagline"]
    kicker    = ctx["kicker"]

    return f"""You are writing a "By the end of this course" outcomes panel for the AESOP AI Academy intro page of one course.

Course slug: {slug}
Course kicker (top-of-page label): {kicker}
Course headline: {headline}
Course tagline: {tagline}

Course narrative (the story shown on the intro page above where the panel will sit):
{narrative}

Course modules (in order):
{modules_block or '(module list not available)'}

Your job: produce 5 to 7 bullets answering THREE questions in one cohesive list:
  - What will the learner KNOW after completing every module?
  - What will the learner be able to DO / look like in practice?
  - Who are they BECOMING?

Style requirements:
- Speak directly to the learner ("You'll …", "You will …").
- Concrete and specific, never generic. If the course has unique vocabulary,
  domain, or framework, name it.
- Each bullet should be a single sentence, 12–28 words.
- Mix the three question types across the bullets — do NOT segment into
  three labeled sub-lists. The reader sees one cohesive set.
- Tone: AESOP house voice — direct, precise, never hype, never academic-stiff.
- For youth/K-12 audiences (kicker mentions Youth, ages 8–16, etc.),
  drop reading level appropriately, but keep the same 5–7 bullets.
- Do NOT repeat the tagline.
- Do NOT use the literal word "outcomes" in any bullet.

Return ONLY a JSON object with this exact shape (no markdown fences, no preamble):

{{
  "bullets": [
    "<bullet 1>",
    "<bullet 2>",
    ...
  ]
}}"""


def call_claude(client, prompt: str) -> dict:
    last_err = None
    for attempt in range(4):
        try:
            r = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=900,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = r.content[0].text.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            return json.loads(raw)
        except Exception as e:
            last_err = e
            time.sleep(6 * (attempt + 1))
    raise last_err  # type: ignore[misc]


# ── HTML insertion ────────────────────────────────────────────────────

def render_outcomes_block(bullets: list[str]) -> str:
    """Build the HTML to inject. Uses the existing story-scene visual
    pattern plus a learner-outcomes hook for site-wide styling later."""
    items = "\n".join(
        f"      <li class=\"learner-outcomes-item\">{b}</li>"
        for b in bullets
    )
    return (
        '\n    <div class="story-scene learner-outcomes" data-label="By the End">\n'
        '      <p class="story-text learner-outcomes-lead"><strong>If you finish every module, here\'s who you become:</strong></p>\n'
        '      <ul class="learner-outcomes-list">\n'
        f'{items}\n'
        '      </ul>\n'
        '    </div>'
    )


STORY_SCENE_CLOSE_BEFORE_PNAV = re.compile(
    r'(</div>\s*\n)(\s*<div class="pnav"[^>]*>)',
)


def insert_block(html: str, intro_block_match: re.Match, block: str) -> str:
    """Insert ``block`` just inside lesson-body, after the closing </div>
    of the last .story-scene, and before the .pnav navigation row."""
    intro_text = intro_block_match.group(2)
    new_intro = STORY_SCENE_CLOSE_BEFORE_PNAV.sub(
        lambda m: m.group(1) + block + "\n" + m.group(2),
        intro_text,
        count=1,
    )
    if new_intro == intro_text:
        # Couldn't find the .pnav anchor; fall back to inserting at
        # end of lesson-body if we can find it.
        lb_close = intro_text.rfind('</div>')
        if lb_close == -1:
            return html
        new_intro = intro_text[:lb_close] + block + "\n  " + intro_text[lb_close:]
    return (
        html[: intro_block_match.start(2)]
        + new_intro
        + html[intro_block_match.end(2):]
    )


# ── Main ──────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Write changes. Without this, runs as dry-run.")
    ap.add_argument("--limit", type=int, default=0,
                    help="Cap how many courses to process. 0 = no cap.")
    ap.add_argument("--slug", default="",
                    help="Process only this course slug (e.g. ai-governance).")
    ap.add_argument("--workers", type=int, default=8,
                    help="Concurrent Claude API calls (default 8). "
                         "Set to 1 for sequential.")
    args = ap.parse_args()

    lookup = load_courses_data_lookup()

    candidates = []
    skipped_already = 0
    skipped_no_narrative = 0
    for d in sorted(MODULES_DIR.iterdir()):
        if not d.is_dir() or d.name.startswith("."):
            continue
        if args.slug and d.name != args.slug:
            continue
        m1 = d / f"{d.name}-m1.html"
        if not m1.exists():
            continue
        text = m1.read_text(encoding="utf-8", errors="replace")
        if ALREADY_PATCHED_MARKER in text:
            skipped_already += 1
            continue
        intro = INTRO_RE.search(text)
        if not intro:
            skipped_no_narrative += 1
            continue
        ctx = extract_intro_context(text)
        if not ctx:
            skipped_no_narrative += 1
            continue
        candidates.append((m1, d.name, text, intro, ctx))

    if args.limit:
        candidates = candidates[: args.limit]

    print(f"Courses queued for outcomes block: {len(candidates)}")
    print(f"  skipped (already patched):  {skipped_already}")
    print(f"  skipped (no narrative):     {skipped_no_narrative}")
    print()

    if not candidates:
        return 0

    if not args.apply:
        for m1, slug, _, _, ctx in candidates[:8]:
            print(f"  would patch: {m1.relative_to(REPO)}  ({ctx['headline'] or slug})")
        if len(candidates) > 8:
            print(f"  … and {len(candidates) - 8} more")
        print()
        print(f"Estimated cost: ~${0.005 * len(candidates):.2f} ({len(candidates)} Claude calls)")
        print("Re-run with --apply to actually write.")
        return 0

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 2
    import anthropic
    client = anthropic.Anthropic(api_key=api_key, timeout=300)

    # Run candidates in parallel via a thread pool. Each worker holds
    # one in-flight Claude call; the SDK is thread-safe for sync use.
    # File writes are local and lockless because each worker writes to
    # a distinct path.
    written = 0
    failed  = 0
    done    = 0
    total   = len(candidates)

    def process_one(idx, m1, slug, text, intro, ctx):
        try:
            mods = module_summary_for(slug, lookup)
            prompt = build_prompt(slug, ctx, mods)
            llm_out = call_claude(client, prompt)
            bullets = [
                str(b).strip() for b in (llm_out.get("bullets") or [])
                if str(b).strip()
            ]
            if not (5 <= len(bullets) <= 7):
                if len(bullets) < 4:
                    raise RuntimeError(f"too few bullets ({len(bullets)})")
                bullets = bullets[:7]
            block = render_outcomes_block(bullets)
            new_html = insert_block(text, intro, block)
            if new_html == text:
                raise RuntimeError("insert anchor not found")
            m1.write_text(new_html, encoding="utf-8")
            return (idx, m1, slug, ctx, len(bullets), None)
        except Exception as e:
            return (idx, m1, slug, ctx, 0, e)

    workers = max(1, args.workers)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(process_one, i, m1, slug, text, intro, ctx)
            for i, (m1, slug, text, intro, ctx) in enumerate(candidates, 1)
        ]
        for fut in as_completed(futures):
            idx, m1, slug, ctx, n_bullets, err = fut.result()
            done += 1
            rel = m1.relative_to(REPO)
            label = ctx['headline'] or slug
            prefix = f"[{done}/{total}] {rel}  ({label})"
            if err is None:
                written += 1
                print(f"{prefix}\n  ok — {n_bullets} bullets inserted")
            else:
                failed += 1
                print(f"{prefix}\n  FAIL: {err}")

    print()
    print(f"Patched: {written}, failed: {failed}, total: {len(candidates)}")
    # Same exit policy as backfill — don't sabotage the wrapping
    # workflow's commit step over a single bad LLM response.
    if written == 0 and failed > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
