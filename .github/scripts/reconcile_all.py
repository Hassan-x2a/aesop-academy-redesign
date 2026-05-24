#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reconcile_all.py — Orchestrate every per-surface reconciler so every
UI surface stays in sync with disk truth.

Source of truth: course folders under ai-academy/modules/ with
<slug>-m1.html. Everything else (course-registry.json, courses.html
mega-menu + panels, dashboard.html, i18n files, stats.json) is derived
from that.

Runs, in order:
  1. sync_registry_to_disk.py  — add missing disk courses to registry
     (status=live).
  2. tag_mega_buttons.py       — add data-course to nav buttons.
  3. dedup_mega_buttons.py     — collapse duplicate buttons, promote
     to --live when the course is on disk.
  4. reconcile_panels.py       — tag panels, toggle live badges.
  5. sync_i18n_to_registry.py  — add missing translation keys.
  6. build_stats.py            — refresh coursesLive counter.

After running, writes aip/registration-report.json in the same shape
that notify_registration.py expects, so the existing email workflow
continues to function. "registered" lists courses that became
newly live-in-registry during this run.

Usage:
    python .github/scripts/reconcile_all.py           # dry-run
    python .github/scripts/reconcile_all.py --apply   # execute
"""

from __future__ import annotations

import argparse
import html as _html_mod
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO        = Path(__file__).resolve().parents[2]
SCRIPTS     = REPO / ".github" / "scripts"
REGISTRY    = REPO / "ai-academy" / "modules" / "course-registry.json"
REPORT_JSON = REPO / "aip" / "registration-report.json"

# Ordered list of reconcilers. Each entry: (label, script filename,
# extra_args_for_apply). All scripts accept --apply; some accept no args
# (build_stats.py always writes).
STEPS = [
    # (label, script, args_for_apply_mode, skip_in_dry_run)
    ("registry → disk",   "sync_registry_to_disk.py", ["--apply"], False),
    ("tag nav buttons",   "tag_mega_buttons.py",      ["--apply"], False),
    ("dedup nav buttons", "dedup_mega_buttons.py",    ["--apply"], False),
    ("sync panel counts", "sync_panel_counts.py",     ["--apply"], False),
    ("reconcile panels",  "reconcile_panels.py",      ["--apply"], False),
    # ensure_panels_live runs AFTER reconcile_panels: reconcile_panels
    # tags panels with data-course and toggles core-badge-live; this
    # script then strips any lingering core-panel--cs class, removes
    # contradictory "Coming Soon" badges, and replaces "In Development"
    # span CTAs with real "Enter Course →" links — for every panel of
    # every disk-built registry-live course. Closes the recurring
    # "button says Live, panel says In Development" gap.
    ("ensure panels live","ensure_panels_live.py",    ["--apply"], False),
    # reconcile_modgen_data syncs courses-data.json (the file ModGen
    # reads) to current registry-live + disk-built truth: promotes
    # entries to live, refreshes module lists from disk + drafts,
    # fills missing subtitles, and demotes stale legacy entries to
    # live=false so they stop polluting ModGen's course picker.
    ("reconcile modgen",  "reconcile_modgen_data.py", ["--apply"], False),
    # reconcile_v2_to_modgen syncs V2 courses (modules/v2/{slug}/,
    # registered in courses-v2.html) into courses-data.json keyed
    # `{slug}-v2`, so the catalog API (/aesop-api/catalog.php, consumed
    # by 25experts.com) includes them. The v1 reconciler above is blind
    # to the v2/ folder convention, so V2 courses need their own pass.
    ("reconcile v2 modgen", "reconcile_v2_to_modgen.py", ["--apply"], False),
    ("sync i18n",         "sync_i18n_to_registry.py", ["--apply"], False),
    # build_stats has no dry-run mode — it always writes. Skip on dry-run.
    ("build stats",       "build_stats.py",           [],          True),
]


def disk_live_slugs_from_registry() -> set[str]:
    """Return the set of registry-live course slugs currently recorded
    via /ai-academy/modules/<slug>/ URLs."""
    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except Exception:
        return set()
    slugs = set()
    for entry in data.values():
        if not isinstance(entry, dict):
            continue
        if entry.get("status") != "live":
            continue
        url = entry.get("url") or ""
        m = re.search(r"/modules/([^/]+)/", url)
        if m:
            slugs.add(m.group(1))
    return slugs


def registry_entry_by_slug(slug: str) -> dict | None:
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    for entry in data.values():
        if not isinstance(entry, dict):
            continue
        url = entry.get("url") or ""
        m = re.search(r"/modules/([^/]+)/", url)
        if m and m.group(1) == slug and entry.get("status") == "live":
            return entry
    return None


def run_step(label: str, script: str, extra_args: list[str],
             dry_run: bool) -> dict:
    path = SCRIPTS / script
    if dry_run:
        # Call each script without --apply; scripts default to dry-run.
        args = [a for a in extra_args if a != "--apply"]
    else:
        args = list(extra_args)

    cmd = [sys.executable, str(path), *args]
    print(f"\n── {label}  ({script}{' --apply' if '--apply' in args else ' (dry-run)'}) ──")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    out = (result.stdout or "") + (result.stderr or "")
    print(out.strip() or "(no output)")
    return {
        "label":      label,
        "script":     script,
        "returncode": result.returncode,
        "applied":    not dry_run,
    }


def write_report(new_slugs: list[str], step_results: list[dict]) -> None:
    """Write aip/registration-report.json in the shape notify_registration.py
    expects. ``registered`` lists disk-backed courses that became live in
    the registry during this run (by slug delta)."""
    registered = []
    for slug in new_slugs:
        entry = registry_entry_by_slug(slug)
        if not entry:
            continue
        registered.append({
            "id":     slug,
            "name":   _html_mod.unescape(entry.get("title") or "").strip(),
            "n_mods": entry.get("modCount") or 0,
            "url":    entry.get("url") or f"/ai-academy/modules/{slug}/",
            "desc":   _html_mod.unescape(entry.get("desc") or "").strip(),
        })

    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(
        json.dumps({
            "registered":   registered,
            "reconcile_steps": step_results,
        }, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nWrote {REPORT_JSON.relative_to(REPO)}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Actually write changes. Without this, every "
                         "reconciler runs in its own dry-run mode.")
    args = ap.parse_args()

    print(f"reconcile_all.py  apply={args.apply}")

    pre_slugs  = disk_live_slugs_from_registry()

    step_results = []
    for label, script, extra, skip_on_dry in STEPS:
        if not args.apply and skip_on_dry:
            print(f"\n── {label}  ({script}) ── skipped in dry-run (script has no dry-run mode)")
            step_results.append({"label": label, "script": script,
                                 "returncode": 0, "applied": False, "skipped": True})
            continue
        r = run_step(label, script, extra, dry_run=not args.apply)
        step_results.append(r)
        if r["returncode"] != 0:
            print(f"\nStep '{label}' failed (rc={r['returncode']}). Stopping.")
            return r["returncode"]

    post_slugs = disk_live_slugs_from_registry()
    new_slugs = sorted(post_slugs - pre_slugs)

    print(f"\n── Summary ──")
    print(f"  Registry live slugs before: {len(pre_slugs)}")
    print(f"  Registry live slugs after:  {len(post_slugs)}")
    print(f"  Newly registered this run:  {len(new_slugs)}")
    for s in new_slugs:
        print(f"    + {s}")

    if args.apply:
        write_report(new_slugs, step_results)
    else:
        print("\nDry run — no report written.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
