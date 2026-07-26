"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { useProgress } from "@react-three/drei";
import { Overlay, PaintPicker } from "@/components/Overlay";
import { Loader } from "@/components/Loader";
import { Intro } from "@/components/Intro";
import { Hud } from "@/components/Hud";
import { PAINTS } from "@/lib/shots";
import { clamp, intro, INTRO_MS, scroll } from "@/lib/scroll";

/** WebGL never runs on the server */
const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), {
  ssr: false,
});

type Phase = "loading" | "intro" | "live";

export default function Home() {
  const [paint, setPaint] = useState(PAINTS[0].hex);
  const [phase, setPhase] = useState<Phase>("loading");
  const [photo, setPhoto] = useState(false);
  const lenis = useRef<Lenis | null>(null);

  const { active, progress } = useProgress();

  /** smooth scroll + the scroll→camera pipe */
  useEffect(() => {
    const update = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scroll.progress = max > 0 ? clamp(window.scrollY / max) : 0;
    };

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;

    if (!reduced) {
      const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
      lenis.current = l;
      l.stop(); // held until the intro finishes
      const loop = (time: number) => {
        l.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      l.on("scroll", update);
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.scrollTo(0, 0);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
      lenis.current?.destroy();
      lenis.current = null;
    };
  }, []);

  /** loading → fly-past → live */
  useEffect(() => {
    if (phase !== "loading" || active || progress < 100) return;

    const start = setTimeout(() => {
      intro.startedAt = performance.now();
      setPhase("intro");
    }, 450);

    return () => clearTimeout(start);
  }, [phase, active, progress]);

  useEffect(() => {
    if (phase !== "intro") return;

    const finish = setTimeout(() => setPhase("live"), INTRO_MS);
    return () => clearTimeout(finish);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    document.body.style.overflow = "";
    lenis.current?.start();
  }, [phase]);

  /** no scrolling past the title card */
  useEffect(() => {
    if (phase === "live") return;
    document.body.style.overflow = "hidden";
  }, [phase]);

  /** photo mode hands the camera to the mouse, so the page stops scrolling */
  useEffect(() => {
    if (phase !== "live") return;
    if (photo) {
      lenis.current?.stop();
      document.body.style.overflow = "hidden";
    } else {
      lenis.current?.start();
      document.body.style.overflow = "";
    }
  }, [photo, phase]);

  return (
    <main className="relative">
      <Scene paint={paint} photo={photo} />
      <div className="vignette pointer-events-none fixed inset-0 z-[5]" />

      <div
        className={`transition-opacity duration-700 ${
          phase === "live" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`transition-opacity duration-500 ${
            photo ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <Overlay paint={paint} setPaint={setPaint} />
        </div>
        <PaintPicker paint={paint} setPaint={setPaint} />
        <Hud paint={paint} photo={photo} setPhoto={setPhoto} />
      </div>

      {/* mounted exactly when the fly-past starts, so CSS and WebGL stay in step */}
      {phase === "intro" && <Intro />}
      <Loader />
    </main>
  );
}
