"use client";

import { SHOTS, type Paint } from "@/lib/shots";

/** the beats worth putting in a nav, by id */
const NAV: { id: string; label: string }[] = [
  { id: "bumper", label: "Detail" },
  { id: "cabin", label: "Cabin" },
  { id: "spec", label: "Specs" },
  { id: "timeline", label: "History" },
];

/**
 * Fixed masthead: wordmark, chapter links, and the live paint readout. Sits on a
 * hairline so the page reads as a document rather than a floating canvas.
 */
export function TopBar({
  paint,
  onJump,
}: {
  paint: Paint;
  onJump: (index: number) => void;
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="pointer-events-auto flex items-center justify-between gap-6 border-b border-white/10 bg-gradient-to-b from-black/70 to-transparent px-5 py-4 backdrop-blur-[2px] md:px-8">
        <div className="flex shrink-0 items-baseline gap-3">
          <span className="font-display text-xs tracking-[0.3em] text-white sm:text-sm sm:tracking-[0.42em]">
            PORSCHE
          </span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.3em] text-white/35 sm:inline">
            996.1 Turbo
          </span>
        </div>

        {/* phones get the same chapters, just scrolled sideways rather than dropped */}
        <nav className="flex flex-1 items-center gap-5 overflow-x-auto px-2 [scrollbar-width:none] md:flex-none md:justify-center md:gap-7 md:overflow-visible md:px-0">
          {NAV.map((item) => {
            const index = SHOTS.findIndex((s) => s.id === item.id);
            if (index < 0) return null;
            return (
              <button
                key={item.id}
                onClick={() => onJump(index)}
                className="group relative shrink-0 whitespace-nowrap py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45 transition-colors hover:text-white"
              >
                {item.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-ruby transition-all duration-300 group-hover:w-full" />
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full transition-colors duration-500"
            style={{ background: paint.hex }}
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-white/70 sm:inline">
            {paint.name}
          </span>
          <span className="hidden font-mono text-[9px] tracking-[0.25em] text-white/30 sm:inline">
            {paint.code}
          </span>
        </div>
      </div>
    </header>
  );
}
