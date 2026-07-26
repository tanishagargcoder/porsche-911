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
import { PAINTS, paintByHex, paintBySlug } from "@/lib/shots";
import { clamp, intro, INTRO_MS, scroll } from "@/lib/scroll";
import { rev, setEnabled, tick, unlock, whoosh } from "@/lib/audio";

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

  const swatch = paintByHex(paint);

  /** ?paint=racing-yellow opens straight into that colour, and links stay shareable */
  useEffect(() => {
    const wanted = paintBySlug(
      new URLSearchParams(window.location.search).get("paint"),
    );
    if (wanted) setPaint(wanted.hex);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("paint", swatch.slug);
    window.history.replaceState(null, "", url);

    // Next writes the static metadata title just after hydration, so the first
    // one has to be re-asserted once that's done
    const title = `911 Turbo — ${swatch.name}`;
    document.title = title;
    const again = setTimeout(() => {
      document.title = title;
    }, 300);

    return () => clearTimeout(again);
  }, [swatch.slug, swatch.name]);

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

  /** 1–5 for paint, P for photo mode, S for sound */
  useEffect(() => {
    if (phase !== "live") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const n = Number(e.key);
      if (n >= 1 && n <= PAINTS.length) {
        setPaint(PAINTS[n - 1].hex);
        tick();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "p") setPhoto((v) => !v);
      if (key === "s") {
        setSound((v) => {
          const next = !v;
          setEnabled(next);
          if (next) rev();
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

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
          <Overlay paint={swatch} />
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
      <Loader name={swatch.name} />
    </main>
  );
}
