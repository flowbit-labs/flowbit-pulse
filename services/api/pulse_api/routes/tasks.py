from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..core.deps import get_db
from ..core.schemas import TaskCreate, TaskPatch, TaskOut
from ..core import models

router = APIRouter()

@router.get("", response_model=list[TaskOut])
def list_tasks(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Task)
    if status:
        q = q.filter(models.Task.status == status)
    return q.order_by(models.Task.created_at.desc()).all()

@router.post("", response_model=TaskOut)
def create_task(body: TaskCreate, db: Session = Depends(get_db)):
    t = models.Task(
        title=body.title,
        notes=body.notes or "",
        priority=int(body.priority),
        estimate_min=int(body.estimate_min),
        status="todo",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.patch("/{task_id}", response_model=TaskOut)
def patch_task(task_id: int, body: TaskPatch, db: Session = Depends(get_db)):
    t = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if body.title is not None:
        t.title = body.title
    if body.notes is not None:
        t.notes = body.notes
    if body.priority is not None:
        t.priority = int(body.priority)
    if body.estimate_min is not None:
        t.estimate_min = int(body.estimate_min)
    if body.status is not None:
        t.status = body.status

    t.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(t)
    return t
