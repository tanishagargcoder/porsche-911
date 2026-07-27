"use client";

import type { Paint } from "@/lib/shots";

const META: [string, string][] = [
  ["420", "hp"],
  ["4.2", "s"],
  ["305", "km/h"],
  ["AWD", ""],
];

/**
 * The real first screen. Browsers won't open audio without a gesture, so this
 * is what most people meet before anything moves — it gets the same treatment
 * as the hero rather than being a bare permission prompt. The car sits parked
 * behind it, so the glass is thin on purpose.
 */
export function Gate({
  paint,
  onEnter,
  onSkip,
}: {
  paint: Paint;
  onEnter: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6">
      {/* dim, not opaque — the car should still be readable underneath */}
      <div className="absolute inset-0 bg-ink/72" />
      <div className="vignette absolute inset-0" />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        <div className="gate-in flex items-center gap-4" style={{ animationDelay: "80ms" }}>
          <span className="h-px w-8 bg-ruby" />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-ruby">
            996.1 Turbo · 2000
          </span>
          <span className="h-px w-8 bg-ruby" />
        </div>

        <h1 className="mt-7 font-display uppercase leading-[0.84] tracking-[-0.02em] text-white">
          <span
            className="gate-in block text-[21vw] md:text-[8rem]"
            style={{ animationDelay: "160ms" }}
          >
            911
          </span>
          <span
            className="gate-in block text-[21vw] md:text-[8rem]"
            style={{ animationDelay: "240ms" }}
          >
            Turbo
          </span>
        </h1>

        <span
          className="gate-in mt-4 font-mono text-[11px] uppercase tracking-[0.45em] text-white/50"
          style={{ animationDelay: "320ms" }}
        >
          {paint.name}
        </span>

        {/* the numbers, hairline top and bottom */}
        <dl
          className="gate-in mt-8 flex w-full items-center justify-center gap-5 border-y border-white/10 py-4"
          style={{ animationDelay: "400ms" }}
        >
          {META.map(([value, label], i) => (
            <div
              key={value}
              className={`flex items-baseline gap-1.5 ${
                i > 0 ? "border-l border-white/10 pl-5" : ""
              }`}
            >
              <dd className="font-display text-lg tabular-nums text-white md:text-xl">
                {value}
              </dd>
              {label && (
                <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  {label}
                </dt>
              )}
            </div>
          ))}
        </dl>

        {/* ignition: a ring that keeps pulsing until it's pressed */}
        <button
          onClick={onEnter}
          className="gate-in group relative mt-10 flex h-32 w-32 items-center justify-center rounded-full"
          style={{ animationDelay: "480ms" }}
        >
          <span className="gate-ring absolute inset-0 rounded-full border border-ruby/60" />
          <span className="gate-ring absolute inset-0 rounded-full border border-ruby/40 [animation-delay:900ms]" />
          <span className="absolute inset-3 rounded-full border border-white/15 bg-black/50 backdrop-blur-sm transition-colors duration-300 group-hover:border-ruby group-hover:bg-ruby/15" />
          <span className="relative flex flex-col items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ruby transition-transform duration-300 group-hover:scale-150" />
            <span className="font-mono text-[9px] uppercase leading-tight tracking-[0.25em] text-white">
              Fire
              <br />
              it up
            </span>
          </span>
        </button>

        <span
          className="gate-in mt-6 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30"
          style={{ animationDelay: "520ms" }}
        >
          Ignition on the left, as always
        </span>

        <button
          onClick={onSkip}
          className="gate-in mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35 underline underline-offset-4 transition-colors hover:text-white/70"
          style={{ animationDelay: "560ms" }}
        >
          Continue without sound
        </button>
      </div>

      {/* the ringer switch mutes Web Audio on iPhones and nothing in the page
          can override it, so say so rather than let it look broken */}
      <span className="absolute bottom-7 px-6 text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.3em] text-white/20">
        Headphones recommended · iPhone: ringer switch on
      </span>
    </div>
  );
}
