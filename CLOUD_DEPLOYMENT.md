# Cloud Deployment (Optional) — Flowbit Pulse

Flowbit Pulse is local-first by default (SQLite). If you want remote access, deploy API + Web and use Postgres.

## Recommended architecture
- Web (Next.js): Vercel (root: apps/web)
- API (FastAPI): Render/Railway/Fly (root: services/api)
- DB: Postgres (managed by your platform)

## API environment variables
- DATABASE_URL=postgresql://...
- OPENAI_API_KEY=... (optional)
- PULSE_LLM_MODEL=gpt-5-mini (optional)
- CORS_ORIGINS=https://your-web-domain

## Web environment variables
- NEXT_PUBLIC_API_URL=https://your-api-domain

## API start command
uvicorn pulse_api.main:app --host 0.0.0.0 --port 8000
