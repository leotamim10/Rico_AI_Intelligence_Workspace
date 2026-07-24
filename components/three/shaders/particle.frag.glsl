// Particle field — fragment stage.
// Soft round point, colored from dim (raw) toward accent (resolved),
// with a depth fog that gives the cloud parallax depth.

precision highp float;

uniform vec3 uColorDim;
uniform vec3 uColorAccent;

varying float vStructure;
varying float vDepth;

void main() {
  // Round the square point and soften its edge.
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float disc = smoothstep(0.5, 0.12, d);

  // Raw points read cool/dim; resolved points glow accent.
  vec3 color = mix(uColorDim, uColorAccent, vStructure);

  // Depth fog — far points recede.
  float fog = smoothstep(11.0, 3.5, vDepth);
  float alpha = disc * mix(0.18, 1.0, fog);

  gl_FragColor = vec4(color, alpha);
}
