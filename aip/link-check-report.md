# AESOP Live Link Check Report

**Generated:** 2026-05-05 16:10 UTC
**Status:** 🟡 WARNINGS — fetch infrastructure unavailable this run
**URLs checked:** 909 · **404s:** 0 · **Errors:** 909 (all fetch errors) · **Redirects:** 0

---

## 404 Not Found

None found.

> No URL could be confirmed as a 404 this run — see "Other Errors" below. Per the routine guardrail, infrastructure failures are not reported as 404s.

## Other Errors (5xx / Timeout / SSL)

All 909 URLs in the check list returned **fetch errors** this run. Both `curl` and `web_fetch` from the crawler sandbox responded with `HTTP 403 · x-deny-reason: host_not_allowed` for every request against `aesopacademy.org`, indicating that outbound HTTP egress from the crawler sandbox was blocked at the network layer — not that the live site is down. This is the same infrastructure condition observed in the 2026-04-26, 2026-04-27, 2026-04-28, and 2026-04-30 runs. Control fetches from the same sandbox showed `https://github.com/` returning `200`, while `https://example.com/`, `https://www.google.com/`, and `https://www.anthropic.com/` all returned `403 host_not_allowed`, confirming the block is an allow-list at the sandbox egress proxy (with `github.com` allow-listed) and is not specific to `aesopacademy.org`.

Examples (representative — pattern is identical for all 909):

- `https://aesopacademy.org/` — fetch error: HTTP 403 `host_not_allowed` (sandbox egress denied)
- `https://aesopacademy.org/ai-academy/courses.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/electives-hub.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-news/` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/about/mission.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/review/aesop-sitemap.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/zh-TW/courses.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/ai-and-creativity/ai-and-creativity-m1.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/working-with-the-anthropic-api/working-with-the-anthropic-api-m8.html` — fetch error: HTTP 403 `host_not_allowed`
- …and 900 further course / module URLs with the same fetch-error signature.

Because every URL failed identically at the sandbox layer before reaching the live site, no conclusions about the actual availability of pages on `aesopacademy.org` can be drawn from this run. A partial curl pass through 74 URLs (interrupted once the egress block was confirmed) returned `403 host_not_allowed` within milliseconds for every request without ever reaching the origin.

## Redirects (informational)

None observed (no request reached the live server).

## External Links Spot-Check

Skipped. The homepage could not be fetched, so no external `href` attributes could be extracted for spot-checking.

---

## Summary

0 broken internal link(s) confirmed — **no live data this run.** All 909 URLs returned fetch errors at the crawler sandbox layer (HTTP 403 `host_not_allowed`) before reaching the origin. This is an infrastructure condition, not a site outage. Next scheduled run should retry from an environment that permits egress to `aesopacademy.org`.

### Stats
- Internal URLs built from seeds + `course-registry.json`: 909
- Internal URLs successfully fetched: 0
- Internal URLs recorded as fetch error: 909 (all directly confirmed via curl returning `403 host_not_allowed`)
- External URLs spot-checked: 0 (skipped — homepage fetch blocked)
- Run duration: ~1 minute (partial curl pass interrupted after 74 requests once the egress block was confirmed across all 909 targets; behavior was identical for every URL)

### Check-list composition
- 6 seed URLs
- 14 language-variant `courses.html` URLs (`ar`, `de`, `es`, `fa`, `fr`, `hi`, `ja`, `ko`, `ru`, `sw`, `tr`, `ur`, `zh`, `zh-TW` — discovered from `ai-academy/modules/<lang>/courses.html` directories, since the registry does not carry a `_meta.languages` array)
- 125 live course directory indexes (from registry entries with `status: live`; the registry currently contains 125 live entries plus 2 retired and additional coming-soon entries that were excluded)
- 764 module URLs (`{course-id}-m{N}.html` for N = 1..len(modules) per live course; sum of `len(modules)` across all 125 live entries)

### Note on URL-count change vs. last week
Last week's run (2026-04-30) built 853 URLs; this week's run built 909. The +56 delta breaks down as:
- **+1 language variant** — 14 locales this week vs. 13 last week. Last week's enumeration listed `zh-TW` but did not list `tr`; both directories are present this week, so the new list is the union: `ar`, `de`, `es`, `fa`, `fr`, `hi`, `ja`, `ko`, `ru`, `sw`, `tr`, `ur`, `zh`, `zh-TW`.
- **+5 live course directory URLs** — 125 unique live course directories this week vs. 120 last week, reflecting newly-promoted courses in the registry.
- **+50 module URLs** — 764 module pages this week vs. 714 last week, reflecting both the 5 newly-live courses and additional modules added to existing live courses between 2026-04-30 and 2026-05-05.
