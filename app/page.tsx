"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { useProgress } from "@react-three/drei";
import { Overlay, PaintPicker } from "@/components/Overlay";
import { Loader } from "@/components/Loader";
import { Intro } from "@/components/Intro";
import { Gate } from "@/components/Gate";
import { Hud } from "@/components/Hud";
import { PAINTS } from "@/lib/shots";
import { clamp, intro, INTRO_MS, scroll } from "@/lib/scroll";
import { rev, setEnabled, unlock, whoosh } from "@/lib/audio";

/** WebGL never runs on the server */
const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), {
  ssr: false,
});

type Phase = "loading" | "gate" | "intro" | "live";

/** the car is on screen from 22% to 66% of the intro — the whoosh rides that */
const PASS_AT = INTRO_MS * 0.22;
const PASS_FOR = (INTRO_MS * 0.44) / 1000;

export default function Home() {
  const [paint, setPaint] = useState(PAINTS[0].hex);
  const [phase, setPhase] = useState<Phase>("loading");
  const [photo, setPhoto] = useState(false);
  const [sound, setSound] = useState(false);
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

  /** ignition, then the fly-past, with the whoosh timed to the car crossing */
  const begin = useCallback((withSound: boolean) => {
    intro.startedAt = performance.now();
    setPhase("intro");

    if (!withSound) return;
    rev();
    window.setTimeout(() => whoosh(PASS_FOR), PASS_AT);
  }, []);

  /**
   * Once the car has loaded, try to open audio. Browsers usually refuse without
   * a gesture, and then we ask for one rather than starting the show in silence.
   */
  useEffect(() => {
    if (phase !== "loading" || active || progress < 100) return;

    let cancelled = false;

    const t = window.setTimeout(async () => {
      const ok = await unlock();
      if (cancelled) return;

      if (ok) {
        setEnabled(true);
        setSound(true);
        begin(true);
      } else {
        setPhase("gate");
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [phase, active, progress, begin]);

  useEffect(() => {
    if (phase !== "intro") return;
    const finish = setTimeout(() => setPhase("live"), INTRO_MS);
    return () => clearTimeout(finish);
  }, [phase]);

  /** scroll stays locked until the show is over, and while photo mode is on */
  useEffect(() => {
    const locked = phase !== "live" || photo;
    document.body.style.overflow = locked ? "hidden" : "";
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
  }, [phase, photo]);

  const enterWithSound = async () => {
    await unlock();
    setEnabled(true);
    setSound(true);
    begin(true);
  };

  const enterMuted = () => {
    setEnabled(false);
    setSound(false);
    begin(false);
  };

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
        <Hud
          paint={paint}
          photo={photo}
          setPhoto={setPhoto}
          sound={sound}
          setSound={setSound}
        />
      </div>

      {/* mounted exactly when the fly-past starts, so CSS and WebGL stay in step */}
      {phase === "intro" && <Intro />}
      {phase === "gate" && (
        <Gate onEnter={enterWithSound} onSkip={enterMuted} />
      )}
      <Loader />
    </main>
  );
}
