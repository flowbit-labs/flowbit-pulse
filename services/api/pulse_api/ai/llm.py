from openai import OpenAI
from ..core.config import llm_model

client = OpenAI()

def generate_text(system: str, user: str) -> str:
    resp = client.responses.create(
        model=llm_model(),
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    try:
        return resp.output_text.strip()
    except Exception:
        return str(resp).strip()
