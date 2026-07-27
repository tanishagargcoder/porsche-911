"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  AdaptiveDpr,
  PerformanceMonitor,
} from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import {
  BlendFunction,
  type BloomEffect,
  type ChromaticAberrationEffect,
  type DepthOfFieldEffect,
} from "postprocessing";
import { Porsche } from "./Porsche";
import { SHOTS } from "@/lib/shots";
import { clamp, easeInOut, intro, INTRO_MS, range, scroll } from "@/lib/scroll";
import { rig } from "@/lib/rig";
import type { Caliper, Wheel } from "@/lib/config";

/**
 * The car group and the focus point live here rather than being passed as
 * props. Three objects are circular (`parent` ⇄ `children`), and React dev
 * tooling serialises props when it reports an error — which turns any real
 * error into an unrelated "circular structure" crash and hides the cause.
 */
const carRef: { current: THREE.Group | null } = { current: null };
const focusPoint = new THREE.Vector3(0, 0.7, 0);

const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const offset = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/**
 * The intro opens on the crest on the bonnet — the real one on the model, sat
 * at roughly x 1.75, y 0.63 once the car is normalised — and pushes in while
 * the engine turns over. Then it cuts wide for the fly-past.
 */
const CREST_CAM: [number, number, number] = [2.62, 0.68, 0.06];
const CREST_CAM_END: [number, number, number] = [2.12, 0.655, 0.02];
const CREST_TARGET: [number, number, number] = [1.75, 0.63, -0.04];
const CREST_FOV = 15;
/** how much of the intro the crest holds for */
const CREST_UNTIL = 0.2;

/** side-on and tight, so the car fills the frame as it tears past */
const INTRO_CAM: [number, number, number] = [0, 1.15, 9];
const INTRO_TARGET: [number, number, number] = [0, 0.8, 0];
const INTRO_FOV = 26;

/** where the car starts and ends its fly-past, in metres */
const RUN_FROM = -46;
const RUN_TO = 46;

/** the beat the headlamps come on at, and how long the ignition takes */
const IGNITE_AT = 5.4;

/** the current pose of the scroll timeline, ignoring the intro */
function poseFromScroll() {
  const p = clamp(scroll.progress) * (SHOTS.length - 1);
  const i = Math.min(Math.floor(p), SHOTS.length - 2);
  return { from: SHOTS[i], to: SHOTS[i + 1], t: easeInOut(p - i), p };
}

/**
 * Drives everything that moves: the intro fly-past, the car's own yaw, the
 * camera walking down the shot list, and the pointer parallax on top.
 */
function Rig() {
  const car = carRef;
  const { camera, size, pointer } = useThree();
  const settled = useRef(false);
  const drift = useRef(new THREE.Vector2());

  useFrame((_, delta) => {
    if (rig.photo) return; // OrbitControls owns the camera in photo mode

    // ---- intro ----------------------------------------------------------
    intro.t = intro.startedAt
      ? clamp((performance.now() - intro.startedAt) / INTRO_MS)
      : 0;

    const running = intro.startedAt > 0 && intro.t < 1;
    const pass = range(intro.t, 0.22, 0.66);
    const passing = running && intro.t > 0.2 && intro.t < 0.7;

    const { from, to, t, p } = poseFromScroll();

    rig.beat = Math.round(p);
    rig.detail = from.kind === "detail" || to.kind === "detail" ? 1 : 0;
    rig.lights = running ? 0 : clamp(p - IGNITE_AT);

    // the closing run: the car straightens up and drives out of frame, which is
    // the intro fly-past played once more on the way out
    const leaving = to.kind === "run" ? t : 0;
    const launch = Math.pow(leaving, 2.4) * 62;
    rig.speed = leaving > 0.02 ? Math.min(305, Math.pow(leaving, 1.5) * 340) : 0;

    // the closing run is silent on purpose — the engine is only heard once, at
    // ignition, and repeating it later cheapens it

    if (car.current) {
      car.current.position.x = passing
        ? RUN_FROM + (RUN_TO - RUN_FROM) * pass
        : launch;
      // nose-first down the straight during the pass, timeline yaw after it
      car.current.rotation.y = passing ? 0 : from.yaw + (to.yaw - from.yaw) * t;
      // parked and lit for the crest, then off down the straight — never hidden
      car.current.visible = true;
    }

    // ---- camera ---------------------------------------------------------
    a.fromArray(from.cam);
    b.fromArray(to.cam);
    camPos.lerpVectors(a, b, t);

    a.fromArray(from.target);
    b.fromArray(to.target);
    camTarget.lerpVectors(a, b, t);

    let fov = from.fov + (to.fov - from.fov) * t;

    // portrait phones need the camera further back or the car falls out of frame
    const aspect = size.width / size.height;
    if (aspect < 1.35) {
      const pull = clamp(1.5 / Math.max(aspect, 0.4), 1, 1.75);
      offset.subVectors(camPos, camTarget).multiplyScalar(pull);
      camPos.addVectors(camTarget, offset);
      fov = Math.min(fov + 6, 60);
    }

    // the intro overrides the shot list: crest macro, then the side-on pass,
    // then a swing into the hero framing
    const handover = running ? 1 - range(intro.t, 0.72, 1) : 0;
    if (handover > 0) {
      const h = easeInOut(handover);
      camPos.lerp(a.fromArray(INTRO_CAM), h);
      camTarget.lerp(b.fromArray(INTRO_TARGET), h);
      fov += (INTRO_FOV - fov) * h;
    }

    if (running && intro.t < CREST_UNTIL) {
      // slow push towards the badge while the engine catches
      const push = easeInOut(range(intro.t, 0, CREST_UNTIL));
      a.fromArray(CREST_CAM);
      b.fromArray(CREST_CAM_END);
      camPos.lerpVectors(a, b, push);
      camTarget.fromArray(CREST_TARGET);
      // portrait crops the sides, so open up or the badge overfills the frame
      fov = aspect < 1.35 ? CREST_FOV + 7 : CREST_FOV;
    }

    // ---- pointer parallax ------------------------------------------------
    // a nudge, not a swing — the shot list stays in charge of the framing
    drift.current.x += (pointer.x - drift.current.x) * Math.min(1, delta * 3);
    drift.current.y += (pointer.y - drift.current.y) * Math.min(1, delta * 3);

    offset.subVectors(camPos, camTarget);
    right.crossVectors(offset, up).normalize();
    const reach = offset.length() * 0.035;
    camPos.addScaledVector(right, -drift.current.x * reach);
    camPos.y += drift.current.y * reach * 0.6;

    // Frame one lands exactly on pose; after that the camera drifts into place.
    // The drift is distance-aware: the jump out of the turntable into the first
    // macro shot is about five metres, and a fixed rate makes that read as the
    // camera sticking and then catching up.
    const far = camera.position.distanceTo(camPos);
    const rate = far > 1.5 ? 0.00002 : 0.0015;
    const k = settled.current ? 1 - Math.pow(rate, delta) : 1;
    settled.current = true;

    camera.position.lerp(camPos, k);

    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * k;
      cam.updateProjectionMatrix();
    }

    camera.lookAt(camTarget);
    focusPoint.copy(camTarget); // depth of field focuses wherever the shot is aimed
  });

  return null;
}

/** studio rig built from area lights — reflections streak across the paint like a shoot */
function Studio({ tint, night }: { tint: string; night: boolean }) {
  return (
    <Environment resolution={256}>
      <color attach="background" args={["#05060a"]} />
      <Lightformer
        intensity={night ? 1.4 : 6}
        rotation-x={Math.PI / 2}
        position={[0, 6, -3]}
        scale={[12, 6, 1]}
      />
      {[-6, -3, 0, 3, 6].map((x) => (
        <Lightformer
          key={x}
          form="rect"
          intensity={night ? 0.6 : 2.2}
          rotation-y={Math.PI / 2}
          position={[-8, 3, x]}
          scale={[8, 1.2, 1]}
        />
      ))}
      <Lightformer
        form="rect"
        intensity={night ? 0.9 : 3.2}
        rotation-y={-Math.PI / 2}
        position={[9, 3.5, 0]}
        scale={[14, 3, 1]}
      />
      {/* kicker in the car's own colour, so the whole room shifts with the paint */}
      <Lightformer
        form="ring"
        color={tint}
        intensity={2.6}
        scale={4}
        position={[-6, 2, 6]}
      />
    </Environment>
  );
}

/**
 * Bloom on the lamps, bokeh that tightens right up for the macro shots, and a
 * little grain and fringing so it reads like footage rather than a render.
 */
function Effects({ full }: { full: boolean }) {
  const dof = useRef<DepthOfFieldEffect | null>(null);
  const fringe = useRef<ChromaticAberrationEffect | null>(null);
  const glow = useRef<BloomEffect | null>(null);
  const speed = useRef(0);

  /**
   * These are bound with `onUpdate` rather than `ref` on purpose.
   *
   * @react-three/postprocessing memoises each effect's args on
   * `JSON.stringify(props)`, and in React 19 `ref` is itself a prop — so once a
   * ref is populated with the effect instance (which reaches the camera, and
   * from there the whole scene graph) the next render throws "Converting
   * circular structure to JSON". A function prop just serialises to undefined.
   */
  const bind = (key: "dof" | "fringe" | "glow") => {
    const onUpdate = (self: unknown) => {
      if (key === "dof") {
        dof.current = self as DepthOfFieldEffect;
        // the effect recomputes focus distance from this point every frame
        dof.current.target = focusPoint;
      }
      if (key === "fringe") fringe.current = self as ChromaticAberrationEffect;
      if (key === "glow") glow.current = self as BloomEffect;
    };

    // the wrappers don't declare onUpdate even though R3F forwards it to the
    // instance, so it goes in as a spread rather than a typed attribute
    return { onUpdate } as unknown as Record<never, never>;
  };

  useFrame((_, delta) => {
    // scroll hard and the image starts to smear and glow — the whole point of
    // the effect is that speed is something you feel rather than read
    speed.current += (scroll.velocity - speed.current) * Math.min(1, delta * 4);
    const v = speed.current;

    if (fringe.current) {
      fringe.current.offset.set(0.0005 + v * 0.004, 0.0005 + v * 0.0022);
    }
    if (glow.current) {
      glow.current.intensity = 0.75 + v * 0.9;
    }

    const m = dof.current?.cocMaterial;
    if (!m) return;
    // wide beats keep the whole car sharp, macro beats throw everything away
    const want = rig.detail ? 0.55 : 4.5;
    m.focusRange += (want - m.focusRange) * Math.min(1, delta * 2);
  });

  // two explicit trees: the composer's children are typed as elements, so a
  // conditional child isn't allowed — and phones can't afford the bokeh pass
  const bloom = (
    <Bloom
      {...bind("glow")}
      intensity={0.75}
      luminanceThreshold={0.62}
      luminanceSmoothing={0.28}
      mipmapBlur
    />
  );
  const grade = (
    <>
      <ChromaticAberration
        {...bind("fringe")}
        offset={new THREE.Vector2(0.0005, 0.0005)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={0.035} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
    </>
  );

  if (!full) {
    return (
      <EffectComposer enableNormalPass={false} multisampling={0}>
        {bloom}
        {grade}
      </EffectComposer>
    );
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {bloom}
      {/* half-res bokeh: the blur hides the resolution, and this is the pass
          that costs the most when the macro shots come in */}
      <DepthOfField
        {...bind("dof")}
        focusDistance={6}
        focusRange={4}
        bokehScale={2.4}
        resolutionScale={0.4}
      />
      {grade}
    </EffectComposer>
  );
}

export function Scene({
  paint,
  wheel,
  caliper,
  photo,
  night,
}: {
  paint: string;
  wheel: Wheel;
  caliper: Caliper;
  photo: boolean;
  night: boolean;
}) {
  /** 2 = everything, 1 = no bokeh, 0 = no mirror either */
  const [quality, setQuality] = useState(2);
  const [lost, setLost] = useState(false);

  // the room picks up the paint, but lifted towards white so dark colours still
  // throw a usable kick light
  const tint = useMemo(
    () =>
      "#" +
      new THREE.Color(paint)
        .lerp(new THREE.Color("#ffffff"), 0.45)
        .getHexString(),
    [paint],
  );

  if (lost) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
          The graphics context dropped out
        </p>
        <button
          onClick={() => window.location.reload()}
          className="border border-ruby px-6 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white transition-colors hover:bg-ruby/15"
        >
          Restart
        </button>
      </div>
    );
  }

  return (
    <Canvas
      className="!fixed inset-0"
      // PCFSoft is deprecated in three 0.185; PCF is the supported one now
      shadows="percentage"
      // 1.5 is plenty with this much post-processing, and every extra 0.5 costs
      // memory across a dozen render targets at once
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        toneMappingExposure: 1.1,
        powerPreference: "high-performance",
      }}
      camera={{ position: INTRO_CAM, fov: INTRO_FOV, near: 0.1, far: 120 }}
      onCreated={({ gl }) => {
        // a lost context otherwise surfaces as an unrelated React crash
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          setLost(true);
        });
      }}
    >
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 14, 40]} />

      <hemisphereLight intensity={night ? 0.06 : 0.25} groundColor="#0a0a0f" />
      <spotLight
        position={[5, 8, 4]}
        angle={0.5}
        penumbra={1}
        intensity={night ? 28 : 120}
        castShadow
        // 1024 is indistinguishable here and a quarter of the memory
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <spotLight
        position={[-7, 5, -5]}
        angle={0.6}
        penumbra={1}
        intensity={60}
        color={tint}
      />

      <Suspense fallback={null}>
        <group
          ref={(g) => {
            carRef.current = g;
          }}
        >
          <Porsche
            paint={paint}
            wheel={wheel}
            caliper={caliper}
            night={night}
          />
        </group>
        <Studio tint={tint} night={night} />
      </Suspense>

      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.7}
        scale={16}
        blur={2.2}
        far={4}
        resolution={512}
        color="#000000"
      />

      <Floor reflective={quality > 0} night={night} />

      <Rig />
      <Capture />
      <PhotoControls active={photo} />
      <Quality level={quality} />

      {/* if the frame rate sags, drop the expensive passes rather than stutter */}
      <PerformanceMonitor
        onDecline={() => setQuality((q) => Math.max(0, q - 1))}
        flipflops={2}
      />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}

/**
 * Draws one frame straight to the canvas and reads it back. This bypasses the
 * effect composer, so a saved shot has no bloom or grain on it — the trade for
 * not holding a second copy of the framebuffer for the whole session.
 */
function Capture() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    rig.capture = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      rig.capture = null;
    };
  }, [gl, scene, camera]);

  return null;
}

/** the floor loses its mirror first when the GPU is struggling */
function Floor({
  reflective,
  night,
}: {
  reflective: boolean;
  night: boolean;
}) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[22, 64]} />
      {reflective ? (
        <MeshReflectorMaterial
          // the floor re-renders the whole scene every frame; a quarter of the
          // pixels is invisible under this much blur and costs a lot less
          resolution={256}
          mixBlur={1}
          mixStrength={night ? 32 : 22}
          blur={[200, 60]}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.35}
          mirror={0.42}
          color="#080910"
          metalness={0.65}
          roughness={0.82}
        />
      ) : (
        <meshStandardMaterial color="#0a0b11" metalness={0.6} roughness={0.55} />
      )}
    </mesh>
  );
}

/** free orbit at the end of the ride — drag the car around and take your own shot */
function PhotoControls({ active }: { active: boolean }) {
  useEffect(() => {
    rig.photo = active;
    return () => {
      rig.photo = false;
    };
  }, [active]);

  if (!active) return null;

  return (
    <OrbitControls
      makeDefault
      target={[0, 0.7, 0]}
      enablePan={false}
      minDistance={3.2}
      maxDistance={14}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.04}
      enableDamping
      dampingFactor={0.06}
    />
  );
}

/** depth of field is the expensive one, so small or struggling devices skip it */
function Quality({ level }: { level: number }) {
  const size = useThree((s) => s.size);
  return <Effects full={size.width > 900 && level >= 2} />;
}
