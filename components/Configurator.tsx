"use client";

import { useState } from "react";
import { PAINTS, type Paint } from "@/lib/shots";
import { CALIPERS, WHEELS, type Caliper, type Wheel } from "@/lib/config";
import { tick } from "@/lib/audio";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
        {label}
      </span>
      <div className="flex items-center gap-2.5">{children}</div>
    </div>
  );
}

function Dot({
  hex,
  active,
  label,
  onClick,
}: {
  hex: string;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => {
        onClick();
        tick();
      }}
      title={label}
      aria-label={label}
      aria-pressed={active}
      // the swatch stays 20px; the button around it is a finger-sized target
      className="group flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        className={`h-5 w-5 rounded-full transition-transform duration-200 group-hover:scale-125 ${
          active
            ? "ring-2 ring-white/80 ring-offset-2 ring-offset-black"
            : "ring-1 ring-white/20"
        }`}
        style={{ background: hex }}
      />
    </button>
  );
}

/**
 * The bottom bar: paint always reachable, everything else a click away, plus
 * the build summary and a link that carries the whole spec.
 */
export function Configurator({
  paint,
  setPaint,
  wheel,
  setWheel,
  caliper,
  setCaliper,
  night,
  setNight,
  open,
  setOpen,
}: {
  paint: Paint;
  setPaint: (hex: string) => void;
  wheel: Wheel;
  setWheel: (slug: string) => void;
  caliper: Caliper;
  setCaliper: (slug: string) => void;
  night: boolean;
  setNight: (on: boolean) => void;
  /** controlled, so the hero's "Build yours" can open it too */
  open: boolean;
  setOpen: (on: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard is blocked in some contexts; the URL bar already has the spec
      setCopied(false);
    }
  };

  return (
    <>
      {/* a tap-away layer, deliberately transparent: the whole point of the
          panel is watching the car change behind it */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-20 md:hidden ${
          open ? "" : "pointer-events-none"
        }`}
      />

      <div
        id="build"
        className="fixed bottom-5 left-1/2 z-30 w-[min(92vw,26rem)] -translate-x-1/2 md:bottom-7"
      >
      {/* the panel */}
      <div
        // height and opacity are inline on purpose: this is the one piece of UI
        // that must open, and an arbitrary Tailwind class is one stale CSS build
        // away from silently staying shut
        style={{
          maxHeight: open ? "30rem" : 0,
          opacity: open ? 1 : 0,
        }}
        className={`mb-3 origin-bottom overflow-hidden rounded-2xl border bg-black/70 backdrop-blur-md transition-all duration-300 ${
          open
            ? "border-white/10"
            : "pointer-events-none border-transparent"
        }`}
      >
        <div className="divide-y divide-white/10 px-5 py-2">
          <Row label="Wheels">
            {WHEELS.map((w) => (
              <Dot
                key={w.slug}
                hex={w.hex}
                label={w.name}
                active={w.slug === wheel.slug}
                onClick={() => setWheel(w.slug)}
              />
            ))}
          </Row>

          <Row label="Calipers">
            {CALIPERS.map((c) => (
              <Dot
                key={c.slug}
                hex={c.hex}
                label={c.name}
                active={c.slug === caliper.slug}
                onClick={() => setCaliper(c.slug)}
              />
            ))}
          </Row>

          <Row label="Showroom">
            <button
              onClick={() => {
                setNight(!night);
                tick();
              }}
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-white"
              aria-pressed={night}
            >
              {night ? "Night" : "Day"}
            </button>
          </Row>

          {/* your build */}
          <div className="py-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ruby">
              Your build
            </div>
            <dl className="space-y-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">
              {[
                ["Model", "911 Turbo · 996"],
                ["Paint", `${paint.name} · ${paint.code}`],
                ["Wheels", wheel.name],
                ["Calipers", caliper.name],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-white/30">{k}</dt>
                  <dd className="text-right text-white/75">{v}</dd>
                </div>
              ))}
            </dl>

            <button
              onClick={copyLink}
              className="mt-4 w-full border border-white/20 py-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60 transition-colors hover:border-ruby hover:text-white"
            >
              {copied ? "Link copied" : "Copy build link"}
            </button>
          </div>
        </div>
      </div>

      {/* the bar */}
      <div className="flex items-center justify-between gap-2 rounded-full border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-md md:px-3">
        <div className="flex items-center">
          {PAINTS.map((p) => (
            <Dot
              key={p.hex}
              hex={p.hex}
              label={p.name}
              active={p.hex === paint.hex}
              onClick={() => setPaint(p.hex)}
            />
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-2 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45 transition-colors hover:text-white"
        >
          Build
          <span
            className={`transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          >
            ▴
          </span>
        </button>
      </div>
      </div>
    </>
  );
}
