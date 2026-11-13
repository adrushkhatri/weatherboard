# WeatherBoard

Installable weather PWA (React + Vite, client-side only).

**Live URL:** https://weatherboard-eosin.vercel.app/

**GITHUB URL:** https://github.com/adrushkhatri/weatherboard

## Setup

```
npm i && cp .env.example .env   # add VITE_OWM_KEY (openweathermap.org) and VITE_RAPIDAPI_KEY (GeoDB Cities on RapidAPI)
npm run dev        # or: npm run build && npm run preview  (service worker only runs in production build)
```

Deploy to Vercel/Netlify with the same two env vars. Keys are visible in client bundles (unavoidable without a backend) — use restricted free-tier keys.

## APIs

GeoDB Cities (autocomplete, 300 ms debounce, falls back to Open-Meteo geocoding if no key) · OpenWeatherMap (current + forecast) · Open-Meteo (automatic fallback on any OWM failure/rate-limit) · Notifications API + Service Worker.

## Architecture

`src/api.js` normalises both weather providers to one shape · `src/App.jsx` UI/state · `public/sw.js` stale-while-revalidate app shell, network-first weather API cache, reminder logic · last city + weather also stored in localStorage for offline display · storage wrapper falls back to memory if localStorage is blocked.

## Known limitations

- A true push that fires with the tab closed needs a push server (VAPID), which the "client-only" scope excludes. This app schedules the reminder in the service worker, triggered by Periodic Background Sync (Chromium, installed PWA) and an in-page ticker while open. Elsewhere it fires only when the app/browser is alive. Documented trade-off.
- 5-day forecast from OWM aggregates 3-hourly data; today may be partial.
- No Lottie icons (emoji used).
