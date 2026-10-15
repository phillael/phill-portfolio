/**
 * Play mode round 2's UFOs and the mushroom they carry. Three UFOs a run hover over lines down the
 * page (chest height: a plain smash reaches them). Smashed: +200, a wobble with the rim lights flashing
 * white, its beam brings the mushroom down to the line, then it zips off. The mushroom walks the live
 * lines away from him, drops off line ends, and is lost past the edge or after 15 s; eating it is +1,000
 * and the trip. Its parts are voxel props the cast draws; the rules are pickups.ts and hitboxes.ts.
 */

import type { Beam, Cast, Prop } from './cast'
import { PLAY_R2, type AwardKind } from './config'
import { bodyBox, mushroomBox, overlaps, ufoBox, type Box } from './hitboxes'
import { hex, lcg, Q, type Quat, type Vec3 } from './math'
import { createWalker, placeUfos, stepWalker, type ShrimpSpot, type Walker } from './pickups'
import { PAL, mushroom } from './pixelArt'
import { surfaceAt, type Level, type Surface } from './platforms'
import type { PlayEvent } from './play'
import { ufoParts, voxels } from './voxels'
import type { World } from './world'

export interface UfoContext {
  w: World
  level: Level
  cast: Cast
  emit: (e: PlayEvent) => void
  award: (why: AwardKind, at: Vec3) => void
}

/** the UFO's voxel (0.42 wide) and how high its bottom hovers over the ink; the mushroom's voxel (0.3 tall) */
const VOX = 0.42 / 24
const HOVER = 0.2
const MVOX = 0.3 / 18
/** a hit: the wobble, the lights' flash, the passenger leaving, the beam, the zip-off and gone (s) */
const WOBBLE = 0.35
const FLASH = 0.4
const BEAM_ON = 0.3
const BEAM_OFF = 1.45
const GONE = 2.35
/** the mushroom: aboard until the beam takes it, then down to the line (s); its last blinking seconds and the poof */
const ABOARD = 0.35
const DROP = 0.9
const BLINK = 2
const POOF = 0.25
const CHASE = 'ymC'.split('').map((k) => hex(PAL[k]))
const WHITE: Vec3 = [1.6, 1.6, 1.6]
const NONE: Vec3 = [0, 0, 0]

interface Ufo {
  spot: ShrimpSpot
  ph: number
  state: 'idle' | 'hit' | 'gone'
  t: number
  body: Prop
  passenger: Prop
  glass: Prop
  lights: Prop[]
  beam: Beam
  /** its bottom middle now */
  x: number
  y: number
}

interface Mushroom {
  phase: 'aboard' | 'drop' | 'walk' | 'poof'
  t: number
  /** where the beam set it down, and the line */
  x0: number
  ink: number
  walker: Walker | null
  prop: Prop
  x: number
  y: number
  scale: number
}

export function createUfos({ w, level, cast, emit, award }: UfoContext) {
  const parts = ufoParts(VOX)
  const models = {
    body: cast.voxels(parts.body), passenger: cast.voxels(parts.passenger), glass: cast.voxels(parts.glass),
    lights: parts.lights.map((l) => cast.voxels(l)), mushroom: cast.voxels(voxels(mushroom(), (_x, y) => (y <= 10 ? 7 : 5), { vox: MVOX })),
  }
  const ufos: Ufo[] = []
  let mush: Mushroom | null = null
  const ground = (x: number, maxY: number, out: Surface) => surfaceAt(w, level, x, 0.06, maxY, out)
  const qa: Quat = [0, 0, 0, 1]

  const prop = (model: Prop['model'], extra: Partial<Prop> = {}): Prop => ({
    model, pos: [0, 0, 0], anchor: 'origin', rot: [0, 0, 0, 1], size: 0, alpha: 1, glow: NONE, flash: 0, ambient: 0.75, rim: 0.4, halo: null, ...extra,
  })
  const remove = (p: Prop) => { const i = cast.props.indexOf(p); if (i >= 0) cast.props.splice(i, 1) }

  function clear() {
    for (const u of ufos) {
      for (const p of [u.body, u.passenger, u.glass, ...u.lights]) remove(p)
      const i = cast.beams.indexOf(u.beam)
      if (i >= 0) cast.beams.splice(i, 1)
    }
    ufos.length = 0
    if (mush) remove(mush.prop)
    mush = null
  }

  /** a run's UFOs, a third of the page each, not next to the shrimp's lines */
  function roll(avoid: number[]) {
    clear()
    if (!models.body || !models.passenger || !models.glass || !models.mushroom || models.lights.some((m) => !m)) return
    for (const spot of placeUfos(w, level, PLAY_R2.ufos, lcg(Math.floor(Math.random() * 2 ** 31)), avoid)) {
      const u: Ufo = {
        spot, ph: Math.random() * 6.28, state: 'idle', t: 0,
        body: prop(models.body), passenger: prop(models.passenger),
        // the glass: see-through (drawn after the rest of it), a little glow of its own
        glass: prop(models.glass, { alpha: 0.45, ambient: 0.9, rim: 0.6, glow: [0.04, 0.23, 0.27] }),
        lights: models.lights.map((m) => prop(m!, { ambient: 0, rim: 0 })),
        beam: { top: [0, 0, 0], len: 0, rTop: 0.05, rBot: 0.17, alpha: 0 },
        x: spot.x, y: 0,
      }
      ufos.push(u)
      cast.props.push(u.body, u.passenger, ...u.lights, u.glass)
      cast.beams.push(u.beam)
    }
  }

  /** a smash (his strike box): the first idle UFO it reaches is hit */
  function smash(box: Box) {
    for (const u of ufos) {
      if (u.state !== 'idle' || !overlaps(box, ufoBox(u.x, u.y))) continue
      u.state = 'hit'
      u.t = 0
      const at: Vec3 = [u.x, u.y + 0.1, u.body.pos[2]]
      award('ufo', at)
      emit({ type: 'ufo', index: ufos.indexOf(u), at })
      // its mushroom (one at a time: it replaces one still out)
      const m: Mushroom = { phase: 'aboard', t: 0, x0: u.x, ink: level.lines[u.spot.line].inkTop, walker: null, prop: prop(models.mushroom!, { ambient: 0.8, rim: 0.5 }), x: u.x, y: 0, scale: 0 }
      if (mush) remove(mush.prop)
      mush = m
      cast.props.push(m.prop)
      return true
    }
    return false
  }

  function stepUfo(u: Ufo, dt: number, t: number) {
    const l = level.lines[u.spot.line]
    let x = u.spot.x, y = l.inkTop + HOVER + 0.02 * Math.sin(t * 2.2 + u.ph), roll = 0.06 * Math.sin(t * 1.3 + u.ph), sc = 1, beam = 0
    if (u.state === 'hit') {
      u.t += dt
      const ht = u.t
      roll += 0.35 * Math.sin(ht * 40) * Math.max(0, 1 - ht / WOBBLE)
      beam = ht > BEAM_ON && ht < BEAM_OFF ? Math.min(1, (ht - BEAM_ON) / 0.12, (BEAM_OFF - ht) / 0.15) : 0
      if (ht > BEAM_OFF) { const f = (ht - BEAM_OFF) / (GONE - BEAM_OFF); x += 2.6 * f * f; y += 1.6 * f * f; sc = Math.max(0.001, 1 - f * 0.8) } // and zips off
      if (ht > GONE) u.state = 'gone'
    }
    const gone = u.state === 'gone'
    u.x = x
    u.y = y
    const z = w.bend.at(x, l.inkTop) + 0.13
    // tipped toward you a little, rolling
    Q.mul(Q.axis(1, 0, 0, 0.12, u.body.rot), Q.axis(0, 0, 1, roll, qa), u.body.rot)
    const ph = Math.floor(t * 8), flash = u.state === 'hit' && u.t < FLASH
    for (const p of [u.body, u.passenger, u.glass, ...u.lights]) {
      p.pos[0] = x; p.pos[1] = y; p.pos[2] = z
      if (p !== u.body) for (let k = 0; k < 4; k++) p.rot[k] = u.body.rot[k]
      p.size = (p.model as { extent: number }).extent * sc
      if (gone) p.alpha = 0
    }
    if (u.state === 'hit' && u.t > ABOARD) u.passenger.alpha = 0 // the passenger leaves down the beam
    // the rim lights chase (8 steps a second through yellow, pink, cyan) and flash white when it's hit
    u.lights.forEach((p, g) => { p.glow = flash ? WHITE : CHASE[(g + ph) % 3] })
    u.beam.top[0] = x; u.beam.top[1] = y; u.beam.top[2] = z
    u.beam.len = Math.max(0, y - l.inkTop)
    u.beam.alpha = gone ? 0 : beam
  }

  function stepMushroom(dt: number, t: number, hx: number, hy: number, canEat: boolean) {
    const m = mush
    if (!m) return
    m.t += dt
    if (m.phase === 'aboard') {
      if (m.t >= ABOARD) {
        m.phase = 'drop'
        m.t = 0
        emit({ type: 'mushroom', at: [m.x0, m.ink + HOVER, w.bend.at(m.x0, m.ink) + 0.1] })
      }
    }
    if (m.phase === 'drop') {
      const f = Math.min(1, m.t / DROP)
      m.x = m.x0
      m.y = m.ink + HOVER * (1 - f)
      m.scale = 0.4 + 0.6 * f
      if (f >= 1) { m.phase = 'walk'; m.t = 0; m.walker = createWalker(m.x, m.ink, Math.sign(m.x - hx) || 1) }
    } else if (m.phase === 'walk' && m.walker) {
      stepWalker(m.walker, dt, ground, w.pageW, w.pageBottom)
      m.x = m.walker.x
      m.y = m.walker.y
      m.scale = 1
      if (m.walker.lost) { m.phase = 'poof'; m.t = 0 }
    } else if (m.phase === 'poof') {
      m.scale = Math.max(0, 1 - m.t / POOF)
      if (m.t >= POOF) { remove(m.prop); mush = null; return }
    }
    // eaten: +1,000 and the trip
    if (canEat && (m.phase === 'walk' || (m.phase === 'drop' && m.t > DROP * 0.5)) && overlaps(bodyBox(hx, hy), mushroomBox(m.x, m.y))) {
      const at: Vec3 = [m.x, m.y + 0.15, m.prop.pos[2]]
      remove(m.prop)
      mush = null
      award('mushroom', at)
      emit({ type: 'trip', at })
      return
    }
    // it wobbles as it walks (its eyes to the camera), and blinks in its last seconds (2 Hz)
    const p = m.prop, left = m.walker ? 15 - m.walker.t : 15
    p.pos[0] = m.x
    p.pos[1] = m.y - MVOX * m.scale // (its grid's bottom row is empty)
    p.pos[2] = w.bend.at(m.x, m.y) + 0.1
    Q.mul(Q.axis(0, 1, 0, 0.3 * Math.sin(t * 6), p.rot), Q.axis(0, 0, 1, 0.08 * Math.sin(t * 9), qa), p.rot)
    p.size = (p.model as { extent: number }).extent * m.scale
    p.alpha = m.phase === 'aboard' ? 0 : m.phase === 'walk' && left < BLINK && Math.floor(t * 4) % 2 ? 0.25 : 1
  }

  /** each frame: hx, hy his feet; canEat: he's in control (not entering, flailing or finished) */
  function update(dt: number, hx: number, hy: number, canEat: boolean) {
    const t = w.time
    for (const u of ufos) stepUfo(u, dt, t)
    stepMushroom(dt, t, hx, hy, canEat)
  }

  /** dev: a mushroom walking from (x, the line's ink) toward dir */
  function devMushroom(line: number, x: number, dir: number) {
    if (!models.mushroom) return
    if (mush) remove(mush.prop)
    const ink = level.lines[line].inkTop
    mush = { phase: 'walk', t: 0, x0: x, ink, walker: createWalker(x, ink, dir), prop: prop(models.mushroom, { ambient: 0.8, rim: 0.5 }), x, y: ink, scale: 1 }
    cast.props.push(mush.prop)
  }

  return {
    roll,
    clear,
    smash,
    update,
    devMushroom,
    /** dev: where they are */
    state: () => ({
      ufos: ufos.map((u) => ({ line: u.spot.line, x: u.x, y: u.y, state: u.state })),
      mushroom: mush ? { x: mush.x, y: mush.y, phase: mush.phase, line: mush.walker?.line ?? -1, t: mush.walker?.t ?? 0 } : null,
    }),
  }
}

export type Ufos = ReturnType<typeof createUfos>
