"use client";

import { Canvas } from "@react-three/fiber";

import {
  ParticleField,
  type PointerRef,
  type ProgressRef,
} from "./ParticleField";

type Props = {
  progressRef: ProgressRef;
  pointerRef: PointerRef;
  count: number;
  /** When false the render loop is parked — no work while offscreen. */
  active: boolean;
  parallax?: number;
};

export default function Scene({
  progressRef,
  pointerRef,
  count,
  active,
  parallax,
}: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={active ? "always" : "never"}
      style={{ pointerEvents: "none" }}
    >
      <ParticleField
        count={count}
        progressRef={progressRef}
        pointerRef={pointerRef}
        parallax={parallax}
      />
    </Canvas>
  );
}
