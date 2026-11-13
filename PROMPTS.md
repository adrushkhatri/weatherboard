# PROMPTS.md

## Overview
- **Project:** WeatherBoard (React + Vite PWA)
- **Primary AI tool:** Claude (chat) — used to generate the initial project from the challenge PDF
- **Development environment:** WebStorm (editing, running, formatting, Git), Vercel (deployment)
- **Agentic IDE note:** The initial build was generated in Claude chat rather than in Cursor, Antigravity or OpenCode.

## Prompt History (in order)

### 1. Initial build
**Prompt:** "read, analyze and understand this. and build a full flesh application according to the instructions provided" (attached the challenge PDF)

**Outcome:** Generated the full project: city search with autocomplete, weather and 5-day forecast, favourites, PWA manifest and service worker, reminder notifications, responsive layout, README and a PROMPTS template.

**My follow-up:** Ran and tested it locally, then deployed it.

### 2. Tooling and setup help
**Prompt:** Asked how to get API keys and what to do with my empty `.env` file.

**Outcome:** Learned the app falls back to Open-Meteo when no keys are set.

### 3. Code quality
**Prompt:** "i want to install prettier in my repo in webstorm"

**Outcome:** Added Prettier with a config, a `format` script and WebStorm run-on-save, then formatted the codebase.

### 4. UI fix
**Prompt:** "set reminder button need ui fix. top margin 10px"

**Outcome:** Added a CSS rule giving the reminder button a 10px top margin.

## Issues Hit and How I Resolved Them
| Issue | Cause | Fix |
|---|---|---|
| `&&` rejected in PowerShell | Older PowerShell doesn't support `&&` | Ran commands separately |
| `npm` not recognised | Node.js was not installed | Installed Node LTS and reopened the terminal |
| `git push` failed (no `main` branch) | No commit existed yet | Configured Git identity, committed, then pushed |
| Missing `format` script | Script not added to `package.json` | Added it and reran |

## Testing Done
Tested on the live site: city search, forecast, favourites with removal confirmation, °C/°F toggle, offline mode, PWA install, reminder permission flow. 

## Known Limitations (also in README)
- Notifications that fire with the tab fully closed normally need a push server. This app uses the service worker with Periodic Background Sync, which only works in installed Chromium PWAs.
- Animated icons are not included (emoji are used).