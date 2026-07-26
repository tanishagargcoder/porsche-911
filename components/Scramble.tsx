"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&/\\<>*+";

/**
 * Resolves text one character at a time out of random glyphs. Re-runs whenever
 * `text` changes or the block scrolls back into view.
 */
export function Scramble({
  text,
  run = true,
  speed = 34,
  className,
}: {
  text: string;
  run?: boolean;
  speed?: number;
  className?: string;
}) {
  const [out, setOut] = useState(text);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // off screen there's nothing to animate, but the text still has to keep up —
    // paint changes rewrite copy in sections the reader hasn't reached yet
    if (!run) {
      setOut(text);
      return;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      setOut(text);
      return;
    }

    let frame = 0;
    const settle = text.length + 6;

    timer.current = setInterval(() => {
      frame++;
      const locked = Math.floor((frame / settle) * text.length);

      setOut(
        text
          .split("")
          .map((ch, i) => {
            if (i < locked || ch === " ") return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(""),
      );

      if (frame >= settle) {
        setOut(text);
        if (timer.current) clearInterval(timer.current);
      }
    }, speed);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, run, speed]);

  return <span className={className}>{out}</span>;
}

/**
 * Counts a number up when it lands on screen. Decimals are kept fixed so the
 * readout never jitters in width.
 */
export function CountUp({
  value,
  run,
  decimals = 0,
  duration = 1100,
}: {
  value: number;
  run: boolean;
  decimals?: number;
  duration?: number;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!run) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      setN(value);
      return;
    }

    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // ease out, so it sprints then lands
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run, duration]);

  return <>{n.toFixed(decimals)}</>;
}
