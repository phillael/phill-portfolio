/**
 * The Relic Vault's CRT: the screen shader (barrel, wobble, rounded mask, cover crop, chromatic bleed, snow with a
 * rolling band, scanlines, aperture mask, flicker, vignette, the power window and the hologram's glow), ported 1:1
 * from the mockup. The look is fixed: CRT Classic, idle sets Static.
 */

import * as THREE from 'three'

/** the CRT preset (the mockup's Classic) */
export const CRT = { curv: 0.11, scan: 0.5, mask: 0.22, bleed: 1, wobble: 0 } as const
/** what an idle set shows (the mockup's Static): the window open, dim, mostly snow */
export const IDLE = { open: 1, bright: 0.3, stat: 0.85 } as const

export const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

export const FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uCrop;
uniform float uTime, uOpenX, uOpenY, uFlash, uWobble, uStatic, uBright, uCurv, uScan, uMask, uBleed, uRound, uAspect, uEmit, uLines, uSeed;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 c = vUv - 0.5;
  vec2 ca = c * vec2(uAspect, 1.0);
  c *= 1.0 + uCurv * dot(ca, ca) / max(uAspect, 1.0);
  c.x += uWobble * 0.012 * sin(c.y * 36.0 + uTime * 21.0);
  vec2 uv = c + 0.5;
  float d = rbox(c * vec2(uAspect, 1.0), vec2(0.5 * uAspect, 0.5), uRound);
  float inside = 1.0 - smoothstep(-0.004, 0.003, d);

  vec2 t = c * uCrop + 0.5;
  float off = uBleed * 0.0024;
  vec3 col = vec3(texture2D(uTex, t + vec2(off, 0.0)).r, texture2D(uTex, t).g, texture2D(uTex, t - vec2(off, 0.0)).b);

  // snow, with a slow bright band rolling up
  vec2 cell = floor(uv * vec2(uLines * uAspect, uLines) * 0.55);
  float sn = hash(cell + floor(uTime * 26.0) * vec2(17.0, 59.0) + uSeed);
  float band = smoothstep(0.18, 0.0, abs(fract(uv.y - uTime * 0.11) - 0.5));
  col = mix(col, vec3(sn * (0.8 + 0.5 * band)), uStatic);

  float sl = 0.5 + 0.5 * cos(uv.y * uLines * 6.2831853);
  col *= mix(1.0, 0.45 + 0.55 * sl, uScan);
  float m = mod(floor(gl_FragCoord.x), 3.0);
  vec3 mask = m < 0.5 ? vec3(1.0, 0.7, 0.7) : m < 1.5 ? vec3(0.7, 1.0, 0.7) : vec3(0.7, 0.7, 1.0);
  col *= mix(vec3(1.0), mask * 1.2, uMask);
  col *= uBright * (0.985 + 0.015 * sin(uTime * 113.0 + uSeed));
  col *= 1.0 - 0.6 * smoothstep(0.3, 0.85, length(c * vec2(1.0, 1.1)) * 1.25);

  // power on / off: the picture lives inside a window that opens from a dot to a line to the full screen
  float wx = uOpenX * 0.5, wy = uOpenY * 0.5;
  float inX = 1.0 - smoothstep(wx - 0.006, wx + 0.003, abs(uv.x - 0.5));
  float inY = 1.0 - smoothstep(wy + 0.002, wy + 0.009, abs(uv.y - 0.5));
  col = (col + vec3(uFlash)) * inX * inY;

  // projecting the hologram: the glass becomes the light source
  col = mix(col, vec3(0.6, 0.92, 1.0) * (1.1 + 0.3 * sl), uEmit);

  col += vec3(0.014, 0.018, 0.02); // the glass when it's off
  col *= mix(0.3, 1.0, smoothstep(0.0, -0.06, d));
  gl_FragColor = vec4(col * inside, 1.0);
  #include <colorspace_fragment>
}`

export type CrtUniforms = {
  uTex: THREE.IUniform<THREE.Texture>
  uCrop: THREE.IUniform<THREE.Vector2>
  uTime: THREE.IUniform<number>
  uOpenX: THREE.IUniform<number>
  uOpenY: THREE.IUniform<number>
  uFlash: THREE.IUniform<number>
  uWobble: THREE.IUniform<number>
  uStatic: THREE.IUniform<number>
  uBright: THREE.IUniform<number>
  uCurv: THREE.IUniform<number>
  uScan: THREE.IUniform<number>
  uMask: THREE.IUniform<number>
  uBleed: THREE.IUniform<number>
  uRound: THREE.IUniform<number>
  uAspect: THREE.IUniform<number>
  uEmit: THREE.IUniform<number>
  uLines: THREE.IUniform<number>
  uSeed: THREE.IUniform<number>
}
export type CrtMaterial = THREE.ShaderMaterial & { uniforms: CrtUniforms }

let black: THREE.DataTexture | null = null
/** one black pixel: a screen's texture before its poster loads (the snow covers it) */
export function blackTexture() {
  if (!black) {
    black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    black.needsUpdate = true
  }
  return black
}

/** a screen's material: aspect = its width / height, round = its corner radius in heights; idle (Static) to start */
export function crtMaterial(aspect: number, round: number): CrtMaterial {
  const u = <T>(value: T) => ({ value })
  const uniforms: CrtUniforms = {
    uTex: u<THREE.Texture>(blackTexture()),
    uCrop: u(new THREE.Vector2(1, 1)),
    uTime: u(0),
    uOpenX: u<number>(IDLE.open),
    uOpenY: u<number>(IDLE.open),
    uFlash: u(0),
    uWobble: u<number>(CRT.wobble),
    uStatic: u<number>(IDLE.stat),
    uBright: u<number>(IDLE.bright),
    uCurv: u<number>(CRT.curv),
    uScan: u<number>(CRT.scan),
    uMask: u<number>(CRT.mask),
    uBleed: u<number>(CRT.bleed),
    uRound: u(round),
    uAspect: u(aspect),
    uEmit: u(0),
    uLines: u(180),
    uSeed: u(Math.random() * 100),
  }
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }) as CrtMaterial
}

/** set several uniforms at once */
export const setU = (u: CrtUniforms, o: Partial<Record<keyof CrtUniforms, number>>) => {
  for (const k in o) (u[k as keyof CrtUniforms] as THREE.IUniform<number>).value = o[k as keyof CrtUniforms]!
}
