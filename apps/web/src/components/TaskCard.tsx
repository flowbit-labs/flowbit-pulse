"use client";
import React from "react";
import type { Task } from "@/lib/types";

function priorityDot(p: number) {
  if (p === 1) return "bg-white/80";
  if (p === 2) return "bg-white/50";
  return "bg-white/25";
}

export function TaskCard({
  task, onDone, onBlocked, onStart,
}: {
  task: Task;
  onDone: () => void;
  onBlocked: () => void;
  onStart: () => void;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 hover:bg-white/[0.05] transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${priorityDot(task.priority)}`} />
            <div className="truncate text-sm font-medium text-white/90">{task.title}</div>
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
            <span>{task.estimate_min} min</span>
            <span>•</span>
            <span className="capitalize">{task.status}</span>
          </div>

          {task.notes ? (
            <div className="mt-2 line-clamp-2 text-xs text-white/55">{task.notes}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onStart}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/75 hover:bg-white/[0.08]"
            title="Start">▶</button>
          <button onClick={onDone}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/75 hover:bg-white/[0.08]"
            title="Done">✓</button>
          <button onClick={onBlocked}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/75 hover:bg-white/[0.08]"
            title="Blocked">⛔</button>
        </div>
      </div>
    </div>
  );
}
