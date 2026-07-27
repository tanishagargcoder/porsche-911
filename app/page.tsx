"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { useProgress } from "@react-three/drei";
import { Overlay } from "@/components/Overlay";
import { Configurator } from "@/components/Configurator";
import { TopBar } from "@/components/TopBar";
import { SceneBoundary } from "@/components/SceneBoundary";
import { Loader } from "@/components/Loader";
import { Intro } from "@/components/Intro";
import { Gate } from "@/components/Gate";
import { Hud } from "@/components/Hud";
import { PAINTS, paintByHex, paintBySlug } from "@/lib/shots";
import {
  CALIPERS,
  WHEELS,
  caliperBySlug,
  wheelBySlug,
} from "@/lib/config";
import { clamp, intro, INTRO_MS, scroll } from "@/lib/scroll";
import { prime, rev, setEnabled, tick, unlock, whoosh } from "@/lib/audio";
import { releaseScrollTween, tweenScrollTo } from "@/lib/tween";

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
  const [night, setNight] = useState(false);
  const [film, setFilm] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [wheelSlug, setWheelSlug] = useState(WHEELS[0].slug);
  const [caliperSlug, setCaliperSlug] = useState(CALIPERS[0].slug);
  const lenis = useRef<Lenis | null>(null);

  const { active, progress } = useProgress();

  const swatch = paintByHex(paint);
  const wheel = wheelBySlug(wheelSlug);
  const caliper = caliperBySlug(caliperSlug);

  /** the whole build lives in the URL, so a link opens someone else's spec */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const wanted = paintBySlug(q.get("paint"));
    if (wanted) setPaint(wanted.hex);
    if (q.get("wheels")) setWheelSlug(wheelBySlug(q.get("wheels")).slug);
    if (q.get("calipers"))
      setCaliperSlug(caliperBySlug(q.get("calipers")).slug);
    if (q.get("night") === "1") setNight(true);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("paint", swatch.slug);
    url.searchParams.set("wheels", wheel.slug);
    url.searchParams.set("calipers", caliper.slug);
    if (night) url.searchParams.set("night", "1");
    else url.searchParams.delete("night");
    window.history.replaceState(null, "", url);

    // Next writes the static metadata title just after hydration, so the first
    // one has to be re-asserted once that's done
    const title = `911 Turbo — ${swatch.name}`;
    document.title = title;
    const again = setTimeout(() => {
      document.title = title;
    }, 300);

    return () => clearTimeout(again);
  }, [swatch.slug, swatch.name, wheel.slug, caliper.slug, night]);

  /** smooth scroll + the scroll→camera pipe */
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();

    const update = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scroll.progress = max > 0 ? clamp(window.scrollY / max) : 0;

      // px per ms, normalised — the effects lean on this for the sense of speed
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      const v = Math.abs(window.scrollY - lastY) / dt;
      scroll.velocity = clamp(v / 4);
      lastY = window.scrollY;
      lastT = now;
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

    // ?gate=1 forces the ignition screen even where audio would auto-unlock,
    // which is the only way to look at it on a browser that doesn't block
    const forced =
      new URLSearchParams(window.location.search).get("gate") === "1";

    if (forced) {
      setPhase("gate");
      return;
    }

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

    // whatever audio does, the page must never be left stuck on the loader with
    // the copy hidden and scrolling locked
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setPhase((p) => (p === "loading" ? "gate" : p));
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(failsafe);
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
          if (next) prime();
          setEnabled(next);
          if (next) rev();
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  /** chapter ticks jump the timeline — each beat is one viewport tall */
  const jump = useCallback((index: number) => {
    tweenScrollTo(index * window.innerHeight, 1300, lenis.current);
  }, []);

  /** hands-free run of the whole film, cancelled by any real scroll */
  const toggleFilm = useCallback(() => {
    if (film) {
      releaseScrollTween(lenis.current);
      setFilm(false);
      return;
    }

    setFilm(true);
    const max = document.body.scrollHeight - window.innerHeight;
    const left = 1 - window.scrollY / Math.max(max, 1);

    tweenScrollTo(
      max,
      Math.max(8000, 72000 * left),
      lenis.current,
      () => setFilm(false),
      (t) => t, // constant speed, like a camera move
    );
  }, [film]);

  useEffect(() => {
    if (!film) return;

    const cancel = () => {
      releaseScrollTween(lenis.current);
      setFilm(false);
    };

    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);

    return () => {
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [film]);

  /** no await anywhere in here — iOS unlocks audio only on the gesture's own tick */
  const enterWithSound = () => {
    prime();
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
      <a href="#build" className="skip-link">
        Skip to the configurator
      </a>

      <SceneBoundary>
        <Scene
          paint={paint}
          wheel={wheel}
          caliper={caliper}
          photo={photo}
          night={night}
        />
      </SceneBoundary>
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
          <Overlay
            paint={swatch}
            onBuild={() => setBuildOpen(true)}
            onPlayFilm={toggleFilm}
            film={film}
          />
        </div>
        <TopBar paint={swatch} onJump={jump} />
        <Configurator
          open={buildOpen}
          setOpen={setBuildOpen}
          paint={swatch}
          setPaint={setPaint}
          wheel={wheel}
          setWheel={setWheelSlug}
          caliper={caliper}
          setCaliper={setCaliperSlug}
          night={night}
          setNight={setNight}
        />
        <Hud
          paint={paint}
          photo={photo}
          setPhoto={setPhoto}
          sound={sound}
          setSound={setSound}
          onJump={jump}
          film={film}
          toggleFilm={toggleFilm}
          buildOpen={buildOpen}
        />
      </div>

      {/* mounted exactly when the fly-past starts, so CSS and WebGL stay in step */}
      {phase === "intro" && <Intro />}
      {phase === "gate" && (
        <Gate paint={swatch} onEnter={enterWithSound} onSkip={enterMuted} />
      )}
      <Loader name={swatch.name} />
    </main>
  );
}
