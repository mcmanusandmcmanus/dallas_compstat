# Dallas CompStat Command Brief

An end-to-end CompStat experience powered by the Dallas Police Department open RMS incident feed (`qv6i-rri7`). The dashboard highlights short-, medium-, and long-range crime deltas, Poisson z-scores, spatial hot spots, and top offense categories so that command staff can walk into the next briefing with current intelligence.

https://github.com/mcmanusandmcmanus/dallas_compstat

## Feature Highlights

- **Live windows:** 7-day, 28-day, Year-to-Date, and trailing 365-day metrics render simultaneously with percent change and Poisson alert bands.
- **Focus filters:** Snap the briefing to a single division or NIBRS category while keeping the remaining metrics in view.
- **Trend intelligence:** Rolling averages and ±3σ Poisson bands surface statistically meaningful spikes instead of noisy daily swings.
- **Spatial context:** Leaflet-powered map with the latest 350 geocoded incidents plus an analyst-ready narrative capsule.
- **GPU heatmap (optional):** Enable a deck.gl-powered surface via `NEXT_PUBLIC_ENABLE_GPU_HEATMAP` without touching the layout.
- **Render ready:** `render.yaml` + `.env.example` make it trivial to deploy on Render (or any Node platform).

## Tech Stack

| Layer        | Tooling                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| Frontend     | Next.js 16 (App Router) + Tailwind v4 + Recharts + React Leaflet                |
| Backend      | Next.js route handler (`/api/compstat`) with in-memory query caching            |
| Data Source  | Dallas OpenData RMS Incidents dataset `qv6i-rri7` (Socrata API)                 |
| Visualization| Poisson-based KPI badges, rolling averages, geographic hot spots                |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file from the sample:

```bash
cp .env.example .env.local
```

- `SOCRATA_APP_TOKEN` *(optional but recommended)* — Register at https://www.dallasopendata.com/ to avoid anonymous rate limits.
- `NEXT_PUBLIC_ENABLE_GPU_HEATMAP` *(optional, default `false`)* — Set to `true` to surface the GPU heatmap toggle inside the Crime Map.
- `NEXT_PUBLIC_GPU_HEATMAP_STYLE` *(optional)* — Override the MapLibre style URL used by the GPU heatmap; defaults to Carto Dark Matter GL.

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Filtering and window switches call the `/api/compstat` route, which in turn queries Socrata, computes CompStat metrics, and streams JSON to the UI.

### 4. Production build

```bash
npm run build
npm run start
```

## CompStat Methodology

| Window  | Definition                                     | Comparison Logic                            |
| ------- | ---------------------------------------------- | ------------------------------------------- |
| 7-day   | Last 7 days vs. the previous 7-day period      | Percent change + Poisson z-score            |
| 28-day  | Last 28 days vs. prior 28 days                 | Core CompStat cadence                       |
| YTD     | Jan 1 → today vs. same span last year          | Handles leap years + dynamic day counts     |
| 365-day | Trailing 365 days vs. preceding 365 days       | Smooths seasonality                         |

Poisson z-score is calculated as `2 * (sqrt(cur) - sqrt(prev))`, mirroring Esri/Peregrine analyst playbooks:

- `z ≥ 3` → Spike
- `1 ≤ z < 3` → Elevated
- `-1 < z < 1` → Normal
- `z ≤ -1` → Below normal

Trend bands use rolling 7-day averages with ±3 * sqrt(mean) intervals to expose statistically significant excursions.

## Deployment on Render

A `render.yaml` file is included at the repository root:

```yaml
services:
  - type: web
    name: dallas-compstat
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_VERSION
        value: 22
      - key: SOCRATA_APP_TOKEN
        sync: false
```

Steps:

1. Push the repo to GitHub.
2. Create a new **Web Service** in Render and point it to the repo.
3. Add environment variables in Render (Dashboard → Environment):
   - `SOCRATA_APP_TOKEN` (recommended to raise rate limits)
   - Any Redis/feature flags you add later
4. Deploy. Render will execute the build/start commands and serve the production build.
5. Optional: configure the health check endpoint to `/api/health` (added for uptime monitoring). Render will receive a 200 when both Socrata and CompStat caches are current, 503 otherwise.

## Troubleshooting

| Symptom                              | Fix                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| API returns 429/Too Many Requests    | Configure `SOCRATA_APP_TOKEN` and redeploy; unauthenticated access is throttled.    |
| Blank trend/chart                    | Make sure the selected division/category actually has data in the chosen window.    |
| Map renders nothing                  | Some incidents lack geocodes; expand the window or drop the division filter.        |
| Build fails due to fetch timeout     | Render/CI needs outbound HTTPS – ensure firewall rules allow `*.dallasopendata.com`.|

## Project Structure

```
src/
 ├─ app/
 │   ├─ api/compstat/route.ts   # Socrata-backed API for UI + Render
 │   ├─ api/health/route.ts     # Health probe for Render/monitors
 │   ├─ layout.tsx, page.tsx    # Shell + hero + dashboard entry point
 ├─ components/dashboard        # Client components (filters, cards, map, table)
 └─ lib                         # CompStat math, date windows, Socrata helpers
```

## License

MIT — see `LICENSE` for details.
