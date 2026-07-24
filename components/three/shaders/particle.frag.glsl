// Particle field — fragment stage.
// Soft round point, colored from dim (raw) toward accent (resolved),
// with a depth fog that gives the cloud parallax depth.

precision highp float;

uniform vec3 uColorDim;
uniform vec3 uColorAccent;

varying float vStructure;
varying float vDepth;

void main() {
  // Round the square point with a fully soft falloff — no flat hot core.
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float disc = smoothstep(0.5, 0.0, d);

  // Raw points read cool/dim; resolved points glow accent.
  vec3 color = mix(uColorDim, uColorAccent, vStructure);

  // Depth fog — far points recede. Ceiling kept below 1 so additive
  // brightens without blowing out to white.
  float fog = smoothstep(11.0, 3.5, vDepth);

  // Structuring gates brightness: the raw cloud reads faint, the resolved
  // lattice glows. vStructure is 0.5 at the hero's structured end-state.
  float lift = mix(0.45, 1.0, clamp(vStructure * 2.0, 0.0, 1.0));

  float alpha = disc * mix(0.28, 0.85, fog) * lift;

  gl_FragColor = vec4(color, alpha);
}
