/**
 * Hero sparks: the hero photo as ~18K comet sparks (~6K on phones), sampled from its own
 * pixels on a stratified grid. Each keeps its pixel on screen; at rest its world position
 * is that pixel unprojected onto a plane in front of the camera (re-derived whenever the
 * camera moves, so it never misaligns). Drawn with the comet program: heat 0 is the
 * photo's color, heat 1 the comet ramp.
 *
 * The dissolve: a ragged front sweeps out from the click; each spark heats to white-hot,
 * kicks outward, swirls and hovers near the photo until the resume has loaded. Then the
 * glyph sparks take over rank for rank in reading order (the photo's top becomes the
 * page's header) and stream into their words while the scanline prints the page.
 */

import { camDist } from './camera'
import { FOV } from './config'
import { galaxyAt, galaxySlots } from './galaxy'
import { lcg, smooth } from './math'
import { BANDS, bandKey, handoffMap, orderByKey } from './order'
import { swirlKick } from './physics'
import { bilerp, type World } from './world'

export interface HeroPool {
  N: number
  /** drawn at all */
  show: boolean
  /** the hero sparks stand in for the resume's own (they're hidden) */
  cover: boolean
  /** the 🍄 summon: the heat starts blue-violet */
  tint: number
  /** a photo pixel's radius in canvas px */
  dot: number
  /** the rest plane's distance from the camera */
  dist: number
  key: string
  camKey: string
  dirtyPos: boolean
  dirtyAttr: boolean
  /** each spark's place in the photo, CSS px from its top left */
  loc: Float32Array
  /** each spark's place on the canvas, CSS px */
  scr: Float32Array
  at: [number, number] | null
  col: Float32Array
  pos: Float32Array
  tail: Float32Array
  vel: Float32Array
  alpha: Float32Array
  age: Float32Array
  heat: Float32Array
  sv: Float32Array
  prev: Float32Array
  gal: Float32Array
}

export const createHeroPool = (): HeroPool => {
  const E = new Float32Array(0)
  return {
    N: 0, show: false, cover: false, tint: 0, dot: 2, dist: 10, key: '', camKey: '', dirtyPos: true, dirtyAttr: true,
    loc: E, scr: E, at: null, col: E, pos: E, tail: E, vel: E, alpha: E, age: E, heat: E, sv: E, prev: E, gal: E,
  }
}

/** Where the photo is drawn inside an object-fit: contain <img>, in client px. */
export function containedRect(img: HTMLImageElement) {
  const b = img.getBoundingClientRect(), nw = img.naturalWidth || 1, nh = img.naturalHeight || 1
  const s = Math.min(b.width / nw, b.height / nh), w = nw * s, h = nh * s
  return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h }
}

let photo: { src: string; bitmap: Promise<ImageBitmap | null>; ready: ImageBitmap | null } | null = null

/**
 * The photo, decoded off the main thread (sampling an <img> decodes it on the main thread:
 * ~50 ms on a throttled phone, in the open's busiest frame). Cached per source; null where
 * it can't (no createImageBitmap, or the fetch fails), and then the <img> itself is drawn.
 */
export function decodePhoto(img: HTMLImageElement): Promise<ImageBitmap | null> {
  const src = img.currentSrc || img.src
  if (photo?.src !== src) {
    const entry: NonNullable<typeof photo> = { src, bitmap: Promise.resolve(null), ready: null }
    if (src && typeof createImageBitmap === 'function') {
      entry.bitmap = fetch(src)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`Photo request failed: ${r.status}`))))
        .then((b) => createImageBitmap(b))
        .then((bm) => (entry.ready = bm))
        .catch(() => null)
    }
    photo = entry
  }
  return photo.bitmap
}

/** Let the decoded photo go once the resume is closed (decodePhoto makes it again). */
export function releasePhoto() {
  photo?.ready?.close()
  photo = null
}

const decoded = (img: HTMLImageElement) => (photo && photo.src === (img.currentSrc || img.src) ? photo.ready : null)

export interface HeroSource {
  img: HTMLImageElement
  /** the canvas's client rect */
  canvas: DOMRect
  dpr: number
  low: boolean
}

/**
 * Sample the photo into sparks (or, if its size hasn't changed, just follow it). Returns
 * false if it can't (not loaded, no pixels, or a tainted canvas). `rebuilt` is called with
 * the pool when its arrays are new, so the renderer can make its buffers.
 */
export function buildHeroSparks(w: World, hp: HeroPool, src: HeroSource, rebuilt: () => void) {
  const { img, canvas: rc, dpr, low } = src
  if (!img.complete || !img.naturalWidth || rc.width < 2) return false
  const b = containedRect(img)
  if (b.width < 2) return false
  const want = Math.round((low ? 6000 : 18000) * w.s.heroSparks)
  const key = [b.width, b.height, want, dpr].map((v) => Math.round(v)).join(',')
  if (key === hp.key) { placeHeroSparks(hp, b, rc); return true } // same size: just follow the photo (the hover lift moves it)
  // the grid is in CSS px, so low quality samples at 1× (a quarter of the pixels; each spark is a cell's average anyway)
  const k = Math.min(low ? 1 : dpr, 1400 / b.width), W = Math.round(b.width * k), H = Math.round(b.height * k)
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (!g) return false
  g.drawImage(decoded(img) ?? img, 0, 0, W, H)
  let px: Uint8ClampedArray
  try {
    px = g.getImageData(0, 0, W, H).data
  } catch (err) {
    console.warn('Hero sparks need a same-origin photo', err)
    return false
  }
  let A = 0
  for (let i = 3; i < px.length; i += 16) if (px[i] > 127) A += 4
  if (!A) return false
  // one spark per grid cell that's mostly photo, colored by the cell's average (so the dots read as the photo, not as aliasing)
  const step = Math.sqrt(A / want), S: number[] = [], C: number[] = []
  const r = lcg(11)
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(W, Math.ceil(x + step)), y1 = Math.min(H, Math.ceil(y + step))
    let rr = 0, gg = 0, bb = 0, n = 0, all = 0
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 4
      all++
      if (px[o + 3] < 128) continue
      rr += px[o]; gg += px[o + 1]; bb += px[o + 2]; n++
    }
    if (n < all * 0.5) continue
    const cx = x + step * (0.5 + (r() - 0.5) * 0.3), cy = y + step * (0.5 + (r() - 0.5) * 0.3)
    S.push(cx / k, cy / k)
    C.push(rr / n / 255, gg / n / 255, bb / n / 255)
  }
  const N = S.length / 2
  hp.N = N
  hp.key = key
  hp.dot = ((0.74 * step) / k) * dpr // dot radius in canvas px: neighbours overlap, so the photo is solid
  hp.loc = Float32Array.from(S)
  hp.scr = new Float32Array(S.length)
  hp.col = Float32Array.from(C)
  hp.at = null
  placeHeroSparks(hp, b, rc)
  hp.pos = new Float32Array(N * 3)
  hp.tail = new Float32Array(N * 3)
  hp.vel = new Float32Array(N * 3)
  hp.sv = new Float32Array(N * 3)
  hp.prev = new Float32Array(N * 3)
  hp.alpha = new Float32Array(N).fill(1)
  hp.age = new Float32Array(N).fill(9)
  hp.heat = new Float32Array(N)
  hp.gal = galaxySlots(N, lcg(23))
  order.heroSrc = null
  idle(() => heroOrder(hp))
  rebuilt()
  hp.camKey = ''
  hp.dirtyAttr = true
  return true
}

/** Each spark's pixel on the canvas: its place in the photo plus where the photo is now. */
function placeHeroSparks(hp: HeroPool, b: { left: number; top: number }, rc: DOMRect) {
  const x = b.left - rc.left, y = b.top - rc.top
  if (hp.at && hp.at[0] === x && hp.at[1] === y) return
  hp.at = [x, y]
  hp.camKey = ''
  for (let i = 0; i < hp.N; i++) { hp.scr[i * 2] = hp.loc[i * 2] + x; hp.scr[i * 2 + 1] = hp.loc[i * 2 + 1] + y }
}

/** Spark i's pixel, unprojected onto the plane in front of the camera at hp.dist (just in front of the page). */
export function heroHome(w: World, hp: HeroPool, i: number, cw: number, ch: number, out: number[]) {
  const cam = w.cam
  const nx = (hp.scr[i * 2] / cw) * 2 - 1, ny = 1 - (hp.scr[i * 2 + 1] / ch) * 2, tf = Math.tan(FOV / 2), D = hp.dist
  for (let a = 0; a < 3; a++) out[a] = cam.eye[a] + (cam.fwd[a] + cam.right[a] * nx * tf * cam.aspect + cam.up[a] * ny * tf) * D
}

const tmp = [0, 0, 0]
const gtmp = [0, 0, 0]

/** At rest, every spark sits exactly on its pixel (only recomputed when the camera or canvas changes). */
export function heroRest(w: World, hp: HeroPool, cw: number, ch: number, drawW: number, drawH: number) {
  const cam = w.cam, ck = cam.eye.join() + cam.target.join() + drawW + 'x' + drawH
  if (ck === hp.camKey) return
  hp.camKey = ck
  hp.dirtyPos = true
  hp.dist = 0.85 * camDist(w)
  for (let i = 0; i < hp.N; i++) {
    heroHome(w, hp, i, cw, ch, tmp)
    const o = i * 3
    for (let a = 0; a < 3; a++) hp.pos[o + a] = hp.tail[o + a] = tmp[a]
  }
}

// smooth value noise, so the dissolve front is ragged rather than a perfect circle
const vnoise2 = (x: number, y: number) => {
  const h = (i: number, j: number) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v) }
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  return (h(i, j) * (1 - sx) + h(i + 1, j) * sx) * (1 - sy) + (h(i, j + 1) * (1 - sx) + h(i + 1, j + 1) * sx) * sy
}

export interface Dissolve {
  t: number
  rel: Float32Array
  travel: number
  sweep: number
  ox: number
  oy: number
  direct: boolean
  arrived: number
  handed: boolean
  fade: number
  used: Uint8Array | null
}

/**
 * Start the dissolve from (ox, oy) on the canvas (the click; the nav button sits outside
 * the photo, so the front starts at the photo's nearest point and crosses it in `sweep`).
 */
export function startDissolve(w: World, hp: HeroPool, ox: number, oy: number, low: boolean, tint: number): Dissolve {
  const T = w.s.dissolveTime * (low ? 0.7 : 1), sweep = T * 0.42, N = hp.N
  let dMin = Infinity, dMax = 0
  for (let i = 0; i < N; i++) { const dd = Math.hypot(hp.scr[i * 2] - ox, hp.scr[i * 2 + 1] - oy); dMin = Math.min(dMin, dd); dMax = Math.max(dMax, dd) }
  const rel = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const x = hp.scr[i * 2], y = hp.scr[i * 2 + 1]
    rel[i] = sweep * ((Math.hypot(x - ox, y - oy) - dMin) / Math.max(1, dMax - dMin) + 0.22 * vnoise2(x / 45, y / 45) + 0.05 * Math.random())
  }
  hp.vel.fill(0)
  hp.sv = new Float32Array(N * 3)
  hp.prev = hp.pos.slice()
  hp.tint = tint
  hp.show = true
  hp.cover = true
  return { t: 0, rel, travel: T, sweep, ox, oy, direct: w.s.heroPath !== 'galaxy', arrived: 0, handed: false, fade: 1, used: null }
}

/** One frame of the dissolve. Returns true once every spark is released and hot (ready for the handoff). */
export function updateDissolve(w: World, hp: HeroPool, d: Dissolve, dt: number, cw: number, ch: number) {
  const N = hp.N, T = d.travel, SW = w.s.swirl * 3, tr = 0.05 * w.s.trail
  const rx = w.cam.right, uy = w.cam.up, fw = w.cam.fwd, camY = w.cam.y ?? 0
  d.t += dt
  let arrived = 0
  for (let i = 0; i < N; i++) {
    const o = i * 3, u = d.t - d.rel[i]
    if (u < 0) { // not reached by the front yet: still a pixel of the photo
      heroHome(w, hp, i, cw, ch, tmp)
      for (let a = 0; a < 3; a++) hp.pos[o + a] = hp.tail[o + a] = hp.prev[o + a] = tmp[a]
      continue
    }
    if (hp.heat[i] === 0) {
      // released: kick outward from the origin (in screen terms), a little toward the camera
      const dx = hp.scr[i * 2] - d.ox, dy = hp.scr[i * 2 + 1] - d.oy, l = Math.hypot(dx, dy) || 1, sp = 1.5 + Math.random() * 2.5
      for (let a = 0; a < 3; a++) hp.vel[o + a] = (rx[a] * dx / l - uy[a] * dy / l) * sp - fw[a] * (0.5 + Math.random())
      hp.age[i] = 0
    }
    hp.heat[i] = Math.max(1e-4, Math.min(1, u / 0.25))
    hp.age[i] = u
    if (d.direct) {
      // straight to the page: kick, swirl and hover near the photo until the resume takes over (it waits here if loading is slow)
      if (u >= 0.25) arrived++
      heroHome(w, hp, i, cw, ch, gtmp)
      if (SW > 0) swirlKick(hp.vel, hp.pos, o, w.time, SW * dt)
      const drag = Math.max(0, 1 - 1.1 * dt), pull = 1 - Math.exp(-0.5 * dt)
      for (let a = 0; a < 3; a++) { hp.vel[o + a] *= drag; hp.pos[o + a] += hp.vel[o + a] * dt; hp.pos[o + a] += (gtmp[a] - hp.pos[o + a]) * pull }
    } else {
      galaxyAt(hp.gal, i, w.time, camY, gtmp)
      const k = smooth(u / T)
      if (k >= 1) { for (let a = 0; a < 3; a++) hp.pos[o + a] = gtmp[a]; arrived++ }
      else {
        if (SW > 0) swirlKick(hp.vel, hp.pos, o, w.time, SW * dt)
        const drag = Math.max(0, 1 - (1 + 4 * k) * dt), pull = 1 - Math.exp(-(1 + 22 * k * k) * dt)
        for (let a = 0; a < 3; a++) { hp.vel[o + a] *= drag; hp.pos[o + a] += hp.vel[o + a] * dt; hp.pos[o + a] += (gtmp[a] - hp.pos[o + a]) * pull }
      }
    }
    // comet tails from the smoothed recent motion
    for (let a = 0; a < 3; a++) {
      const v = (hp.pos[o + a] - hp.prev[o + a]) / Math.max(dt, 1e-3)
      hp.sv[o + a] += (v - hp.sv[o + a]) * 0.45
      hp.tail[o + a] = hp.pos[o + a] - hp.sv[o + a] * tr
      hp.prev[o + a] = hp.pos[o + a]
    }
  }
  d.arrived = arrived
  hp.dirtyPos = hp.dirtyAttr = true
  if (d.handed) { // after the handoff, the slots no resume spark took over fade out
    d.fade = Math.max(0, d.fade - dt / 0.3)
    for (let i = 0; i < N; i++) if (!d.used![i]) hp.alpha[i] = d.fade
  }
  return arrived === N
}

// ---- Reading order, sorted ahead of time in idle moments (cached per build) so the handoff frame stays cheap ----
const order: { hero: Int32Array | null; heroSrc: Float32Array | null; page: Int32Array | null; pageSrc: Float32Array | null } = { hero: null, heroSrc: null, page: null, pageSrc: null }

/** Soon, in an idle moment if there is one (a busy, throttled phone may have none before the handoff). */
export const idle = (f: () => void) => {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o: { timeout: number }) => number }).requestIdleCallback
  if (ric) ric(f, { timeout: 250 })
  else setTimeout(f, 50)
}

export function heroOrder(hp: HeroPool) {
  if (order.heroSrc === hp.loc && order.hero) return order.hero
  const H = hp.N, L = hp.loc
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (let i = 0; i < H; i++) { x0 = Math.min(x0, L[i * 2]); x1 = Math.max(x1, L[i * 2]); y0 = Math.min(y0, L[i * 2 + 1]); y1 = Math.max(y1, L[i * 2 + 1]) }
  const key = new Float32Array(H)
  for (let i = 0; i < H; i++) key[i] = bandKey((L[i * 2] - x0) / (x1 - x0 + 1e-3), (L[i * 2 + 1] - y0) / (y1 - y0 + 1e-3), BANDS)
  order.hero = orderByKey(key)
  order.heroSrc = L
  return order.hero
}

export function pageOrder(w: World) {
  if (order.pageSrc === w.ptLu && order.page) return order.page
  const key = new Float32Array(w.NPT)
  for (const bd of w.bodies) for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
    bilerp(w.home, bd, w.ptLu[k], w.ptLv[k], tmp)
    key[k] = bandKey((tmp[0] + w.pageW / 2) / w.pageW, (w.pageH / 2 - tmp[1]) / w.pageH, BANDS)
  }
  order.page = orderByKey(key)
  order.pageSrc = w.ptLu
  return order.page
}

/**
 * The handoff: the resume's glyph sparks take over exactly where the hero sparks are. Straight
 * to the page (the default), rank for rank in reading order, keeping the hero sparks' flight
 * and comet age; through the galaxy, k → k mod H. Twins fade in rather than doubling, and the
 * covered hero slots switch off on the same frame.
 */
export function heroHandoff(w: World, hp: HeroPool, d: Dissolve) {
  const H = hp.N, used = new Uint8Array(H)
  const { ptPos, ptPrev, ptVel, ptSV, ptTail, ptAlpha, ptAge, ptGal } = w
  if (d.direct) {
    const po = pageOrder(w), heroFor = handoffMap(po, heroOrder(hp))
    for (let r = 0; r < po.length; r++) {
      const k = po[r], i = heroFor[k], o = k * 3, h = i * 3
      for (let a = 0; a < 3; a++) { ptPos[o + a] = ptPrev[o + a] = hp.pos[h + a]; ptVel[o + a] = hp.vel[h + a]; ptSV[o + a] = hp.sv[h + a]; ptTail[o + a] = hp.tail[h + a] }
      ptAlpha[k] = used[i] ? 0 : 1
      ptAge[k] = hp.age[i]
      used[i] = 1
    }
  } else {
    for (let k = 0; k < w.NPT; k++) {
      const o = k * 3, h = (k % H) * 3
      for (let a = 0; a < 3; a++) { ptGal[o + a] = hp.gal[h + a]; ptPos[o + a] = ptPrev[o + a] = hp.pos[h + a]; ptSV[o + a] = hp.sv[h + a]; ptTail[o + a] = hp.tail[h + a] }
      ptAlpha[k] = k < H ? 1 : 0
      ptAge[k] = 9
      used[k % H] = 1
    }
  }
  for (let i = 0; i < H; i++) if (used[i]) hp.alpha[i] = 0
  hp.cover = false
  hp.dirtyAttr = true
  d.used = used
  d.handed = true
  d.fade = 1
}

// ---- Close, in reverse: the words burst into the hero pool, the sparks fly home to their pixels cooling from comet
// colors back to the photo's, the camera swings back out, then the photo and the page cross-fade back in ----

export interface Closing {
  t: number
  T: number
  rel: Float32Array
  /** how far out the camera has swung (only grows) */
  cam: number
  /** the scanline un-printing the sheet, bottom to top */
  reveal: number
  landed: boolean
  fade: number
}

let ptBody: Int32Array | null = null, ptBodySrc: Float32Array | null = null

/** Where resume spark k is right now: on its word's lattice if the word shows, else wherever it flies. */
function particleAt(w: World, k: number, out: number[]) {
  if (!ptBody || ptBodySrc !== w.ptLu) {
    ptBody = new Int32Array(w.NPT)
    ptBodySrc = w.ptLu
    w.bodies.forEach((bd, bi) => ptBody!.fill(bi, bd.pt0, bd.pt0 + bd.ptN))
  }
  const bd = w.bodies[ptBody[k]]
  if (bd.state >= 3) { out[0] = w.ptPos[k * 3]; out[1] = w.ptPos[k * 3 + 1]; out[2] = w.ptPos[k * 3 + 2] }
  else bilerp(w.pos, bd, w.ptLu[k], w.ptLv[k], out)
}

/** Start the reverse (the pool must already sit on the photo: buildHeroSparks first). */
export function startClosing(w: World, hp: HeroPool, low: boolean, cam0: number): Closing {
  const N = hp.N, T = w.s.dissolveTime * (low ? 0.65 : 0.9)
  hp.prev = new Float32Array(N * 3)
  hp.sv = new Float32Array(N * 3)
  const rel = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const o = i * 3
    particleAt(w, i % w.NPT, tmp)
    const th = Math.random() * 6.283, sp = 1.5 + Math.random() * 2.5
    for (let a = 0; a < 3; a++) hp.pos[o + a] = hp.prev[o + a] = hp.tail[o + a] = tmp[a]
    hp.vel[o] = Math.cos(th) * sp
    hp.vel[o + 1] = Math.sin(th) * sp
    hp.vel[o + 2] = 0.6 + Math.random() * 1.5
    hp.heat[i] = 1
    hp.age[i] = 0
    hp.alpha[i] = 1
    rel[i] = 0.22 * Math.random()
  }
  hp.tint = 0
  hp.show = true
  hp.cover = true
  hp.dirtyPos = hp.dirtyAttr = true
  return { t: 0, T, rel, cam: cam0, reveal: w.pageBottom - 0.3, landed: false, fade: 0 }
}

/**
 * One frame of the reverse. Returns 'landed' the frame every spark is home (show the photo
 * and the page again), 'done' once they've faded out over it, else null.
 */
export function updateClosing(w: World, hp: HeroPool, c: Closing, dt: number, cw: number, ch: number): 'landed' | 'done' | null {
  const N = hp.N, SW = w.s.swirl * 3, tr = 0.05 * w.s.trail
  c.t += dt
  c.cam = Math.max(c.cam, smooth(c.t / (c.T + 0.3)))
  c.reveal = w.pageBottom - 0.3 + (w.pageH + 0.6) * smooth(c.t / 0.6)
  hp.dist = 0.85 * camDist(w)
  let home = 0
  for (let i = 0; i < N; i++) {
    const o = i * 3, u = Math.max(0, c.t - c.rel[i]), k = smooth(u / c.T)
    heroHome(w, hp, i, cw, ch, tmp) // its pixel on the photo, from wherever the camera is now
    if (k >= 1) { for (let a = 0; a < 3; a++) hp.pos[o + a] = tmp[a]; home++ }
    else {
      if (SW > 0) swirlKick(hp.vel, hp.pos, o, w.time, SW * dt * (1 - k))
      const drag = Math.max(0, 1 - (1 + 5 * k) * dt), pull = 1 - Math.exp(-(0.5 + 26 * k * k) * dt)
      for (let a = 0; a < 3; a++) { hp.vel[o + a] *= drag; hp.pos[o + a] += hp.vel[o + a] * dt; hp.pos[o + a] += (tmp[a] - hp.pos[o + a]) * pull }
    }
    hp.heat[i] = 1 - smooth((u / c.T - 0.4) / 0.6) // cools back to the photo's colors as it lands
    hp.age[i] = u
    for (let a = 0; a < 3; a++) {
      const v = (hp.pos[o + a] - hp.prev[o + a]) / Math.max(dt, 1e-3)
      hp.sv[o + a] += (v - hp.sv[o + a]) * 0.45
      hp.tail[o + a] = hp.pos[o + a] - hp.sv[o + a] * tr * (1 - k)
      hp.prev[o + a] = hp.pos[o + a]
    }
  }
  hp.dirtyPos = hp.dirtyAttr = true
  let event: 'landed' | 'done' | null = null
  if (!c.landed && home === N) { c.landed = true; event = 'landed' }
  if (c.landed) {
    // the real photo and the page fade back in under the sparks
    c.fade = Math.min(1, c.fade + dt / 0.5)
    const a = 1 - smooth(c.fade)
    for (let i = 0; i < N; i++) hp.alpha[i] = a
    if (c.fade >= 1) {
      hp.show = false
      hp.cover = false
      hp.alpha.fill(1)
      hp.heat.fill(0)
      hp.age.fill(9)
      event = 'done'
    }
  }
  return event
}
