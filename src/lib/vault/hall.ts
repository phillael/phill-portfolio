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

export type Hall = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  composer: EffectComposer
  bloom: UnrealBloomPass
  /** the lit set's light on its plinth and the floor, in its picture's colour */
  spill: THREE.PointLight
  M: Mats
  /** the RoomEnvironment's reflections, made once (a step of its own: the engine stages the build across frames) */
  environment(): void
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

/** the hall; throws when WebGL isn't there (the engine falls back) */
export function createHall(canvas: HTMLCanvasElement): Hall {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.05
  const scene = new THREE.Scene()
  const bg = new THREE.Color(BG)
  scene.background = bg
  scene.fog = new THREE.FogExp2(bg, 0.07)
  let env: THREE.Texture | null = null
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80)
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.96)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const tex = drawTextures()
  const M = createMaterials(tex)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x0c1216, roughness: 0.3, metalness: 0.4 }))
  floor.rotation.x = -Math.PI / 2
  const track = new THREE.Mesh(
    new THREE.RingGeometry(R - 0.006, R + 0.006, 256),
    new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.16 }),
  )
  track.position.y = 0.002
  track.rotation.x = -Math.PI / 2
  const spill = new THREE.PointLight(0x9fdcff, 0, 4.5, 2)
  scene.add(floor, track, new THREE.HemisphereLight(0xa8e6ff, 0x0a0d10, 0.55), spill)

  return {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    spill,
    M,
    environment() {
      if (env) return
      const pmrem = new THREE.PMREMGenerator(renderer)
      const room = new RoomEnvironment()
      env = pmrem.fromScene(room, 0.04).texture
      room.dispose()
      pmrem.dispose()
      scene.environment = env
      scene.environmentIntensity = 0.42
      M.glass.envMap = env
      M.glass.needsUpdate = true
    },
    dispose() {
      const textures = new Set<THREE.Texture>(Object.values(tex))
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
      composer.dispose()
      bloom.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
