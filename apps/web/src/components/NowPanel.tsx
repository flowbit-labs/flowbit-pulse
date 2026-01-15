"use client";
import React from "react";
import type { TodayPlan, Task } from "@/lib/types";

export function NowPanel({
  plan, onDone, onBlocked, onStart,
}: {
  plan: TodayPlan;
  onDone: (t: Task) => void;
  onBlocked: (t: Task) => void;
  onStart: (t: Task) => void;
}) {
  const t = plan.now?.task;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-sm font-semibold tracking-tight">Now</div>
      <div className="mt-1 text-xs text-white/55">One clear next step. No juggling.</div>

      {t ? (
        <>
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium text-white/90">{t.title}</div>
            <div className="mt-1 text-xs text-white/55">{t.estimate_min} min • P{t.priority}</div>

            {plan.now?.reason ? (
              <div className="mt-3 text-sm text-white/70">{plan.now.reason}</div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => onStart(t)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85 hover:bg-white/[0.10] transition">
                ▶ Start
              </button>
              <button onClick={() => onDone(t)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85 hover:bg-white/[0.10] transition">
                ✓ Done
              </button>
              <button onClick={() => onBlocked(t)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85 hover:bg-white/[0.10] transition">
                ⛔ Blocked
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-white/55">
            Tip: hit <span className="text-white/75">⌘K</span> to move “Now” instantly.
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
          Add tasks, then generate a plan.
        </div>
      )}
    </div>
  );
}
