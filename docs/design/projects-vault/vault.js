// The Relic Vault (mockup): a museum hall of CRT sets, one per project. The set in front powers on and plays its
// video through a CRT shader; Watch lifts the picture out of the glass as a hologram (a DOM <dialog> mapped onto the
// screen's projected corners). Debug handle: window.__vault.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { PROJECTS } from './projects.js'

const $ = (s, r = document) => r.querySelector(s)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a, b, t) => a + (b - a) * t
const easeOut = (t) => 1 - (1 - t) ** 3
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

const N = PROJECTS.length
const R = 7 // the hall's radius: the sets stand on it, facing its centre
const STEP = 0.27 // radians between sets
const SCREEN_Y = 1.5 // every screen's centre, whatever the set (the plinths make up the difference)
const START = 1

const CRT = {
  subtle: { curv: 0.05, scan: 0.28, mask: 0.1, bleed: 0.5, wobble: 0 },
  classic: { curv: 0.11, scan: 0.5, mask: 0.22, bleed: 1, wobble: 0 },
  wrecked: { curv: 0.2, scan: 0.78, mask: 0.45, bleed: 2.8, wobble: 0.14 },
}
const IDLE = {
  static: { open: 1, bright: 0.3, stat: 0.85 },
  preview: { open: 1, bright: 0.38, stat: 0.12 },
  off: { open: 0, bright: 0, stat: 0 },
}

const mq = matchMedia('(prefers-reduced-motion: reduce)')
const S = {
  pos: START, vel: 0, target: START, near: -1, on: -1, settle: 0,
  idle: 'static', crt: 'classic', sfx: false, rm: mq.matches, paused: mq.matches,
  visible: false, holo: -1, pendingHolo: -1, hc: 0, hcTo: 0, lookUp: 0, hover: -1, time: 0, drag: null, wide: true, camD: 4.4,
}

/* ================= DOM: tabs + panels (the real content) ================= */
const stage = $('.pv-stage'), canvas = $('.pv-stage canvas'), tablist = $('.pv-index'), cards = $('.pv-cards')
const live = $('[data-live]'), hint = $('.pv-hint'), powerBtn = $('.pv-power')
const tabs = [], panels = []
PROJECTS.forEach((p, i) => {
  const n = String(i + 1).padStart(2, '0')
  const tab = document.createElement('button')
  Object.assign(tab, { type: 'button', id: `pv-t-${p.id}`, tabIndex: -1 })
  tab.setAttribute('role', 'tab')
  tab.setAttribute('aria-selected', 'false')
  tab.setAttribute('aria-controls', `pv-p-${p.id}`)
  tab.innerHTML = `<span class="pv-n" aria-hidden="true">${n}</span>${p.short ?? p.title}`
  tab.addEventListener('click', () => go(i))
  tablist.append(tab)
  tabs.push(tab)

  const a = document.createElement('article')
  a.className = 'pv-card hud'
  a.id = `pv-p-${p.id}`
  a.setAttribute('role', 'tabpanel')
  a.setAttribute('aria-labelledby', `pv-t-${p.id}`)
  a.hidden = true
  const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (opens in a new tab)</span>&nbsp;<span aria-hidden="true">↗</span></a>`
  a.innerHTML = `
    <p class="pv-meta">Exhibit ${n} <span aria-hidden="true">·</span> Recovered from ${p.year}</p>
    <h3 class="pv-name">${p.title}</h3>
    <p class="pv-desc">${p.description}</p>
    <p class="pv-stack"><span class="sr-only">Built with: </span>${p.stack.join('<span aria-hidden="true"> · </span><span class="sr-only">, </span>')}</p>
    <div class="pv-acts">
      <button type="button" class="pv-watch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>Watch<span class="sr-only"> the ${p.short ?? p.title} video</span></button>
      ${p.live ? ext(p.live, 'Live') : ''}${p.code ? ext(p.code, 'Code') : ''}
    </div>
    <p class="pv-set">Displayed on ${p.set}.</p>`
  a.querySelector('.pv-watch').addEventListener('click', () => watch(i))
  cards.append(a)
  panels.push(a)
})
tablist.addEventListener('keydown', (e) => {
  const k = e.key
  let i = S.target
  if (k === 'ArrowRight') i = (i + 1) % N
  else if (k === 'ArrowLeft') i = (i - 1 + N) % N
  else if (k === 'Home') i = 0
  else if (k === 'End') i = N - 1
  else return
  e.preventDefault()
  go(i)
  tabs[i].focus()
})
$('.pv-prev').addEventListener('click', () => go((S.target - 1 + N) % N, true))
$('.pv-next').addEventListener('click', () => go((S.target + 1) % N, true))
powerBtn.addEventListener('click', () => setPaused(!S.paused))

function showPanel(i) {
  tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1 })
  panels.forEach((p, k) => {
    if (k === i) { p.hidden = false; p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter') }
    else p.hidden = true
  })
}

/* ================= three ================= */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.toneMapping = THREE.NeutralToneMapping
renderer.toneMappingExposure = 1.05
const scene = new THREE.Scene()
const BG = new THREE.Color('#05090c')
scene.background = BG
scene.fog = new THREE.FogExp2(BG, 0.07)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.42
const ENV = scene.environment
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80)
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.96)
composer.addPass(bloom)
composer.addPass(new OutputPass())

/* ---------- textures drawn in code ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const woodTex = (base, dark) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h)
  for (let k = 0; k < 170; k++) {
    const y0 = rnd() * h, amp = 2 + rnd() * 9, f = 0.004 + rnd() * 0.01, ph = rnd() * 6
    g.strokeStyle = rnd() < 0.7 ? `${dark}${Math.floor(20 + rnd() * 60).toString(16)}` : `#ffffff${Math.floor(6 + rnd() * 14).toString(16).padStart(2, '0')}`
    g.lineWidth = 0.6 + rnd() * 2.6
    g.beginPath()
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp + Math.sin(x * 0.03 + ph) * 1.2)
    g.stroke()
  }
})
const grilleTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#17191c'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#050607'
  for (let y = 4; y < h; y += 9) for (let x = 4 + ((y / 9) % 2) * 4.5; x < w; x += 9) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill() }
})
const keysTex = canvasTex(512, 168, (g, w, h) => {
  g.fillStyle = '#cfc3a6'; g.fillRect(0, 0, w, h)
  const rows = [14, 14, 13, 12], kw = w / 14.6
  rows.forEach((n, r) => {
    for (let k = 0; k < n; k++) {
      const x = 6 + k * kw + r * kw * 0.3, y = 8 + r * 38
      g.fillStyle = '#b6aa8c'; g.fillRect(x, y + 3, kw - 6, 32)
      g.fillStyle = '#e4dabf'; g.fillRect(x + 2, y, kw - 10, 27)
    }
  })
  g.fillStyle = '#b6aa8c'; g.fillRect(w * 0.27, 8 + 4 * 38 - 2, w * 0.4, 8)
})
const blobTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(0, 0, w, h)
})
const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
BLACK.needsUpdate = true

/* a stand-in picture until the footage (or its poster) loads: colour bars + the name */
function testCard(p) {
  const tall = p.tv === 'pocket'
  return canvasTex(tall ? 360 : 640, tall ? 640 : 360, (g, w, h) => {
    const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
    bars.forEach((c, k) => { g.fillStyle = c; g.fillRect((k * w) / 7, 0, w / 7 + 1, h * 0.62) })
    g.fillStyle = '#101418'; g.fillRect(0, h * 0.62, w, h)
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `${tall ? 30 : 34}px Audiowide, sans-serif`
    g.fillText(p.short ?? p.title, w / 2, h * 0.78, w * 0.9)
    g.font = '600 15px Nunito, sans-serif'; g.fillStyle = '#9fb3bf'
    g.fillText('PLACEHOLDER SIGNAL', w / 2, h * 0.9)
  })
}

/* ---------- materials ---------- */
const M = {
  black: new THREE.MeshPhysicalMaterial({ color: 0x111316, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
  bezel: new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.5 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe4eaee, roughness: 0.16, metalness: 1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.28, metalness: 1 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex('#6a3a1b', '#2a1206'), roughness: 0.5 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x2c1709, roughness: 0.55 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 0.6 }),
  beige: new THREE.MeshStandardMaterial({ color: 0xd9cfb4, roughness: 0.62 }),
  beigeDark: new THREE.MeshStandardMaterial({ color: 0xbcb092, roughness: 0.66 }),
  white: new THREE.MeshPhysicalMaterial({ color: 0xc4c4be, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.15 }),
  red: new THREE.MeshPhysicalMaterial({ color: 0xc8352a, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
  gun: new THREE.MeshStandardMaterial({ color: 0x41474e, roughness: 0.36, metalness: 0.75 }),
  grille: new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.85 }),
  keys: new THREE.MeshStandardMaterial({ map: keysTex, roughness: 0.6 }),
  acrylic: new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false }),
  led: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.6) }),
  plinth: new THREE.MeshStandardMaterial({ color: 0x1b2328, roughness: 0.32, metalness: 0.35 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x0c1216, roughness: 0.3, metalness: 0.4 }),
  blob: new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }),
  // CRT glass: only its reflections, added over the picture
  glass: new THREE.MeshBasicMaterial({ color: 0x000000, combine: THREE.AddOperation, reflectivity: 0.09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
}

M.glass.envMap = ENV

/* ---------- the CRT shader ---------- */
const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const FRAG = /* glsl */ `
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
function crtMaterial(aspect, round) {
  const u = (value) => ({ value })
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uTex: u(BLACK), uCrop: u(new THREE.Vector2(1, 1)), uTime: u(0), uOpenX: u(1), uOpenY: u(1), uFlash: u(0), uWobble: u(0),
      uStatic: u(0.85), uBright: u(0.3), uCurv: u(0.11), uScan: u(0.5), uMask: u(0.22), uBleed: u(1), uRound: u(round),
      uAspect: u(aspect), uEmit: u(0), uLines: u(180), uSeed: u(Math.random() * 100),
    },
  })
}

/* ---------- geometry helpers ---------- */
const box = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat)
const cyl = (rt, rb, h, mat, seg = 32) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
function at(o, x, y, z, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o }
function rr(w, h, r, s) {
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}
function bezel(w, h, bw, rIn, depth, mat) {
  const s = rr(w + 2 * bw, h + 2 * bw, rIn + bw * 0.8, new THREE.Shape())
  s.holes.push(rr(w, h, rIn, new THREE.Path()))
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3, curveSegments: 10 })
  g.translate(0, 0, 0.01) // its back on the mount, its lip at depth + 0.02
  return new THREE.Mesh(g, mat)
}
/** a curved CRT face in a bezel; the unit's back is at z 0 (put it on the cabinet's face) */
function screenUnit({ w, h, round = 0.06, bulge = 0.035, bw = 0.04, depth = 0.04, mat = M.bezel }) {
  const g = new THREE.Group()
  const geo = new THREE.PlaneGeometry(w, h, 32, 24)
  const pos = geo.attributes.position
  for (let k = 0; k < pos.count; k++) {
    const nx = pos.getX(k) / (w / 2), ny = pos.getY(k) / (h / 2)
    pos.setZ(k, bulge * (1 - nx * nx) * (1 - ny * ny))
  }
  geo.computeVertexNormals()
  const mat2 = crtMaterial(w / h, round)
  const z = bw > 0 ? depth + 0.008 : 0.004 // the face's rim sits under the bezel's lip; its bulge comes out past it
  const mesh = at(new THREE.Mesh(geo, mat2), 0, 0, z)
  const glass = at(new THREE.Mesh(geo, M.glass), 0, 0, z + 0.002)
  glass.renderOrder = 2
  g.add(mesh, glass)
  if (bw > 0) g.add(bezel(w, h, bw, round * h, depth, mat))
  return { g, scr: { mesh, mat: mat2, w, h } }
}
function knob(r = 0.06) {
  const g = new THREE.Group()
  g.add(at(cyl(r, r * 1.06, 0.035, M.chrome), 0, 0, 0.018, Math.PI / 2))
  g.add(at(cyl(r * 0.7, r * 0.74, 0.05, M.black), 0, 0, 0.045, Math.PI / 2))
  g.add(at(box(r * 0.16, r * 0.9, 0.012, 0.004, M.chrome), 0, r * 0.25, 0.072))
  return g
}

/* ---------- the sets ---------- */
const SETS = {
  // Number Slayers: a black tube set, c. 1994
  tube() {
    const g = new THREE.Group()
    g.add(at(box(0.86, 0.06, 0.66, 0.02, M.black), 0, 0.03, -0.04))
    g.add(at(box(1.32, 1.04, 0.62, 0.05, M.black), 0, 0.6, 0))
    g.add(at(box(1.0, 0.82, 0.52, 0.12, M.black), 0, 0.64, -0.5))
    const { g: su, scr } = screenUnit({ w: 0.98, h: 0.735, round: 0.05, bulge: 0.03, bw: 0.03, depth: 0.025 })
    g.add(at(su, 0, 0.66, 0.312))
    g.add(at(box(0.32, 0.02, 0.012, 0.005, M.chrome), 0, 0.17, 0.312))
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 8), M.led), 0.54, 0.17, 0.312))
    for (let k = 0; k < 4; k++) g.add(at(box(0.05, 0.022, 0.015, 0.006, M.bezel), 0.26 + k * 0.065, 0.17, 0.31))
    return { g, scr }
  },
  // Pong: a wood console set, c. 1974
  console() {
    const g = new THREE.Group()
    for (const [x, z] of [[-0.64, 0.28], [0.64, 0.28], [-0.64, -0.28], [0.64, -0.28]])
      g.add(at(cyl(0.03, 0.018, 0.36, M.woodDark, 12), x, 0.17, z, z > 0 ? 0.14 : -0.14, 0, x > 0 ? -0.12 : 0.12))
    g.add(at(box(1.6, 1.0, 0.82, 0.05, M.wood), 0, 0.84, 0))
    g.add(at(box(1.48, 0.88, 0.03, 0.02, M.panel), 0, 0.84, 0.4))
    const { g: su, scr } = screenUnit({ w: 0.84, h: 0.63, round: 0.11, bulge: 0.05, bw: 0.045, depth: 0.03, mat: M.brass })
    g.add(at(su, -0.27, 0.86, 0.415))
    g.add(at(plane(0.34, 0.34, M.grille), 0.46, 0.74, 0.418))
    g.add(at(knob(0.06), 0.37, 1.08, 0.415))
    g.add(at(knob(0.06), 0.55, 1.08, 0.415))
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.black), 0.3, 1.34, -0.08))
    for (const s of [-1, 1]) {
      const L = 0.82, a = 0.46
      g.add(at(cyl(0.006, 0.007, L, M.chrome, 8), 0.3 + s * Math.sin(a) * L / 2, 1.38 + Math.cos(a) * L / 2, -0.08, 0, 0, -s * a))
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.chrome), 0.3 + s * Math.sin(a) * L, 1.38 + Math.cos(a) * L, -0.08))
    }
    return { g, scr }
  },
  // Jelly Resume: a space helmet set, c. 1970
  sphere() {
    const g = new THREE.Group()
    g.add(at(cyl(0.3, 0.32, 0.05, M.white, 48), 0, 0.025, 0))
    g.add(at(cyl(0.035, 0.045, 0.3, M.chrome, 16), 0, 0.2, 0))
    const cap = 0.8 // the shell's opening at the front
    const shell = at(new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 48, 0, Math.PI * 2, cap, Math.PI - cap), M.white), 0, 0.82, 0, Math.PI / 2)
    g.add(shell)
    const fz = 0.5 * Math.cos(cap)
    g.add(at(cyl(0.362, 0.362, 0.05, M.black, 64), 0, 0.82, fz - 0.02, Math.PI / 2))
    const { g: su, scr } = screenUnit({ w: 0.46, h: 0.355, round: 0.17, bulge: 0.03, bw: 0.022, depth: 0.02 })
    g.add(at(su, 0, 0.83, fz + 0.005))
    g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 10, 28), M.chrome), 0, 1.36, 0))
    return { g, scr }
  },
  // Rezmancer: a beige office terminal, c. 1984
  terminal() {
    const g = new THREE.Group()
    g.add(at(box(0.8, 1.02, 0.78, 0.06, M.beige), 0, 0.53, -0.16))
    g.add(at(box(0.66, 0.54, 0.03, 0.03, M.beigeDark), 0, 0.71, 0.23))
    const { g: su, scr } = screenUnit({ w: 0.5, h: 0.375, round: 0.07, bulge: 0.03, bw: 0.03, depth: 0.025 })
    g.add(at(su, 0, 0.71, 0.245))
    g.add(at(box(0.24, 0.016, 0.02, 0.005, M.black), 0.14, 0.3, 0.235))
    for (let k = 0; k < 5; k++) g.add(at(box(0.012, 0.18, 0.01, 0.004, M.beigeDark), -0.3 + k * 0.03, 0.26, 0.235))
    g.add(at(box(0.74, 0.045, 0.27, 0.015, M.beige), 0, 0.028, 0.5, 0.06))
    g.add(at(plane(0.68, 0.22, M.keys), 0, 0.053, 0.5, -Math.PI / 2 + 0.06))
    return { g, scr }
  },
  // Quadzilla: a pocket television, c. 1982 (a tall screen, for the phone video)
  pocket() {
    const g = new THREE.Group(), dev = new THREE.Group()
    dev.add(box(0.46, 0.84, 0.12, 0.035, M.gun))
    const { g: su, scr } = screenUnit({ w: 0.34, h: 0.56, round: 0.06, bulge: 0.015, bw: 0.022, depth: 0.012 })
    dev.add(at(su, 0, 0.09, 0.062))
    dev.add(at(plane(0.24, 0.1, M.grille), 0, -0.31, 0.061))
    dev.add(at(knob(0.035), 0.235, 0.22, 0, 0, Math.PI / 2))
    let y = 0.42, r = 0.011
    for (const L of [0.28, 0.26, 0.22]) {
      dev.add(at(cyl(r * 0.9, r, L, M.chrome, 10), -0.17 - Math.sin(0.28) * (y - 0.42 + L / 2), y + Math.cos(0.28) * L / 2, -0.02, 0, 0, 0.28))
      y += Math.cos(0.28) * L; r *= 0.75
    }
    dev.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.chrome), -0.17 - Math.sin(0.28) * (y - 0.42), y, -0.02))
    at(dev, 0, 0.5, 0, -0.12)
    g.add(dev)
    g.add(at(box(0.4, 0.05, 0.24, 0.012, M.acrylic), 0, 0.025, 0.02))
    g.add(at(box(0.32, 0.72, 0.015, 0.006, M.acrylic), 0, 0.4, -0.12, -0.2))
    g.scale.setScalar(1.3)
    return { g, scr }
  },
  // Pickleball 2079: a portable colour set, c. 1986
  portable() {
    const g = new THREE.Group()
    for (const x of [-0.4, 0.4]) for (const z of [-0.2, 0.2]) g.add(at(cyl(0.03, 0.03, 0.03, M.black, 12), x, 0.015, z))
    g.add(at(box(1.06, 0.8, 0.64, 0.07, M.red), 0, 0.43, 0))
    const { g: su, scr } = screenUnit({ w: 0.6, h: 0.45, round: 0.08, bulge: 0.03, bw: 0.045, depth: 0.025, mat: M.black })
    g.add(at(su, -0.16, 0.46, 0.322))
    g.add(at(plane(0.22, 0.3, M.grille), 0.34, 0.53, 0.321))
    g.add(at(knob(0.04), 0.28, 0.21, 0.32))
    g.add(at(knob(0.04), 0.4, 0.21, 0.32))
    g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 12, 40, Math.PI), M.black), 0, 0.84, 0))
    for (const x of [-0.3, 0.3]) g.add(at(box(0.07, 0.06, 0.1, 0.015, M.black), x, 0.85, 0))
    return { g, scr }
  },
}

/* ---------- the hall ---------- */
const floor = at(new THREE.Mesh(new THREE.CircleGeometry(40, 64), M.floor), 0, 0, 0, -Math.PI / 2)
scene.add(floor)
const track = at(new THREE.Mesh(new THREE.RingGeometry(R - 0.006, R + 0.006, 256), new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.16 })), 0, 0.002, 0, -Math.PI / 2)
scene.add(track)
scene.add(new THREE.HemisphereLight(0xa8e6ff, 0x0a0d10, 0.55))
const spill = new THREE.PointLight(0x9fdcff, 0, 4.5, 2)
scene.add(spill)

const angleOf = (s) => (s - (N - 1) / 2) * STEP
const E = PROJECTS.map((p, i) => {
  const root = new THREE.Group()
  const a = angleOf(i)
  root.position.set(R * Math.sin(a), 0, -R * Math.cos(a))
  root.rotation.y = -a
  scene.add(root)
  const tv = SETS[p.tv]()
  root.add(tv.g)
  root.updateMatrixWorld(true)
  const sp = new THREE.Vector3()
  tv.scr.mesh.getWorldPosition(sp)
  const h = SCREEN_Y - sp.y // the plinth makes up the difference
  tv.g.position.y = h
  const plinth = at(cyl(0.8, 0.84, h, M.plinth, 64), 0, h / 2, 0)
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.8, 1) })
  const ring = at(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.005, 6, 96), ringMat), 0, h, 0, Math.PI / 2)
  const box3 = new THREE.Box3().setFromObject(tv.g)
  const size = box3.getSize(new THREE.Vector3())
  const blob = at(plane(size.x * 1.25, size.z * 1.4, M.blob), 0, h + 0.002, 0, -Math.PI / 2)
  root.add(plinth, ring, blob)
  // an invisible box to click
  const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(size.x, 1), h + size.y, Math.max(size.z, 0.8)), new THREE.MeshBasicMaterial({ visible: false }))
  hit.position.set(0, (h + size.y) / 2, 0)
  hit.userData.i = i
  root.add(hit)
  const spot = new THREE.SpotLight(0xe6f7ff, 0, 0, 0.42, 0.9, 2)
  spot.position.set(0, 4.6, 1.9)
  const tgt = new THREE.Object3D()
  tgt.position.set(0, SCREEN_Y - 0.35, 0)
  root.add(spot, tgt)
  spot.target = tgt
  const e = { p, i, root, scr: tv.scr, u: tv.scr.mat.uniforms, ringMat, spot, hit, poster: testCard(p), video: null, vtex: null, tween: null, tex: null, emit: 0 }
  useTex(e, e.poster)
  new THREE.TextureLoader().load(`media/${p.id}.jpg`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
    e.poster = t
    if (e.tex !== e.vtex || !e.vtex) useTex(e, t)
  }, undefined, () => {})
  return e
})
const hitboxes = E.map((e) => e.hit)
document.fonts.ready.then(() => E.forEach((e) => { if (e.poster.isCanvasTexture) { const t = testCard(e.p); if (e.tex === e.poster) useTex(e, t); e.poster = t } }))

function useTex(e, tex) {
  e.tex = tex
  e.u.uTex.value = tex
  const img = tex.image
  const tw = img?.videoWidth || img?.width || 16, th = img?.videoHeight || img?.height || 9
  const ta = tw / th, sa = e.scr.w / e.scr.h
  e.u.uCrop.value.set(ta > sa ? sa / ta : 1, ta > sa ? 1 : ta / sa) // cover
}
function applyCrt() {
  const c = CRT[S.crt]
  E.forEach((e) => { e.u.uCurv.value = c.curv; e.u.uScan.value = c.scan; e.u.uMask.value = c.mask; e.u.uBleed.value = c.bleed })
}
applyCrt()
E.forEach((e) => setIdle(e, true))

/* ================= video ================= */
function videoOf(e) {
  if (e.video) return e.video
  const v = document.createElement('video')
  Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' })
  v.src = `media/${e.p.id}.mp4`
  v.addEventListener('loadeddata', () => {
    e.vtex = new THREE.VideoTexture(v)
    e.vtex.colorSpace = THREE.SRGBColorSpace
    if (S.on === e.i && !v.paused) useTex(e, e.vtex)
  }, { once: true })
  // a paused video never uploads a frame: its set shows the poster until it plays
  v.addEventListener('playing', () => { if (S.on === e.i && e.vtex) useTex(e, e.vtex) })
  e.video = v
  return v
}
function startVideo(e) {
  const v = videoOf(e)
  try { v.currentTime = 0 } catch {}
  if (!S.paused && S.visible) v.play().catch(() => {})
  else useTex(e, e.poster)
}
function stopVideo(e) {
  e.video?.pause()
  useTex(e, e.poster)
}

/* ================= power on / off ================= */
function tween(e, dur, fn, done) { e.tween = { t: 0, dur, fn, done } }
function setIdle(e, instant) {
  const v = IDLE[S.idle]
  e.idleTo = v
  if (instant) { e.u.uOpenX.value = e.u.uOpenY.value = v.open; e.u.uBright.value = v.bright; e.u.uStatic.value = v.stat; e.u.uFlash.value = 0 }
}
function powerOn(i) {
  const e = E[i]
  S.on = i
  e.idleTo = null
  startVideo(e)
  const c = CRT[S.crt]
  if (S.rm) { Object.assign(e, { tween: null }); set(e.u, { uOpenX: 1, uOpenY: 1, uFlash: 0, uWobble: c.wobble, uStatic: 0, uBright: 1.05 }); return }
  sfx.on()
  tween(e, 1.1, (t) => set(e.u, {
    uOpenX: easeOut(clamp(t / 0.13)),
    uOpenY: easeOut(clamp((t - 0.11) / 0.24)),
    uFlash: t < 0.11 ? 1.5 : lerp(1.3, 0, clamp((t - 0.11) / 0.5)),
    uStatic: lerp(0.5, 0, clamp((t - 0.2) / 0.45)),
    uWobble: c.wobble + (1 - clamp((t - 0.25) / 0.8)) * Math.sin(t * 26) * 1.1,
    uBright: lerp(0.75, 1.05, clamp((t - 0.2) / 0.5)),
  }))
}
function powerOff(i) {
  const e = E[i]
  if (S.on === i) S.on = -1
  stopVideo(e)
  if (S.rm) { e.tween = null; setIdle(e, true); return }
  sfx.off()
  const from = e.u.uBright.value
  tween(e, 0.34, (t) => set(e.u, {
    uOpenY: 1 - easeOut(clamp(t / 0.13)),
    uOpenX: 1 - easeOut(clamp((t - 0.12) / 0.13)),
    uFlash: t < 0.12 ? lerp(0, 1.1, t / 0.12) : lerp(1.1, 0, clamp((t - 0.22) / 0.12)),
    uBright: from, uStatic: 0, uWobble: 0,
  }), () => setIdle(e))
}
const set = (u, o) => { for (const k in o) u[k].value = o[k] }

/* ================= navigation ================= */
function go(i, fromArrow) {
  i = ((i % N) + N) % N
  interacted()
  if (i === S.target) return
  if (S.on >= 0 && S.on !== i) powerOff(S.on)
  S.target = i
  if (S.rm) { S.pos = i; S.vel = 0 }
  if (fromArrow) live.textContent = `Exhibit ${i + 1} of ${N}: ${PROJECTS[i].title}`
}
function watch(i) {
  interacted()
  if (S.on === i && !E[i].tween) return openHolo(i)
  go(i)
  S.pendingHolo = i
}
function setPaused(p) {
  S.paused = p
  powerBtn.classList.toggle('paused', p)
  powerBtn.setAttribute('aria-label', p ? 'Play the televisions' : 'Pause the televisions')
  powerBtn.querySelector('.pv-power-l').textContent = p ? 'Play' : 'Pause'
  const v = S.on >= 0 ? E[S.on].video : null
  if (v) p ? v.pause() : v.play().catch(() => {})
}
let didInteract = false
function interacted() { if (!didInteract) { didInteract = true; hint.classList.add('gone') } }

/* ---------- pointer: drag the hall, click a set ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
function pick(ev) {
  const r = canvas.getBoundingClientRect()
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  const hit = ray.intersectObjects(hitboxes, false)[0]
  return hit ? hit.object.userData.i : -1
}
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 || S.holo >= 0) return
  S.drag = { x: ev.clientX, y: ev.clientY, pos0: S.pos, axis: null, lastX: ev.clientX, lastT: performance.now(), v: 0, id: ev.pointerId }
})
canvas.addEventListener('pointermove', (ev) => {
  const d = S.drag
  if (!d) {
    if (ev.pointerType === 'mouse') { S.hover = pick(ev); canvas.classList.toggle('over', S.hover >= 0) }
    return
  }
  const dx = ev.clientX - d.x, dy = ev.clientY - d.y
  if (!d.axis && Math.hypot(dx, dy) > 7) {
    d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (d.axis === 'x') { canvas.setPointerCapture(d.id); canvas.classList.add('dragging'); interacted() }
  }
  if (d.axis !== 'x') return
  const per = stage.clientWidth * (S.wide ? 0.26 : 0.5)
  const now = performance.now(), dt = Math.max(1, now - d.lastT)
  d.v = lerp(d.v, -(ev.clientX - d.lastX) / per / (dt / 1000), 0.4)
  d.lastX = ev.clientX; d.lastT = now
  S.pos = clamp(d.pos0 - dx / per, -0.35, N - 1 + 0.35)
  S.vel = 0
  if (S.on >= 0 && Math.abs(S.pos - S.on) > 0.3) powerOff(S.on)
})
function endDrag(ev, cancelled) {
  const d = S.drag
  S.drag = null
  canvas.classList.remove('dragging')
  if (!d) return
  if (d.axis === 'x') {
    const to = clamp(Math.round(S.pos + clamp(d.v, -6, 6) * 0.16), 0, N - 1)
    S.vel = d.v
    if (S.on >= 0 && S.on !== to) powerOff(S.on)
    S.target = to
    return
  }
  if (cancelled || d.axis) return
  const i = pick(ev)
  if (i < 0) return
  interacted()
  if (i === S.on && !E[i].tween) openHolo(i)
  else go(i)
}
canvas.addEventListener('pointerup', (ev) => endDrag(ev, false))
canvas.addEventListener('pointercancel', (ev) => endDrag(ev, true))
canvas.addEventListener('pointerleave', () => { S.hover = -1; canvas.classList.remove('over') })
// a sideways trackpad swipe moves the hall too (vertical wheel stays the page's)
let wheelAcc = 0, wheelT = 0
canvas.addEventListener('wheel', (ev) => {
  if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY) || S.holo >= 0) return
  ev.preventDefault()
  const now = performance.now()
  if (now - wheelT > 380) wheelAcc = 0
  wheelAcc += ev.deltaX
  if (Math.abs(wheelAcc) > 60) { const step = Math.sign(wheelAcc); wheelAcc = 0; wheelT = now; go(clamp(S.target + step, 0, N - 1)) }
}, { passive: false })

/* ================= the loop ================= */
const camLook = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3()
function placeCamera(t) {
  const sway = S.rm || S.paused || S.holo >= 0 ? 0 : Math.sin(t * 0.21) * 0.012
  const a = angleOf(S.pos), r = R - S.camD - S.hc * holoBack()
  camera.position.set(r * Math.sin(a + sway), (S.wide ? 1.74 : 1.62) + (S.rm || S.paused ? 0 : Math.sin(t * 0.33) * 0.015), -r * Math.cos(a + sway))
  camLook.set(R * Math.sin(a), SCREEN_Y - (S.wide ? 0.06 : 0.12) + S.hc * S.lookUp, -R * Math.cos(a))
  camera.lookAt(camLook)
  // the hall sits right of the card; with the hologram up, the set comes to the middle
  const w = stage.clientWidth, h = stage.clientHeight, ox = S.wide ? -w * 0.13 * (1 - S.hc) : 0
  if (ox !== S.ox) { S.ox = ox; if (ox) camera.setViewOffset(w, h, ox, 0, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix() }
}
const holoBack = () => (S.wide ? 1.9 : 1.3)
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight
  S.wide = w > 760
  renderer.setPixelRatio(Math.min(devicePixelRatio, S.wide ? 1.75 : 2))
  renderer.setSize(w, h, false)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(w, h)
  camera.aspect = w / h
  camera.fov = S.wide ? 30 : 34
  S.camD = S.wide ? 4.4 : 3.55
  S.ox = null
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(stage)
resize()
S.near = START
showPanel(START)

const sampleCv = Object.assign(document.createElement('canvas'), { width: 4, height: 4 })
const sampleG = sampleCv.getContext('2d', { willReadFrequently: true })
const spillColor = new THREE.Color(0x9fdcff), spillTo = new THREE.Color(0x9fdcff)
let frameN = 0, last = performance.now()

function step(dt, now) {
  if (!S.paused && !S.rm) S.time += dt
  S.hc = S.rm ? S.hcTo : lerp(S.hc, S.hcTo, 1 - Math.exp(-dt * 5.5))
  if (Math.abs(S.hc - S.hcTo) < 0.001) S.hc = S.hcTo
  // the camera: a spring to the target, unless dragging
  if (!S.drag || S.drag.axis !== 'x') {
    if (S.rm) { S.pos = S.target; S.vel = 0 }
    else {
      const k = 34, c = 2 * Math.sqrt(k) * 1.02
      S.vel += (k * (S.target - S.pos) - c * S.vel) * dt
      S.vel = clamp(S.vel, -9, 9)
      S.pos += S.vel * dt
      if (Math.abs(S.target - S.pos) < 0.002 && Math.abs(S.vel) < 0.02) { S.pos = S.target; S.vel = 0 }
    }
  }
  const near = clamp(Math.round(S.pos), 0, N - 1)
  if (near !== S.near) { S.near = near; showPanel(near) }
  placeCamera(S.time)

  // power the set in front once the hall stops
  const still = S.pos === S.target && !S.drag && S.visible
  if (still && S.on !== S.target && S.holo < 0) { S.settle += dt; if (S.settle > 0.06) powerOn(S.target) } else S.settle = 0
  if (S.pendingHolo >= 0 && S.on === S.pendingHolo && !E[S.on].tween) { const i = S.pendingHolo; S.pendingHolo = -1; openHolo(i) }

  for (const e of E) {
    e.u.uTime.value = S.time
    if (e.tween) {
      const tw = e.tween
      tw.t += dt
      tw.fn(Math.min(tw.t, tw.dur))
      if (tw.t >= tw.dur) { e.tween = null; tw.done?.() }
    } else if (e.idleTo) {
      // idle sets ease to the chosen look (+ a little when hovered)
      const v = e.idleTo, hov = S.hover === e.i ? 1 : 0
      const k = S.rm ? 1 : 1 - Math.exp(-dt * 7)
      const open = Math.max(v.open, hov && !v.open ? 1 : 0)
      e.u.uOpenX.value = lerp(e.u.uOpenX.value, open, k)
      e.u.uOpenY.value = lerp(e.u.uOpenY.value, open, k)
      e.u.uBright.value = lerp(e.u.uBright.value, v.bright + hov * 0.22 + (hov && !v.open ? 0.3 : 0), k)
      e.u.uStatic.value = lerp(e.u.uStatic.value, hov && v.stat > 0.5 ? 0.45 : v.stat, k)
      e.u.uFlash.value = lerp(e.u.uFlash.value, 0, k)
    }
    e.u.uEmit.value = lerp(e.u.uEmit.value, e.emit, S.rm ? 1 : 1 - Math.exp(-dt * 6))
    // lights: the set in front gets the spot, the rest a little
    const lit = e.i === S.near ? 1 : 0
    e.spot.intensity = lerp(e.spot.intensity, lit ? 60 : 16 + (S.hover === e.i ? 18 : 0), 1 - Math.exp(-dt * 5))
    const rk = lit ? 2.2 : 0.5
    e.ringMat.color.setRGB(0.25 * rk, 0.8 * rk, 1 * rk)
    // scanlines: about 3 device pixels each, whatever the distance
    e.scr.mesh.getWorldPosition(tmp)
    tmp2.copy(tmp).y += e.scr.h / 2
    tmp.y -= e.scr.h / 2
    tmp.project(camera); tmp2.project(camera)
    const px = Math.abs(tmp2.y - tmp.y) / 2 * renderer.domElement.height
    e.u.uLines.value = clamp(px / 3.2, 50, 240)
  }

  // the lit set's light spills on its plinth and the floor, in its picture's colour
  const on = S.on >= 0 ? E[S.on] : null
  if (on) {
    on.scr.mesh.getWorldPosition(tmp)
    tmp2.set(0, 0, 0.95).applyQuaternion(on.root.quaternion)
    spill.position.copy(tmp).add(tmp2)
    if (++frameN % 8 === 0 && on.video && on.video.readyState >= 2) {
      try {
        sampleG.drawImage(on.video, 0, 0, 4, 4)
        const d = sampleG.getImageData(0, 0, 4, 4).data
        let r = 0, g = 0, b = 0
        for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2] }
        spillTo.setRGB(r / 16 / 255, g / 16 / 255, b / 16 / 255, THREE.SRGBColorSpace).lerp(new THREE.Color(1, 1, 1), 0.25)
      } catch {}
    }
  }
  spillColor.lerp(spillTo, 1 - Math.exp(-dt * 4))
  spill.color.copy(spillColor)
  const want = on ? (on.emit ? 7 : 2.6 * on.u.uBright.value * (on.u.uOpenY.value)) : 0
  spill.intensity = lerp(spill.intensity, want, 1 - Math.exp(-dt * 8))

  if (S.holo >= 0) holoFrame()
}
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (!S.visible && S.holo < 0) return
  step(dt, now)
  composer.render()
}
new IntersectionObserver(([en]) => {
  S.visible = en.isIntersecting
  const v = S.on >= 0 ? E[S.on].video : null
  if (v) S.visible && !S.paused ? v.play().catch(() => {}) : v.pause()
}, { threshold: 0.15 }).observe(stage)
document.addEventListener('visibilitychange', () => { if (document.hidden) E.forEach((e) => e.video?.pause()) })
requestAnimationFrame(frame)

/* ================= the hologram ================= */
const dlg = $('.holo'), panel = $('.holo-panel'), hv = $('.holo-v'), bar = $('.holo-bar'), beam = $('.holo-beam'), poly = $('.holo-beam polygon'), grad = $('#beam-g')
const H = { t: 0, dir: 0, i: -1, quad: null, start: null, end: null, crop: [1, 1], W: 0, Hh: 0, aspect: 16 / 9 }

function screenQuad(e) {
  const { w, h, mesh } = e.scr
  mesh.updateWorldMatrix(true, false)
  const r = canvas.getBoundingClientRect()
  return [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]].map(([x, y]) => {
    const v = new THREE.Vector3(x * 0.97, y * 0.97, 0.01).applyMatrix4(mesh.matrixWorld).project(camera)
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height]
  })
}
/** the unit square → a quad (TL TR BR BL), as a projective map */
function sq2quad(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  let g = 0, h = 0
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / den
    h = (dx1 * dy3 - dx3 * dy1) / den
  }
  return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h }
}
const mapH = (M, u, v) => { const w = M.g * u + M.h * v + 1; return [(M.a * u + M.b * v + M.c) / w, (M.d * u + M.e * v + M.f) / w] }
const cssH = (M, W, Hh) => `matrix3d(${M.a / W},${M.d / W},0,${M.g / W},${M.b / Hh},${M.e / Hh},0,${M.h / Hh},0,0,1,0,${M.c},${M.f},0,1)`
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], up = []
  for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (const q of p.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
const BAR_H = 60
function finalRect(aspect) {
  const vw = innerWidth, vh = innerHeight, narrow = vw < 760
  const top = narrow ? 16 + BAR_H + 8 : Math.max(16 + BAR_H, vh * 0.06 + BAR_H)
  const maxW = Math.min(vw - (narrow ? 32 : 96), 1000), maxH = vh * (narrow ? 0.5 : 0.56) - top + (narrow ? 60 : 40)
  let w = maxW, h = w / aspect
  if (h > maxH) { h = maxH; w = h * aspect }
  return { x: (vw - w) / 2, y: top, w, h }
}
function layoutHolo() {
  const f = finalRect(H.aspect)
  H.W = f.w; H.Hh = f.h
  panel.style.width = `${f.w}px`; panel.style.height = `${f.h}px`
  H.end = [[f.x, f.y], [f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x, f.y + f.h]]
  bar.style.left = `${f.x}px`; bar.style.top = `${f.y - BAR_H}px`; bar.style.width = `${f.w}px`; bar.style.height = `${BAR_H - 6}px`
  // the camera pulls back and looks up, so the set lands below the hologram: where, on the stage, in NDC
  const r = stage.getBoundingClientRect(), vh = innerHeight
  const want = clamp((f.y + f.h + vh) / 2 + (S.wide ? 30 : 10), r.top + r.height * 0.3, r.bottom - r.height * 0.19)
  const ndcY = 1 - (2 * (want - r.top)) / r.height
  S.lookUp = -ndcY * (S.camD + holoBack()) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
}
/** the full picture's corners while its cropped middle sits on the glass */
function startCorners() {
  const [cx, cy] = H.crop
  const Hq = sq2quad(H.quad)
  const u0 = -(1 - cx) / 2 / cx, u1 = 1 + (1 - cx) / 2 / cx, v0 = -(1 - cy) / 2 / cy, v1 = 1 + (1 - cy) / 2 / cy
  return [mapH(Hq, u0, v0), mapH(Hq, u1, v0), mapH(Hq, u1, v1), mapH(Hq, u0, v1)]
}
function openHolo(i) {
  if (S.holo >= 0) return
  const e = E[i], p = e.p
  S.holo = H.i = i
  const src = e.video
  const vw = src?.videoWidth, vh = src?.videoHeight
  H.aspect = vw && vh ? vw / vh : p.tv === 'pocket' ? 9 / 16 : 16 / 9
  H.crop = [e.u.uCrop.value.x, e.u.uCrop.value.y]
  hv.src = `media/${p.id}.mp4`
  hv.poster = e.poster.image?.src ?? ''
  try { hv.currentTime = src?.currentTime ?? 0 } catch {}
  hv.muted = true
  hv.play().catch(() => {})
  src?.pause()
  $('.holo-t').textContent = p.title
  const liveA = bar.querySelector('[data-h="live"]')
  liveA.hidden = !p.live
  if (p.live) liveA.href = p.live
  playLabel(false)
  bar.querySelector('[data-h="sound"]').hidden = true
  bar.classList.remove('on')
  dlg.classList.remove('closing')
  dlg.showModal()
  document.documentElement.style.overflow = 'hidden'
  layoutHolo()
  S.hcTo = 1
  e.emit = 0.85
  sfx.holo()
  if (S.rm) { H.t = 1; H.dir = 0; panel.style.opacity = '0'; panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }); holoDone() }
  else { H.t = 0; H.dir = 1; panel.style.opacity = '1'; panel.classList.remove('flicker'); beam.classList.remove('idle') }
  holoFrame()
  setTimeout(() => {
    const a = hv.audioTracks?.length || hv.mozHasAudio || hv.webkitAudioDecodedByteCount > 0
    bar.querySelector('[data-h="sound"]').hidden = !a
  }, 900)
}
function holoDone() {
  bar.classList.add('on')
  beam.classList.add('idle')
  if (!S.rm) { void panel.offsetWidth; panel.classList.add('flicker') }
}
function closeHolo() {
  if (S.holo < 0 || H.dir === -1) return
  bar.classList.remove('on')
  beam.classList.remove('idle')
  panel.classList.remove('flicker')
  sfx.holoClose()
  dlg.classList.add('closing')
  S.hcTo = 0
  if (S.rm) { panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(finishClose); return }
  H.dir = -1
}
function finishClose() {
  const e = E[H.i]
  dlg.close()
  dlg.classList.remove('closing')
  document.documentElement.style.overflow = ''
  e.emit = 0
  if (e.video) {
    try { e.video.currentTime = hv.currentTime } catch {}
    if (!S.paused) e.video.play().catch(() => {})
  }
  if (!S.rm) { e.u.uFlash.value = 0.9; tween(e, 0.4, (t) => { e.u.uFlash.value = lerp(0.9, 0, t / 0.4) }) }
  hv.pause()
  hv.removeAttribute('src')
  hv.load()
  S.holo = H.i = -1
  H.dir = 0
}
let lastHolo = performance.now()
function holoFrame() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastHolo) / 1000)
  lastHolo = now
  if (H.dir) {
    H.t = clamp(H.t + (H.dir > 0 ? dt / 0.78 : -dt / 0.5))
    if (H.dir > 0 && H.t >= 1) { H.dir = 0; holoDone() }
    if (H.dir < 0 && H.t <= 0) { finishClose(); return }
  }
  H.quad = screenQuad(E[H.i])
  const k = H.dir < 0 ? easeInOut(H.t) : easeOut(H.t)
  const start = startCorners()
  const pts = start.map((s, n) => [lerp(s[0], H.end[n][0], k), lerp(s[1], H.end[n][1], k)])
  const M2 = sq2quad(pts)
  panel.style.transform = cssH(M2, H.W, H.Hh)
  const [cx, cy] = H.crop
  const ix = ((1 - cx) / 2) * (1 - k), iy = ((1 - cy) / 2) * (1 - k)
  panel.style.clipPath = `inset(${iy * 100}% ${ix * 100}% ${iy * 100}% ${ix * 100}%)`
  const vis = [mapH(M2, ix, iy), mapH(M2, 1 - ix, iy), mapH(M2, 1 - ix, 1 - iy), mapH(M2, ix, 1 - iy)]
  poly.setAttribute('points', hull(H.quad.concat(vis)).map((q) => q.join(',')).join(' '))
  const qc = H.quad.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0])
  const pc = vis.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0])
  grad.setAttribute('x1', qc[0]); grad.setAttribute('y1', qc[1]); grad.setAttribute('x2', pc[0]); grad.setAttribute('y2', pc[1])
  dlg.style.setProperty('--tx', `${qc[0]}px`)
  dlg.style.setProperty('--ty', `${qc[1]}px`)
  beam.style.opacity = S.rm ? '0.35' : String(0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.15)) + (H.dir === 0 ? 0.35 : 0))
}
dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); closeHolo() })
let downOnBackdrop = false
dlg.addEventListener('pointerdown', (ev) => { downOnBackdrop = ev.target === dlg || ev.target === beam })
dlg.addEventListener('click', (ev) => { if ((ev.target === dlg || ev.target === beam) && downOnBackdrop) closeHolo(); downOnBackdrop = false })
function playLabel(paused) {
  const b = bar.querySelector('[data-h="play"]'), l = paused ? 'Play' : 'Pause'
  b.classList.toggle('paused', paused)
  b.setAttribute('aria-label', l)
  b.querySelector('.lbl').textContent = l
}
bar.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-h]')
  if (!b) return
  const h = b.dataset.h
  if (h === 'close') closeHolo()
  else if (h === 'play') { if (hv.paused) hv.play(); else hv.pause(); playLabel(hv.paused) }
  else if (h === 'sound') { hv.muted = !hv.muted; const l = hv.muted ? 'Sound on' : 'Sound off'; b.setAttribute('aria-label', l); b.querySelector('.lbl').textContent = l }
  else if (h === 'full') (hv.requestFullscreen?.() ?? hv.webkitEnterFullscreen?.())
})
addEventListener('resize', () => { if (S.holo >= 0) { layoutHolo(); holoFrame() } })

/* ================= sound effects (mock bar: Sound FX) ================= */
const sfx = (() => {
  let ac = null, out = null, noiseBuf = null
  const ctx = () => {
    if (!ac) {
      ac = new AudioContext()
      out = ac.createGain(); out.gain.value = 0.6; out.connect(ac.destination)
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1
    }
    if (ac.state === 'suspended') ac.resume()
    return ac
  }
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d) }
  function osc(type, f0, f1, t, dur, peak, a = 0.005) {
    const o = ac.createOscillator(), g = ac.createGain()
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    env(g, t, a, peak, dur); o.connect(g).connect(out); o.start(t); o.stop(t + a + dur + 0.05)
    return o
  }
  function noise(t, dur, peak, type, f, q = 0.7, a = 0.004) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain()
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q
    env(g, t, a, peak, dur); s.connect(fl).connect(g).connect(out); s.start(t); s.stop(t + a + dur + 0.05)
    return fl
  }
  return {
    on() {
      if (!S.sfx) return
      const t = ctx().currentTime
      osc('sine', 95, 36, t, 0.3, 0.5) // the relay thunk
      const lp = ac.createBiquadFilter(), g = ac.createGain(), o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain()
      o.type = 'sawtooth'; o.frequency.value = 60; lp.type = 'lowpass'; lp.frequency.value = 320
      lfo.frequency.value = 7; lg.gain.value = 0.04; lfo.connect(lg).connect(g.gain)
      env(g, t + 0.04, 0.05, 0.09, 0.75); o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + 1); lfo.start(t); lfo.stop(t + 1) // degauss
      noise(t + 0.02, 0.4, 0.07, 'highpass', 2500) // static crackle
      osc('sine', 12500, 0, t + 0.1, 1.4, 0.006, 0.2) // the flyback whine
    },
    off() {
      if (!S.sfx) return
      const t = ctx().currentTime
      osc('sine', 420, 70, t, 0.14, 0.12)
      noise(t, 0.1, 0.05, 'bandpass', 3200)
    },
    holo() {
      if (!S.sfx) return
      const t = ctx().currentTime
      osc('sine', 330, 990, t, 0.7, 0.07, 0.05)
      osc('triangle', 332, 1000, t + 0.02, 0.7, 0.04, 0.05)
      const f = noise(t, 0.75, 0.05, 'bandpass', 600, 2.5, 0.08)
      f.frequency.exponentialRampToValueAtTime(7000, t + 0.75)
    },
    holoClose() {
      if (!S.sfx) return
      const t = ctx().currentTime
      osc('sine', 990, 260, t, 0.45, 0.06, 0.02)
      noise(t, 0.35, 0.04, 'bandpass', 4000, 2)
    },
  }
})()

/* ================= the mock bar ================= */
document.querySelectorAll('.mock .seg').forEach((seg) => seg.addEventListener('click', (ev) => {
  const b = ev.target.closest('button')
  if (!b) return
  seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
  if (seg.dataset.set === 'idle') { S.idle = b.dataset.v; E.forEach((e) => { if (e.i !== S.on && !e.tween) setIdle(e) }) }
  else { S.crt = b.dataset.v; applyCrt(); if (S.on >= 0 && !E[S.on].tween) E[S.on].u.uWobble.value = CRT[S.crt].wobble }
}))
document.querySelectorAll('.mock .tog').forEach((b) => b.addEventListener('click', () => {
  const on = b.getAttribute('aria-pressed') !== 'true'
  b.setAttribute('aria-pressed', String(on))
  if (b.dataset.tog === 'sfx') { S.sfx = on; if (on) sfx.on() }
  else setRm(on)
}))
function setRm(on) {
  S.rm = on
  document.documentElement.classList.toggle('rm', on)
  setPaused(on)
}
if (S.rm) { document.documentElement.classList.add('rm'); $('[data-tog="rm"]').setAttribute('aria-pressed', 'true'); setPaused(true) }

window.__vault = { screenQuad, bloom, S, E, go, watch, openHolo, closeHolo, camera, renderer, setRm, setPaused }
