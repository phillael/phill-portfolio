/**
 * The simulation's shared state: one jelly body per word (a mass-spring lattice in typed
 * arrays, Jelly Mario style), the comet sparks sampled from each word's glyphs, and the
 * camera. Every other module reads and writes it; React never sees it.
 */

import { BendTable } from './bend'
import { CELL, DRIP, HOME, PAD_TOP, PAD_X, ROWS, type JellyState } from './config'
import { galaxySlots } from './galaxy'
import { hex, lcg, type Vec3 } from './math'
import type { MusicFeatures } from './music'
import type { Sfx } from './sfx'
import type { BodySpec } from './snapshot'
import { wordToken } from './finder'

export interface Body {
  x0: number
  x1: number
  yTop: number
  yBot: number
  cols: number
  /** its lattice particles: [p0, p1) */
  p0: number
  p1: number
  b: BodySpec
  state: number
  /** home-spring strength (0 while loose) */
  strength: number
  timer: number
  /** how far it's been pushed, eased (the gummy backing's input) */
  jig: number
  seed: number
  escaped: boolean
  reform: number
  /** its sparks: [pt0, pt0 + ptN) */
  pt0: number
  ptN: number
  /** home center */
  hcx: number
  hcy: number
  tok: string
  parts: string[]
  /** Finder highlight, eased toward hlT */
  hl: number
  hlT: number
  /** Play mode's glows, eased toward their targets: an Impact coin (green, pulsing) and a lit line (cyan); neither lifts the word */
  coin: number
  coinT: number
  lit: number
  litT: number
  /** the entrance's own re-form time (0 = a normal re-form) */
  rt: number
}

export interface Camera {
  eye: Vec3
  target: Vec3
  right: Vec3
  up: Vec3
  fwd: Vec3
  mvp: Float32Array
  aspect: number
  x: number | null
  y: number | null
  scrollX: number
  scrollY: number
  zoom: number | null
  halfW: number
  halfH: number
  canPan: boolean
  mom: { x: number; y: number } | null
  /** a jolt on top of the eased camera (Play mode's smash shake), and a roll about its view (the trip's sway; rad) */
  shake: { x: number; y: number }
  roll: number
}

export interface Intro {
  t: number
  dur: number
  pre: boolean
  ended: boolean
  lead: number
  /** fresh from the hero: sparks keep flying until their word's turn */
  direct: boolean
}

export interface World {
  s: JellyState
  low: boolean
  sfx: Sfx
  music: MusicFeatures
  rnd: () => number
  pageW: number
  pageH: number
  pageBottom: number
  time: number
  /** the shroom look: the user's 🍄 or Play's trip, whichever is more (eased) */
  shroomAmt: number
  /** Play's trip: its look (Play sets the target; the engine eases tripAmt toward it), and no random word drops while playing */
  trip: number
  tripAmt: number
  noDrops: boolean
  /** how soft the words' springs are (the user's 🍄 only: the trip is a look, so the text stays readable and walkable) */
  meltAmt: number
  danceMix: number
  /** 1 while scrolling/panning/zooming/rotating, fading over ~0.5 s: words hold on tighter */
  navCalm: number
  bodies: Body[]
  NP: number
  NS: number
  pos: Float32Array
  vel: Float32Array
  home: Float32Array
  /** per-frame target offsets (finder lift, dancing, the bend) */
  off: Float32Array
  frc: Float32Array
  inv: Float32Array
  pBody: Int32Array
  vis: Float32Array
  sa: Int32Array
  sb: Int32Array
  srest: Float32Array
  sk: Float32Array
  NPT: number
  ptLu: Float32Array
  ptLv: Float32Array
  ptPos: Float32Array
  ptVel: Float32Array
  ptHome: Float32Array
  ptCol: Float32Array
  ptAlpha: Float32Array
  ptAge: Float32Array
  ptGal: Float32Array
  ptPrev: Float32Array
  ptSV: Float32Array
  ptTail: Float32Array
  burstQueue: Set<number>
  finger: { active: boolean; eye: Vec3; dir: Vec3; vel: Vec3; last: { p: Vec3; t: number } | null }
  hole: { on: boolean; amt: number; p: Vec3; eaten: Body[] }
  tiltG: { on: boolean; x: number; y: number }
  intro: Intro | null
  bend: BendTable
  cam: Camera
  ripples: { x: number; y: number; t: number; k: number }[]
  rippleSide: number
  searchAmt: number
  searchN: number
  actLoose: number
  actBurst: number
}

const F0 = new Float32Array(0)

export function createWorld(s: JellyState, low: boolean, sfx: Sfx, music: MusicFeatures): World {
  return {
    s, low, sfx, music, rnd: lcg(7),
    pageW: 8.5, pageH: 11, pageBottom: -5.5, // Letter until the resume loads, so the camera doesn't move when it does
    time: 0, shroomAmt: 0, trip: 0, tripAmt: 0, noDrops: false, meltAmt: 0, danceMix: 0, navCalm: 0,
    bodies: [], NP: 0, NS: 0,
    pos: F0, vel: F0, home: F0, off: F0, frc: F0, inv: F0, pBody: new Int32Array(0), vis: F0,
    sa: new Int32Array(0), sb: new Int32Array(0), srest: F0, sk: F0,
    NPT: 0, ptLu: F0, ptLv: F0, ptPos: F0, ptVel: F0, ptHome: F0, ptCol: F0, ptAlpha: F0, ptAge: F0, ptGal: F0, ptPrev: F0, ptSV: F0, ptTail: F0,
    burstQueue: new Set(),
    finger: { active: false, eye: [0, 0, 0], dir: [0, 0, -1], vel: [0, 0, 0], last: null },
    hole: { on: false, amt: 0, p: [0, 0, 0.25], eaten: [] },
    tiltG: { on: false, x: 0, y: 0 },
    intro: null,
    bend: new BendTable(),
    cam: {
      eye: [0, 0, 15], target: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, -1], mvp: new Float32Array(16), aspect: 1,
      x: null, y: null, scrollX: 0, scrollY: Infinity, zoom: null, halfW: 1, halfH: 1, canPan: false, mom: null, shake: { x: 0, y: 0 }, roll: 0,
    },
    ripples: [], rippleSide: 1,
    searchAmt: 0, searchN: 0, actLoose: 0, actBurst: 0,
  }
}

/** BURST, REFORM, INTRO, EATEN: the lattice is invisible (its sparks stand in for it). */
export const hidden = (bd: Body) => bd.state >= 3

/** Lattices and springs for every word. The page is `pageW` × `pageH`, centered on the origin. */
/**
 * The words' lattices and springs, a batch of bodies per step (a load yields between steps,
 * so a cold phone, still running this in the interpreter, never blocks a frame for long).
 */
export function* physicsSteps(w: World, list: BodySpec[], batch = 160): Generator<void, void> {
  const bodies: Body[] = []
  let np = 0
  const quads = list.map((b) => {
    const lineTop = w.pageH / 2 + b.line.top
    const x0 = -w.pageW / 2 + b.x - PAD_X, x1 = x0 + b.w + 2 * PAD_X
    const yTop = lineTop + PAD_TOP, yBot = lineTop - b.line.lh * (1 + DRIP)
    const cols = Math.max(2, Math.ceil((x1 - x0) / CELL) + 1)
    const q = { x0, x1, yTop, yBot, cols, p0: np, p1: 0 }
    np += cols * ROWS
    q.p1 = np
    return q
  })
  const NP = np
  const pos = new Float32Array(NP * 3), vel = new Float32Array(NP * 3), home = new Float32Array(NP * 3), off = new Float32Array(NP * 3)
  const frc = new Float32Array(NP * 3), inv = new Float32Array(NP), pBody = new Int32Array(NP), vis = new Float32Array(NP).fill(1)
  const A: number[] = [], B: number[] = [], RL: number[] = [], KM: number[] = []
  for (let bi = 0; bi < list.length; bi++) {
    if (bi && bi % batch === 0) yield
    const b = list[bi], q = quads[bi], kind = b.st.kind
    const kMul = kind === 'heading' ? 1.8 : kind === 'bold' ? 1 / w.s.boldSoft : 1
    const im = kind === 'heading' ? 0.6 : 1
    const idx = (i: number, j: number) => q.p0 + j * q.cols + i
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < q.cols; i++) {
      const p = idx(i, j), o = p * 3
      const x = q.x0 + ((q.x1 - q.x0) * i) / (q.cols - 1), y = q.yTop - ((q.yTop - q.yBot) * j) / (ROWS - 1), z = 0.012 + (bi % 7) * 0.0006
      pos[o] = home[o] = x
      pos[o + 1] = home[o + 1] = y
      pos[o + 2] = home[o + 2] = z
      inv[p] = im
      pBody[p] = bi
    }
    const spring = (a: number, c: number, m: number) => {
      const oa = a * 3, oc = c * 3
      A.push(a); B.push(c)
      RL.push(Math.hypot(home[oc] - home[oa], home[oc + 1] - home[oa + 1], home[oc + 2] - home[oa + 2]))
      KM.push(m * kMul)
    }
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < q.cols; i++) {
      if (i + 1 < q.cols) spring(idx(i, j), idx(i + 1, j), 1)
      if (j + 1 < ROWS) spring(idx(i, j), idx(i, j + 1), 1)
      if (i + 1 < q.cols && j + 1 < ROWS) { spring(idx(i, j), idx(i + 1, j + 1), 0.7); spring(idx(i + 1, j), idx(i, j + 1), 0.7) }
      if (i + 2 < q.cols) spring(idx(i, j), idx(i + 2, j), 0.35)
    }
    for (let i = 0; i < q.cols; i++) spring(idx(i, 0), idx(i, ROWS - 1), 0.35)
    let hx = 0, hy = 0
    for (let p = q.p0; p < q.p1; p++) { hx += home[p * 3]; hy += home[p * 3 + 1] }
    const { tok, parts } = wordToken(String(b.text))
    bodies.push({
      ...q, b, state: HOME, strength: 1, timer: 0, jig: 0, seed: w.rnd(), escaped: false, reform: 0, pt0: 0, ptN: 0,
      hcx: hx / (q.p1 - q.p0), hcy: hy / (q.p1 - q.p0), tok, parts, hl: 0, hlT: 0, coin: 0, coinT: 0, lit: 0, litT: 0, rt: 0,
    })
  }
  Object.assign(w, {
    bodies, NP, NS: A.length, pos, vel, home, off, frc, inv, pBody, vis,
    sa: Int32Array.from(A), sb: Int32Array.from(B), srest: Float32Array.from(RL), sk: Float32Array.from(KM),
  })
  w.burstQueue.clear()
}

export interface AtlasRect {
  x: number
  y: number
  w: number
  h: number
  u0: number
  v0: number
  u1: number
  v1: number
}

/**
 * The text atlas (every word's glyphs cropped from the snapshot's text layer, with room
 * for drips) and the comet sparks: points sampled where each word has ink. A generator,
 * one batch of words per step, so a cold load never blocks a frame for long; the seeded
 * random numbers are drawn in the same order as building it in one go.
 */
export function* atlasSteps(w: World, list: BodySpec[], snapText: CanvasImageSource, batch = 120): Generator<void, { atlas: HTMLCanvasElement; rects: AtlasRect[] }> {
  const AW = 4096
  let ppu = 230, ok = false, AH = 4096
  let rects: AtlasRect[] = []
  while (!ok && ppu > 60) {
    rects = []
    let x = 2, y = 2, rowH = 0
    ok = true
    for (const b of list) {
      const rw = Math.ceil((b.w + 2 * PAD_X) * ppu) + 4, rh = Math.ceil((PAD_TOP + b.line.lh * (1 + DRIP)) * ppu) + 4
      if (x + rw > AW) { x = 2; y += rowH + 2; rowH = 0 }
      if (y + rh > AW) { ok = false; break }
      rects.push({ x, y, w: rw, h: rh, u0: 0, v0: 0, u1: 0, v1: 0 })
      x += rw + 2
      rowH = Math.max(rowH, rh)
    }
    if (!ok) ppu *= 0.85
    else AH = Math.min(4096, 1 << Math.ceil(Math.log2(y + rowH + 4)))
  }
  const atlas = document.createElement('canvas')
  atlas.width = AW
  atlas.height = AH
  const g = atlas.getContext('2d', { willReadFrequently: true })!
  const LU: number[] = [], LV: number[] = [], COL: number[] = []
  for (let s0 = 0; s0 < list.length; s0 += batch) {
    const s1 = Math.min(list.length, s0 + batch)
    let top = Infinity, bottom = 0
    for (let i = s0; i < s1; i++) {
      const b = list[i], r = rects[i]
      g.drawImage(snapText, b.crop.x, b.crop.y, b.crop.w, b.crop.h, r.x + 2 + PAD_X * ppu, r.y + 2 + PAD_TOP * ppu, b.w * ppu, b.line.lh * ppu)
      r.u0 = (r.x + 1) / AW; r.v0 = (r.y + 1) / AH; r.u1 = (r.x + r.w - 1) / AW; r.v1 = (r.y + r.h - 1) / AH
      top = Math.min(top, r.y)
      bottom = Math.max(bottom, r.y + r.h)
    }
    // Glyph samples: where the ink is in each word, as local lattice coordinates (read back only this batch's rows)
    const img = g.getImageData(0, top, AW, bottom - top).data
    for (let bi = s0; bi < s1; bi++) {
      const b = list[bi], r = rects[bi], ink: number[] = []
      for (let y = r.y + 1; y < r.y + r.h - 1; y += 2) for (let x = r.x + 1; x < r.x + r.w - 1; x += 2) if (img[((y - top) * AW + x) * 4 + 3] > 120) ink.push(x, y)
      const bd = w.bodies[bi]
      bd.pt0 = LU.length
      bd.ptN = ink.length ? Math.max(6, Math.min(Math.round(90 * w.s.pDensity), Math.round((ink.length / 2 / 7) * w.s.pDensity))) : 0
      const c = hex(b.st.color)
      for (let k = 0; k < bd.ptN; k++) {
        const j = Math.floor((w.rnd() * ink.length) / 2) * 2
        LU.push((ink[j] - r.x - 1) / (r.w - 2))
        LV.push((ink[j + 1] - r.y - 1) / (r.h - 2))
        COL.push(c[0], c[1], c[2])
      }
    }
    yield
  }
  const NPT = LU.length
  Object.assign(w, {
    NPT, ptLu: Float32Array.from(LU), ptLv: Float32Array.from(LV), ptCol: Float32Array.from(COL),
    ptPos: new Float32Array(NPT * 3), ptVel: new Float32Array(NPT * 3), ptHome: new Float32Array(NPT * 3),
    ptAlpha: new Float32Array(NPT), ptAge: new Float32Array(NPT),
    ptPrev: new Float32Array(NPT * 3), ptSV: new Float32Array(NPT * 3), ptTail: new Float32Array(NPT * 3),
    ptGal: galaxySlots(NPT, w.rnd),
  })
  return { atlas, rects }
}

/** Bilinear lookup into a body's lattice (positions or homes) at local (lu, lv). */
export function bilerp(arr: Float32Array, bd: Body, lu: number, lv: number, out: number[]) {
  const fi = lu * (bd.cols - 1), fj = lv * (ROWS - 1)
  const i0 = Math.min(bd.cols - 2, Math.max(0, Math.floor(fi))), j0 = Math.min(ROWS - 2, Math.max(0, Math.floor(fj)))
  const ti = fi - i0, tj = fj - j0
  const a = (bd.p0 + j0 * bd.cols + i0) * 3, b = a + 3, c = a + bd.cols * 3, d = c + 3
  for (let k = 0; k < 3; k++) out[k] = (arr[a + k] * (1 - ti) + arr[b + k] * ti) * (1 - tj) + (arr[c + k] * (1 - ti) + arr[d + k] * ti) * tj
}
