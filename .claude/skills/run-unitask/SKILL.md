---
name: run-unitask
description: Run, start, screenshot, verify, or test UniTask (weekly-tracker Next.js app). Use when asked to run the app, take a screenshot, confirm a UI change works, or test a feature visually.
---

UniTask (package name `weekly-tracker`) is a Next.js 16 app driven by Playwright via `driver.mjs`. The driver lives at `.claude/skills/run-unitask/driver.mjs`. All paths below are relative to the UniTask repo root.

## Prerequisites

Node 24 is required (matches the `engines.node: 24.x` in `package.json`).

Playwright and its Chromium browser must be available. The driver installs `playwright` into its own `node_modules` alongside `driver.mjs`. Install once:

```bash
# From repo root:
npm install playwright --prefix .claude/skills/run-unitask
npx playwright install chromium
```

Environment: copy `.env.local` and `.env` must exist (they contain Firebase credentials). They are already present in this repo and are not committed.

## Build

No separate build step for local dev — Turbopack compiles on first request.

```bash
npm install          # if node_modules is missing
```

## Run (agent path)

**Step 1 — Start the dev server** (one-time per session, in background):

```bash
cd /path/to/UniTask
npm run dev &
```

The server prints `✓ Ready in ~4s` and listens on `http://localhost:3000`. If 3000 is taken it auto-selects 3001 — set `UNITASK_URL=http://localhost:3001` for the driver.

**Step 2 — Drive with the driver** (always run from the skill directory):

```bash
cd .claude/skills/run-unitask

# Screenshot the login page (root):
node driver.mjs ss "" home.png

# Screenshot a specific route:
node driver.mjs ss uniflux flow.png
node driver.mjs ss agenda agenda.png

# Click an element:
node driver.mjs click "" "button[type=submit]"

# Fill a form field:
node driver.mjs fill "" "input[name=email]" "user@example.com"

# Print text content of an element:
node driver.mjs text "" "h1"

# Raw HTTP check (no browser):
node driver.mjs get uniflux
```

Screenshots land in `.claude/skills/run-unitask/screenshots/`.

**Override the base URL:**
```bash
UNITASK_URL=http://localhost:3001 node driver.mjs ss "" home.png
```

## Routes observed

| Route | Auth required | What it shows |
|---|---|---|
| `/` | No | Login page (Google OAuth or email/password) |
| `/uniflux` | No | UniFlux Flow Designer (C4/process diagram builder) |
| `/tasks` | Yes | Redirects to login |
| `/agenda` | Yes | Redirects to login |
| `/uniflux/core` | No | Flow canvas |

Most routes behind auth redirect to `/` (login). UniFlux (`/uniflux`) is accessible without login.

## Run (human path)

```bash
npm run dev
# Open http://localhost:3000 in browser
# Ctrl-C to stop
```

## Gotchas

**Path `/` expands in git bash.** When calling the driver from git bash, never pass `/` as a path argument — bash expands it to `C:/Program Files/Git/`. Use `""` (empty string) for the root, and omit the leading slash for other routes (`uniflux`, not `/uniflux`).

Verified:
```bash
# RIGHT:
node driver.mjs ss "" home.png        # → http://localhost:3000/
node driver.mjs ss uniflux flow.png   # → http://localhost:3000/uniflux

# WRONG (git bash expands / to Windows FS root):
node driver.mjs ss / home.png         # → 404, navigates to wrong URL
```

**Port conflict.** If another Next.js instance is running, the server picks 3001 instead of 3000. The driver defaults to 3000; set `UNITASK_URL=http://localhost:3001` to override.

**Playwright package.** The project's `node_modules` doesn't include `playwright`. The driver has its own local install at `.claude/skills/run-unitask/node_modules/`. Run `npm install playwright --prefix .claude/skills/run-unitask` once if it's missing.

**First request is slow.** Turbopack compiles on first hit — expect 8-10s for `/` and up to 15s for other routes. `networkidle` timeout in the driver is 15s; increase if needed for heavy routes.

**Firebase auth in headless browser.** Google OAuth will not complete headlessly. Email/password login with a real test account works via `fill` + `click` commands; test credentials are not stored in this repo.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot find package 'playwright'` | `npm install playwright --prefix .claude/skills/run-unitask` |
| `Timeout 15000ms exceeded` | Route is slow to compile; increase `setDefaultTimeout` in driver or wait longer after server start |
| Screenshot shows 404 with a Windows path | You passed `/` in git bash — use `""` instead |
| `Port 3000 is in use` | Another instance is running; use `UNITASK_URL=http://localhost:3001` or kill the old process |
| `Unable to acquire lock at .next/dev/lock` | Two `npm run dev` instances fighting; kill one with `taskkill /F /IM node.exe` (Windows) |
