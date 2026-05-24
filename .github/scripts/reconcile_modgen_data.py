#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reconcile_modgen_data.py — Sync ai-academy/modules/courses-data.json
(the file ModGen reads) against current registry-live + disk-built
truth.

ModGen, the Module Generator UI, fetches courses-data.json to build
its course picker. The fields it cares about per course:
  id, name, live, icon, desc, tier, ageGroup,
  modules[].n, modules[].title, modules[].sub

This script:
  - For every registry-live + disk-built course:
      * Ensures a courses-data entry exists.
      * Sets live=true.
      * Refreshes name / icon / desc / tier / ageGroup from registry
        (only fills fields that are empty on the existing entry).
      * Syncs modules[] from the matching draft JSON if available
        (so module subtitles flow through), falling back to extracting
        titles from disk m*.html when no draft data is present.
      * Aligns module count to actual disk module count
        (<slug>/<slug>-m*.html files).
  - For every courses-data entry that is NOT registry-live or NOT
    disk-built any more:
      * Sets live=false. (We don't delete; we demote, so historical
        metadata is preserved.)
  - Idempotent. Designed to run every push (via reconcile_all.py)
    plus daily.

Usage:
    python .github/scripts/reconcile_modgen_data.py             # dry-run
    python .github/scripts/reconcile_modgen_data.py --apply     # write
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO         = Path(__file__).resolve().parents[2]
MODULES_DIR  = REPO / "ai-academy" / "modules"
REGISTRY     = MODULES_DIR / "course-registry.json"
COURSES_DATA = MODULES_DIR / "courses-data.json"

DRAFT_DIRS = [
    REPO / "aip" / "drafts",
    REPO / "aip" / "ya-drafts",
    REPO / "aip" / "k12-drafts",
    REPO / "aip" / "cyber-drafts",
]


# ── Disk + registry truth ─────────────────────────────────────────────

def disk_built_slugs() -> set[str]:
    return {
        d.name for d in MODULES_DIR.iterdir()
        if d.is_dir() and (d / f"{d.name}-m1.html").exists()
    }


def disk_module_count(slug: str) -> int:
    folder = MODULES_DIR / slug
    if not folder.exists():
        return 0
    return len(list(folder.glob(f"{slug}-m*.html")))


def registry_live_by_slug() -> dict[str, dict]:
    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except Exception:
        return {}
    out: dict[str, dict] = {}
    for entry in data.values():
        if not isinstance(entry, dict) or entry.get("status") != "live":
            continue
        url = entry.get("url") or ""
        m = re.search(r"/modules/([^/]+)/", url)
        if not m:
            continue
        out[m.group(1)] = entry
    return out


# ── Draft module data ─────────────────────────────────────────────────

def load_drafts_by_id() -> dict[str, dict]:
    """Map draft.id (== slug) to the draft dict from any of the four
    folders. If the same id appears more than once, the last one wins;
    this matches the autopatch's existing behaviour."""
    out: dict[str, dict] = {}
    for d in DRAFT_DIRS:
        if not d.exists():
            continue
        for f in d.glob("*.json"):
            if f.name == "index.json":
                continue
            try:
                draft = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                continue
            if not isinstance(draft, dict):
                continue
            sid = draft.get("id")
            if sid:
                out[sid] = draft
    return out


def extract_title_from_module_html(slug: str, n: int) -> str:
    """Best-effort title extraction from <slug>-m{n}.html. Looks for the
    first lesson <h1> in the file. Empty string on failure."""
    p = MODULES_DIR / slug / f"{slug}-m{n}.html"
    if not p.exists():
        return ""
    try:
        text = p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""
    m = re.search(
        r'class="lesson-kicker">[^<]*Lesson\s*1.*?<h1[^>]*>(.*?)</h1>',
        text, re.DOTALL,
    )
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    m = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.DOTALL)
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    return ""


def build_modules_for(slug: str, drafts: dict[str, dict]) -> list[dict]:
    """Construct the modules array for courses-data, using draft data
    where available and falling back to disk extraction for titles."""
    n_disk = disk_module_count(slug)
    if n_disk == 0:
        return []
    draft = drafts.get(slug) or {}
    raw = draft.get("modules") or []
    out: list[dict] = []
    for i in range(n_disk):
        n = i + 1
        title = ""
        sub = ""
        if i < len(raw):
            m = raw[i]
            if isinstance(m, dict):
                title = (m.get("title") or "").strip()
                sub   = (m.get("sub") or "").strip()
            else:
                title = str(m).strip()
        if not title:
            title = extract_title_from_module_html(slug, n)
        if not title:
            title = f"Module {n}"
        out.append({"n": n, "title": title, "sub": sub})
    return out


# ── Build canonical courses-data entry ────────────────────────────────

def canonical_entry(slug: str, reg_entry: dict, drafts: dict[str, dict],
                    existing: dict | None) -> dict:
    """Compose the canonical courses-data entry from registry + disk +
    drafts. Existing entry's user-edited fields (e.g. icon overrides,
    custom name) are preserved when present and non-empty."""
    base: dict = dict(existing or {})
    base["id"] = slug
    base["live"] = True
    name = (existing or {}).get("name") or reg_entry.get("title") or slug
    base["name"] = name
    for src, dst in [
        ("icon",     "icon"),
        ("desc",     "desc"),
        ("tier",     "tier"),
        ("ageGroup", "ageGroup"),
        ("category", "category"),
        ("bar",      "bar"),
    ]:
        if not str(base.get(dst) or "").strip() and reg_entry.get(src):
            base[dst] = reg_entry[src]
    base["modules"] = build_modules_for(slug, drafts)
    return base


# ── Main reconciliation ──────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Write changes back to courses-data.json. "
                         "Without this, runs as a dry-run with summary.")
    ap.add_argument("--keep-stale", action="store_true",
                    help="Don't demote stale entries (live=false). "
                         "Default is to demote.")
    args = ap.parse_args()

    if not COURSES_DATA.exists():
        print(f"ERROR: {COURSES_DATA} not found", file=sys.stderr)
        return 2

    cdata_doc = json.loads(COURSES_DATA.read_text(encoding="utf-8"))
    cdata_list = cdata_doc.get("courses") or []
    cdata_by_id = {c["id"]: c for c in cdata_list
                   if isinstance(c, dict) and c.get("id")}

    reg_live = registry_live_by_slug()
    disk     = disk_built_slugs()
    drafts   = load_drafts_by_id()
    truth    = {slug: e for slug, e in reg_live.items() if slug in disk}

    print(f"Registry-live + disk-built courses (truth): {len(truth)}")
    print(f"courses-data entries before:               {len(cdata_by_id)}")
    print(f"Drafts available for module-sub merge:     {len(drafts)}")
    print()

    n_added           = 0
    n_promoted        = 0
    n_demoted         = 0
    n_modules_synced  = 0
    n_subs_filled     = 0

    for slug in sorted(truth):
        reg = truth[slug]
        existing = cdata_by_id.get(slug)
        new_entry = canonical_entry(slug, reg, drafts, existing)

        if existing is None:
            cdata_list.append(new_entry)
            cdata_by_id[slug] = new_entry
            n_added += 1
            print(f"  + ADD       {slug}  ({len(new_entry['modules'])} modules)")
            continue

        prev_live = existing.get("live") is True
        if not prev_live:
            n_promoted += 1
            print(f"  ↑ PROMOTE   {slug}")

        before_mods = existing.get("modules") or []
        before_sub_count = sum(
            1 for m in before_mods
            if isinstance(m, dict) and (m.get("sub") or "").strip()
        )
        after_mods = new_entry["modules"]
        after_sub_count = sum(
            1 for m in after_mods if (m.get("sub") or "").strip()
        )

        def _norm(m):
            return m if isinstance(m, dict) else {"title": str(m)}
        same_modules = (
            len(before_mods) == len(after_mods)
            and all(_norm(b) == a for b, a in zip(before_mods, after_mods))
        )
        if not same_modules:
            n_modules_synced += 1
        if after_sub_count > before_sub_count:
            n_subs_filled += (after_sub_count - before_sub_count)

        for i, c in enumerate(cdata_list):
            if isinstance(c, dict) and c.get("id") == slug:
                cdata_list[i] = new_entry
                break
        cdata_by_id[slug] = new_entry

    stale_slugs = [s for s in cdata_by_id if s not in truth]
    for slug in stale_slugs:
        e = cdata_by_id[slug]
        # V2 courses (format="v2") are owned by reconcile_v2_to_modgen.py,
        # which keys them `{slug}-v2` and syncs them from courses-v2.html.
        # They are never v1-disk-built, so they always look stale here —
        # skip them so the two reconcilers don't fight over the live flag.
        if e.get("format") == "v2":
            continue
        if e.get("live") is True and not args.keep_stale:
            e["live"] = False
            n_demoted += 1

    print()
    print(f"Added:                   {n_added}")
    print(f"Promoted to live:        {n_promoted}")
    print(f"Demoted from live:       {n_demoted}  (stale entries; not deleted)")
    print(f"Modules refreshed:       {n_modules_synced}")
    print(f"New module subs filled:  {n_subs_filled}")
    if stale_slugs:
        print(f"Stale-but-kept (live=false) cdata entries: {len(stale_slugs)}")
        for s in stale_slugs[:8]:
            print(f"  - {s}")
        if len(stale_slugs) > 8:
            print(f"  … {len(stale_slugs) - 8} more")

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
