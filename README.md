# Flowbit Pulse — AI Workday Engine (Local-first)

Flowbit Pulse is a local-first AI workday engine that builds a calm plan, adapts when reality changes, and protects focus time.

## Features
- Rules-first planning (reliable)
- Replan using real signals (blocked/done/started)
- Lock blocks (protect deep work)
- Drag & drop + reorder (persisted)
- Command palette (Cmd/Ctrl + K)
- Optional AI layer:
  - “Now” reason
  - Replan explanation
  - End-of-day review

---

## Run locally

### 1) API (FastAPI)
```bash
cd services/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn pulse_api.main:app --reload --port 8000
```

### 2) Run
```bash
cd ../../apps/web
npm install
cp .env.local.example .env.local
npm run dev
```
# Open:
- http://localhost:3000/today


### Enable AI (optional)

Set env vars for the API:
```bash
export OPENAI_API_KEY="YOUR_KEY"
export PULSE_LLM_MODEL="gpt-5-mini"
```
If OPENAI_API_KEY is not set, Pulse runs fully without AI.
