# Aesop AI Academy

Free AI literacy education platform. Rigorous, honest, no agenda. Built for people who weren't handed the keys.

## Project
- **Purpose:** Free AI education courses for youth and adults entering an AI-saturated world
- **Stack:** PHP, HTML/CSS/JS (no Node/npm), Python scripts for tooling
- **Deployment:** cPanel (`.cpanel.yml`), FTP-based push to shared hosting

## Key directories
- `ai-academy/` — course modules and lab files (the main product)
- `aesop-api/` — API layer
- `assets/` — images, shared CSS
- `scripts/` — build/automation scripts
- `workers/` — Cloudflare workers

## Lab rules
All lab building must follow `lab-rules.md`. Non-negotiable:
1. Students never leave the academy — embed all reading content; external links are optional deep-dives only
2. Writing happens through AI-driven conversation — no static textareas; AI leads the exchange
3. Lab AI stays on topic — use `ACADEMY_GUARDRAIL` constant (defined once, applied in `chatSend()`); never duplicate inside lab prompts
4. Every lab completable without live API — offline fallback fires after one retry; lab completion still triggers

## Version bumping
When delivering any code change, bump the project version at the time of delivery — in the same edit, not retroactively. This project has no `package.json`; if a version constant or file exists, update it then. If none exists, note the version in the commit message.

## Development
- No npm, no Node — pure PHP/HTML/JS with Python for tooling
- Secrets in `secrets.php` / `secrets.local.php` (gitignored); never hardcode
- Test locally before pushing; verify cPanel deploy log after push
- Module build standards: `AESOP-MODULE-BUILD-STANDARDS.md`
