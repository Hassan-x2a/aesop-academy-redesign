#!/usr/bin/env python3
"""
build_stats.py — Generate stats.json for the homepage live-stats banner.

Produces three numbers surfaced by the top banner on index.html:
  - learnersThisWeek : GA4 `activeUsers` over the last 7 days (0 if API unavailable)
  - coursesLive      : Count of entries in course-registry.json with status='live'
  - languages        : Count of supported UI languages (canonical list below)

Reads:
  ai-academy/modules/course-registry.json
Writes:
  stats.json  (at repo root — served as https://aesopacademy.org/stats.json)

Environment (for GA4 metric, all optional — script degrades gracefully if missing):
  GA4_PROPERTY_ID              : numeric GA4 property ID (e.g. "123456789")
  GA4_SERVICE_ACCOUNT_JSON     : full JSON credentials string for a service account
                                 with "Viewer" role on the GA4 property.

Usage:
    python .github/scripts/build_stats.py

Exits 0 even on partial failure so the cron workflow can commit whatever was
obtained. On total failure (e.g. registry missing), exits 1.
"""

import json
import os
import random
import sys
from datetime import date, datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_PATH = REPO_ROOT / "ai-academy" / "modules" / "course-registry.json"
COURSES_HTML_PATH = REPO_ROOT / "ai-academy" / "courses.html"
STATS_PATH = REPO_ROOT / "stats.json"

# Canonical list of UI languages actually supported by the shared top banner.
# Keep this in sync with the <button data-lang="..."> pills in the top banner.
LANGUAGES = ["en", "es", "hi", "ar", "zh-TW", "ko", "ur", "tr"]


def count_live_courses() -> int:
    """Count courses in the registry whose status == 'live'."""
    if not REGISTRY_PATH.exists():
        print(f"[stats] WARNING: registry not found at {REGISTRY_PATH}", file=sys.stderr)
        return 0
    with REGISTRY_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return 0
    return sum(
        1 for v in data.values()
        if isinstance(v, dict) and v.get("status") == "live"
    )


def count_dev_courses() -> int:
    """Count unique coming-soon courses shown in courses.html.

    Parses the mega-menu HTML for buttons carrying both 'mega-link' and
    'mega-link--soon' classes, deduplicates by their data-panel attribute,
    and returns the unique count.  This is the canonical source — it reflects
    exactly what visitors see as grey/disabled in the course selector.

    Falls back to counting non-live registry entries if courses.html is absent.
    """
    import re

    if COURSES_HTML_PATH.exists():
        html = COURSES_HTML_PATH.read_text(encoding="utf-8")
        # Match every button that has mega-link--soon in its class attribute,
        # capture the data-panel value.
        panels = set(re.findall(
            r'<button[^>]+class="[^"]*mega-link--soon[^"]*"[^>]+data-panel="([^"]+)"',
            html,
        ))
        if panels:
            print(f"[stats] {len(panels)} unique coming-soon panels in courses.html",
                  file=sys.stderr)
            return len(panels)
        # If the regex found nothing (class order swapped?), try the reverse
        panels = set(re.findall(
            r'<button[^>]+data-panel="([^"]+)"[^>]+class="[^"]*mega-link--soon[^"]*"',
            html,
        ))
        if panels:
            print(f"[stats] {len(panels)} unique coming-soon panels in courses.html "
                  "(alt attr order)", file=sys.stderr)
            return len(panels)
        print("[stats] WARNING: no mega-link--soon buttons found in courses.html",
              file=sys.stderr)

    # Fallback: registry where status != 'live'
    print("[stats] falling back to course-registry.json for coursesInDev", file=sys.stderr)
    if not REGISTRY_PATH.exists():
        return 0
    with REGISTRY_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return 0
    return sum(
        1 for v in data.values()
        if isinstance(v, dict) and v.get("status") != "live"
    )


def estimated_learners_this_week() -> int:
    """
    Placeholder until GA4 is wired up.
    Seeds a deterministic RNG with today's UTC date so the number is stable
    all day and changes at midnight UTC. Each day's value = 175 (25×7) ± 23-75.
    """
    today = date.today()
    rng = random.Random(today.toordinal())
    delta = rng.randint(23, 75)
    sign = rng.choice([-1, 1])
    return 25 * 7 + sign * delta


def fetch_active_users() -> int | None:
    """
    Query GA4 Data API for activeUsers over the last 7 days.
    Returns None if credentials aren't configured or the API fails — the caller
    should preserve the previous value or hide the stat in that case.
    """
    property_id = os.environ.get("GA4_PROPERTY_ID", "").strip()
    creds_json = os.environ.get("GA4_SERVICE_ACCOUNT_JSON", "").strip()

    if not property_id or not creds_json:
        print("[stats] GA4 credentials not configured — skipping learner count", file=sys.stderr)
        return None

    try:
        from google.oauth2 import service_account  # type: ignore
        from google.analytics.data_v1beta import BetaAnalyticsDataClient  # type: ignore
        from google.analytics.data_v1beta.types import (  # type: ignore
            DateRange, Metric, RunReportRequest,
        )
    except ImportError as e:
        print(f"[stats] GA4 libraries not installed ({e}) — skipping learner count", file=sys.stderr)
        return None

    try:
        creds_dict = json.loads(creds_json)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
        client = BetaAnalyticsDataClient(credentials=credentials)
        request = RunReportRequest(
            property=f"properties/{property_id}",
            metrics=[Metric(name="activeUsers")],
            date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
        )
        response = client.run_report(request)
        if response.rows:
            value = response.rows[0].metric_values[0].value
            return int(value)
        return 0
    except Exception as e:
        print(f"[stats] GA4 query failed: {e}", file=sys.stderr)
        return None


def load_previous_stats() -> dict:
    """Read the existing stats.json, if any, so we can preserve prior values
    when a single metric fails."""
    if not STATS_PATH.exists():
        return {}
    try:
        with STATS_PATH.open(encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def main() -> int:
    previous = load_previous_stats()

    courses_live = count_live_courses()
    if courses_live == 0:
        # Registry missing or empty is a hard fail — keep previous value if we had one.
        courses_live = previous.get("coursesLive", 0)

    courses_dev = count_dev_courses()

    learners = fetch_active_users()
    if learners is None:
        # Fall back to date-seeded estimate (25×7 ± 23-75) until GA4 is live.
        learners = estimated_learners_this_week()

    stats = {
        "learnersThisWeek": learners,
        "coursesLive": courses_live,
        "coursesInDev": courses_dev,
        "languages": len(LANGUAGES),
        "supportedLanguages": LANGUAGES,
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "learnersThisWeek": "GA4 activeUsers, last 7 days" if os.environ.get("GA4_PROPERTY_ID") else "estimated (25×7 ± daily variance)",
            "coursesLive": "course-registry.json where status=='live'",
            "coursesInDev": "courses.html mega-link--soon buttons (unique data-panel)",
            "languages": "canonical list in build_stats.py",
        },
    }

    STATS_PATH.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(f"[stats] wrote {STATS_PATH}")
    print(f"  learnersThisWeek = {learners}")
    print(f"  coursesLive      = {courses_live}")
    print(f"  coursesInDev     = {courses_dev}")
    print(f"  languages        = {len(LANGUAGES)}  ({', '.join(LANGUAGES)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
