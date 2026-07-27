"use client";

import { SHOTS, type Shot } from "@/lib/shots";

const label = (s: Shot) =>
  s.hud?.label ?? s.title ?? (s.kind === "turn" ? "Rotation" : s.id);

const group = (s: Shot) => {
  if (s.kind === "turn" || s.kind === "title") return "Walkaround";
  if (s.kind === "detail") return "Detail";
  if (s.kind === "spec" || s.kind === "timeline") return "Reference";
  return "Finish";
};

/**
 * The whole timeline as a grid — the fastest way to reach any beat, and the
 * only sane chapter navigation on a phone.
 */
export function Chapters({
  open,
  onClose,
  onJump,
  active,
}: {
  open: boolean;
  onClose: () => void;
  onJump: (index: number) => void;
  active: number;
}) {
  return (
    <div
      style={{ opacity: open ? 1 : 0 }}
      className={`fixed inset-0 z-[55] overflow-y-auto bg-ink/95 backdrop-blur-md transition-opacity duration-300 ${
        open ? "" : "pointer-events-none"
      }`}
    >
      <div className="mx-auto min-h-full w-full max-w-5xl px-5 py-20 md:px-10">
        <div className="mb-10 flex items-baseline justify-between border-b border-white/10 pb-5">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-ruby">
              Index
            </span>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-tight text-white md:text-4xl">
              {SHOTS.length} chapters
            </h2>
          </div>

          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45 transition-colors hover:text-white"
          >
            Close
          </button>
        </div>

        <ul className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {SHOTS.map((shot, i) => (
            <li key={shot.id}>
              <button
                onClick={() => {
                  onJump(i);
                  onClose();
                }}
                style={{
                  transitionDelay: open ? `${Math.min(i, 12) * 25}ms` : "0ms",
                }}
                className={`group flex h-full w-full flex-col justify-between gap-8 bg-ink p-5 text-left transition-all duration-300 hover:bg-white/5 ${
                  open
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
                } ${i === active ? "bg-white/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`font-mono text-[10px] tabular-nums tracking-[0.25em] ${
                      i === active ? "text-ruby" : "text-white/30"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/25">
                    {group(shot)}
                  </span>
                </div>

                <div>
                  <div className="font-display text-lg leading-tight text-white">
                    {label(shot)}
                  </div>
                  <div className="mt-2 h-px w-6 bg-ruby transition-all duration-300 group-hover:w-14" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
