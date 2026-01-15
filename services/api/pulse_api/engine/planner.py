from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
from datetime import datetime, date, time, timedelta

@dataclass
class TaskLite:
    id: int
    title: str
    notes: str
    priority: int
    estimate_min: int
    status: str
    due_at: Optional[datetime]

def _parse_hhmm(s: str) -> time:
    hh, mm = s.split(":")
    return time(hour=int(hh), minute=int(mm))

def _minutes_between(start: time, end: time) -> int:
    dt0 = datetime.combine(date.today(), start)
    dt1 = datetime.combine(date.today(), end)
    if dt1 <= dt0:
        dt1 += timedelta(days=1)
    return int((dt1 - dt0).total_seconds() // 60)

def _add_minutes(t: time, mins: int) -> time:
    dt = datetime.combine(date.today(), t) + timedelta(minutes=mins)
    return dt.time().replace(second=0, microsecond=0)

def _fmt(t: time) -> str:
    return t.strftime("%H:%M")

def _sort_key(task: TaskLite) -> Tuple[int, datetime, int]:
    due = task.due_at or datetime.max
    return (task.priority, due, task.estimate_min)

def sort_tasks_with_signals(tasks: List[TaskLite], blocked_ids: set[int], doing_ids: set[int], deferred_ids: set[int]) -> List[TaskLite]:
    def key(t: TaskLite):
        is_doing = 0 if t.id in doing_ids else 1
        is_blocked = 1 if t.id in blocked_ids else 0
        is_deferred = 1 if t.id in deferred_ids else 0
        due = t.due_at or datetime.max
        return (is_doing, is_blocked, is_deferred, t.priority, due, t.estimate_min)
    return sorted(tasks, key=key)

def build_day_blocks(work_start: str, work_end: str, buffer_pct: float, deep_work_first: bool) -> Tuple[List[Dict], int]:
    start_t = _parse_hhmm(work_start)
    end_t = _parse_hhmm(work_end)
    total = _minutes_between(start_t, end_t)

    buffer_min = int(total * buffer_pct)
    usable = max(60, total - buffer_min)

    deep_work = 120
    admin = 60
    wrap = 30

    remaining = max(0, usable - (deep_work + admin + wrap))
    focus1 = min(120, remaining)
    remaining -= focus1
    focus2 = remaining

    blocks_spec = []
    if deep_work_first:
        blocks_spec += [("Deep Work", deep_work), ("Admin", admin)]
    else:
        blocks_spec += [("Admin", admin), ("Deep Work", deep_work)]

    if focus1 > 0:
        blocks_spec.append(("Focus", focus1))
    if focus2 > 0:
        blocks_spec.append(("Focus", focus2))
    if buffer_min >= 15:
        blocks_spec.append(("Buffer", buffer_min))
    blocks_spec.append(("Wrap-up", wrap))

    blocks = []
    cursor = start_t
    for i, (label, mins) in enumerate(blocks_spec):
        b_start = cursor
        b_end = _add_minutes(cursor, mins)
        cursor = b_end
        blocks.append({
            "id": f"{label.lower().replace(' ', '-')}-{i+1}",
            "label": label,
            "start": _fmt(b_start),
            "end": _fmt(b_end),
            "tasks": [],
            "capacity_min": mins,
        })
    return blocks, buffer_min

def assign_tasks_to_blocks(
    tasks: List[TaskLite],
    blocks: List[Dict],
    max_tasks_per_block: int,
    blocked_ids: set[int] | None = None,
    doing_ids: set[int] | None = None,
    deferred_ids: set[int] | None = None,
    exclude_ids: set[int] | None = None,
) -> List[Dict]:
    blocked_ids = blocked_ids or set()
    doing_ids = doing_ids or set()
    deferred_ids = deferred_ids or set()
    exclude_ids = exclude_ids or set()

    candidates = [t for t in tasks if t.status in ("todo", "doing")]
    candidates = sort_tasks_with_signals(candidates, blocked_ids, doing_ids, deferred_ids)

    deep_blocks = [b for b in blocks if b["label"] == "Deep Work"]
    admin_blocks = [b for b in blocks if b["label"] == "Admin"]
    focus_blocks = [b for b in blocks if b["label"] == "Focus"]
    buffer_blocks = [b for b in blocks if b["label"] == "Buffer"]
    wrap_blocks = [b for b in blocks if b["label"] == "Wrap-up"]

    used_ids = set(exclude_ids)
    p1 = [t for t in candidates if t.priority == 1]
    short = sorted(candidates, key=lambda t: t.estimate_min)

    def place(block_list: List[Dict], pick_fn):
        for b in block_list:
            remaining = b["capacity_min"]
            count = 0
            while remaining >= 5 and count < max_tasks_per_block:
                nxt = pick_fn(remaining)
                if not nxt:
                    break
                b["tasks"].append(nxt)
                used_ids.add(nxt.id)
                remaining -= nxt.estimate_min
                count += 1

    def pick_longer_from_p1(remaining):
        options = [t for t in p1 if t.id not in used_ids and t.estimate_min <= remaining and t.id not in blocked_ids]
        if not options:
            options = [t for t in p1 if t.id not in used_ids and t.estimate_min <= remaining]
        if not options:
            return None
        return sorted(options, key=lambda t: -t.estimate_min)[0]

    def pick_short_any(remaining):
        options = [t for t in short if t.id not in used_ids and t.estimate_min <= remaining and t.id not in blocked_ids]
        if options:
            return options[0]
        options = [t for t in short if t.id not in used_ids and t.estimate_min <= remaining]
        return options[0] if options else None

    def pick_priority_then_fit(remaining):
        options = [t for t in candidates if t.id not in used_ids and t.estimate_min <= remaining]
        if not options:
            return None
        non_blocked = [t for t in options if t.id not in blocked_ids]
        if non_blocked:
            non_blocked.sort(key=_sort_key)
            return non_blocked[0]
        options.sort(key=lambda t: t.estimate_min)
        return options[0]

    place(deep_blocks, pick_longer_from_p1)
    place(admin_blocks, pick_short_any)
    place(focus_blocks, pick_priority_then_fit)
    place(buffer_blocks, pick_short_any)
    place(wrap_blocks, pick_short_any)

    for b in blocks:
        b.pop("capacity_min", None)
    return blocks

def compute_now(blocks: List[Dict], blocked_ids: set[int] | None = None) -> Tuple[Optional[TaskLite], str, Optional[str]]:
    blocked_ids = blocked_ids or set()

    for b in blocks:
        if b["label"] in ("Buffer", "Wrap-up"):
            continue
        for t in b["tasks"]:
            if t.id not in blocked_ids and t.status != "blocked":
                return t, f"Best next step in your {b['label']} block.", b["label"]

    for b in blocks:
        for t in b["tasks"]:
            if t.id not in blocked_ids and t.status != "blocked":
                return t, f"Best next step from {b['label']}.", b["label"]

    return None, "Add tasks to generate a plan.", None

def as_api_task(t: TaskLite) -> Dict:
    return {
        "id": t.id,
        "title": t.title,
        "notes": t.notes or "",
        "priority": int(t.priority),
        "estimate_min": int(t.estimate_min),
        "status": t.status,
        "due_at": t.due_at.isoformat() if t.due_at else None,
    }
