"use client";

import { useEffect, useRef, useState } from "react";
import { SHOTS, PAINTS, type Paint, type Shot } from "@/lib/shots";
import { tick } from "@/lib/audio";
import { CountUp, Scramble } from "./Scramble";

/** true once the section is more than half on screen */
function useOnScreen(initial = false) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setOn(e.intersectionRatio > 0.55),
      { threshold: [0, 0.55, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, on] as const;
}

const shown = (on: boolean) =>
  on ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-[2px]";

/** the macro shots: a targeting panel with a leader line into the reticle */
function DetailPanel({ shot }: { shot: Shot }) {
  const [ref, on] = useOnScreen();
  const hud = shot.hud!;
  const right = hud.anchor === "right";

  return (
    <section
      ref={ref}
      className="relative flex h-screen w-full items-center px-6 md:px-16"
    >
      <div
        className={`w-full max-w-xs transition-all duration-700 ease-out ${shown(on)} ${
          right ? "ml-auto" : ""
        }`}
      >
        <div
          className={`relative border-y border-white/15 bg-black/30 px-5 py-4 backdrop-blur-sm ${
            right ? "text-right" : ""
          }`}
        >
          <div className="font-mono text-[10px] tracking-[0.3em] text-ruby">
            <Scramble text={hud.code} run={on} />
          </div>
          <div className="mt-1 font-display text-xl text-white">
            {hud.label}
          </div>
          <dl className="mt-4 space-y-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/45">
            {hud.specs.map(([k, v]) => (
              <div
                key={k}
                className={`flex gap-3 ${right ? "justify-end" : ""}`}
              >
                <dt className="text-white/30">{k}</dt>
                <dd className="text-white/70">
                  <Scramble text={v} run={on} />
                </dd>
              </div>
            ))}
          </dl>

          {/* leader line pointing at the reticle in the middle of the screen */}
          <span
            className={`absolute top-1/2 hidden h-px w-[6vw] bg-gradient-to-r from-ruby/70 to-transparent md:block ${
              right ? "right-full rotate-180" : "left-full"
            }`}
          />
        </div>
      </div>
    </section>
  );
}

/** the wide copy beats */
function CopyBlock({
  shot,
  index,
  paint,
}: {
  shot: Shot;
  index: number;
  paint: Paint;
}) {
  const [ref, on] = useOnScreen(index === 0);

  const place =
    shot.align === "center"
      ? "items-center text-center mx-auto"
      : shot.align === "right"
        ? "items-end text-right ml-auto"
        : "items-start text-left";

  // the copy follows the paint: the hero is the colour's name, and the finish
  // section is written per colour
  const isHero = shot.kind === "title";
  const isFinish = shot.id === "paint";

  const title = isHero ? paint.name : isFinish ? paint.title : shot.title;
  const body = isHero ? paint.tagline : isFinish ? paint.body : shot.body;
  const big = shot.kind === "title" || shot.kind === "final";

  return (
    <section
      ref={ref}
      className="relative flex h-screen w-full items-center px-6 md:px-16"
    >
      <div
        className={`flex w-full max-w-xl flex-col gap-4 transition-all duration-700 ease-out ${place} ${shown(on)}`}
      >
        {shot.kicker && (
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-ruby">
            <Scramble text={shot.kicker} run={on} />
          </span>
        )}
        {title && (
          <h2
            className={`font-display uppercase leading-[0.9] tracking-tight text-white ${
              big ? "text-6xl md:text-[8.5rem]" : "text-4xl md:text-6xl"
            }`}
          >
            {title}
          </h2>
        )}
        {body && (
          <p
            key={body}
            className="max-w-md text-sm leading-relaxed text-white/55 md:text-base"
          >
            {body}
          </p>
        )}

        {shot.stats && (
          <dl
            className={`mt-4 flex gap-8 font-mono ${
              shot.align === "right" ? "justify-end" : ""
            }`}
          >
            {shot.stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-3xl tabular-nums text-white md:text-4xl">
                  <CountUp value={s.value} run={on} decimals={s.decimals} />
                  {s.suffix && (
                    <span className="ml-1 text-sm text-ruby">{s.suffix}</span>
                  )}
                </dd>
                <dt className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/35">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/** the rotation act runs almost bare — just a readout of the angle */
function TurnBlock({ shot, index }: { shot: Shot; index: number }) {
  const [ref, on] = useOnScreen();
  const deg = Math.round((-shot.yaw * 180) / Math.PI);

  return (
    <section
      ref={ref}
      className="relative flex h-screen w-full items-end justify-center pb-28"
    >
      <div
        className={`flex flex-col items-center gap-2 transition-all duration-500 ${shown(on)}`}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
          Rotation
        </span>
        <span className="font-display text-5xl tabular-nums text-white/85">
          <CountUp value={deg} run={on} duration={700} />°
        </span>
        <span className="font-mono text-[10px] tracking-[0.3em] text-ruby">
          <Scramble text={index === 4 ? "FULL TURN" : "TURNTABLE"} run={on} />
        </span>
      </div>
    </section>
  );
}

export function Overlay({ paint }: { paint: Paint }) {
  return (
    <div className="relative z-10">
      {SHOTS.map((shot, i) =>
        shot.kind === "detail" ? (
          <DetailPanel key={shot.id} shot={shot} />
        ) : shot.kind === "turn" ? (
          <TurnBlock key={shot.id} shot={shot} index={i} />
        ) : (
          <CopyBlock key={shot.id} shot={shot} index={i} paint={paint} />
        ),
      )}

      <footer className="relative flex flex-col items-center gap-3 px-6 pb-28 pt-10 text-center font-mono text-[10px] leading-relaxed text-white/30">
        <p>
          3D model:{" "}
          <a
            className="text-white/60 underline underline-offset-4"
            href="https://sketchfab.com/3d-models/porsche-911-turbo-996-8b9c0f74d8f144158b4c3ada55d1196e"
            target="_blank"
            rel="noreferrer"
          >
            &quot;Porsche 911 Turbo (996)&quot;
          </a>{" "}
          by Alex.Ka., licensed{" "}
          <a
            className="text-white/60 underline underline-offset-4"
            href="http://creativecommons.org/licenses/by-nc/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-NC 4.0
          </a>
          .
        </p>
        <p>Fan project. Not affiliated with Dr. Ing. h.c. F. Porsche AG.</p>
      </footer>
    </div>
  );
}

/** lives outside the scrolling copy so it stays reachable in photo mode */
export function PaintPicker({
  paint,
  setPaint,
}: {
  paint: string;
  setPaint: (hex: string) => void;
}) {
  return (
    <div className="fixed bottom-7 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md">
      {PAINTS.map((p) => (
        <button
          key={p.hex}
          onClick={() => {
            setPaint(p.hex);
            tick();
          }}
          title={p.name}
          aria-label={p.name}
          aria-pressed={paint === p.hex}
          className={`h-5 w-5 rounded-full transition-transform duration-200 hover:scale-125 ${
            paint === p.hex
              ? "ring-2 ring-white/80 ring-offset-2 ring-offset-black"
              : "ring-1 ring-white/20"
          }`}
          style={{ background: p.hex }}
        />
      ))}
    </div>
  );
}
