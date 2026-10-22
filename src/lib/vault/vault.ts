/**
 * The Relic Vault's engine: `createVault` builds the hall (one step per frame), runs the loop on state.ts, takes
 * the stage's input (drag, click, hover, a sideways wheel), powers the sets on and off, and plays one project's video
 * at a time through its set's CRT. Ported from the mockup (docs/design/projects-vault/vault.js); the React island
 * (components/projects/ProjectsVault.tsx) owns the tabs, panels, buttons and the live region, and calls in.
 * Watch opens the hologram (holo.ts) on the set's own video; without WebGL it lifts from the fallback's screen
 * (the stage's `[data-vault-screen]`). The sound effects (sfx.ts) stay silent until armSound() from a click.
 *
 * Rules it keeps: no layout reads and no callbacks per frame (sizes come from the ResizeObserver; onNear fires on
 * index changes only); the loop runs only while the stage is on screen (or the hologram is up) and the tab is
 * visible; one video decodes at a time; a set shows its poster until its video fires `playing` (a paused video
 * never uploads a frame).
 */

import * as THREE from 'three'
import type { Project } from '@/types/content'
import { CRT, IDLE, blackTexture, setU, type CrtUniforms } from './crt'
import { CONTEXT, createHall, type Hall } from './hall'
import { createHolo } from './holo'
import { R, SCREEN_Y, START, angleOf, clamp, coverCrop, dragPer, easeOut, holoBack, lerp, lookUp, scanLines, type Pt, type Quad } from './math'
import { SETS, buildExhibit, type Exhibit, type Television } from './sets'
import { contextFromClick, createSfx } from './sfx'
import { createState, dragEnd, dragMove, go as goTo, tick, watch as watchSet, type Hooks } from './state'
import './vault.css'

export type MediaEntry = {
  w: number
  h: number
  duration: number
  audio: boolean
  placeholder: boolean
  poster: string
  sources: { src: string; type: string }[]
}

export type VaultOpts = {
  stage: HTMLElement
  canvas: HTMLCanvasElement
  projects: Project[]
  media: Record<string, MediaEntry>
  /** a visually hidden holder for the video elements (iOS needs texture videos in the document) */
  videoHolder: HTMLElement
  reducedMotion: boolean
  /** the set nearest the camera changed: the tab and card follow (index changes only) */
  onNear(i: number): void
  /** the first frame is drawn: fade the canvas in */
  onReady(): void
  /** no WebGL, or the context was lost: show the fallback */
  onFail(): void
  /** an exhibit change to announce in the live region (the arrows and swipes) */
  onAnnounce?(i: number): void
  /** the visitor's first touch of the hall (the hint fades) */
  onInteract?(): void
}

export type Vault = {
  /** bring set i to the front; announce = say it in the live region (the arrows) */
  go(i: number, announce?: boolean): void
  /** the next (1) or previous (-1) set from where the hall is heading, announced (the arrows) */
  step(dir: 1 | -1): void
  watch(i: number): void
  setPaused(paused: boolean): void
  setReducedMotion(rm: boolean): void
  /** the sound effects may play from now on: call it inside a click in the section (it makes the AudioContext) */
  armSound(): void
  destroy(): void
}

type Tween = { t: number; dur: number; fn: (t: number) => void; done?: () => void }
type Exh = {
  p: Project
  i: number
  m: MediaEntry
  /** its television, built a frame before the rest of the exhibit */
  tv: Television | null
  ex: Exhibit | null
  u: CrtUniforms | null
  poster: THREE.Texture | null
  video: HTMLVideoElement | null
  vtex: THREE.VideoTexture | null
  tween: Tween | null
  /** easing toward the idle look (a powered-off set) */
  idle: boolean
  /** the hologram's glow on the glass (0–1) */
  emit: number
}

const WHEEL_STEP = 60

export function createVault(opts: VaultOpts): Vault {
  const { stage, canvas, projects, media, videoHolder } = opts
  const N = projects.length
  const S = createState(N, START, opts.reducedMotion)
  const E: Exh[] = projects.map((p, i) => ({
    p,
    i,
    m: media[p.id],
    tv: null,
    ex: null,
    u: null,
    poster: null,
    video: null,
    vtex: null,
    tween: null,
    idle: true,
    emit: 0,
  }))
  const view = { w: 0, h: 0, wide: true, camD: 4.4, ox: null as number | null, lookUp: 0 }
  let hall: Hall | null = null
  let gl: WebGL2RenderingContext | null = null
  let failed = false
  let destroyed = false
  let built = false
  let ready = false
  let raf = 0
  let buildRaf = 0
  let last = 0
  let hover = -1
  let quiet = 0
  let didInteract = false
  const cleanups: (() => void)[] = []
  const sfx = createSfx()
  let ownAc: AudioContext | null = null
  // a set powering on because the hall scrolled into view is silent; one the visitor asked for isn't
  let scrolledIn = false
  const listen = <T extends Event>(el: EventTarget, type: string, fn: (ev: T) => void, o?: AddEventListenerOptions) => {
    el.addEventListener(type, fn as EventListener, o)
    cleanups.push(() => el.removeEventListener(type, fn as EventListener, o))
  }

  /* ================= video ================= */
  function showTex(e: Exh, tex: THREE.Texture | null) {
    if (e.u) e.u.uTex.value = tex ?? blackTexture()
  }
  function videoOf(e: Exh) {
    if (e.video) return e.video
    const v = document.createElement('video')
    v.muted = true
    v.defaultMuted = true
    v.loop = true
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.preload = 'auto'
    v.poster = e.m.poster // the hologram shows it while a clip that never played loads
    for (const s of e.m.sources) {
      const el = document.createElement('source')
      el.src = s.src
      el.type = s.type
      v.append(el)
    }
    v.addEventListener('loadeddata', () => {
      if (!hall || e.vtex) return
      e.vtex = new THREE.VideoTexture(v)
      e.vtex.colorSpace = THREE.SRGBColorSpace
    })
    // a paused video never uploads a frame: its set shows the poster until it plays
    v.addEventListener('playing', () => {
      if (!hall || S.on !== e.i) return
      if (!e.vtex) {
        e.vtex = new THREE.VideoTexture(v)
        e.vtex.colorSpace = THREE.SRGBColorSpace
      }
      showTex(e, e.vtex)
      kick()
    })
    videoHolder.append(v)
    e.video = v
    return v
  }
  const canPlay = () => !S.paused && S.visible && !document.hidden
  const play = (v: HTMLVideoElement) => void v.play()?.catch(() => {})
  function startVideo(e: Exh) {
    const v = videoOf(e)
    try {
      v.currentTime = 0
    } catch {}
    showTex(e, e.poster)
    if (canPlay()) play(v)
  }
  function stopVideo(e: Exh) {
    e.video?.pause()
    showTex(e, e.poster)
  }

  /* ================= power on / off ================= */
  const tween = (e: Exh, dur: number, fn: (t: number) => void, done?: () => void) => {
    e.tween = { t: 0, dur, fn, done }
  }
  function setIdle(e: Exh, instant = false) {
    e.idle = true
    if (instant && e.u) setU(e.u, { uOpenX: IDLE.open, uOpenY: IDLE.open, uBright: IDLE.bright, uStatic: IDLE.stat, uFlash: 0 })
  }
  function powerOn(i: number) {
    const e = E[i]
    const u = e.u
    e.idle = false
    startVideo(e)
    if (!u) return
    if (S.rm) {
      e.tween = null
      setU(u, { uOpenX: 1, uOpenY: 1, uFlash: 0, uWobble: CRT.wobble, uStatic: 0, uBright: 1.05 })
      return
    }
    if (!scrolledIn) sfx.on()
    tween(e, 1.1, (t) =>
      setU(u, {
        uOpenX: easeOut(clamp(t / 0.13)),
        uOpenY: easeOut(clamp((t - 0.11) / 0.24)),
        uFlash: t < 0.11 ? 1.5 : lerp(1.3, 0, clamp((t - 0.11) / 0.5)),
        uStatic: lerp(0.5, 0, clamp((t - 0.2) / 0.45)),
        uWobble: CRT.wobble + (1 - clamp((t - 0.25) / 0.8)) * Math.sin(t * 26) * 1.1,
        uBright: lerp(0.75, 1.05, clamp((t - 0.2) / 0.5)),
      }),
    )
  }
  function powerOff(i: number) {
    const e = E[i]
    const u = e.u
    stopVideo(e)
    if (!u) return setIdle(e)
    if (S.rm) {
      e.tween = null
      return setIdle(e, true)
    }
    sfx.off()
    const from = u.uBright.value
    tween(
      e,
      0.34,
      (t) =>
        setU(u, {
          uOpenY: 1 - easeOut(clamp(t / 0.13)),
          uOpenX: 1 - easeOut(clamp((t - 0.12) / 0.13)),
          uFlash: t < 0.12 ? lerp(0, 1.1, t / 0.12) : lerp(1.1, 0, clamp((t - 0.22) / 0.12)),
          uBright: from,
          uStatic: 0,
          uWobble: 0,
        }),
      () => setIdle(e),
    )
  }

  const hooks: Hooks = {
    near: (i) => opts.onNear(i),
    powerOn,
    powerOff,
    openHolo: (i) => openHolo(i),
    tweening: (i) => E[i].tween !== null,
  }

  /* ================= the hologram ================= */
  // the page rects it maps from: read at open and on resize only (the page doesn't scroll while it's up)
  const rects = { canvas: null as DOMRect | null, stage: null as DOMRect | null, screen: null as DOMRect | null }
  const fallbackScreen = () => stage.querySelector<HTMLElement>('[data-vault-screen]')
  function readRects() {
    rects.canvas = canvas.getBoundingClientRect()
    rects.stage = stage.getBoundingClientRect()
    rects.screen = fallbackScreen()?.getBoundingClientRect() ?? null
  }
  const corner = new THREE.Vector3()
  /** the set's glass on the viewport (TL TR BR BL), through the camera as it is now */
  function screenQuad(e: Exh): Quad {
    const ex = e.ex!
    const cam = hall!.camera
    const r = rects.canvas!
    cam.updateMatrixWorld()
    ex.scr.mesh.updateWorldMatrix(true, false)
    const { w, h } = ex.scr
    const at = ([x, y]: Pt): Pt => {
      corner.set(x * 0.97, y * 0.97, 0.01).applyMatrix4(ex.scr.mesh.matrixWorld).project(cam)
      return [r.left + ((corner.x + 1) / 2) * r.width, r.top + ((1 - corner.y) / 2) * r.height]
    }
    return [at([-w / 2, h / 2]), at([w / 2, h / 2]), at([w / 2, -h / 2]), at([-w / 2, -h / 2])]
  }
  /** the fallback's CSS screen (or the stage's middle) */
  function rectQuad(): Quad {
    const r = rects.screen ?? rects.stage!
    const b = rects.screen ? r : new DOMRect(r.left + r.width * 0.3, r.top + r.height * 0.3, r.width * 0.4, r.height * 0.3)
    return [
      [b.left, b.top],
      [b.right, b.top],
      [b.right, b.bottom],
      [b.left, b.bottom],
    ]
  }
  const holo = createHolo({
    reducedMotion: () => S.rm,
    drives: () => built && !failed && !destroyed,
    onLayout(f) {
      readRects()
      if (hall) view.lookUp = lookUp(f, rects.stage!, innerHeight, view.wide, view.camD, hall.camera.fov)
    },
    onOpen() {
      S.hcTo = 1
      E[S.holo].emit = 0.85
      sfx.holo()
      kick()
    },
    onClosing() {
      S.hcTo = 0
      sfx.holoClose()
      kick()
    },
    onClosed() {
      const e = E[S.holo]
      S.holo = -1
      e.emit = 0
      const v = e.video
      if (v) {
        if (S.on === e.i && canPlay()) play(v)
        else v.pause()
      }
      const u = e.u
      if (u && !S.rm && !failed) {
        u.uFlash.value = 0.9
        tween(e, 0.4, (t) => {
          u.uFlash.value = lerp(0.9, 0, t / 0.4)
        })
      }
      kick()
    },
  })
  function openHolo(i: number) {
    if (S.holo >= 0 || holo.isOpen() || destroyed) return
    const e = E[i]
    readRects()
    const glass = !failed && e.ex && e.u
    const crop: Pt = glass ? [e.u!.uCrop.value.x, e.u!.uCrop.value.y] : coverCrop(e.m.w / e.m.h, rects.screen ? rects.screen.width / rects.screen.height : 4 / 3)
    S.holo = i
    S.pendingHolo = -1
    holo.open({
      project: e.p,
      media: e.m,
      video: videoOf(e),
      holder: videoHolder,
      crop,
      quad: () => (glass && !failed ? screenQuad(e) : rectQuad()),
      opener: document.activeElement,
    })
  }

  /* ================= the scene ================= */
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const camLook = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const tmp2 = new THREE.Vector3()
  const white = new THREE.Color(1, 1, 1)
  const spillColor = new THREE.Color(0x9fdcff)
  const spillTo = new THREE.Color(0x9fdcff)
  let sampleG: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null
  let sampling = false
  let frameN = 0
  /** the picture's colour, for the spill: a 4×4 copy of the video frame, made off the frame and read from an
   * OffscreenCanvas (a video's, or a bitmap's, first draw into a readable page canvas stalls ~15 ms on a readback) */
  function sampleSpill(v: HTMLVideoElement) {
    if (sampling || typeof createImageBitmap !== 'function') return
    sampling = true
    createImageBitmap(v, { resizeWidth: 4, resizeHeight: 4, resizeQuality: 'low' })
      .then((bmp) => {
        if (!sampleG) {
          const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(4, 4) : Object.assign(document.createElement('canvas'), { width: 4, height: 4 })
          sampleG = c.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
        }
        if (sampleG && !destroyed) {
          sampleG.drawImage(bmp, 0, 0)
          const d = sampleG.getImageData(0, 0, 4, 4).data
          let r = 0
          let g = 0
          let b = 0
          for (let k = 0; k < d.length; k += 4) {
            r += d[k]
            g += d[k + 1]
            b += d[k + 2]
          }
          spillTo.setRGB(r / 16 / 255, g / 16 / 255, b / 16 / 255, THREE.SRGBColorSpace).lerp(white, 0.25)
        }
        bmp.close()
      })
      .catch(() => {})
      .finally(() => {
        sampling = false
      })
  }

  function placeCamera(t: number) {
    const camera = hall!.camera
    const still = S.rm || S.paused
    const sway = still || S.holo >= 0 ? 0 : Math.sin(t * 0.21) * 0.012
    const a = angleOf(S.pos, N)
    const r = R - view.camD - S.hc * holoBack(view.wide)
    camera.position.set(r * Math.sin(a + sway), (view.wide ? 1.74 : 1.62) + (still ? 0 : Math.sin(t * 0.33) * 0.015), -r * Math.cos(a + sway))
    camLook.set(R * Math.sin(a), SCREEN_Y - (view.wide ? 0.06 : 0.12) + S.hc * view.lookUp, -R * Math.cos(a))
    camera.lookAt(camLook)
    // the hall sits right of the card; with the hologram up, the set comes to the middle
    const ox = view.wide ? -view.w * 0.13 * (1 - S.hc) : 0
    if (ox !== view.ox) {
      view.ox = ox
      if (ox) camera.setViewOffset(view.w, view.h, ox, 0, view.w, view.h)
      else camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
  }

  function resize(w: number, h: number) {
    view.w = w
    view.h = h
    if (!hall || !w || !h) return
    const { renderer, composer, camera } = hall
    view.wide = w > 760
    const coarse = matchMedia('(pointer: coarse)').matches
    renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 1.75))
    renderer.setSize(w, h, false)
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(w, h)
    }
    camera.aspect = w / h
    camera.fov = view.wide ? 30 : 34
    view.camD = view.wide ? 4.4 : 3.55
    view.ox = null
    camera.updateProjectionMatrix()
    kick()
  }

  function step(dt: number) {
    const { renderer, camera, spill } = hall!
    tick(S, dt, hooks)
    placeCamera(S.time)

    for (const e of E) {
      const u = e.u
      const ex = e.ex
      if (!u || !ex) continue
      u.uTime.value = S.time
      if (e.tween) {
        const tw = e.tween
        tw.t += dt
        tw.fn(Math.min(tw.t, tw.dur))
        if (tw.t >= tw.dur) {
          e.tween = null
          tw.done?.()
        }
      } else if (e.idle) {
        // idle sets ease to the idle look (+ a little when hovered)
        const hov = hover === e.i ? 1 : 0
        const k = S.rm ? 1 : 1 - Math.exp(-dt * 7)
        u.uOpenX.value = lerp(u.uOpenX.value, IDLE.open, k)
        u.uOpenY.value = lerp(u.uOpenY.value, IDLE.open, k)
        u.uBright.value = lerp(u.uBright.value, IDLE.bright + hov * 0.22, k)
        u.uStatic.value = lerp(u.uStatic.value, hov ? 0.45 : IDLE.stat, k)
        u.uFlash.value = lerp(u.uFlash.value, 0, k)
      }
      u.uEmit.value = lerp(u.uEmit.value, e.emit, S.rm ? 1 : 1 - Math.exp(-dt * 6))
      // lights: the set in front gets the spot, the rest a little
      const lit = e.i === S.near
      ex.spot.intensity = lerp(ex.spot.intensity, lit ? 60 : 16 + (hover === e.i ? 18 : 0), 1 - Math.exp(-dt * 5))
      const rk = lit ? 2.2 : 0.5
      ex.ringMat.color.setRGB(0.25 * rk, 0.8 * rk, 1 * rk)
      // scanlines: about 3 device pixels each, whatever the distance
      ex.scr.mesh.getWorldPosition(tmp)
      tmp2.copy(tmp).y += ex.scr.h / 2
      tmp.y -= ex.scr.h / 2
      tmp.project(camera)
      tmp2.project(camera)
      u.uLines.value = scanLines((Math.abs(tmp2.y - tmp.y) / 2) * renderer.domElement.height)
    }

    // the lit set's light spills on its plinth and the floor, in its picture's colour
    const on = S.on >= 0 ? E[S.on] : null
    if (on?.ex && on.u) {
      on.ex.scr.mesh.getWorldPosition(tmp)
      tmp2.set(0, 0, 0.95).applyQuaternion(on.ex.root.quaternion)
      spill.position.copy(tmp).add(tmp2)
      const v = on.video
      if (++frameN % 8 === 0 && v && v.readyState >= 2 && !v.paused) sampleSpill(v)
    }
    spillColor.lerp(spillTo, 1 - Math.exp(-dt * 4))
    spill.color.copy(spillColor)
    const want = on?.u ? (on.emit ? 7 : 2.6 * on.u.uBright.value * on.u.uOpenY.value) : 0
    spill.intensity = lerp(spill.intensity, want, 1 - Math.exp(-dt * 8))

    if (S.holo >= 0) holo.tick()
  }

  /* ================= the loop ================= */
  // paused and settled: draw a few more frames, then stop until something changes
  const settled = () => S.paused && S.holo < 0 && !S.held && S.pos === S.target && S.hc === S.hcTo && E.every((e) => !e.tween)
  const wanted = () => built && !failed && !destroyed && (S.visible || S.holo >= 0) && !document.hidden
  function kick() {
    quiet = 0
    if (raf || !wanted()) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  function frame(now: number) {
    raf = 0
    if (!wanted()) return
    const dt = clamp((now - last) / 1000, 0, 0.05)
    last = now
    step(dt)
    hall!.composer.render()
    if (settled() && ++quiet > 30) return
    // something in the step may have kicked already (a video's `playing`)
    if (!raf) raf = requestAnimationFrame(frame)
  }

  /* ================= the staged build ================= */
  // one step per frame, so mounting never makes a long task: the renderer, the reflections, each set, the shaders
  const loader = new THREE.TextureLoader()
  function buildSet(e: Exh) {
    const h = hall!
    const ex = buildExhibit(e.p.tv, e.i, N, h.M, e.tv ?? undefined)
    e.tv = null
    e.ex = ex
    e.u = ex.scr.mat.uniforms
    e.u.uCrop.value.set(...coverCrop(e.m.w / e.m.h, ex.scr.w / ex.scr.h))
    h.scene.add(ex.root)
    loader.load(e.m.poster, (t) => {
      if (destroyed || !hall) return t.dispose()
      t.colorSpace = THREE.SRGBColorSpace
      hall.renderer.initTexture(t) // its upload in this task, not the first frame's
      e.poster = t
      if (!e.video || e.video.paused || S.on !== e.i) showTex(e, t)
      kick()
    })
  }
  /** draw one exhibit alone into the composer's target: its buffers go up now, not all in the first frame */
  function warm(e: Exh) {
    const { renderer, scene, camera, composer } = hall!
    const hidden: THREE.Object3D[] = []
    const unculled: THREE.Object3D[] = []
    for (const o of E) {
      o.ex?.root.traverse((m) => {
        if (!(m as THREE.Mesh).isMesh) return
        if (o !== e && m.visible) {
          m.visible = false
          hidden.push(m)
        } else if (o === e && m.frustumCulled) {
          m.frustumCulled = false
          unculled.push(m)
        }
      })
    }
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(composer.readBuffer)
    renderer.render(scene, camera)
    renderer.setRenderTarget(prev)
    hidden.forEach((m) => (m.visible = true))
    unculled.forEach((m) => (m.frustumCulled = true))
  }
  /** the first frame, even offscreen, so the canvas is ready when it scrolls in */
  function firstFrame() {
    buildRaf = 0
    if (destroyed || failed) return
    built = true
    E.forEach((e) => setIdle(e, true))
    last = performance.now()
    step(0)
    hall!.composer.render()
    ready = true
    opts.onReady()
    kick()
  }
  function fail() {
    if (failed || destroyed) return
    failed = true
    cancelAnimationFrame(raf)
    cancelAnimationFrame(buildRaf)
    raf = buildRaf = 0
    E.forEach((e) => e.video?.pause())
    opts.onFail()
  }
  const steps: (() => void | Promise<void>)[] = [
    () => {
      // the context in a frame of its own (three takes it next); without WebGL2, the fallback, and no three errors
      gl = canvas.getContext('webgl2', CONTEXT)
      if (!gl) throw new Error('no WebGL2')
      listen(canvas, 'webglcontextlost', fail)
    },
    () => {
      hall = createHall(canvas, gl!)
      resize(view.w, view.h)
    },
    () => hall!.post(),
    () => hall!.decorate(),
    () => hall!.prepareRoom(),
    () => hall!.preparePasses(),
    () => hall!.warmEnvironment(),
    () => hall!.environment(),
    ...E.flatMap((e) => [
      () => {
        e.tv = SETS[e.p.tv](hall!.M)
      },
      () => buildSet(e),
    ]),
    () => hall!.targets(),
    async () => {
      placeCamera(S.time)
      await hall!.compile()
    },
    ...E.map((e) => () => warm(e)),
  ]
  async function build(k: number) {
    buildRaf = 0
    if (destroyed || failed) return
    try {
      await steps[k]()
    } catch {
      return fail()
    }
    if (destroyed || failed) return
    buildRaf = requestAnimationFrame(k + 1 < steps.length ? () => build(k + 1) : firstFrame)
  }
  buildRaf = requestAnimationFrame(() => build(0))

  /* ================= input ================= */
  function interacted() {
    scrolledIn = false
    if (didInteract) return
    didInteract = true
    opts.onInteract?.()
  }
  function pick(ev: PointerEvent) {
    if (!hall || !view.w || !view.h) return -1
    ndc.set((ev.offsetX / view.w) * 2 - 1, -(ev.offsetY / view.h) * 2 + 1)
    ray.setFromCamera(ndc, hall.camera)
    const hits = ray.intersectObjects(
      E.flatMap((e) => (e.ex ? [e.ex.hit] : [])),
      false,
    )
    return hits.length ? (hits[0].object.userData.i as number) : -1
  }
  type Drag = { x: number; y: number; pos0: number; axis: 'x' | 'y' | null; lastX: number; lastT: number; v: number; id: number }
  let drag: Drag | null = null
  listen(canvas, 'pointerdown', (ev: PointerEvent) => {
    if (ev.button !== 0 || S.holo >= 0 || !built || failed) return
    scrolledIn = false
    drag = { x: ev.clientX, y: ev.clientY, pos0: S.pos, axis: null, lastX: ev.clientX, lastT: performance.now(), v: 0, id: ev.pointerId }
    S.held = true
    kick()
  })
  listen(canvas, 'pointermove', (ev: PointerEvent) => {
    const d = drag
    if (!d) {
      if (ev.pointerType === 'mouse' && built && !failed && S.holo < 0) {
        const h = pick(ev)
        if (h !== hover) {
          hover = h
          canvas.classList.toggle('over', h >= 0)
          kick()
        }
      }
      return
    }
    const dx = ev.clientX - d.x
    const dy = ev.clientY - d.y
    if (!d.axis && Math.hypot(dx, dy) > 7) {
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'x') {
        canvas.setPointerCapture?.(d.id)
        canvas.classList.add('dragging')
        S.dragging = true
        interacted()
      }
    }
    if (d.axis !== 'x') return
    const per = dragPer(view.w, view.wide)
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    d.v = lerp(d.v, -(ev.clientX - d.lastX) / per / (dt / 1000), 0.4)
    d.lastX = ev.clientX
    d.lastT = now
    dragMove(S, d.pos0 - dx / per, hooks)
    kick()
  })
  function endDrag(ev: PointerEvent, cancelled: boolean) {
    const d = drag
    drag = null
    S.held = false
    canvas.classList.remove('dragging')
    if (!d) return
    if (d.axis === 'x') {
      S.dragging = false
      const before = S.target
      dragEnd(S, d.v, hooks)
      if (S.target !== before) opts.onAnnounce?.(S.target)
      kick()
      return
    }
    if (cancelled || d.axis) return kick()
    const i = pick(ev)
    if (i < 0) return kick()
    interacted()
    // the set in front (or on its way there) is Watch: now if it's on, else once it is; another set comes forward
    if (i === S.target) watchSet(S, i, hooks)
    else goTo(S, i, hooks)
    kick()
  }
  listen(canvas, 'pointerup', (ev: PointerEvent) => endDrag(ev, false))
  listen(canvas, 'pointercancel', (ev: PointerEvent) => endDrag(ev, true))
  listen(canvas, 'pointerleave', () => {
    if (hover < 0) return
    hover = -1
    canvas.classList.remove('over')
    kick()
  })
  // a sideways trackpad swipe moves the hall too (a vertical wheel stays the page's): a set per 60 px of a swipe,
  // then its momentum rests for 380 ms so one flick doesn't fly through the hall
  let wheelAcc = 0
  let wheelLast = -Infinity
  let wheelT = -Infinity
  listen(
    canvas,
    'wheel',
    (ev: WheelEvent) => {
      if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY) || S.holo >= 0 || failed) return
      ev.preventDefault()
      const now = performance.now()
      if (now - wheelLast > 380) wheelAcc = 0
      wheelLast = now
      if (now - wheelT < 380) return
      wheelAcc += ev.deltaX
      if (Math.abs(wheelAcc) > WHEEL_STEP) {
        const dir = Math.sign(wheelAcc)
        wheelAcc = 0
        wheelT = now
        api.go(clamp(S.target + dir, 0, N - 1), true)
      }
    },
    { passive: false },
  )

  /* ================= on screen / hidden ================= */
  const ro = new ResizeObserver(([en]) => {
    const box = en.contentRect
    resize(Math.round(box.width), Math.round(box.height))
  })
  ro.observe(stage)
  view.w = stage.clientWidth
  view.h = stage.clientHeight
  const io = new IntersectionObserver(
    ([en]) => {
      if (en.isIntersecting && !S.visible) scrolledIn = true
      S.visible = en.isIntersecting
      const v = S.on >= 0 ? E[S.on].video : null
      if (v) {
        if (canPlay()) play(v)
        else v.pause()
      }
      kick()
    },
    { threshold: 0.15 },
  )
  io.observe(stage)
  listen(document, 'visibilitychange', () => {
    if (document.hidden) E.forEach((e) => e.video?.pause())
    else {
      const v = S.on >= 0 ? E[S.on].video : null
      if (v && canPlay()) play(v)
      kick()
    }
  })

  /* ================= the API ================= */
  const api: Vault = {
    go(i, announce = false) {
      interacted()
      if (failed) {
        i = ((i % N) + N) % N
        if (i === S.target) return
        S.target = S.near = S.pos = i
        opts.onNear(i)
        if (announce) opts.onAnnounce?.(i)
        return
      }
      if (goTo(S, i, hooks) && announce) opts.onAnnounce?.(S.target)
      kick()
    },
    step(dir) {
      api.go(S.target + dir, true)
    },
    watch(i) {
      interacted()
      if (failed) {
        api.go(i)
        return openHolo(((i % N) + N) % N)
      }
      watchSet(S, i, hooks)
      kick()
    },
    setPaused(p) {
      S.paused = p
      const v = S.on >= 0 ? E[S.on].video : null
      if (v) {
        if (canPlay()) play(v)
        else v.pause()
      }
      kick()
    },
    setReducedMotion(rm) {
      S.rm = rm
      kick()
    },
    armSound() {
      if (sfx.armed() || destroyed) return
      const c = contextFromClick()
      if (!c) return
      sfx.arm(c.ac)
      if (c.own) ownAc = c.ac
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(buildRaf)
      raf = buildRaf = 0
      holo.destroy()
      sfx.dispose()
      void ownAc?.close()
      cleanups.forEach((fn) => fn())
      ro.disconnect()
      io.disconnect()
      for (const e of E) {
        const v = e.video
        if (v) {
          v.pause()
          v.querySelectorAll('source').forEach((s) => s.remove())
          v.removeAttribute('src')
          v.load()
          v.remove()
        }
        e.vtex?.dispose()
        e.poster?.dispose()
        e.video = e.vtex = e.poster = null
      }
      hall?.dispose()
      hall = null
      if (process.env.NODE_ENV !== 'production') delete (window as { __vault?: unknown }).__vault
    },
  }

  if (process.env.NODE_ENV !== 'production') {
    ;(window as { __vault?: unknown }).__vault = { S, E, view, api, hall: () => hall, ready: () => ready }
  }
  return api
}
