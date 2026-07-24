"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import vertexShader from "./shaders/particle.vert.glsl";
import fragmentShader from "./shaders/particle.frag.glsl";

/** Pointer position in normalized device space, [-1, 1]. */
export type PointerRef = React.MutableRefObject<{ x: number; y: number }>;
/** Current (already-damped) uProgress in [0, 2]. */
export type ProgressRef = React.MutableRefObject<number>;

type Props = {
  count: number;
  progressRef: ProgressRef;
  pointerRef: PointerRef;
  /** How far the camera drifts with the cursor. 0 disables parallax. */
  parallax?: number;
};

const RADIUS = 4.2;

/** Deterministic PRNG so the baked layout is stable across reloads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildAttributes(count: number) {
  const rand = mulberry32(0x9e3779b9);
  const chaos = new Float32Array(count * 3);
  const structured = new Float32Array(count * 3);
  const clustered = new Float32Array(count * 3);
  const scale = new Float32Array(count);

  // Grid lattice dimensions for the structured state.
  const side = Math.ceil(Math.cbrt(count));
  const step = (RADIUS * 1.6) / side;
  const half = (side - 1) / 2;

  // Cluster centers for the clustered state (k-means-style groups).
  const K = 7;
  const centers: [number, number, number][] = [];
  for (let k = 0; k < K; k++) {
    const a = (k / K) * Math.PI * 2;
    const r = 2.4 + rand() * 0.8;
    centers.push([
      Math.cos(a) * r,
      (rand() - 0.5) * 3.0,
      Math.sin(a) * r * 0.7,
    ]);
  }

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // aChaos — random cloud in a sphere, core biased hollow so the
    // center stays legible behind the headline.
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const cr = RADIUS * (0.4 + 0.6 * Math.cbrt(rand()));
    chaos[i3] = cr * Math.sin(phi) * Math.cos(theta);
    chaos[i3 + 1] = cr * Math.sin(phi) * Math.sin(theta);
    chaos[i3 + 2] = cr * Math.cos(phi);

    // aStructured — 3D grid lattice.
    const gx = i % side;
    const gy = Math.floor(i / side) % side;
    const gz = Math.floor(i / (side * side)) % side;
    structured[i3] = (gx - half) * step;
    structured[i3 + 1] = (gy - half) * step;
    structured[i3 + 2] = (gz - half) * step;

    // aClustered — assigned to a center with gaussian jitter.
    const c = centers[i % K];
    const j = 0.55;
    clustered[i3] = c[0] + (rand() - 0.5) * j * 2;
    clustered[i3 + 1] = c[1] + (rand() - 0.5) * j * 2;
    clustered[i3 + 2] = c[2] + (rand() - 0.5) * j * 2;

    scale[i] = 0.6 + rand() * 0.9;
  }

  return { chaos, structured, clustered, scale };
}

export function ParticleField({
  count,
  progressRef,
  pointerRef,
  parallax = 0.6,
}: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const attrs = useMemo(() => buildAttributes(count), [count]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1.35 },
      uColorDim: { value: new THREE.Color("#5f676c") },
      uColorAccent: { value: new THREE.Color("#4f8ff7") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (mat) {
      mat.uniforms.uTime.value += delta;
      mat.uniforms.uProgress.value = progressRef.current;
    }

    if (parallax > 0) {
      const { camera } = state;
      const px = pointerRef.current.x * parallax;
      const py = pointerRef.current.y * parallax * 0.6;
      camera.position.x += (px - camera.position.x) * 0.05;
      camera.position.y += (py - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        {/* position drives draw count + bounds; chaos is the start state. */}
        <bufferAttribute
          attach="attributes-position"
          args={[attrs.chaos, 3]}
        />
        <bufferAttribute attach="attributes-aChaos" args={[attrs.chaos, 3]} />
        <bufferAttribute
          attach="attributes-aStructured"
          args={[attrs.structured, 3]}
        />
        <bufferAttribute
          attach="attributes-aClustered"
          args={[attrs.clustered, 3]}
        />
        <bufferAttribute attach="attributes-aScale" args={[attrs.scale, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
