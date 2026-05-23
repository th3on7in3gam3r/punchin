# PunchIn

PWA work-hour tracker: clock in/out, breaks, calendar, reports, and reminders. Data is stored in **localStorage** and synced to **Neon Postgres** when `DATABASE_URL` is set.

## Run locally

**Prerequisites:** Node.js 20+

1. `npm install`
2. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — Neon connection string (optional for offline-only)
   - `GEMINI_API_KEY` — for AI insights in Reports (server-side only)
3. `npm run dev` — API on `:3001`, Vite on `:3000`

## Deploy (Render)

See `render.yaml`: build with `npm run build`, start with `npm start`, set `DATABASE_URL` and `GEMINI_API_KEY`.
