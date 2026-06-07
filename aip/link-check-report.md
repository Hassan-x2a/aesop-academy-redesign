# AESOP Live Link Check Report

**Generated:** 2026-06-07 10:13 UTC
**Status:** 🟡 WARNINGS — fetch infrastructure unavailable this run
**URLs checked:** 911 · **404s:** 0 · **Errors:** 911 (all fetch errors) · **Redirects:** 0

---

## 404 Not Found

None found.

> No URL could be confirmed as a 404 this run — see "Other Errors" below. Per the routine guardrail, infrastructure failures are not reported as 404s.

## Other Errors (5xx / Timeout / SSL)

All 911 URLs in the check list returned **fetch errors** this run. Both `curl` and `web_fetch` from the crawler sandbox responded with `HTTP 403 · x-deny-reason: host_not_allowed` for every request against `aesopacademy.org`, indicating that outbound HTTP egress from the crawler sandbox was blocked at the network layer — not that the live site is down. Control fetches from the same sandbox today showed `https://github.com/` returning `200`, while `https://api.github.com/`, `https://www.anthropic.com/`, `https://www.google.com/`, `https://example.com/`, and `https://aesopacademy.org/` all returned `403 host_not_allowed`, confirming the block is an allow-list at the sandbox egress proxy (only `github.com` is currently allow-listed) and is not specific to `aesopacademy.org`.

Examples (representative — pattern is identical for all 911):

- `https://aesopacademy.org/` — fetch error: HTTP 403 `host_not_allowed` (sandbox egress denied)
- `https://aesopacademy.org/ai-academy/courses.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/electives-hub.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-news/` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/about/mission.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/review/aesop-sitemap.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/zh-TW/courses.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/ai-and-creativity/ai-and-creativity-m1.html` — fetch error: HTTP 403 `host_not_allowed`
- `https://aesopacademy.org/ai-academy/modules/working-with-the-anthropic-api/working-with-the-anthropic-api-m8.html` — fetch error: HTTP 403 `host_not_allowed`
- …and 902 further course / module URLs with the same fetch-error signature.

A full curl pass through all 911 URLs of the check list completed in ~10 seconds (12-way parallel) and returned `403 host_not_allowed` within milliseconds for every request without ever reaching the origin. Because every URL failed identically at the sandbox layer before reaching the live site, **no conclusions about the actual availability of pages on `aesopacademy.org` can be drawn from this run.**

## Redirects (informational)

None observed (no request reached the live server).

## External Links Spot-Check

Skipped. The homepage could not be fetched, so no external `href` attributes could be extracted for spot-checking.

---

## Summary

0 broken internal link(s) confirmed — **no live data this run.** All 911 URLs returned fetch errors at the crawler sandbox layer (HTTP 403 `host_not_allowed`) before reaching the origin. This is an infrastructure condition, not a site outage. Next scheduled run should retry from an environment that permits egress to `aesopacademy.org`.

### Stats
- Internal URLs built from seeds + `course-registry.json`: 911
- Internal URLs successfully fetched: 0
- Internal URLs recorded as fetch error: 911 (all 911 directly confirmed via parallel curl returning `403 host_not_allowed`)
- External URLs spot-checked: 0 (skipped — homepage fetch blocked)
- Run duration: ~10 seconds (full 12-way parallel curl pass through all 911 URLs)

### Check-list composition
- 6 seed URLs
- 14 language-variant `courses.html` URLs (`ar`, `de`, `es`, `fa`, `fr`, `hi`, `ja`, `ko`, `ru`, `sw`, `tr`, `ur`, `zh`, `zh-TW` — discovered from `ai-academy/modules/<lang>/courses.html` directories on disk; the registry no longer carries a `_meta.languages` field, so language codes were sourced from the filesystem)
- 128 non-coming-soon course directory indexes (126 `status: live` + 2 `status: retired`; 3 `coming-soon` entries excluded). After deduplication against retired-vs-live `url` collisions (`society` / `ai-in-society` and `ar-11` / `performing-arts-and-ai` resolve to the same directory) the set contains 126 distinct directory URLs.
- 781 module URLs (`{course-dir}-m{N}.html` for N = 1..len(modules) per non-coming-soon course; identical pattern applied across the 128 entries, again deduplicated by URL)

### Note on URL-count change vs. last run
Last run (2026-05-07) built 909 URLs; this run built 911 (+2). The registry now contains 126 live courses (vs. 125 last run) and 765 modules across live entries (vs. 764). One additional live course of length 1 — or an equivalent net schema adjustment — is responsible for the +2 URL delta.

### Control-host change vs. last run
Last run noted `https://api.github.com/` returning `200`; today the same probe returns `403 host_not_allowed`, so the egress allow-list has contracted and now only permits `github.com`. The block on `aesopacademy.org`, `anthropic.com`, `google.com`, and `example.com` is unchanged.
