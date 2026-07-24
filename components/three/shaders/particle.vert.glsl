// Particle field — vertex stage.
// Morphs each point across three baked position sets on the GPU:
//   uProgress 0 → 1 : aChaos      → aStructured   (raw data → structured)
//   uProgress 1 → 2 : aStructured → aClustered    (structured → grouped insight)

uniform float uProgress;
uniform float uTime;
uniform float uSize;

attribute vec3 aChaos;
attribute vec3 aStructured;
attribute vec3 aClustered;
attribute float aScale;

varying float vStructure; // 0..1 how "resolved" this point is — drives color
varying float vDepth;     // view-space depth — drives fog + alpha

void main() {
  float t1 = clamp(uProgress, 0.0, 1.0);
  float t2 = clamp(uProgress - 1.0, 0.0, 1.0);

  // Ease each leg so points arrive with a settle rather than linearly.
  t1 = t1 * t1 * (3.0 - 2.0 * t1);
  t2 = t2 * t2 * (3.0 - 2.0 * t2);

  vec3 p = mix(aChaos, aStructured, t1);
  p = mix(p, aClustered, t2);

  // Idle breathing drift — subtle, reads as alive not floating.
  float drift = sin(uTime * 0.45 + p.x * 1.8 + p.y * 1.3) * 0.035;
  p += normalize(p + 0.0001) * drift;

  vStructure = clamp(uProgress * 0.5, 0.0, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mvPosition.z;

  gl_Position = projectionMatrix * mvPosition;
  // Perspective-attenuated point size, clamped so near points never bloom.
  gl_PointSize = clamp(uSize * aScale * (32.0 / vDepth), 1.0, 7.0);
}
