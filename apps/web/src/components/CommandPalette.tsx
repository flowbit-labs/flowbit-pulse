"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Command = { id: string; title: string; subtitle?: string; icon?: string; run: () => void; };

export function CommandPalette({
  open, onClose, commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => (c.title + " " + (c.subtitle ?? "")).toLowerCase().includes(s));
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((v) => Math.min(v + 1, Math.max(0, filtered.length - 1))); }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((v) => Math.max(v - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[idx];
        if (cmd) { cmd.run(); onClose(); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, idx, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 p-4" onMouseDown={onClose}>
      <div
        className="mx-auto mt-24 w-full max-w-xl rounded-3xl border border-white/10 bg-[#0D0F16] shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 p-4">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <div className="mt-2 text-xs text-white/45">⌘K / CtrlK • Enter to run • Esc to close</div>
        </div>

        <div className="max-h-[380px] overflow-auto p-2">
          {filtered.length ? (
            filtered.map((c, i) => (
              <button
                key={c.id}
                onMouseEnter={() => setIdx(i)}
                onClick={() => { c.run(); onClose(); }}
                className={["w-full rounded-2xl px-3 py-3 text-left transition", i === idx ? "bg-white/10" : "hover:bg-white/[0.06]"].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-lg">{c.icon ?? "⚡"}</div>
                  <div>
                    <div className="text-sm font-medium text-white/90">{c.title}</div>
                    {c.subtitle ? <div className="mt-0.5 text-xs text-white/55">{c.subtitle}</div> : null}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-sm text-white/60">No commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
