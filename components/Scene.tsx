"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  AdaptiveDpr,
} from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Porsche } from "./Porsche";
import { SHOTS } from "@/lib/shots";
import { clamp, easeInOut, intro, INTRO_MS, range, scroll } from "@/lib/scroll";
import { rig } from "@/lib/rig";
import { whoosh } from "@/lib/audio";
import type { Caliper, Wheel } from "@/lib/config";

const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const offset = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

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
function Rig({
  car,
  focus,
}: {
  car: React.RefObject<THREE.Group | null>;
  focus: THREE.Vector3;
}) {
  const { camera, size, pointer } = useThree();
  const settled = useRef(false);
  const drift = useRef(new THREE.Vector2());
  const whooshed = useRef(false);

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

    if (leaving > 0.28 && !whooshed.current) {
      whooshed.current = true;
      whoosh(1.1);
    } else if (leaving < 0.05) {
      whooshed.current = false;
    }

    if (car.current) {
      car.current.position.x = passing
        ? RUN_FROM + (RUN_TO - RUN_FROM) * pass
        : launch;
      // nose-first down the straight during the pass, timeline yaw after it
      car.current.rotation.y = passing ? 0 : from.yaw + (to.yaw - from.yaw) * t;
      car.current.visible = !running || intro.t > 0.2;
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

    // hold the side-on framing through the pass, then swing into the hero shot
    const handover = running ? 1 - range(intro.t, 0.72, 1) : 0;
    if (handover > 0) {
      const h = easeInOut(handover);
      camPos.lerp(a.fromArray(INTRO_CAM), h);
      camTarget.lerp(b.fromArray(INTRO_TARGET), h);
      fov += (INTRO_FOV - fov) * h;
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

    // frame one lands exactly on pose; after that the camera drifts into place
    const k = settled.current ? 1 - Math.pow(0.0015, delta) : 1;
    settled.current = true;

    camera.position.lerp(camPos, k);

    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * k;
      cam.updateProjectionMatrix();
    }

    camera.lookAt(camTarget);
    focus.copy(camTarget); // depth of field focuses wherever the shot is aimed
  });

  return null;
}

/** studio rig built from area lights — reflections streak across the paint like a shoot */
function Studio({ tint, night }: { tint: string; night: boolean }) {
  return (
    <Environment resolution={512}>
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
function Effects({ focus, full }: { focus: THREE.Vector3; full: boolean }) {
  const dof = useRef<React.ComponentRef<typeof DepthOfField>>(null);

  useEffect(() => {
    const e = dof.current;
    // the effect recomputes focus distance from this point every frame
    if (e) e.target = focus;
  }, [focus]);

  useFrame((_, delta) => {
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
      intensity={0.75}
      luminanceThreshold={0.62}
      luminanceSmoothing={0.28}
      mipmapBlur
    />
  );
  const grade = (
    <>
      <ChromaticAberration
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
      <DepthOfField
        ref={dof}
        focusDistance={6}
        focusRange={4}
        bokehScale={3.2}
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
  const car = useRef<THREE.Group>(null);
  const focus = useMemo(() => new THREE.Vector3(0, 0.7, 0), []);

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

  return (
    <Canvas
      className="!fixed inset-0"
      // PCFSoft is deprecated in three 0.185; PCF is the supported one now
      shadows="percentage"
      dpr={[1, 2]}
      // preserveDrawingBuffer keeps the frame readable for photo-mode downloads
      gl={{
        antialias: false,
        toneMappingExposure: 1.1,
        preserveDrawingBuffer: true,
      }}
      camera={{ position: INTRO_CAM, fov: INTRO_FOV, near: 0.1, far: 120 }}
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
        shadow-mapSize={[2048, 2048]}
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
        <group ref={car}>
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
        resolution={1024}
        color="#000000"
      />

      {/* wet showroom floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <MeshReflectorMaterial
          resolution={512}
          mixBlur={1}
          mixStrength={22}
          blur={[300, 90]}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.35}
          mirror={0.42}
          color="#080910"
          metalness={0.65}
          roughness={0.82}
        />
      </mesh>

      <Rig car={car} focus={focus} />
      <PhotoControls active={photo} />
      <Quality focus={focus} />
      <AdaptiveDpr pixelated />
    </Canvas>
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

/** depth of field is the expensive one, so small screens skip it */
function Quality({ focus }: { focus: THREE.Vector3 }) {
  const size = useThree((s) => s.size);
  return <Effects focus={focus} full={size.width > 900} />;
}
