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
import { burstAll, chaos, collide, healAll, releaseHole, startHole, step, updateParticles, updateStates } from './physics'
import { createRenderer } from './render'
import { createSfx } from './sfx'
import { snapshotBodies, type LoadedSnapshot } from './snapshot'
import { buildAtlas, buildPhysics, createWorld, hidden, type World } from './world'

export interface JellyEngineOptions {
  canvas: HTMLCanvasElement
  /** the site's music player, for the dance (wired in T8) */
  music?: () => MusicInput | null
  /** the Finder ran (on its own when a deep link's page lands) */
  onFind?: (query: string, matches: number) => void
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

export function createJellyEngine({ canvas, music, onFind }: JellyEngineOptions) {
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
  let skyAmt = 0, skyTarget = 0
  let navMode: 'rotate' | 'pan' = 'rotate'
  let holeMode = false
  let lastRay: Ray | null = null
  let back: HTMLCanvasElement | null = null

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

  /** Build the bodies, sparks, atlas and sheet from the snapshot; the resume then waits as a galaxy. */
  function load(snapshot: LoadedSnapshot) {
    loaded = snapshot
    const snap = snapshot.snap
    w.rnd = lcg(7)
    w.pageW = snap.page.w
    w.pageH = snap.page.h
    w.pageBottom = -w.pageH / 2
    const list = snapshotBodies(snap)
    buildPhysics(w, list)
    const { atlas, rects } = buildAtlas(w, list, snapshot.text)
    renderer.buildGPU(atlas, rects)
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
    if (pendingOpen) { pendingOpen = false; directIntro() }
  }

  function directIntro() {
    startIntro(w) // from the galaxy, so it's quick
    w.ptAlpha.fill(0) // the stardust fades in as it streams to the page
  }

  /** A direct visit (or a shared link): the nebula fades in, then a quick galaxy intro prints the page. */
  function openDirect(find?: string | null) {
    open = true
    skyTarget = 1
    if (find) pendingFind = find
    if (loaded) directIntro()
    else pendingOpen = true
  }

  function find(q: string) {
    const hit = findMatches(w.bodies.map((bd) => ({ text: bd.b.text, tok: bd.tok, parts: bd.parts })), q)
    w.bodies.forEach((bd, i) => (bd.hlT = hit[i]))
    w.searchN = countMatches(hit)
    return w.searchN
  }

  const enabled = () => open && !!loaded
  const detachInput = attachInput({
    w, canvas, ui, enabled,
    navMode: () => navMode,
    holeMode: () => holeMode,
    setLastRay: (r) => { lastRay = r },
    gesture: () => sfx.init(),
  })

  // ---- the loop: runs while the tab is visible ----
  let raf = 0, last = 0, frames = 0, fpsT = 0, fps = 0, physMs = 0
  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.033, (now - last) / 1000)
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
    updateCamera(w, dt, canvas.width, canvas.height, ui, introCam(w, open, null))
    w.hole.amt = w.hole.on ? w.hole.amt + (1 - w.hole.amt) * Math.min(1, dt * 0.9) : Math.max(0, w.hole.amt - dt * 5)
    for (const bd of w.bodies) { bd.hl += (bd.hlT - bd.hl) * Math.min(1, dt * 5); if (bd.hl < 1e-3 && !bd.hlT) bd.hl = 0 }
    features.update(dt, music?.() ?? null)
    updateBend(w)
    updateTargets(w, dt)
    w.searchAmt += ((w.searchN ? 1 : 0) - w.searchAmt) * Math.min(1, dt * 4)
    const t0 = performance.now()
    if (w.NP) { // no bodies until the resume loads
      for (let k = 0; k < 4; k++) step(w, dt / 4)
      collide(w)
      updateStates(w, dt)
      updateParticles(w, dt)
    }
    physMs = physMs * 0.9 + (performance.now() - t0) * 0.1
    if (w.hole.amt > 0 || w.hole.on) sfx.hole(w.hole.amt)
    frames++
    fpsT += dt
    if (fpsT > 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0 }
    skyAmt = skyTarget > skyAmt ? Math.min(skyTarget, skyAmt + dt / 0.7) : Math.max(skyTarget, skyAmt - dt / 0.7)
    renderer.render(skyAmt, revealY(w, null), true, null)
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
    stopLoop()
    document.removeEventListener('visibilitychange', onVisibility)
    ro.disconnect()
    detachInput()
    sfx.dispose()
    renderer.dispose()
    if (debug && (window as unknown as { __jelly?: unknown }).__jelly === debug) delete (window as unknown as { __jelly?: unknown }).__jelly
  }

  const api = {
    load,
    openDirect,
    find,
    chaos: () => chaos(w),
    burstAll: () => burstAll(w),
    healAll: () => healAll(w),
    setShroom: (on: boolean) => { s.shroom = on },
    setSound: (on: boolean) => { s.soundOn = on; sfx.setVolume() },
    setHoleMode: (on: boolean) => { holeMode = on },
    /** hold Space: the black hole opens at the mouse */
    holeAtCursor: () => { if (lastRay && !w.hole.on) startHole(w, planeZ(lastRay, 0.25)) },
    releaseHole: () => releaseHole(w),
    replayIntro: () => { if (loaded) startIntro(w) },
    resetView: () => resetView(w),
    zoomBy: (f: number) => zoomCenter(w, canvas.getBoundingClientRect(), ui, f),
    setNavMode: (m: 'rotate' | 'pan') => { navMode = m },
    setUiInsets: (top: number, bot: number) => { ui.top = top; ui.bot = bot },
    gesture: () => sfx.init(),
    stats,
    dispose,
  }

  // dev only: a handle for scripted checks in the browser, like the playground's
  const debug = process.env.NODE_ENV !== 'production' ? { ...api, w, intro: () => w.intro, cam: w.cam } : null
  if (debug) (window as unknown as { __jelly?: unknown }).__jelly = debug

  return api
}

export type JellyEngine = ReturnType<typeof createJellyEngine>
