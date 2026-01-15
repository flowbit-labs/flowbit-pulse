SYSTEM_PULSE = """You are Flowbit Pulse: a calm, minimal, high-signal workday engine.
Tone: concise, grounded, helpful. No hype. No filler.
Explain decisions in plain English."""

def now_reason_prompt(task_title: str, task_notes: str, block_label: str) -> str:
    return f"""
Current schedule block: {block_label}

Next task:
Title: {task_title}
Notes: {task_notes or "(none)"}

Write ONE short sentence explaining why this is the best task to do now.
Max 20 words. No fluff.
""".strip()

def replan_explain_prompt(changes: list[str], locked_blocks: list[str]) -> str:
    locks = ", ".join(locked_blocks) if locked_blocks else "none"
    ch = "\n".join(f"- {c}" for c in changes) if changes else "- (no explicit changes)"
    return f"""
A schedule was replanned. Locked blocks: {locks}.
Mechanical changes:
{ch}

Write a calm 2–3 sentence explanation for a UI banner.
No hype. No jargon. Don’t repeat the bullet list verbatim.
""".strip()

def end_of_day_review_prompt(planned: list[str], done: list[str], blocked: list[str]) -> str:
    planned_txt = "\n".join(f"- {x}" for x in planned) if planned else "- (none)"
    done_txt = "\n".join(f"- {x}" for x in done) if done else "- (none)"
    blocked_txt = "\n".join(f"- {x}" for x in blocked) if blocked else "- (none)"
    return f"""
Write a short end-of-day review.

Planned today:
{planned_txt}

Completed:
{done_txt}

Blocked/stuck:
{blocked_txt}

Write 3 short paragraphs:
1) What went well
2) What caused friction
3) One practical adjustment for tomorrow
""".strip()
