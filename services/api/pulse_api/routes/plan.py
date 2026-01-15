import json
from datetime import date, datetime, time as dtime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.deps import get_db
from ..core.schemas import PlanGenerateIn, TodayPlanOut, LockBlockIn, MoveTaskIn
from ..core import models
from ..core.config import ai_enabled

from ..engine.planner import (
    TaskLite,
    build_day_blocks,
    assign_tasks_to_blocks,
    compute_now,
    as_api_task,
)

from ..ai.llm import generate_text
from ..ai.prompts import SYSTEM_PULSE, now_reason_prompt, replan_explain_prompt

router = APIRouter()

def _today_key() -> str:
    return date.today().isoformat()

def _today_start():
    return datetime.combine(date.today(), dtime.min)

def _load_tasks(db: Session) -> list[TaskLite]:
    rows = db.query(models.Task).all()
    out: list[TaskLite] = []
    for r in rows:
        out.append(TaskLite(
            id=r.id,
            title=r.title,
            notes=r.notes or "",
            priority=int(r.priority),
            estimate_min=int(r.estimate_min),
            status=r.status,
            due_at=None,
        ))
    return out

def _save_plan(db: Session, day: str, plan_dict: dict):
    raw = json.dumps(plan_dict)
    existing = db.query(models.DayPlan).filter(models.DayPlan.date == day).first()
    if existing:
        existing.plan_json = raw
        existing.updated_at = datetime.utcnow()
    else:
        db.add(models.DayPlan(date=day, plan_json=raw))
    db.commit()

def _task_block_map(plan_dict: dict) -> dict[int, str]:
    out = {}
    for b in plan_dict.get("blocks", []):
        for t in b.get("tasks", []):
            out[int(t["id"])] = b.get("label", "")
    return out

def _diff_changes(old_plan: dict | None, new_plan: dict, limit: int = 4) -> list[str]:
    if not old_plan:
        return []
    changes: list[str] = []

    if old_plan.get("now", {}).get("task") and new_plan.get("now", {}).get("task"):
        old_now = int(old_plan["now"]["task"]["id"])
        new_now = int(new_plan["now"]["task"]["id"])
        if old_now != new_now:
            changes.append("Updated your ‘Now’ recommendation.")

    old_map = _task_block_map(old_plan)
    new_map = _task_block_map(new_plan)

    moved = 0
    for tid, old_label in old_map.items():
        new_label = new_map.get(tid)
        if new_label and new_label != old_label:
            changes.append(f"Moved task #{tid} from {old_label} → {new_label}.")
            moved += 1
            if moved >= limit:
                break

    return changes[:limit]

def _build_plan(
    db: Session,
    body: PlanGenerateIn | None,
    blocked_ids: set[int] | None = None,
    doing_ids: set[int] | None = None,
    deferred_ids: set[int] | None = None,
    exclude_ids: set[int] | None = None,
    locked_block_ids: list[str] | None = None,
) -> dict:
    work_start = "09:00"
    work_end = "17:30"
    buffer_pct = 0.2
    deep_work_first = True
    max_tasks_per_block = 6

    if body:
        work_start = body.work_hours.start
        work_end = body.work_hours.end
        buffer_pct = body.preferences.buffer_pct
        deep_work_first = body.preferences.deep_work_first
        max_tasks_per_block = body.preferences.max_tasks_per_block

    blocked_ids = blocked_ids or set()
    doing_ids = doing_ids or set()
    deferred_ids = deferred_ids or set()
    exclude_ids = exclude_ids or set()

    tasks = _load_tasks(db)
    blocks, buffer_min = build_day_blocks(work_start, work_end, buffer_pct, deep_work_first)

    blocks = assign_tasks_to_blocks(
        tasks, blocks, max_tasks_per_block,
        blocked_ids=blocked_ids,
        doing_ids=doing_ids,
        deferred_ids=deferred_ids,
        exclude_ids=exclude_ids,
    )

    now_task, reason, now_block_label = compute_now(blocks, blocked_ids=blocked_ids)

    if now_task and ai_enabled():
        try:
            reason = generate_text(
                SYSTEM_PULSE,
                now_reason_prompt(now_task.title, now_task.notes, now_block_label or "Today")
            )
        except Exception:
            pass

    api_blocks = []
    for b in blocks:
        api_blocks.append({
            "id": b["id"],
            "label": b["label"],
            "start": b["start"],
            "end": b["end"],
            "tasks": [as_api_task(t) for t in b["tasks"]],
        })

    return {
        "date": _today_key(),
        "blocks": api_blocks,
        "now": {
            "task": as_api_task(now_task) if now_task else None,
            "reason": reason,
        },
        "buffer_min": int(buffer_min),
        "changes": [],
        "locked_block_ids": locked_block_ids or [],
        "explanation": None,
    }

@router.get("/today", response_model=TodayPlanOut)
def get_today(db: Session = Depends(get_db)):
    day = _today_key()
    row = db.query(models.DayPlan).filter(models.DayPlan.date == day).first()
    if not row:
        raise HTTPException(status_code=404, detail="No plan for today")
    return json.loads(row.plan_json)

@router.post("/generate", response_model=TodayPlanOut)
def generate(body: PlanGenerateIn, db: Session = Depends(get_db)):
    day = _today_key()
    plan = _build_plan(db, body, locked_block_ids=[])
    _save_plan(db, day, plan)
    return plan

@router.post("/lock", response_model=TodayPlanOut)
def lock_block(body: LockBlockIn, db: Session = Depends(get_db)):
    day = _today_key()
    row = db.query(models.DayPlan).filter(models.DayPlan.date == day).first()
    plan = json.loads(row.plan_json) if row else _build_plan(db, None, locked_block_ids=[])

    locked = set(plan.get("locked_block_ids", []))
    if body.locked:
        locked.add(body.block_id)
    else:
        locked.discard(body.block_id)

    plan["locked_block_ids"] = sorted(list(locked))
    plan["changes"] = [f"{'Locked' if body.locked else 'Unlocked'} {body.block_id}."]
    _save_plan(db, day, plan)
    return plan

@router.post("/move-task", response_model=TodayPlanOut)
def move_task(body: MoveTaskIn, db: Session = Depends(get_db)):
    day = _today_key()
    row = db.query(models.DayPlan).filter(models.DayPlan.date == day).first()
    if not row:
        raise HTTPException(status_code=404, detail="No plan for today")

    plan = json.loads(row.plan_json)
    locked = set(plan.get("locked_block_ids", []))

    if body.from_block_id in locked or body.to_block_id in locked:
        raise HTTPException(status_code=400, detail="Cannot move tasks in/out of locked blocks")

    from_block = next((b for b in plan["blocks"] if b["id"] == body.from_block_id), None)
    to_block = next((b for b in plan["blocks"] if b["id"] == body.to_block_id), None)
    if not from_block or not to_block:
        raise HTTPException(status_code=404, detail="Block not found")

    moved = None
    kept = []
    for t in from_block.get("tasks", []):
        if int(t["id"]) == int(body.task_id):
            moved = t
        else:
            kept.append(t)
    if not moved:
        raise HTTPException(status_code=404, detail="Task not found in source block")

    from_block["tasks"] = kept
    to_block["tasks"] = to_block.get("tasks", [])

    idx = max(0, min(int(body.to_index), len(to_block["tasks"])))
    to_block["tasks"].insert(idx, moved)

    if body.from_block_id == body.to_block_id:
        plan["changes"] = [f"Reordered “{moved.get('title','task')}” inside {to_block.get('label','')}."]
    else:
        plan["changes"] = [f"Moved “{moved.get('title','task')}” → {to_block.get('label','')}."]
    _save_plan(db, day, plan)
    return plan

@router.post("/replan", response_model=TodayPlanOut)
def replan(db: Session = Depends(get_db)):
    day = _today_key()
    old_row = db.query(models.DayPlan).filter(models.DayPlan.date == day).first()
    old_plan = json.loads(old_row.plan_json) if old_row else None

    locked_block_ids = (old_plan or {}).get("locked_block_ids", []) if old_plan else []

    evs = (
        db.query(models.DayEvent)
        .filter(models.DayEvent.at >= _today_start())
        .order_by(models.DayEvent.at.desc())
        .all()
    )

    blocked_ids, doing_ids, deferred_ids, done_ids = set(), set(), set(), set()
    for e in evs:
        if not e.task_id:
            continue
        tid = int(e.task_id)
        if e.kind == "blocked":
            blocked_ids.add(tid)
        elif e.kind == "started":
            doing_ids.add(tid)
        elif e.kind == "deferred":
            deferred_ids.add(tid)
        elif e.kind in ("done", "completed"):
            done_ids.add(tid)

    for t in db.query(models.Task).filter(models.Task.status == "done").all():
        done_ids.add(int(t.id))

    locked_tasks_by_block: dict[str, list[dict]] = {}
    exclude_ids: set[int] = set()

    if old_plan and locked_block_ids:
        for b in old_plan.get("blocks", []):
            if b.get("id") in locked_block_ids:
                keep = []
                for t in b.get("tasks", []):
                    tid = int(t["id"])
                    if tid not in done_ids:
                        keep.append(t)
                        exclude_ids.add(tid)
                locked_tasks_by_block[b["id"]] = keep

    plan = _build_plan(
        db, None,
        blocked_ids=blocked_ids,
        doing_ids=doing_ids,
        deferred_ids=deferred_ids,
        exclude_ids=exclude_ids,
        locked_block_ids=locked_block_ids,
    )

    if locked_block_ids:
        for b in plan["blocks"]:
            if b["id"] in locked_block_ids:
                b["tasks"] = locked_tasks_by_block.get(b["id"], b["tasks"])

    changes = _diff_changes(old_plan, plan, limit=4)
    if locked_block_ids:
        changes.append(f"Protected {len(locked_block_ids)} locked block(s).")
    if blocked_ids:
        changes.append(f"Avoiding {len(blocked_ids)} blocked task(s) for now.")
    if done_ids:
        changes.append(f"Removed {len(done_ids)} completed task(s).")
    plan["changes"] = changes[:6]

    if ai_enabled():
        try:
            plan["explanation"] = generate_text(
                SYSTEM_PULSE,
                replan_explain_prompt(plan.get("changes", []), plan.get("locked_block_ids", []))
            )
        except Exception:
            plan["explanation"] = None

    _save_plan(db, day, plan)
    return plan
