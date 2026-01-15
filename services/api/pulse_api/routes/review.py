from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
import json

from ..core.deps import get_db
from ..core import models
from ..core.config import ai_enabled
from ..ai.llm import generate_text
from ..ai.prompts import SYSTEM_PULSE, end_of_day_review_prompt

router = APIRouter()

@router.get("/today")
def review_today(db: Session = Depends(get_db)):
    day = date.today().isoformat()
    plan_row = db.query(models.DayPlan).filter(models.DayPlan.date == day).first()
    if not plan_row:
        return {"date": day, "review": "No plan found for today yet."}

    plan = json.loads(plan_row.plan_json)

    planned = []
    for b in plan.get("blocks", []):
        for t in b.get("tasks", []):
            planned.append(t.get("title", "Untitled task"))

    done = [t.title for t in db.query(models.Task).filter(models.Task.status == "done").all()]
    blocked = [t.title for t in db.query(models.Task).filter(models.Task.status == "blocked").all()]

    if ai_enabled():
        text = generate_text(SYSTEM_PULSE, end_of_day_review_prompt(planned, done, blocked))
    else:
        text = "AI is disabled (no OPENAI_API_KEY). Set it to generate a daily review."

    return {"date": day, "review": text}
