"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

export function Loader() {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setGone(true), 700);
      return () => clearTimeout(t);
    }
  }, [active, progress]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05060a] transition-opacity duration-700 ${
        !active && progress >= 100 ? "opacity-0" : "opacity-100"
      }`}
    >
      <span className="font-display text-xs tracking-[0.5em] text-white/60">
        RUBY STAR
      </span>
      <div className="mt-6 h-px w-48 overflow-hidden bg-white/10">
        <div
          className="h-full bg-ruby transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="mt-4 text-[10px] tabular-nums tracking-[0.3em] text-white/30">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
