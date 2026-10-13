/**
 * The Jelly Resume engine: framework-free, one WebGL2 canvas. React mounts it and talks
 * to it through this API; nothing here calls back into React per frame.
 *
 *   const engine = createJellyEngine({ canvas })
 *   engine.load(await loadSnapshot())
 *   engine.openDirect('React')   // a direct visit: a quick galaxy intro, then the Finder
 *   engine.dispose()
 */

import { introCam, revealY, startIntro, updateIntro } from './intro'
import { planeZ, resetView, stepMomentum, updateCamera, zoomCenter, type Ray, type UiInsets } from './camera'
import { HOME, LOOSE, initialState } from './config'
import { onBeat, updateBend, updateTargets } from './dance'
import { countMatches, findMatches } from './finder'
import { attachInput } from './input'
import { lcg } from './math'
import { MusicFeatures, type MusicInput } from './music'
import { burstAll, chaos, collide, healAll, releaseHole, shakeIt, startHole, step, updateParticles, updateStates } from './physics'
import { createRenderer } from './render'
import { createSfx } from './sfx'
import { snapshotBodies, type LoadedSnapshot } from './snapshot'
import { atlasSteps, createWorld, hidden, physicsSteps, type World } from './world'
import {
  buildHeroSparks, containedRect, createHeroPool, heroHandoff, heroRest, pageOrder, startClosing, startDissolve, updateClosing, updateDissolve,
  type Closing, type Dissolve,
} from './hero'
import { smooth } from './math'

export interface JellyEngineOptions {
  canvas: HTMLCanvasElement
  /** the site's music player, for the dance (wired in T8) */
  music?: () => MusicInput | null
  /** the Finder ran (on its own when a deep link's page lands) */
  onFind?: (query: string, matches: number) => void
  /** the resume is open: the direct entrance started, or the hero handed off to the page */
  onOpen?: () => void
  /** closing in reverse: every spark is back on the photo (it's visible again; bring the page back) */
  onLanded?: () => void
  /** the reverse close has finished */
  onClosed?: () => void
}

export interface HeroOpen {
  /** the hero photo (next/image, object-fit: contain); hidden while its sparks stand in */
  img: HTMLImageElement
  /** where it was clicked (client px); null: from its center (keyboard) */
  origin: { x: number; y: number } | null
  /** the 🍄 summon's blue-violet heat */
  tint?: number
  find?: string | null
}

/** The navigator's view box, as fractions of the page (fit: the whole page is in view). */
export interface NavView {
  fit: boolean
  left: number
  top: number
  width: number
  height: number
}

export interface JellyStats {
  words: number
  home: number
  loose: number
  bursting: number
  physicsMs: number
  fps: number
  loaded: boolean
}

export function createJellyEngine({ canvas, music, onFind, onOpen, onLanded, onClosed }: JellyEngineOptions) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true })
  if (!gl) throw new Error('WebGL2 is not available')
  const low = window.matchMedia('(pointer: coarse)').matches // Auto quality: low on touch devices
  const s = initialState()
  const sfx = createSfx(() => s)
  let w: World
  const features = new MusicFeatures((k) => onBeat(w, k))
  w = createWorld(s, low, sfx, features)
  const renderer = createRenderer(gl, w)
  renderer.bakeSky()
  renderer.buildStars()

  const ui: UiInsets = { top: 0.1, bot: 0.1 }
  let loaded: LoadedSnapshot | null = null
  let open = false
  let pendingOpen = false
  let pendingFind: string | null = null
  let skyLin = 0, skyTarget = 0 // the backdrop fades in over 0.7 s (smoothstep)
  const hp = createHeroPool()
  let diss: Dissolve | null = null
  let cl: Closing | null = null
  let pendingClose: HTMLImageElement | null = null
  let heroImg: HTMLImageElement | null = null
  let navMode: 'rotate' | 'pan' = 'rotate'
  let holeMode = false
  let lastRay: Ray | null = null
  let back: HTMLCanvasElement | null = null
  const frameListeners = new Set<() => void>()

  // ---- size: device pixels, DPR capped at 2 ----
  let dpr = 1
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    const r = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(r.width * dpr))
    canvas.height = Math.max(1, Math.round(r.height * dpr))
    renderer.setDpr(dpr)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // Deferred work takes turns, one job per frame: each waits for the frame after the previous
  // job's, then runs in the task after it (back-to-back timeouts would let two heavy steps
  // land before the browser draws)
  let turn = Promise.resolve()
  const nextTask = () => (turn = turn.then(() => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)))))
  let disposed = false

  /**
   * Build the bodies, sparks, atlas and sheet from the snapshot, a step per task so a cold
   * load never blocks a frame for long (the resume stays hidden until it's all built);
   * the resume then waits as a galaxy.
   */
  async function load(snapshot: LoadedSnapshot) {
    await nextTask()
    if (disposed) return
    const snap = snapshot.snap
    w.rnd = lcg(7)
    w.pageW = snap.page.w
    w.pageH = snap.page.h
    w.pageBottom = -w.pageH / 2
    const list = snapshotBodies(snap)
    for (const _ of physicsSteps(w, list)) {
      await nextTask()
      if (disposed) return
    }
    const steps = atlasSteps(w, list, snapshot.text)
    let step: ReturnType<typeof steps.next>
    do {
      await nextTask()
      if (disposed) return
      step = steps.next()
    } while (!step.done)
    const { atlas, rects } = step.value
    await nextTask()
    if (disposed) return
    renderer.buildGPU(atlas, rects)
    await nextTask()
    if (disposed) return
    // the page's backing: white paper plus the decorations at their place in the margins
    const PP = 220
    back = document.createElement('canvas')
    back.width = Math.round(w.pageW * PP)
    back.height = Math.round(w.pageH * PP)
    const g = back.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, back.width, back.height)
    g.drawImage(snapshot.decor, snap.page.marginX * PP, snap.page.marginY * PP, (snap.content.w / 96) * PP, (snap.content.h / 96) * PP)
    renderer.buildBacking(back)
    w.cam.scrollY = Infinity
    w.cam.y = null
    w.cam.scrollX = 0
    w.cam.x = null
    startIntro(w, true) // the resume waits as a galaxy
    loaded = snapshot
    if (pendingOpen) { pendingOpen = false; directIntro() }
    await nextTask()
    if (disposed) return
    pageOrder(w) // sorted now, so the hero handoff frame stays cheap
    await nextTask()
    if (!disposed) sfx.prepare()
  }

  function directIntro() {
    startIntro(w) // from the galaxy, so it's quick
    w.ptAlpha.fill(0) // the stardust fades in as it streams to the page
    onOpen?.()
  }

  /** A direct visit (or a shared link): the nebula fades in, then a quick galaxy intro prints the page. */
  function openDirect(find?: string | null) {
    if (open || diss) return
    open = true
    skyTarget = 1
    if (find) pendingFind = find
    if (loaded) directIntro()
    else pendingOpen = true
  }

  /**
   * From the hero: the photo becomes sparks exactly over its pixels, a front sweeps out
   * from the click, and once the resume has loaded the photo reshapes straight into the
   * page. Returns false if the photo can't be sampled (then open it directly).
   */
  function openFromHero({ img, origin, tint = 0, find }: HeroOpen) {
    if (open || diss) return false
    const rc = canvas.getBoundingClientRect()
    // the pre-intro pose the sparks rest in front of
    updateCamera(w, 0, canvas.width, canvas.height, ui, introCam(w, false, null))
    if (!buildHeroSparks(w, hp, { img, canvas: rc, dpr, low }, () => renderer.buildHero(hp))) return false
    if (find) pendingFind = find
    heroRest(w, hp, canvas.clientWidth, canvas.clientHeight, canvas.width, canvas.height)
    const b = containedRect(img)
    const ox = origin ? origin.x - rc.left : b.left + b.width / 2 - rc.left, oy = origin ? origin.y - rc.top : b.top + b.height / 2 - rc.top
    diss = startDissolve(w, hp, ox, oy, low, tint)
    heroImg = img
    img.style.visibility = 'hidden' // the sparks match the photo, so the swap is invisible
    skyTarget = 1
    // the whoosh (its buffer takes a moment to synthesize: not in this frame)
    nextTask().then(() => { if (!disposed) { sfx.init(); sfx.intro(2) } })
    return true
  }

  /**
   * Close in reverse onto the hero photo: the words burst into sparks that fly home to its
   * pixels, cooling to its colors, while the sheet un-prints and the camera swings out.
   * Mid-dissolve it waits for the handoff. Returns false if it can't (then fade instead).
   */
  function close(img: HTMLImageElement) {
    if (cl) return true
    if (diss) {
      if (!loaded) return false // still waiting for the resume: fade out instead of waiting on the handoff
      pendingClose = img
      return true
    }
    if (!open || !loaded) return false
    const cam0 = introCam(w, open, null)
    const rc = canvas.getBoundingClientRect()
    if (!buildHeroSparks(w, hp, { img, canvas: rc, dpr, low }, () => renderer.buildHero(hp))) return false
    open = false
    find('')
    if (w.hole.on) releaseHole(w)
    cl = startClosing(w, hp, low, cam0)
    heroImg = img
    img.style.visibility = 'hidden'
    startIntro(w, true) // every word hides at once: they're the sparks now
    sfx.intro(2)
    return true
  }

  function find(q: string) {
    const hit = findMatches(w.bodies.map((bd) => ({ text: bd.b.text, tok: bd.tok, parts: bd.parts })), q)
    w.bodies.forEach((bd, i) => (bd.hlT = hit[i]))
    w.searchN = countMatches(hit)
    return w.searchN
  }

  /** The navigator's thumbnail: the page backing plus every word from the atlas at its home position. */
  /** The page at its home layout: the backing, then the text layer over the content box (the words' own home). */
  function drawMiniMap(cv: HTMLCanvasElement) {
    if (!back || !loaded) return
    const W = 208, H = Math.round((W * w.pageH) / w.pageW)
    cv.width = W
    cv.height = H
    const g = cv.getContext('2d')
    if (!g) return
    g.drawImage(back, 0, 0, W, H)
    const { page, content } = loaded.snap, sx = W / w.pageW, sy = H / w.pageH
    g.drawImage(loaded.text, page.marginX * sx, page.marginY * sy, (content.w / 96) * sx, (content.h / 96) * sy)
  }

  function navView(): NavView {
    const cam = w.cam, fit = !cam.canPan && s.zoom >= 0.95
    return {
      fit,
      left: ((cam.x ?? 0) - cam.halfW + w.pageW / 2) / w.pageW,
      top: (w.pageH / 2 - (cam.y ?? 0) - cam.halfH) / w.pageH,
      width: (2 * cam.halfW) / w.pageW,
      height: (2 * cam.halfH) / w.pageH,
    }
  }

  /** Jump the view to (u, v) on the page, as fractions from its top left. */
  function navTo(u: number, v: number) {
    w.cam.scrollX = (u - 0.5) * w.pageW
    w.cam.scrollY = w.pageH / 2 - v * w.pageH
    w.cam.mom = null
  }

  /** Arrows pan a third of the view, Page Up/Down a whole view, Home/End jump to the ends. */
  function panKey(key: string) {
    const cam = w.cam, big = key.startsWith('Page'), sx = cam.halfW * 0.6, sy = cam.halfH * (big ? 1.6 : 0.6)
    if (key === 'ArrowLeft') cam.scrollX -= sx
    else if (key === 'ArrowRight') cam.scrollX += sx
    else if (key === 'ArrowUp' || key === 'PageUp') cam.scrollY += sy
    else if (key === 'ArrowDown' || key === 'PageDown') cam.scrollY -= sy
    else if (key === 'Home') cam.scrollY = Infinity
    else if (key === 'End') cam.scrollY = -Infinity
  }

  // ---- Phone tilt: loose words slide downhill; a hard shake scrambles the page ----
  let shakeLast = 0
  let accPrev: { x: number; y: number; z: number } | null = null
  function onOrient(e: DeviceOrientationEvent) {
    if (!w.tiltG.on || e.gamma == null || e.beta == null) return
    const ang = (screen.orientation && screen.orientation.angle) || 0, r = Math.PI / 180
    let gx = Math.sin(e.gamma * r), gy = -Math.sin((e.beta - 40) * r)
    if (ang === 90) [gx, gy] = [-gy, gx]
    else if (ang === 270 || ang === -90) [gx, gy] = [gy, -gx]
    w.tiltG.x = Math.max(-1, Math.min(1, gx * 1.3))
    w.tiltG.y = Math.max(-1, Math.min(1, gy * 1.3))
  }
  function onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity
    if (!w.tiltG.on || !s.shake || !a || a.x == null || a.y == null || a.z == null) return
    if (accPrev) {
      const j = Math.hypot(a.x - accPrev.x, a.y - accPrev.y, a.z - accPrev.z), now = performance.now()
      if (j > 18 && now - shakeLast > 700) { shakeLast = now; shakeIt(w, Math.min(1, (j - 18) / 20 + 0.4)) }
    }
    accPrev = { x: a.x, y: a.y, z: a.z }
  }
  window.addEventListener('deviceorientation', onOrient)
  window.addEventListener('devicemotion', onMotion)
  type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> }
  /** Turn tilt on (asks iOS for permission; call it from a tap). Resolves to whether it's on. */
  async function setTilt(on: boolean) {
    if (on) {
      try {
        const DO = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as PermissionApi | undefined
        const DM = (typeof DeviceMotionEvent !== 'undefined' ? DeviceMotionEvent : undefined) as PermissionApi | undefined
        if (DO?.requestPermission && (await DO.requestPermission()) !== 'granted') on = false
        if (on && DM?.requestPermission) await DM.requestPermission().catch(() => 'denied')
      } catch {
        on = false
      }
    }
    w.tiltG.on = on
    if (!on) w.tiltG.x = w.tiltG.y = 0
    return on
  }

  /** A user gesture unlocks audio; the reverb's buffers follow a frame later (the hero open makes them as its load's last step). */
  let preparing = false
  function unlockAudio() {
    sfx.init()
    if (preparing || !loaded) return
    preparing = true
    nextTask().then(() => { if (!disposed) sfx.prepare() })
  }

  const enabled = () => open && !!loaded
  const input = attachInput({
    w, canvas, ui, enabled,
    navMode: () => navMode,
    holeMode: () => holeMode,
    setLastRay: (r) => { lastRay = r },
    gesture: unlockAudio,
  })

  // ---- the loop: runs while the tab is visible ----
  let raf = 0, last = 0, frames = 0, fpsT = 0, fps = 0, physMs = 0
  let timeScale = 1 // dev only: slow motion for frame-by-frame checks
  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.033, (now - last) / 1000) * timeScale
    last = now
    w.time += dt
    w.shroomAmt += ((s.shroom ? 1 : 0) - w.shroomAmt) * Math.min(1, dt * 1.2)
    for (let a = 0; a < 3; a++) w.finger.vel[a] *= 0.88
    updateIntro(w, dt, () => {
      if (!pendingFind) return
      const q = pendingFind
      pendingFind = null
      onFind?.(q, find(q)) // a deep link: light it up once the page has landed
    })
    stepMomentum(w, dt)
    if (w.cam.mom) w.navCalm = 1
    w.navCalm = Math.max(0, w.navCalm - dt * 2)
    updateCamera(w, dt, canvas.width, canvas.height, ui, introCam(w, open, cl ? cl.cam : null))
    for (const f of frameListeners) f()
    w.hole.amt = w.hole.on ? w.hole.amt + (1 - w.hole.amt) * Math.min(1, dt * 0.9) : Math.max(0, w.hole.amt - dt * 5)
    for (const bd of w.bodies) { bd.hl += (bd.hlT - bd.hl) * Math.min(1, dt * 5); if (bd.hl < 1e-3 && !bd.hlT) bd.hl = 0 }
    features.update(dt, music?.() ?? null)
    updateBend(w)
    updateTargets(w, dt)
    w.searchAmt += ((w.searchN ? 1 : 0) - w.searchAmt) * Math.min(1, dt * 4)
    const t0 = performance.now()
    if (loaded) { // no bodies until the resume has loaded
      for (let k = 0; k < 4; k++) step(w, dt / 4)
      collide(w)
      updateStates(w, dt)
      updateParticles(w, dt)
    }
    if (diss) {
      const hot = updateDissolve(w, hp, diss, dt, canvas.clientWidth, canvas.clientHeight)
      if (!diss.handed && hot && loaded) {
        // the photo reshapes straight into the page
        startIntro(w)
        if (diss.direct && w.intro) w.intro.direct = true
        heroHandoff(w, hp, diss)
        open = true
        onOpen?.()
      }
      if (diss.handed && diss.fade <= 0) {
        hp.show = false
        diss = null
        if (pendingClose) { const img = pendingClose; pendingClose = null; if (!close(img)) onClosed?.() } // Back during the dissolve
      }
    } else if (cl) {
      const ev = updateClosing(w, hp, cl, dt, canvas.clientWidth, canvas.clientHeight)
      if (ev === 'landed') { if (heroImg) heroImg.style.visibility = ''; onLanded?.() }
      else if (ev === 'done') { cl = null; resetView(w); onClosed?.() }
    } else if (hp.show) heroRest(w, hp, canvas.clientWidth, canvas.clientHeight, canvas.width, canvas.height)
    physMs = physMs * 0.9 + (performance.now() - t0) * 0.1
    if (w.hole.amt > 0 || w.hole.on) sfx.hole(w.hole.amt)
    frames++
    fpsT += dt
    if (fpsT > 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0 }
    skyLin = skyTarget > skyLin ? Math.min(skyTarget, skyLin + dt / 0.7) : Math.max(skyTarget, skyLin - dt / 0.7)
    // closing: the sky fades out with the sparks as the page comes back
    const sky = cl && cl.landed ? 1 - smooth(cl.fade) : smooth(skyLin)
    renderer.render(sky, revealY(w, cl ? cl.reveal : null), !hp.cover, hp.show ? hp : null, !!loaded)
  }
  function startLoop() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame((t) => { last = t; raf = requestAnimationFrame(frame) })
  }
  function stopLoop() {
    cancelAnimationFrame(raf)
    raf = 0
  }
  const onVisibility = () => (document.hidden ? stopLoop() : startLoop())
  document.addEventListener('visibilitychange', onVisibility)
  if (!document.hidden) startLoop()

  function stats(): JellyStats {
    let home = 0, loose = 0, bursting = 0
    for (const bd of w.bodies) { if (bd.state === HOME) home++; else if (bd.state === LOOSE) loose++; else if (hidden(bd)) bursting++ }
    return { words: w.bodies.length, home, loose, bursting, physicsMs: +physMs.toFixed(2), fps, loaded: !!loaded }
  }

  function dispose() {
    disposed = true
    stopLoop()
    document.removeEventListener('visibilitychange', onVisibility)
    ro.disconnect()
    input.detach()
    window.removeEventListener('deviceorientation', onOrient)
    window.removeEventListener('devicemotion', onMotion)
    frameListeners.clear()
    sfx.dispose()
    renderer.dispose()
    gl?.getExtension('WEBGL_lose_context')?.loseContext() // give the context back now, not at GC (browsers cap live contexts)
    if (heroImg) heroImg.style.visibility = '' // never leave the photo hidden
    if (debug && (window as unknown as { __jelly?: unknown }).__jelly === debug) delete (window as unknown as { __jelly?: unknown }).__jelly
  }

  const api = {
    load,
    openDirect,
    openFromHero,
    close,
    find,
    chaos: () => chaos(w),
    burstAll: () => burstAll(w),
    healAll: () => healAll(w),
    setShroom: (on: boolean) => { s.shroom = on },
    setSound: (on: boolean) => { s.soundOn = on; sfx.setVolume() },
    setHoleMode: (on: boolean) => { holeMode = on },
    /** hold Space: the black hole opens at the mouse */
    holeAtCursor: () => { if (enabled() && lastRay && !w.hole.on) startHole(w, planeZ(lastRay, 0.25)) },
    /** let go of Space (a press-and-hold on the page releases itself) */
    releaseHoleKey: () => { if (w.hole.on && !input.pointerHole()) releaseHole(w) },
    replayIntro: () => { if (loaded) startIntro(w) },
    resetView: () => resetView(w),
    zoomBy: (f: number) => zoomCenter(w, canvas.getBoundingClientRect(), ui, f),
    setNavMode: (m: 'rotate' | 'pan') => { navMode = m },
    setUiInsets: (top: number, bot: number) => { ui.top = top; ui.bot = bot },
    panKey,
    navView,
    navTo,
    drawMiniMap,
    setTilt,
    /** called every frame, right after the camera moves (mutate the DOM; never set React state) */
    onFrame: (f: () => void) => { frameListeners.add(f); return () => { frameListeners.delete(f) } },
    gesture: unlockAudio,
    stats,
    dispose,
  }

  // dev only: a handle for scripted checks in the browser, like the playground's
  const debug = process.env.NODE_ENV !== 'production' ? { ...api, w, hp, diss: () => diss, closing: () => cl, intro: () => w.intro, cam: w.cam, setTimeScale: (k: number) => { timeScale = k } } : null
  if (debug) (window as unknown as { __jelly?: unknown }).__jelly = debug

  return api
}

export type JellyEngine = ReturnType<typeof createJellyEngine>
