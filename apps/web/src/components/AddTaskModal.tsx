"use client";
import React, { useState } from "react";

export function AddTaskModal({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (task: { title: string; notes: string; priority: number; estimate_min: number }) => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState(2);
  const [estimate, setEstimate] = useState(30);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 p-4" onMouseDown={onClose}>
      <div
        className="mx-auto mt-24 w-full max-w-lg rounded-3xl border border-white/10 bg-[#0D0F16] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">Add task</div>
            <div className="mt-1 text-xs text-white/55">Keep it specific. One outcome.</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75 hover:bg-white/[0.08]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-white/55">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Draft proposal outline"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div>
            <label className="text-xs text-white/55">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context, links, constraints"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/55">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option value={1}>P1 (High)</option>
                <option value={2}>P2 (Medium)</option>
                <option value={3}>P3 (Low)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/55">Estimate (min)</label>
              <input
                type="number"
                value={estimate}
                onChange={(e) => setEstimate(parseInt(e.target.value, 10))}
                min={5}
                max={1440}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              onCreate({ title: title.trim(), notes: notes.trim(), priority, estimate_min: estimate });
              setTitle("");
              setNotes("");
              setPriority(2);
              setEstimate(30);
              onClose();
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.12] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.16]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
