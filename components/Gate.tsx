"use client";

/**
 * Only shown when the browser refuses to open audio without a gesture. One
 * click starts the engine and the fly-past together.
 */
export function Gate({
  onEnter,
  onSkip,
}: {
  onEnter: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink/95 backdrop-blur-sm">
      <span className="font-display text-[13vw] leading-none tracking-[0.22em] text-white md:text-[7vw]">
        PORSCHE
      </span>

      <button
        onClick={onEnter}
        className="group mt-10 flex items-center gap-3 border border-ruby/60 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.4em] text-white transition-colors hover:bg-ruby/15"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ruby transition-transform group-hover:scale-150" />
        Start engine
      </button>

      <button
        onClick={onSkip}
        className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35 underline underline-offset-4 transition-colors hover:text-white/70"
      >
        Continue without sound
      </button>
    </div>
  );
}
