import os

def ai_enabled() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))

def llm_model() -> str:
    return os.getenv("PULSE_LLM_MODEL", "gpt-5-mini")

def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [x.strip() for x in raw.split(",") if x.strip()]
