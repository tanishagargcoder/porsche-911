"use client";

import { useEffect, useState } from "react";
import { SHOTS, type Shot } from "@/lib/shots";
import { rig } from "@/lib/rig";

const label = (s: Shot) =>
  s.hud?.label ?? s.title ?? (s.kind === "turn" ? "Rotation" : s.id);

const group = (s: Shot) => {
  if (s.kind === "turn" || s.kind === "title") return "Walkaround";
  if (s.kind === "detail") return "Detail";
  if (s.kind === "spec" || s.kind === "timeline") return "Reference";
  return "Finish";
};

const GROUPS = ["All", "Walkaround", "Detail", "Reference", "Finish"] as const;

/** small tags per card, the way a gallery labels what's in each item */
const tags = (s: Shot): string[] => {
  if (s.kind === "detail") return ["macro", "reticle"];
  if (s.kind === "turn") return ["360°"];
  if (s.kind === "spec") return ["data"];
  if (s.kind === "timeline") return ["history"];
  if (s.kind === "run") return ["motion"];
  if (s.stats) return ["wide", "stats"];
  return ["wide"];
};

/**
 * The whole timeline as a grid. Hovering a card flies the real camera to that
 * beat and thins the overlay so you watch it happen behind the grid — a live
 * preview rather than a recorded one.
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
  const [filter, setFilter] = useState<(typeof GROUPS)[number]>("All");
  const [hovered, setHovered] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<(string | null)[]>([]);

  /** ask the scene for card renders the first time the index is opened */
  useEffect(() => {
    if (!open) return;
    rig.wantThumbs = true;

    const poll = setInterval(() => {
      setThumbs([...rig.thumbs]);
      if (rig.thumbsDone) clearInterval(poll);
    }, 150);

    return () => clearInterval(poll);
  }, [open]);

  /** never leave the camera parked on a preview once the overlay is gone */
  useEffect(() => {
    if (!open) {
      setHovered(null);
      rig.preview = null;
    }
    return () => {
      rig.preview = null;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const counts = GROUPS.map((g) =>
    g === "All"
      ? SHOTS.length
      : SHOTS.filter((s) => group(s) === g).length,
  );

  const peeking = hovered !== null;

  return (
    <div
      style={{ opacity: open ? 1 : 0 }}
      className={`fixed inset-0 z-[55] overflow-y-auto transition-opacity duration-300 ${
        open ? "" : "pointer-events-none"
      }`}
    >
      {/* thins right out while a card is hovered so the car reads through */}
      <div
        className={`pointer-events-none fixed inset-0 transition-all duration-500 ${
          peeking ? "bg-ink/25 backdrop-blur-0" : "bg-ink/92 backdrop-blur-md"
        }`}
      />

      <div className="relative mx-auto min-h-full w-full max-w-5xl px-5 py-16 md:px-10">
        <div className="mb-8 flex items-baseline justify-between border-b border-white/10 pb-5">
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

        {/* filters, with counts */}
        <div className="mb-6 flex flex-wrap gap-2">
          {GROUPS.map((g, i) => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition-colors ${
                filter === g
                  ? "border-ruby bg-ruby/15 text-white"
                  : "border-white/15 text-white/45 hover:border-white/40 hover:text-white"
              }`}
            >
              {g}
              <span className="tabular-nums text-white/30">{counts[i]}</span>
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-card bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {SHOTS.map((shot, i) => {
            if (filter !== "All" && group(shot) !== filter) return null;

            return (
              <li key={shot.id}>
                <button
                  onClick={() => {
                    rig.preview = null;
                    onJump(i);
                    onClose();
                  }}
                  onMouseEnter={() => {
                    setHovered(i);
                    rig.preview = i;
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    rig.preview = null;
                  }}
                  onFocus={() => {
                    setHovered(i);
                    rig.preview = i;
                  }}
                  onBlur={() => {
                    setHovered(null);
                    rig.preview = null;
                  }}
                  style={{
                    transitionDelay: open ? `${Math.min(i, 12) * 25}ms` : "0ms",
                  }}
                  className={`group flex h-full w-full flex-col gap-4 p-4 text-left transition-all duration-300 ${
                    open
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0"
                  } ${
                    hovered === i
                      ? "bg-ruby/15"
                      : peeking
                        ? "bg-ink/40"
                        : i === active
                          ? "bg-white/5"
                          : "bg-ink"
                  }`}
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

                  {/* the real shot, rendered from the scene when the index opened */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[calc(var(--radius-card)-4px)] bg-black/40">
                    {thumbs[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbs[i]!}
                        alt=""
                        className={`h-full w-full object-cover transition-transform duration-500 ${
                          hovered === i ? "scale-105" : "scale-100"
                        }`}
                      />
                    ) : (
                      // pulses while renders are queued, settles if they never come
                      <div
                        className={`h-full w-full bg-white/[0.04] ${
                          rig.thumbsDone ? "" : "animate-pulse"
                        }`}
                      />
                    )}
                  </div>

                  <div>
                    <div className="font-display text-lg leading-tight text-white">
                      {label(shot)}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags(shot).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-white/40"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div
                      className={`mt-3 h-px bg-ruby transition-all duration-300 ${
                        hovered === i ? "w-14" : "w-6"
                      }`}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">
          Hover to preview · click to jump
        </p>
      </div>
    </div>
  );
}
