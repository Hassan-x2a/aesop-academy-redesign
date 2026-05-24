#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reconcile_v2_to_modgen.py — Sync V2 courses from courses-v2.html into
ai-academy/modules/courses-data.json (the catalog source the
/aesop-api/catalog.php endpoint, and 25experts.com, consume).

V2 courses live at ai-academy/modules/v2/{slug}/m{N}.html and are
registered in ai-academy/courses-v2.html — a structure the v1 reconcile
pipeline (reconcile_modgen_data.py, which keys off the folder convention
modules/{slug}/{slug}-m1.html) does not recognize. Without this step V2
courses never appear in courses-data.json, so the catalog API omits them.

courses-v2.html is the source of truth: the aesop-course-builder skill
registers every V2 course there (Stage 4). This script:
  - Parses courses-v2.html for each registered V2 course: name, blurb
    (used as desc), and module titles.
  - Confirms the course is disk-built (modules/v2/{slug}/m1.html exists).
  - Upserts a courses-data.json entry keyed `{slug}-v2` with:
      id, name, desc, live=true, format="v2", modules[].
    Other keys on a pre-existing entry (icon, category, tier, ageGroup)
    are preserved; name / desc / modules are always refreshed from
    courses-v2.html.
  - Demotes a previously-synced V2 entry to live=false if its course is
    no longer in courses-v2.html or on disk (mirrors the v1 reconciler's
    demote-don't-delete policy; preserves historical metadata).
  - Idempotent. Wired into reconcile_all.py; runs every push + daily.

The format="v2" marker lets reconcile_modgen_data.py skip these entries
in its v1 demotion sweep, so the two reconcilers do not fight over the
live flag.

Usage:
    python .github/scripts/reconcile_v2_to_modgen.py             # dry-run
    python .github/scripts/reconcile_v2_to_modgen.py --apply     # write
"""

from __future__ import annotations

import argparse
import html as _html_mod
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO         = Path(__file__).resolve().parents[2]
MODULES_DIR  = REPO / "ai-academy" / "modules"
V2_DIR       = MODULES_DIR / "v2"
COURSES_V2   = REPO / "ai-academy" / "courses-v2.html"
COURSES_DATA = MODULES_DIR / "courses-data.json"

# Each registered V2 course is a hidden <li><button>…</div></li> block in
# the cnav-list. Mirrors the regex used by aesop-api/lib/registry-parser.js.
COURSE_BLOCK_RE = re.compile(r"<li>\s*<button[^>]*>.*?</div>\s*</li>", re.DOTALL)
NAME_RE         = re.compile(r'<div class="cnav-name">([^<]+)</div>')
BLURB_RE        = re.compile(r'<div class="cnav-blurb">([^<]+)</div>')
SLUG_RE         = re.compile(r"/ai-academy/modules/v2/([^/]+)/")
MOD_TITLE_RE    = re.compile(r'<span class="cnav-mod-title">([^<]+)</span>')


def _clean(text: str) -> str:
    return _html_mod.unescape(text).strip()


def parse_courses_v2() -> list[dict]:
    """Extract every registered V2 course from courses-v2.html.

    Returns dicts with: slug, name, desc, module_titles. Courses without
    a resolvable name+slug are skipped."""
    if not COURSES_V2.exists():
        return []
    html = COURSES_V2.read_text(encoding="utf-8", errors="replace")

    courses: list[dict] = []
    for block in COURSE_BLOCK_RE.findall(html):
        name_m = NAME_RE.search(block)
        slug_m = SLUG_RE.search(block)
        if not name_m or not slug_m:
            continue
        blurb_m = BLURB_RE.search(block)
        courses.append({
            "slug": slug_m.group(1),
            "name": _clean(name_m.group(1)),
            "desc": _clean(blurb_m.group(1)) if blurb_m else "",
            "module_titles": [_clean(t) for t in MOD_TITLE_RE.findall(block)],
        })
    return courses


def disk_built(slug: str) -> bool:
    return (V2_DIR / slug / "m1.html").exists()


def canonical_v2_entry(course: dict, existing: dict | None) -> dict:
    """Compose the courses-data entry for a V2 course. Preserves any
    extra user-edited keys on an existing entry; always refreshes the
    fields courses-v2.html owns (name, desc, modules)."""
    base: dict = dict(existing or {})
    base["id"]     = f"{course['slug']}-v2"
    base["name"]   = course["name"]
    base["desc"]   = course["desc"]
    base["live"]   = True
    base["format"] = "v2"
    base["modules"] = [
        {"n": i + 1, "title": title, "sub": ""}
        for i, title in enumerate(course["module_titles"])
    ]
    return base


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Write changes back to courses-data.json. "
                         "Without this, runs as a dry-run with summary.")
    ap.add_argument("--keep-stale", action="store_true",
                    help="Don't demote stale V2 entries (live=false). "
                         "Default is to demote.")
    args = ap.parse_args()

    if not COURSES_DATA.exists():
        print(f"ERROR: {COURSES_DATA} not found", file=sys.stderr)
        return 2

    cdata_doc  = json.loads(COURSES_DATA.read_text(encoding="utf-8"))
    cdata_list = cdata_doc.get("courses") or []
    cdata_by_id = {c["id"]: c for c in cdata_list
                   if isinstance(c, dict) and c.get("id")}

    parsed = parse_courses_v2()
    truth  = [c for c in parsed if disk_built(c["slug"])]
    truth_ids = {f"{c['slug']}-v2" for c in truth}

    print(f"V2 courses registered in courses-v2.html: {len(parsed)}")
    print(f"V2 courses also disk-built (truth):        {len(truth)}")
    print(f"courses-data entries before:               {len(cdata_by_id)}")
    print()

    n_added = 0
    n_updated = 0
    n_demoted = 0

    for course in sorted(truth, key=lambda c: c["slug"]):
        cid = f"{course['slug']}-v2"
        existing = cdata_by_id.get(cid)
        new_entry = canonical_v2_entry(course, existing)

        if existing is None:
            cdata_list.append(new_entry)
            cdata_by_id[cid] = new_entry
            n_added += 1
            print(f"  + ADD       {cid}  ({len(new_entry['modules'])} modules)")
            continue

        if existing != new_entry:
            n_updated += 1
            print(f"  ~ UPDATE    {cid}")
        for i, c in enumerate(cdata_list):
            if isinstance(c, dict) and c.get("id") == cid:
                cdata_list[i] = new_entry
                break
        cdata_by_id[cid] = new_entry

    # Demote V2 entries whose course is gone from courses-v2.html / disk.
    for c in cdata_list:
        if not isinstance(c, dict) or c.get("format") != "v2":
            continue
        if c.get("id") not in truth_ids and c.get("live") is True and not args.keep_stale:
            c["live"] = False
            n_demoted += 1
            print(f"  ↓ DEMOTE    {c.get('id')}  (no longer registered/built)")

    print()
    print(f"Added:             {n_added}")
    print(f"Updated:           {n_updated}")
    print(f"Demoted from live: {n_demoted}  (stale V2 entries; not deleted)")

    if not args.apply:
        print()
        print("Dry run — re-run with --apply to write changes.")
        return 0

    cdata_doc["courses"] = cdata_list
    COURSES_DATA.write_text(
        json.dumps(cdata_doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nWrote {COURSES_DATA.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
