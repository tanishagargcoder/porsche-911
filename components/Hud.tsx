"use client";

import { useEffect, useRef, useState } from "react";
import { SHOTS, PAINTS } from "@/lib/shots";
import { clamp, scroll } from "@/lib/scroll";
import { rig } from "@/lib/rig";
import { flutter, setEnabled, rev } from "@/lib/audio";
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
}: {
  paint: string;
  photo: boolean;
  setPhoto: (on: boolean) => void;
  sound: boolean;
  setSound: (on: boolean) => void;
}) {
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState(0);
  const [speed, setSpeed] = useState(0);
  const frame = useRef(0);
  const lastBeat = useRef(0);

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
      setActive((prev) => (beat === prev ? prev : beat));

      // blow-off valve every time a new macro shot locks on
      if (beat !== lastBeat.current) {
        if (SHOTS[beat]?.kind === "detail") flutter();
        lastBeat.current = beat;
      }

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

      {/* top left — who and what */}
      <div className="pointer-events-none fixed left-8 top-7 z-20 font-mono text-[10px] uppercase leading-relaxed tracking-[0.25em] text-white/45">
        <div className="text-white/80">PORSCHE</div>
        <div>996.1 Turbo // 2000</div>
      </div>

      {/* top right — live paint readout, scrambles in on every change */}
      <div className="pointer-events-none fixed right-8 top-7 z-20 text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.25em] text-white/45">
        <div className="flex items-center justify-end gap-2">
          <span
            className="h-2 w-2 rounded-full transition-colors duration-500"
            style={{ background: swatch.hex }}
          />
          <Scramble text={swatch.name} className="text-white/80" />
        </div>
        <div>
          Paint code {swatch.code} · {swatch.hex.toUpperCase()}
        </div>
      </div>

      {/* right edge — one tick per beat */}
      <div className="pointer-events-none fixed right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex">
        {SHOTS.map((s, i) => (
          <span
            key={s.id}
            className={`block h-px transition-all duration-300 ${
              i === active ? "w-8 bg-ruby" : "w-3 bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* bottom left — progress and the chevrons that keep pointing down */}
      <div className="pointer-events-none fixed bottom-8 left-8 z-20 flex items-end gap-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
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
      <div className="fixed bottom-8 right-8 z-30 flex flex-col items-end gap-3 font-mono text-[10px] uppercase tracking-[0.25em]">
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
