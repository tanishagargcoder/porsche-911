"use client";

import { useEffect, useRef, useState } from "react";
import { SHOTS, PAINTS } from "@/lib/shots";
import { clamp, scroll } from "@/lib/scroll";
import { rig } from "@/lib/rig";
import { prime, setEnabled, rev } from "@/lib/audio";
import { Scramble } from "./Scramble";

/** thin ruby corner brackets, the frame the whole page sits inside */
function Corners() {
  const base =
    "pointer-events-none fixed h-8 w-8 border-ruby/50 mix-blend-screen z-20";
  return (
    <>
      <span className={`${base} left-4 top-4 border-l border-t`} />
      <span className={`${base} right-4 top-4 border-r border-t`} />
      <span className={`${base} bottom-4 left-4 border-b border-l`} />
      <span className={`${base} bottom-4 right-4 border-b border-r`} />
    </>
  );
}

/** centre reticle — only armed during the macro shots */
function Reticle({ armed }: { armed: boolean }) {
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
        armed ? "scale-100 opacity-100" : "scale-125 opacity-0"
      }`}
    >
      <div className="relative h-40 w-40 md:h-56 md:w-56">
        {[
          "left-0 top-0 border-l-2 border-t-2",
          "right-0 top-0 border-r-2 border-t-2",
          "bottom-0 left-0 border-b-2 border-l-2",
          "bottom-0 right-0 border-b-2 border-r-2",
        ].map((c) => (
          <span key={c} className={`absolute h-5 w-5 border-ruby ${c}`} />
        ))}
        <span className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-ruby/70" />
        <span className="absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-ruby/70" />
      </div>
    </div>
  );
}

export function Hud({
  paint,
  photo,
  setPhoto,
  sound,
  setSound,
  onJump,
  film,
  toggleFilm,
  buildOpen,
}: {
  paint: string;
  photo: boolean;
  setPhoto: (on: boolean) => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  onJump: (index: number) => void;
  film: boolean;
  toggleFilm: () => void;
  /** the build panel expands upwards over this corner, so get out of its way */
  buildOpen: boolean;
}) {
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [wipe, setWipe] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const tick = () => {
      const p = clamp(scroll.progress);

      setPct((prev) => {
        const next = Math.round(p * 100);
        return next === prev ? prev : next;
      });

      setSpeed((prev) => {
        const next = Math.round(rig.speed);
        return next === prev ? prev : next;
      });

      const beat = Math.round(p * (SHOTS.length - 1));
      setActive((prev) => {
        if (beat === prev) return prev;
        // one wipe per beat change, keyed so the animation restarts
        setWipe((w) => w + 1);
        return beat;
      });

      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const swatch = PAINTS.find((p) => p.hex === paint) ?? PAINTS[0];
  const shot = SHOTS[active];

  /** photo mode: pull the current frame straight off the canvas */
  const saveShot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `911-${swatch.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const toggleSound = () => {
    const next = !sound;
    // prime first and without awaiting, or iOS never opens the device
    if (next) prime();
    setSound(next);
    setEnabled(next);
    if (next) rev();
  };

  return (
    <>
      <Corners />
      <Reticle armed={shot.kind === "detail" && !photo} />

      {/* scanlines + faint grid, the whole hacker-console texture */}
      <div className="scanlines pointer-events-none fixed inset-0 z-[6]" />

      {/* a ruby line wipes across whenever the timeline lands on a new beat */}
      <span
        key={wipe}
        className="beat-wipe pointer-events-none fixed left-0 top-1/2 z-20 h-px w-full bg-gradient-to-r from-transparent via-ruby to-transparent"
      />

      {/* speed streaks while the car is actually pulling away */}
      {speed > 40 && (
        <div className="run-lines pointer-events-none fixed inset-0 z-20">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
              style={{
                top: `${10 + i * 8.5}%`,
                left: "-40%",
                width: `${26 + ((i * 41) % 44)}%`,
                animationDelay: `${(i % 5) * 70}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* the paint and build readouts change under the reader's feet, so
          announce them once rather than on every scramble frame */}
      <p aria-live="polite" className="sr-only">
        {swatch.name}, paint code {swatch.code}
      </p>

      {/* the masthead carries the wordmark and paint readout; down here we only
          keep the mood word, which belongs with the rest of the console */}
      <div className="pointer-events-none fixed left-5 top-20 z-20 font-mono text-[10px] uppercase tracking-[0.3em] text-ruby/70 md:left-8">
        <Scramble text={swatch.mood} />
      </div>

      {/* right edge — one tick per beat, click to jump */}
      <nav className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex">
        {SHOTS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onJump(i)}
            aria-label={s.hud?.label ?? s.title ?? s.kind}
            aria-current={i === active}
            className="group flex items-center gap-2 py-1 pl-6"
          >
            <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.25em] text-white/0 transition-colors duration-200 group-hover:text-white/60">
              {s.hud?.label ?? s.title ?? "Rotation"}
            </span>
            <span
              className={`block h-px transition-all duration-300 group-hover:w-8 group-hover:bg-white/70 ${
                i === active ? "w-8 bg-ruby" : "w-3 bg-white/25"
              }`}
            />
          </button>
        ))}
      </nav>

      {/* bottom left — progress and the chevrons that keep pointing down.
          Sits above the configurator on phones so the two never collide. */}
      <div
        className={`pointer-events-none fixed bottom-32 left-5 z-20 flex items-end gap-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45 transition-opacity duration-300 md:bottom-8 md:left-8 ${
          buildOpen ? "opacity-0 md:opacity-100" : "opacity-100"
        }`}
      >
        <div>
          <div className="mb-2 text-white/80 tabular-nums">
            {String(pct).padStart(3, "0")}%
          </div>
          <div className="h-px w-28 bg-white/15">
            <div
              className="h-full bg-ruby transition-[width] duration-150 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div
          className={`flex flex-col items-center transition-opacity duration-500 ${
            pct > 96 ? "opacity-0" : "opacity-100"
          }`}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="chev -mt-1 text-ruby/80"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              ▾
            </span>
          ))}
        </div>
      </div>

      {/* speedo — only alive during the closing run */}
      <div
        className={`pointer-events-none fixed left-1/2 top-[38%] z-20 -translate-x-1/2 text-center transition-opacity duration-300 ${
          speed > 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="font-display text-7xl tabular-nums leading-none text-white md:text-8xl">
          {speed}
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.5em] text-ruby">
          km/h
        </div>
      </div>

      {/* bottom right — sound, and photo mode once you reach the end */}
      <div
        className={`fixed bottom-32 right-5 z-30 flex flex-col items-end gap-3 font-mono text-[10px] uppercase tracking-[0.25em] transition-opacity duration-300 md:bottom-8 md:right-8 ${
          buildOpen
            ? "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100"
            : "opacity-100"
        }`}
      >
        <button
          onClick={toggleFilm}
          aria-pressed={film}
          className={`pointer-events-auto flex items-center gap-2 transition-colors ${
            film ? "text-white" : "text-white/45 hover:text-white"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 ${
              film ? "animate-pulse rounded-none bg-ruby" : "rounded-full bg-white/25"
            }`}
          />
          {film ? "Stop film" : "Play film"}
        </button>

        <button
          onClick={toggleSound}
          className="pointer-events-auto flex items-center gap-2 text-white/45 transition-colors hover:text-white"
          aria-pressed={sound}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              sound ? "bg-ruby" : "bg-white/25"
            }`}
          />
          Sound {sound ? "on" : "off"}
        </button>

        {photo && (
          <button
            onClick={saveShot}
            className="pointer-events-auto border border-white/20 px-3 py-2 text-white/50 transition-colors hover:border-white/50 hover:text-white"
          >
            Save shot
          </button>
        )}

        <button
          onClick={() => setPhoto(!photo)}
          className={`pointer-events-auto border px-3 py-2 transition-all duration-300 ${
            photo
              ? "border-ruby bg-ruby/15 text-white"
              : "border-white/20 text-white/50 hover:border-white/50 hover:text-white"
          } ${pct > 88 || photo ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {photo ? "Exit photo mode" : "Photo mode"}
        </button>
      </div>

      {/* photo mode instructions */}
      <div
        className={`pointer-events-none fixed bottom-24 left-1/2 z-30 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45 transition-opacity duration-500 ${
          photo ? "opacity-100" : "opacity-0"
        }`}
      >
        Drag to orbit · scroll to zoom
      </div>
    </>
  );
}
