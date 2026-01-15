"use client";
import React from "react";
import type { TimeBlock as TBlock, Task } from "@/lib/types";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DraggableTaskCard } from "./DraggableTaskCard";

export function TimeBlock({
  block, locked, onToggleLock, onTaskDone, onTaskBlocked, onTaskStart,
}: {
  block: TBlock;
  locked: boolean;
  onToggleLock: (blockId: string, nextLocked: boolean) => void;
  onTaskDone: (task: Task) => void;
  onTaskBlocked: (task: Task) => void;
  onTaskStart: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `block:${block.id}`,
    data: { blockId: block.id },
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{block.label}</div>
          <div className="mt-1 text-xs text-white/55">{block.start}–{block.end}</div>
        </div>

        <button
          onClick={() => onToggleLock(block.id, !locked)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 hover:bg-white/[0.08] transition"
        >
          {locked ? "🔒 Locked" : "🔓 Lock"}
        </button>
      </div>

      <div ref={setNodeRef}
        className={["mt-3 space-y-2 rounded-2xl", isOver ? "ring-1 ring-sky-500/30" : ""].join(" ")}
      >
        <SortableContext
          items={(block.tasks ?? []).map((t) => `task:${t.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {block.tasks?.length ? (
            block.tasks.map((t) => (
              <DraggableTaskCard
                key={t.id}
                task={t}
                blockId={block.id}
                onDone={() => onTaskDone(t)}
                onBlocked={() => onTaskBlocked(t)}
                onStart={() => onTaskStart(t)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs text-white/50">
              Drop a task here.
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
