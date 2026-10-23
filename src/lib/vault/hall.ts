/**
 * The Relic Vault's hall, ported from the mockup: the renderer (Neutral tone mapping), the dark fogged room lit by a
 * RoomEnvironment (made once), the floor and the cyan track, the hemisphere light, the screen's spill light, the
 * bloom composer, and the textures drawn in code (wood, grille, keys, the contact blob) for the sets' materials.
 */

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { R } from './math'
import { createMaterials, type Mats } from './sets'

export const BG = '#05090c'

/** PMREMGenerator's private build of its passes (three 0.182) */
type PmremInternals = {
  _setSize?(cubeSize: number): void
  _allocateTargets?(): THREE.WebGLRenderTarget
  _blurMaterial?: THREE.ShaderMaterial | null
  _ggxMaterial?: THREE.ShaderMaterial | null
  _pingPongRenderTarget?: THREE.WebGLRenderTarget | null
}

export type Hall = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  composer: EffectComposer
  bloom: UnrealBloomPass
  /** the lit set's light on its plinth and the floor, in its picture's colour */
  spill: THREE.PointLight
  /** the sets' materials (decorate() makes them) */
  M: Mats
  /*
   * The build, a step per frame (no long task while the section mounts, on a 4×-throttled CPU): createHall (the
   * renderer, on a context made a frame before), post() (the passes), decorate(), the environment (its shaders
   * compiled in parallel, then first drawn in a tiny target, then made), the sets (sets.ts), targets(), then
   * compile(): every shader the first frame needs, in the variants the composer draws with, compiled in parallel
   * where the browser can (KHR_parallel_shader_compile). Shaders compiled for the canvas instead of the composer's
   * target, or left to the first frame, cost that frame over 100 ms.
   */
  /** the composer: the scene, the bloom, the output (tone mapping and sRGB) */
  post(): void
  /** the textures drawn in code, the materials, the floor, the track and the hemisphere light */
  decorate(): void
  /** environment()'s room shaders, compiled in parallel */
  prepareRoom(): Promise<void>
  /** PMREM's own shaders (its background, blur and GGX passes), compiled in parallel */
  preparePasses(): Promise<void>
  /** the first use of those shaders, in a tiny target */
  warmEnvironment(): void
  /** the RoomEnvironment's reflections, made once */
  environment(): void
  /** the composer's and the bloom's render targets, allocated */
  targets(): void
  /** the scene's and the passes' shaders, for the targets they draw into */
  compile(): Promise<void>
  dispose(): void
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}

/** the textures drawn in code (seeded, so the wood is the same every visit) */
function drawTextures() {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const wood = (base: string, dark: string) =>
    canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = base
      g.fillRect(0, 0, w, h)
      for (let k = 0; k < 170; k++) {
        const y0 = rnd() * h
        const amp = 2 + rnd() * 9
        const f = 0.004 + rnd() * 0.01
        const ph = rnd() * 6
        g.strokeStyle =
          rnd() < 0.7
            ? `${dark}${Math.floor(20 + rnd() * 60).toString(16)}`
            : `#ffffff${Math.floor(6 + rnd() * 14)
                .toString(16)
                .padStart(2, '0')}`
        g.lineWidth = 0.6 + rnd() * 2.6
        g.beginPath()
        for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp + Math.sin(x * 0.03 + ph) * 1.2)
        g.stroke()
      }
    })
  const grille = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#17191c'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#050607'
    for (let y = 4; y < h; y += 9)
      for (let x = 4 + ((y / 9) % 2) * 4.5; x < w; x += 9) {
        g.beginPath()
        g.arc(x, y, 2.4, 0, 7)
        g.fill()
      }
  })
  const keys = canvasTex(512, 168, (g, w) => {
    g.fillStyle = '#cfc3a6'
    g.fillRect(0, 0, w, 168)
    const rows = [14, 14, 13, 12]
    const kw = w / 14.6
    rows.forEach((n, r) => {
      for (let k = 0; k < n; k++) {
        const x = 6 + k * kw + r * kw * 0.3
        const y = 8 + r * 38
        g.fillStyle = '#b6aa8c'
        g.fillRect(x, y + 3, kw - 6, 32)
        g.fillStyle = '#e4dabf'
        g.fillRect(x + 2, y, kw - 10, 27)
      }
    })
    g.fillStyle = '#b6aa8c'
    g.fillRect(w * 0.27, 8 + 4 * 38 - 2, w * 0.4, 8)
  })
  const blob = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    gr.addColorStop(0, 'rgba(0,0,0,.75)')
    gr.addColorStop(0.55, 'rgba(0,0,0,.35)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
  })
  return { wood: wood('#6a3a1b', '#2a1206'), grille, keys, blob }
}

/** the context three would make (opaque: the hall's background clears it to alpha 1 anyway) */
export const CONTEXT: WebGLContextAttributes = {
  alpha: false,
  depth: true,
  stencil: false,
  antialias: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false,
}

/** the hall's renderer, on a WebGL2 context made a frame before (see CONTEXT) */
export function createHall(canvas: HTMLCanvasElement, context: WebGL2RenderingContext): Hall {
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, powerPreference: 'high-performance' })
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.05
  const scene = new THREE.Scene()
  const bg = new THREE.Color(BG)
  scene.background = bg
  scene.fog = new THREE.FogExp2(bg, 0.07)
  let env: THREE.Texture | null = null
  let tex: ReturnType<typeof drawTextures> | null = null
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80)
  let composer = null as unknown as EffectComposer
  let bloom = null as unknown as UnrealBloomPass
  let output = null as unknown as OutputPass
  let pmrem: THREE.PMREMGenerator | null = null
  let room: RoomEnvironment | null = null
  const spill = new THREE.PointLight(0x9fdcff, 0, 4.5, 2)
  scene.add(spill)

  // the environment's scenes, compiled for (and first drawn into) a tiny target: linear, no tone mapping, as PMREM draws
  const tiny = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false })
  const cube = new THREE.PerspectiveCamera(90, 1, 0.1, 100)
  const warmScenes: THREE.Scene[] = []
  const compileInto = async (s: THREE.Scene) => {
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(tiny)
    const done = renderer.compileAsync(s, cube)
    renderer.setRenderTarget(prev)
    warmScenes.push(s)
    await done
  }

  const hall: Hall = {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    spill,
    M: null as unknown as Mats,
    post() {
      composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.96)
      composer.addPass(bloom)
      output = new OutputPass()
      composer.addPass(output)
      const size = renderer.getSize(new THREE.Vector2())
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(size.x, size.y)
      hall.composer = composer
      hall.bloom = bloom
    },
    decorate() {
      tex = drawTextures()
      hall.M = createMaterials(tex)
      const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x0c1216, roughness: 0.3, metalness: 0.4 }))
      floor.rotation.x = -Math.PI / 2
      const track = new THREE.Mesh(
        new THREE.RingGeometry(R - 0.006, R + 0.006, 256),
        new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.16 }),
      )
      track.position.y = 0.002
      track.rotation.x = -Math.PI / 2
      scene.add(floor, track, new THREE.HemisphereLight(0xa8e6ff, 0x0a0d10, 0.55))
      Object.values(tex).forEach((t) => renderer.initTexture(t))
    },
    async prepareRoom() {
      pmrem = new THREE.PMREMGenerator(renderer)
      room = new RoomEnvironment()
      await compileInto(room)
    },
    async preparePasses() {
      // PMREM's own passes are private: make them the way fromScene will (same size, so it keeps these materials).
      // Pinned to three 0.182.x; if they're not there, fromScene still works, it just compiles them itself
      const p = (pmrem ??= new THREE.PMREMGenerator(renderer)) as unknown as PmremInternals
      const quad = new THREE.PlaneGeometry(2, 2)
      const flat = new THREE.Scene()
      flat.add(new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false })))
      if (typeof p._setSize === 'function' && typeof p._allocateTargets === 'function') {
        p._setSize(256)
        p._allocateTargets().dispose()
        for (const m of [p._blurMaterial, p._ggxMaterial]) if (m) flat.add(new THREE.Mesh(quad, m))
        if (p._pingPongRenderTarget) renderer.initRenderTarget(p._pingPongRenderTarget)
      }
      await compileInto(flat)
    },
    warmEnvironment() {
      // their first use (uniforms, buffers) in a frame of its own, not in environment()'s
      const prev = renderer.getRenderTarget()
      renderer.setRenderTarget(tiny)
      for (const s of warmScenes) renderer.render(s, cube)
      renderer.setRenderTarget(prev)
    },
    environment() {
      if (env) return
      pmrem ??= new THREE.PMREMGenerator(renderer)
      room ??= new RoomEnvironment()
      env = pmrem.fromScene(room, 0.04).texture
      room.dispose()
      pmrem.dispose()
      room = pmrem = null
      for (const s of warmScenes.splice(0)) s.traverse((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.dispose())
      tiny.dispose()
      scene.environment = env
      scene.environmentIntensity = 0.42
      hall.M.glass.envMap = env
      hall.M.glass.needsUpdate = true
    },
    targets() {
      for (const t of [composer.renderTarget1, composer.renderTarget2, bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical])
        renderer.initRenderTarget(t)
    },
    async compile() {
      // the scene draws into the composer's target (linear, no tone mapping: the output pass does both), so compile
      // those variants, not the canvas's; the bloom's passes draw into its own targets
      const quad = new THREE.PlaneGeometry(2, 2)
      const passes = new THREE.Scene()
      for (const m of [bloom.materialHighPassFilter, ...bloom.separableBlurMaterials, bloom.compositeMaterial, bloom.blendMaterial]) passes.add(new THREE.Mesh(quad, m))
      const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      const prev = renderer.getRenderTarget()
      renderer.setRenderTarget(composer.readBuffer)
      const a = renderer.compileAsync(scene, camera)
      renderer.setRenderTarget(bloom.renderTargetBright)
      const b = renderer.compileAsync(passes, flat)
      renderer.setRenderTarget(prev)
      // the output pass sets its tone mapping when it first draws: a draw of the (empty) frame onto the hidden canvas
      output.renderToScreen = true
      output.render(renderer, composer.writeBuffer, composer.readBuffer, 0, false)
      await Promise.all([a, b])
      quad.dispose()
    },
    dispose() {
      const textures = new Set<THREE.Texture>(tex ? Object.values(tex) : [])
      if (env) textures.add(env)
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
          const map = (m as THREE.MeshBasicMaterial).map
          if (map) textures.add(map)
          m.dispose()
        }
      })
      textures.forEach((t) => t.dispose())
      // a build stopped part-way has made only some of these
      room?.dispose()
      pmrem?.dispose()
      tiny.dispose()
      composer?.dispose()
      bloom?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
  return hall
}
