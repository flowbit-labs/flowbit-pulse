from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.deps import get_db
from ..core.schemas import EventIn
from ..core import models

router = APIRouter()

@router.post("")
def post_event(body: EventIn, db: Session = Depends(get_db)):
    ev = models.DayEvent(kind=body.kind, task_id=body.task_id, meta=body.meta or "")
    db.add(ev)
    db.commit()
    return {"ok": True}
