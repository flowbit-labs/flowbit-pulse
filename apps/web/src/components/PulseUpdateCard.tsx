"use client";
import React from "react";

export function PulseUpdateCard({
  changes, explanation, onClose,
}: {
  changes: string[];
  explanation?: string | null;
  onClose: () => void;
}) {
  if (!changes?.length && !explanation) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Pulse updated your day ⚡</div>
          <div className="mt-1 text-xs text-white/55">Quick summary so it never feels random.</div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10 transition"
        >
          Dismiss
        </button>
      </div>

      {changes?.length ? (
        <div className="mt-3 space-y-2">
          {changes.slice(0, 6).map((c, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
              {c}
            </div>
          ))}
        </div>
      ) : null}

      {explanation ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
          {explanation}
        </div>
      ) : null}
    </div>
  );
}
