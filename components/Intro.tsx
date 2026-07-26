"use client";

/**
 * The opening title card. The car itself streaks past in 3D underneath this —
 * see the intro block in Scene's Rig. Timings here mirror INTRO_MS.
 */
export function Intro() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      {/* speed lines, only while the car is actually in frame */}
      <div className="intro-speed absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
            style={{
              top: `${8 + i * 6.4}%`,
              left: "-40%",
              width: `${28 + ((i * 37) % 46)}%`,
              animationDelay: `${(i % 7) * 90}ms`,
            }}
          />
        ))}
      </div>

      <h1 className="intro-word font-display text-[13vw] leading-none text-white md:text-[9vw]">
        PORSCHE
      </h1>

      <span className="intro-sub absolute bottom-[18%] text-[10px] uppercase tracking-[0.5em] text-ruby">
        911 Turbo
      </span>
    </div>
  );
}
