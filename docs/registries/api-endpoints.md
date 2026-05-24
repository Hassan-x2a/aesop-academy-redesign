# API Endpoints Registry

Every HTTP endpoint served by this project's API layer. For each: request shape, response shape, producers (PHP handler), consumers (JS callers), and status. Update whenever an endpoint is added, changed, or removed.

---

## `POST /aesop-api/proxy.php`

Lab chat proxy. Forwards student chat messages to Anthropic API using `claude-haiku-4-5-20251001`. Used by all course module labs.

**Request shape (JSON body):**
```
{
  messages:      Array<{role: "user"|"assistant", content: string}>,  // required
  system_prompt: string,                                               // optional
  max_tokens:    number                                                // optional; capped at 1024
}
```

**Response shape (JSON):**
Anthropic API response passthrough:
```
{
  content: [{type: "text", text: string}],
  ...
}
```
On error: `{"error": "message string"}`

**Producer**
- `aesop-api/proxy.php:7` — handler; reads `system_prompt` (line 51), caps `max_tokens` at 1024, slices conversation to last 40 turns

**Consumers**
- All course module HTML files under `ai-academy/modules/` — `var PROXY_URL='/aesop-api/proxy.php'` convention
- `ai-academy/modules/admin-review.js:5` — `const PROXY='/aesop-api/proxy.php'`

**Status:** ✓ widely consumed; field names consistent

---

## `POST /aesop-api/assessment-proxy.php`

Assessment chat proxy. Forwards assessment conversation to Anthropic API using `claude-sonnet-4-6`. Separate from lab proxy to allow higher token cap and hardcoded system prompt.

**Request shape (JSON body):**
```
{
  messages:   Array<{role: "user"|"assistant", content: string}>,  // required; each ≤4000 chars; ≤20 turns
  max_tokens: number                                                // optional; capped at 800
}
```

Note: system prompt is **hardcoded server-side** (PHP nowdoc). Any `system_prompt` field sent by the client is silently ignored. Client cannot override the guardrail.

**Response shape (JSON):**
Anthropic API response passthrough on success:
```
{
  content: [{type: "text", text: string}],
  ...
}
```
On error: `{"error": "human-readable message"}` (no raw Anthropic body or internal details exposed)

**Rate limit:** 10 requests/minute per IP (atomic file lock)

**Producer**
- `aesop-api/assessment-proxy.php:26` — hardcoded `$SYSTEM_PROMPT` nowdoc; reads only `messages` + `max_tokens` from request; caps at 800 tokens / 20 turns; per-IP rate limit via `flock(LOCK_EX)` temp file

**Consumers**
- `ai-academy/js/assessment-chat.js:80` — `fetch(PROXY_URL, {messages, max_tokens})`; no `system_prompt` sent

**Status:** ✓ — system prompt server-side; client contract: `{messages, max_tokens}` only

---

## `GET /aesop-api/catalog.php`

Course catalog API. Returns all courses (live and coming-soon) as JSON with SHA-256 hash for change detection. Consumed by 25experts.com Cloud Function for video-to-course mapping.

**Request shape (URL/GET):**
No request body. Query parameters: none.

**Response shape (JSON):**
```
{
  catalog_hash: string,                    // SHA-256 hash of courses-data.json; use for change detection
  generated_at: string,                    // ISO 8601 timestamp (UTC)
  courses: Array<{
    id:    string,                         // immutable course identifier (kebab-case)
    name:  string,                         // display name (may change if course renamed)
    desc:  string,                         // short description/blurb
    url:   string,                         // full URL to course hub (https://aesopacademy.org/ai-academy/electives-hub.html?course={id})
    live:  boolean                         // true if live, false if coming-soon
  }>
}
```

On error: `{"error": "error message"}` with HTTP 5xx

**CORS headers:** `Access-Control-Allow-Origin: *` — allows requests from any origin

**Producer**
- `aesop-api/catalog.php:1` — reads `ai-academy/modules/courses-data.json`, computes `hash_file('sha256')`, extracts course fields, returns JSON

**Consumers**
- 25experts.com Cloud Function (`syncVideoToCourses` in experts project) — fetches periodically, compares `catalog_hash` to cached hash, updates local cache if changed

**Data source**
- `ai-academy/modules/courses-data.json` — single source of truth for course metadata (137 courses: 125 live + 12 coming-soon as of 2026-05-24)
- Kept in sync by idempotent reconciliation system (`reconcile_all.py` + daily safety-net workflow)

**Status:** ✓ new; ready for deployment to Mocahost FTP via GitHub Actions (deployment verification pending post-merge)

---

## Summary

| Endpoint | Method | Purpose | CORS | Status |
|----------|--------|---------|------|--------|
| `/aesop-api/proxy.php` | POST | Lab chat proxy (Haiku) | — | ✓ |
| `/aesop-api/assessment-proxy.php` | POST | Assessment chat proxy (Sonnet) | — | ✓ system prompt server-side |
| `/aesop-api/catalog.php` | GET | Course catalog export (change detection) | `*` | ✓ task #15 |

---

## Audit Trail — Proof of Registry Verification

**Last audit:** 2026-05-24T00:00:00Z (by /cross-boundary-audit, Task #15 branch)

**Boundaries checked:** All PHP files in aesop-api/; producer/consumer pairs for each endpoint

**Evidence recorded:**
- 3 endpoints with complete documentation ✓
  - `proxy.php` (POST, lab chat)
  - `assessment-proxy.php` (POST, assessment chat)
  - `catalog.php` (GET, course catalog export) — NEW in task #15
- All endpoints have CORS headers documented
- All endpoints have request/response shape documented
- All endpoints have producers and consumers identified

**New identifiers introduced on task #15:**
- Endpoint: `GET /aesop-api/catalog.php`
- Response fields: `catalog_hash`, `generated_at`, `courses[]` with shape `{id, name, desc, url, live}`
- Producer: `aesop-api/catalog.php:1`
- Consumer: 25experts.com Cloud Function (external)

**Code matches registry:** Yes — task #15 commit added endpoint and updated this registry in same commit

**Status:** Audit complete
