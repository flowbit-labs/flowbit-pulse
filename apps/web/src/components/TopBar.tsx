"use client";
import React from "react";

export function TopBar({
  dateLabel, onAdd, onReplan, onFocus,
}: {
  dateLabel: string;
  onAdd: () => void;
  onReplan: () => void;
  onFocus: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-white/55">Flowbit Pulse</div>
        <div className="text-xl font-semibold tracking-tight">{dateLabel}</div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onFocus}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08] transition">
          🎯 Focus
        </button>

        <button onClick={onReplan}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08] transition">
          ⚡ Replan
        </button>

        <button onClick={onAdd}
          className="rounded-2xl border border-white/10 bg-white/[0.10] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.14] transition">
          ＋ Add Task
        </button>

        <div className="hidden sm:flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
          ⌘K
        </div>
      </div>
    </div>
  );
}
