"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { rig } from "@/lib/rig";

/** real 996 Turbo length, so camera distances elsewhere are honest metres */
const CAR_LENGTH = 4.43;
/** the source model's nose sits at +Z (headlamps at z≈+2.1); spin it to face +X */
const MODEL_YAW = Math.PI / 2;

/** materials we never want on screen — the Sketchfab scene ships a ground plane and burnout FX */
const HIDDEN = new Set(["floor", "Smoke", "sparks"]);
/** the body panel material, the one that carries the paint */
const BODY = "Porsche_911_Turbo__996__2000_by_Alex_Ka";

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

export function Porsche({ paint }: { paint: string }) {
  const { scene } = useGLTF("/models/porsche.glb");
  const group = useRef<THREE.Group>(null);

  /** clone once so React strict-mode double renders don't fight over one scene graph */
  const model = useMemo(() => scene.clone(true), [scene]);

  const bodyMats = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const lamps = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const tails = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const beams = useRef<THREE.Group>(null);
  const lampLights = useRef<THREE.PointLight[]>([]);

  const target = useMemo(() => new THREE.Color(paint), [paint]);

  useEffect(() => {
    bodyMats.current = [];
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

    // headlamps ignite at the macro shot and stay lit
    const lit = rig.lights;
    lamps.current.forEach((m) => (m.emissiveIntensity = lit * 2.6));
    tails.current.forEach((m) => (m.emissiveIntensity = 0.15 + lit * 1.4));

    if (beams.current) {
      beams.current.visible = lit > 0.01;
      beams.current.children.forEach((c) => {
        const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = lit * 0.06;
      });
    }
    lampLights.current.forEach((l) => (l.intensity = lit * 6));
  });

  return (
    <>
      <group ref={group}>
        <primitive object={model} />
      </group>

      {/* light cones out of the headlamps — bloom does the rest */}
      <group ref={beams} visible={false}>
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
