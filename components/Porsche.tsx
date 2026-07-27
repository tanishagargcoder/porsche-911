"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { rig } from "@/lib/rig";
import type { Caliper, Wheel } from "@/lib/config";

/** real 996 Turbo length, so camera distances elsewhere are honest metres */
const CAR_LENGTH = 4.43;
/** the source model's nose sits at +Z (headlamps at z≈+2.1); spin it to face +X */
const MODEL_YAW = Math.PI / 2;

/** materials we never want on screen — the Sketchfab scene ships a ground plane and burnout FX */
const HIDDEN = new Set(["floor", "Smoke", "sparks"]);
/** the body panel material, the one that carries the paint */
const BODY = "Porsche_911_Turbo__996__2000_by_Alex_Ka";
/** wheel faces */
const RIMS = new Set(["rim1", "rim2", "rim_bolts"]);
/** the brake caliper — sits off-axle at the edge of the disc, unlike the hub */
const CALIPER = "suport";

/**
 * Box3.setFromObject counts hidden meshes, and this scene hides a ±8 unit ground
 * plane and smoke card — measuring those would shrink the car to a speck.
 */
function bounds(root: THREE.Object3D) {
  const box = new THREE.Box3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    o.updateWorldMatrix(true, false);
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
  });
  return box;
}

export function Porsche({
  paint,
  wheel,
  caliper,
  night,
}: {
  paint: string;
  wheel: Wheel;
  caliper: Caliper;
  night: boolean;
}) {
  const { scene } = useGLTF("/models/porsche.glb");
  const group = useRef<THREE.Group>(null);

  /** clone once so React strict-mode double renders don't fight over one scene graph */
  const model = useMemo(() => scene.clone(true), [scene]);

  const bodyMats = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const rimMats = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const caliperMats = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const lamps = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const tails = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const beams = useRef<THREE.Group>(null);
  const lampLights = useRef<THREE.PointLight[]>([]);

  const target = useMemo(() => new THREE.Color(paint), [paint]);

  /**
   * Applied from the frame loop rather than an effect: the materials are only
   * collected once the model effect below has run, and effect order would leave
   * the first paint of the wheels missed.
   */
  const applied = useRef({ wheel: "", caliper: "" });

  useEffect(() => {
    bodyMats.current = [];
    rimMats.current = [];
    caliperMats.current = [];
    lamps.current = [];
    tails.current = [];

    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;

      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const name = mats[0]?.name ?? "";

      if (HIDDEN.has(name)) {
        o.visible = false;
        return;
      }

      o.castShadow = true;
      o.receiveShadow = true;

      mats.forEach((m: THREE.Material) => {
        const mat = m as THREE.MeshPhysicalMaterial;

        if (mat.name === BODY) {
          // the baked paint texture would tint whatever colour we set, so drop it
          mat.map = null;
          mat.clearcoat = 1;
          mat.clearcoatRoughness = 0.03;
          mat.metalness = 0.5;
          mat.roughness = 0.22;
          mat.envMapIntensity = 1.6;
          bodyMats.current.push(mat);
        }

        if (mat.name === "headlights") {
          mat.emissive = new THREE.Color("#dfe9ff");
          mat.emissiveIntensity = 0;
          lamps.current.push(mat);
        }

        if (mat.name === "brakelights") {
          mat.emissive = new THREE.Color("#ff2d1a");
          mat.emissiveIntensity = 0.15;
          tails.current.push(mat);
        }

        if (RIMS.has(mat.name)) {
          mat.map = null;
          mat.envMapIntensity = 1.4;
          rimMats.current.push(mat);
        }

        if (mat.name === CALIPER) {
          mat.map = null;
          mat.metalness = 0.35;
          mat.roughness = 0.42;
          caliperMats.current.push(mat);
        }

        if (mat.name === "brakedisk") {
          mat.metalness = 1;
          mat.roughness = 0.35;
        }

        mat.needsUpdate = true;
      });
    });
  }, [model]);

  /** normalise: nose to +X, centred on origin, wheels on the ground */
  useEffect(() => {
    const g = group.current;
    if (!g) return;

    g.rotation.set(0, MODEL_YAW, 0);
    g.scale.setScalar(1);
    g.position.set(0, 0, 0);
    g.updateMatrixWorld(true);

    const size = bounds(g).getSize(new THREE.Vector3());
    const scale = CAR_LENGTH / Math.max(size.x, size.z);
    g.scale.setScalar(scale);
    g.updateMatrixWorld(true);

    const scaled = bounds(g);
    const center = scaled.getCenter(new THREE.Vector3());
    g.position.set(-center.x, -scaled.min.y, -center.z);
  }, [model]);

  useFrame((_, delta) => {
    // paint flows into the new colour instead of snapping
    const k = 1 - Math.pow(0.002, delta);
    bodyMats.current.forEach((m) => m.color.lerp(target, k));

    if (applied.current.wheel !== wheel.slug && rimMats.current.length) {
      applied.current.wheel = wheel.slug;
      rimMats.current.forEach((m) => {
        m.color.set(wheel.hex);
        m.metalness = wheel.metalness;
        m.roughness = wheel.roughness;
        m.needsUpdate = true;
      });
    }

    if (applied.current.caliper !== caliper.slug && caliperMats.current.length) {
      applied.current.caliper = caliper.slug;
      caliperMats.current.forEach((m) => {
        m.color.set(caliper.hex);
        m.needsUpdate = true;
      });
    }

    // headlamps ignite at the macro shot, stay lit, and are always on at night
    const lit = Math.max(rig.lights, night ? 1 : 0);
    lamps.current.forEach((m) => (m.emissiveIntensity = lit * 2.6));
    tails.current.forEach((m) => (m.emissiveIntensity = 0.15 + lit * 1.4));

    // The beams stay mounted and visible for the whole session and are faded
    // with opacity and intensity instead. Hiding a light removes it from the
    // renderer's light setup, and putting it back rebuilds every shader program
    // in the scene — one hard hitch, exactly at the headlamp shot.
    if (beams.current) {
      beams.current.children.forEach((c) => {
        const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = lit * 0.06;
      });
    }
    lampLights.current.forEach((l) => (l.intensity = lit * 6));
  });

  return (
    <>
      {/* attached imperatively rather than with <primitive object={…} />: that
          prop puts a Three object into the React tree, and anything that walks
          props to report an error chokes on its parent/children cycle */}
      <group
        ref={(g) => {
          group.current = g;
          if (!g) return;
          g.add(model);
          return () => {
            g.remove(model);
          };
        }}
      />

      {/* light cones out of the headlamps — bloom does the rest. Mounted from
          the first frame so their shaders compile with everything else */}
      <group ref={beams}>
        {[0.48, -0.52].map((z) => (
          <mesh
            key={z}
            position={[4.2, 0.6, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <coneGeometry args={[0.62, 5.2, 24, 1, true]} />
            <meshBasicMaterial
              color="#cfe0ff"
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
        {[0.48, -0.52].map((z, i) => (
          <pointLight
            key={`p${z}`}
            ref={(l) => {
              if (l) lampLights.current[i] = l;
            }}
            position={[2.3, 0.62, z]}
            distance={6}
            color="#dfe9ff"
            intensity={0}
          />
        ))}
      </group>
    </>
  );
}

useGLTF.preload("/models/porsche.glb");
