# AstroBase deployment

## Cloudflare Pages

Use the existing `frontend` Vite project:

- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Public variable: `VITE_API_BASE_URL=https://<render-service>.onrender.com`

The `frontend/public/_redirects` file keeps React Router routes working after a
direct page refresh. Do not add Gemini or NASA credentials to Cloudflare
environment variables.

## Render

Deploy the Node service from `backend/nova`:

- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/healthz`

Configure these environment variables in Render:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
NASA_API_KEY=
NODE_ENV=production
CORS_ORIGINS=https://<cloudflare-project>.pages.dev
```

`PORT` is supplied by Render. `GEMINI_API_KEY` and `NASA_API_KEY` must remain
backend-only secrets. The existing deterministic dashboard, mission-rule,
NASA, cache and fallback paths run before Gemini.
