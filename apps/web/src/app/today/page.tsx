"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TodayPlan, Task, TaskStatus } from "@/lib/types";
import {
  createTask,
  generatePlan,
  getTodayPlan,
  moveTask,
  patchTask,
  postEvent,
  replan,
  setBlockLock,
} from "@/lib/api";

import { TopBar } from "@/components/TopBar";
import { Timeline } from "@/components/Timeline";
import { NowPanel } from "@/components/NowPanel";
import { PulseUpdateCard } from "@/components/PulseUpdateCard";
import { AddTaskModal } from "@/components/AddTaskModal";
import { CommandPalette } from "@/components/CommandPalette";

function formatDateLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function findTaskBlock(plan: TodayPlan, taskId: number): { blockId: string; index: number } | null {
  for (const b of plan.blocks ?? []) {
    const idx = (b.tasks ?? []).findIndex((t) => t.id === taskId);
    if (idx >= 0) return { blockId: b.id, index: idx };
  }
  return null;
}

function optimisticMove(plan: TodayPlan, taskId: number, fromBlockId: string, toBlockId: string, toIndex: number) {
  const clone: TodayPlan = structuredClone(plan);

  const from = clone.blocks.find((b) => b.id === fromBlockId);
  const to = clone.blocks.find((b) => b.id === toBlockId);
  if (!from || !to) return clone;

  if (fromBlockId === toBlockId) {
    const idxFrom = from.tasks.findIndex((t) => t.id === taskId);
    if (idxFrom < 0) return clone;

    const [moved] = from.tasks.splice(idxFrom, 1);
    const idx = Math.max(0, Math.min(toIndex, from.tasks.length));
    from.tasks.splice(idx, 0, moved);

    clone.changes = [`Reordered “${moved.title}” inside ${from.label}.`];
    return clone;
  }

  let moved: Task | null = null;
  from.tasks = from.tasks.filter((t) => {
    if (t.id === taskId) { moved = t; return false; }
    return true;
  });
  if (!moved) return clone;

  const idx = Math.max(0, Math.min(toIndex, to.tasks.length));
  to.tasks.splice(idx, 0, moved);
  clone.changes = [`Moved “${moved.title}” → ${to.label}.`];
  return clone;
}

export default function TodayPage() {
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [showPulseUpdates, setShowPulseUpdates] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const loadPlan = useCallback(async () => {
    const p = await getTodayPlan();
    if (p) setPlan(p);
  }, []);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const p = await generatePlan();
      setPlan(p);
      setShowPulseUpdates(true);
      setTimeout(() => setShowPulseUpdates(false), 8000);
      showToast("Plan generated ✨");
    } catch {
      showToast("Generate failed");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleReplan = useCallback(async () => {
    setLoading(true);
    try {
      const p = await replan();
      setPlan(p);
      setShowPulseUpdates(true);
      setTimeout(() => setShowPulseUpdates(false), 8000);
      showToast("Replanned ⚡");
    } catch {
      showToast("Replan failed");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleToggleLock = useCallback(async (blockId: string, nextLocked: boolean) => {
    setLoading(true);
    try {
      const updated = await setBlockLock({ block_id: blockId, locked: nextLocked });
      setPlan(updated);
      setShowPulseUpdates(true);
      setTimeout(() => setShowPulseUpdates(false), 8000);
      showToast(nextLocked ? "Locked 🔒" : "Unlocked 🔓");
    } catch {
      showToast("Lock failed");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleTaskStatus = useCallback(async (task: Task, status: TaskStatus) => {
    showToast(status === "done" ? "Done ✓" : status === "blocked" ? "Blocked ⛔" : "Started ▶");

    try {
      if (status === "done") await postEvent({ kind: "done", task_id: task.id });
      if (status === "blocked") await postEvent({ kind: "blocked", task_id: task.id });
      if (status === "doing") await postEvent({ kind: "started", task_id: task.id });
    } catch {}

    try { await patchTask(task.id, { status }); } catch {}
    await loadPlan();
  }, [loadPlan, showToast]);

  const handleMoveTask = useCallback(async (args: { taskId: number; fromBlockId: string; toBlockId: string; toIndex: number }) => {
    if (!plan) return;

    const optimistic = optimisticMove(plan, args.taskId, args.fromBlockId, args.toBlockId, args.toIndex);
    setPlan(optimistic);
    setShowPulseUpdates(true);
    setTimeout(() => setShowPulseUpdates(false), 8000);
    showToast("Moved ✨");

    try {
      const updated = await moveTask({
        task_id: args.taskId,
        from_block_id: args.fromBlockId,
        to_block_id: args.toBlockId,
        to_index: args.toIndex,
      });
      setPlan(updated);
    } catch {
      showToast("Move failed (reverted)");
      await loadPlan();
    }
  }, [plan, loadPlan, showToast]);

  const moveTaskToBlock = useCallback(async (taskId: number, toBlockId: string) => {
    if (!plan) return;
    const current = findTaskBlock(plan, taskId);
    if (!current) { showToast("Task not found in plan"); return; }

    const locked = plan.locked_block_ids ?? [];
    if (locked.includes(current.blockId) || locked.includes(toBlockId)) {
      showToast("Block is locked 🔒");
      return;
    }

    await handleMoveTask({ taskId, fromBlockId: current.blockId, toBlockId, toIndex: 0 });
  }, [plan, handleMoveTask, showToast]);

  const commands = useMemo(() => {
    const cmds: any[] = [];

    cmds.push({ id: "add", title: "Add task", subtitle: "Create a new task for today", icon: "＋", run: () => setAddOpen(true) });
    cmds.push({ id: "generate", title: "Generate plan", subtitle: "Build today’s schedule blocks", icon: "🗓️", run: () => handleGenerate() });
    cmds.push({ id: "replan", title: "Replan day", subtitle: "Adapt using your signals", icon: "⚡", run: () => handleReplan() });
    cmds.push({
      id: "pulse",
      title: "Show Pulse updates",
      subtitle: "View latest change log",
      icon: "🧠",
      run: () => { setShowPulseUpdates(true); setTimeout(() => setShowPulseUpdates(false), 8000); }
    });

    const nowTask = plan?.now?.task ?? null;
    if (nowTask) {
      cmds.push({ id: "now_done", title: `Mark “${nowTask.title}” as Done`, subtitle: "Close the loop", icon: "✓", run: () => handleTaskStatus(nowTask, "done") });
      cmds.push({ id: "now_blocked", title: `Mark “${nowTask.title}” as Blocked`, subtitle: "Tell Pulse it’s stuck", icon: "⛔", run: () => handleTaskStatus(nowTask, "blocked") });
      cmds.push({ id: "now_start", title: `Start “${nowTask.title}”`, subtitle: "Switch to doing", icon: "▶", run: () => handleTaskStatus(nowTask, "doing") });

      for (const b of plan?.blocks ?? []) {
        cmds.push({
          id: `move_now_${b.id}`,
          title: `Move “Now” to: ${b.label}`,
          subtitle: `${b.start}–${b.end}`,
          icon: "➜",
          run: () => moveTaskToBlock(nowTask.id, b.id),
        });
      }
    }

    const locked = new Set(plan?.locked_block_ids ?? []);
    for (const b of plan?.blocks ?? []) {
      const isLocked = locked.has(b.id);
      cmds.push({
        id: `lock_${b.id}`,
        title: isLocked ? `Unlock: ${b.label}` : `Lock: ${b.label}`,
        subtitle: isLocked ? "Allow Pulse to move tasks here" : "Protect this block from replans",
        icon: isLocked ? "🔓" : "🔒",
        run: () => handleToggleLock(b.id, !isLocked),
      });
    }

    return cmds;
  }, [plan, handleGenerate, handleReplan, handleTaskStatus, handleToggleLock, moveTaskToBlock]);

  const dateLabel = formatDateLabel(new Date());

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <TopBar
        dateLabel={dateLabel}
        onAdd={() => setAddOpen(true)}
        onReplan={handleReplan}
        onFocus={() => showToast("Focus mode UI comes next 🎯")}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {(plan?.changes?.length || plan?.explanation) && showPulseUpdates ? (
            <PulseUpdateCard
              changes={plan?.changes ?? []}
              explanation={plan?.explanation ?? null}
              onClose={() => setShowPulseUpdates(false)}
            />
          ) : null}

          {!plan ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-semibold">No plan yet</div>
              <div className="mt-1 text-sm text-white/60">
                Add a couple of tasks, then generate your first schedule.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setAddOpen(true)}
                  className="rounded-2xl border border-white/10 bg-white/[0.12] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.16]"
                >
                  ＋ Add Task
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
                >
                  🗓️ Generate Plan
                </button>
              </div>
            </div>
          ) : (
            <Timeline
              plan={plan}
              lockedBlockIds={plan.locked_block_ids ?? []}
              onToggleLock={handleToggleLock}
              onTaskDone={(t) => handleTaskStatus(t, "done")}
              onTaskBlocked={(t) => handleTaskStatus(t, "blocked")}
              onTaskStart={(t) => handleTaskStatus(t, "doing")}
              onMoveTask={handleMoveTask}
            />
          )}
        </div>

        <div className="space-y-4">
          {plan ? (
            <NowPanel
              plan={plan}
              onDone={(t) => handleTaskStatus(t, "done")}
              onBlocked={(t) => handleTaskStatus(t, "blocked")}
              onStart={(t) => handleTaskStatus(t, "doing")}
            />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="text-sm font-semibold tracking-tight">Now</div>
              <div className="mt-2 text-sm text-white/60">Generate a plan to get a clear “Now” task.</div>
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold tracking-tight">Controls</div>
            <div className="mt-2 text-sm text-white/60">
              Use <span className="text-white/80">⌘K</span> to move, lock, replan, and mark progress instantly.
            </div>
          </div>
        </div>
      </div>

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={async (t) => {
          setLoading(true);
          try {
            await createTask(t);
            showToast("Task added ＋");
            await loadPlan();
          } catch {
            showToast("Add failed");
          } finally {
            setLoading(false);
          }
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/[0.10] px-4 py-2 text-sm text-white/85 shadow-[0_20px_70px_rgba(0,0,0,0.6)]">
          {toast}
        </div>
      ) : null}

      {loading ? (
        <div className="fixed top-4 right-4 z-[90] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-white/70">
          Working…
        </div>
      ) : null}
    </div>
  );
}
