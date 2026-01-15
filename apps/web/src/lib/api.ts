const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function getTodayPlan() {
  const res = await fetch(`${API_URL}/plan/today`, { cache: "no-store" });
  if (!res.ok) return null;
  return safeJson(res);
}

export async function generatePlan() {
  const res = await fetch(`${API_URL}/plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return safeJson(res);
}

export async function replan() {
  const res = await fetch(`${API_URL}/plan/replan`, { method: "POST" });
  return safeJson(res);
}

export async function createTask(task: { title: string; notes?: string; priority: number; estimate_min: number }) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return safeJson(res);
}

export async function patchTask(taskId: number, patch: any) {
  const res = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return safeJson(res);
}

export async function postEvent(body: any) {
  const res = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return safeJson(res);
}

export async function setBlockLock(input: { block_id: string; locked: boolean }) {
  const res = await fetch(`${API_URL}/plan/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return safeJson(res);
}

export async function moveTask(input: { task_id: number; from_block_id: string; to_block_id: string; to_index: number }) {
  const res = await fetch(`${API_URL}/plan/move-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return safeJson(res);
}
