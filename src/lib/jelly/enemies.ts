/**
 * Play mode round 2's enemy: the Number Slayers lasagna (the mockup's §3), its rules apart from GL.
 * It patrols its line (turning at the ends); when Phill comes within 2.6 units on its line or the
 * next one up or down, a "!" and a 0.45 s wind-up (fair warning), then it jumps up a line toward him
 * (or drops down one), charges, and kicks him when it's close on his line, then walks away. Lines are
 * one-way platforms: it lands only coming down, so a stomp comes from the line above it (his feet,
 * falling, over its middle; a ground-pound counts). A smash flings it off the page, spinning.
 */

import { bodyBox, feetBox, lasagnaBody, lasagnaKick, overlaps, type Box } from './hitboxes'
import type { Surface } from './platforms'

export type LasagnaState = 'patrol' | 'alert' | 'jump' | 'charge' | 'kick' | 'leave' | 'flying' | 'squashed' | 'gone'

export interface Lasagna {
  /** its feet, velocity, which way it faces, whether it's in the air, and the line it's on */
  x: number
  y: number
  vx: number
  vy: number
  dir: number
  air: boolean
  line: number
  state: LasagnaState
  /** seconds in this state, and where its kick (the attack clip) is */
  t: number
  kickT: number
  /** its size (1; 4 as the trip's giant), its spin and squash (flung / stomped) */
  S: number
  spin: number
  squash: number
  /** a line it's dropping through (−1: none), and whether it has kicked this time */
  skip: number
  kicked: boolean
  /** its clip: a looping one at a rate, or one held at a time (t ≥ 0) */
  clip: string
  clipT: number
  rate: number
}

/** what Phill is doing, as the lasagna sees it */
export interface Him {
  x: number
  y: number
  vy: number
  /** the line he stands on (−1 in the air) */
  line: number
  falling: boolean
  /** hit lately (he flickers): its kick can't hurt him */
  inv: boolean
}

export interface EnemyWorld {
  /** the highest surface under x at or below maxY (platforms' surfaceAt) */
  ground: (x: number, maxY: number, out: Surface) => boolean
  pageW: number
  pageBottom: number
}

export type EnemyEvent = { kind: 'alert' | 'jump' | 'kick' | 'hurt' | 'stomped' | 'gone'; e: Lasagna }

/** speeds (units/s) and gravity, the notice range, the wind-up, the kick (the attack clip from 0.85 s at 1.3×; its window) */
const PATROL = 0.35
const CHARGE = 1.3
const LEAVE = 0.6
const G = 9
const NOTICE = 2.6
const WIND_UP = 0.45
const KICK_FROM = 0.85
const KICK_RATE = 1.3
const KICK_WINDOW: [number, number] = [1.2, 1.6]
const KICK_END = 1.95
const STEP_UP = 0.06
const STEP_DOWN = 0.1

export const createLasagna = (x: number, y: number, line: number, dir: number): Lasagna => ({
  x, y, vx: 0, vy: 0, dir, air: false, line, state: 'patrol', t: 0, kickT: 0, S: 1, spin: 0, squash: 1, skip: -1, kicked: false,
  clip: 'walk', clipT: -1, rate: 1,
})

const probe: Surface = { y: 0, z: 0, body: -1, line: -1 }

function to(e: Lasagna, s: LasagnaState) { e.state = s; e.t = 0 }

/** walk along its line; false when there's no ground ahead (a line's end or a pit) */
function walk(e: Lasagna, speed: number, dt: number, W: EnemyWorld) {
  const nx = e.x + e.dir * speed * dt
  if (Math.abs(nx) > W.pageW / 2 - 0.2 || !W.ground(nx, e.y + STEP_UP, probe) || probe.y < e.y - STEP_DOWN) return false
  e.x = nx
  e.y = probe.y
  e.line = probe.line
  return true
}

/** in the air: gravity, and it lands on the first line it comes down onto (one-way; skipping a line it drops through) */
function fly(e: Lasagna, dt: number, W: EnemyWorld, solid = true) {
  e.vy -= G * dt
  const ny = e.y + e.vy * dt
  e.x += e.vx * dt
  if (solid && e.vy < 0 && W.ground(e.x, e.y + 1e-4, probe)) {
    while (probe.line === e.skip && W.ground(e.x, probe.y - 1e-3, probe)) { /* (through the line it's dropping from) */ }
    if (probe.line !== e.skip && ny <= probe.y) { e.y = probe.y; e.line = probe.line; e.vy = 0; e.vx = 0; e.air = false; e.skip = -1; return true }
  }
  e.y = ny
  return false
}

/** One step of its life. Pushes what happened into `ev` (Play scores it and plays its sounds). */
export function stepLasagna(e: Lasagna, dt: number, him: Him, W: EnemyWorld, ev: EnemyEvent[]) {
  if (e.state === 'gone') return
  e.t += dt
  // standing on nothing (the word under it was smashed, or it was put there): it falls to the next line down
  if (!e.air && ['patrol', 'alert', 'charge', 'kick', 'leave'].includes(e.state) && (!W.ground(e.x, e.y + STEP_UP, probe) || probe.y < e.y - STEP_DOWN)) {
    e.air = true
    e.vx = 0
    e.vy = 0
    to(e, 'jump')
  }
  const dx = him.x - e.x, near = (him.line >= 0 ? Math.abs(him.line - e.line) <= 1 : Math.abs(him.y - e.y) < 0.25)
  switch (e.state) {
    case 'patrol':
      e.clip = 'walk'; e.clipT = -1; e.rate = 1
      if (!walk(e, PATROL, dt, W)) e.dir = -e.dir
      if (e.t > 0.3 && near && Math.abs(dx) < NOTICE) { to(e, 'alert'); e.dir = Math.sign(dx) || e.dir; ev.push({ kind: 'alert', e }) }
      break
    case 'alert':
      e.clip = 'idle'; e.clipT = -1; e.rate = 1
      e.dir = Math.sign(dx) || e.dir
      if (e.t >= WIND_UP) {
        const up = him.line >= 0 && him.line < e.line, down = him.line > e.line
        if (up || down) {
          // up a line toward him (the apex just above his line), or down through its own
          to(e, 'jump')
          e.air = true
          e.vx = e.dir * 0.8
          e.vy = up ? Math.sqrt(2 * G * Math.max(0.05, him.y - e.y + 0.08)) : 0.6
          e.skip = down ? e.line : -1
          ev.push({ kind: 'jump', e })
        } else to(e, 'charge')
      }
      break
    case 'jump':
      e.clip = 'jumping'; e.clipT = 0.58 + 0.5 * Math.min(1, e.t / 0.55)
      if (fly(e, dt, W)) to(e, 'charge')
      if (e.y < W.pageBottom - 0.5) to(e, 'gone')
      break
    case 'charge': {
      e.clip = 'walk'; e.clipT = -1; e.rate = 2.2
      e.dir = Math.sign(dx) || e.dir
      if (!walk(e, CHARGE, dt, W)) { e.air = true; e.vx = e.dir * 0.6; e.vy = 0; to(e, 'jump') } // (off its line's end: it falls)
      else if (Math.abs(dx) < 0.36 && Math.abs(him.y - e.y) < 0.05) { to(e, 'kick'); e.kickT = KICK_FROM; e.kicked = false; ev.push({ kind: 'kick', e }) }
      else if (him.line >= 0 && him.line !== e.line && Math.abs(him.line - e.line) <= 1 && Math.abs(dx) < 1.2) to(e, 'alert') // he's a line off: after him
      else if (e.t > 6 || !near) to(e, 'leave')
      break
    }
    case 'kick':
      e.kickT += dt * KICK_RATE
      e.clip = 'attack'; e.clipT = e.kickT
      if (!e.kicked && !him.inv && e.kickT >= KICK_WINDOW[0] && e.kickT <= KICK_WINDOW[1] && overlaps(lasagnaKick(e.x, e.y, e.dir, e.S), bodyBox(him.x, him.y))) {
        e.kicked = true
        ev.push({ kind: 'hurt', e })
      }
      if (e.kickT > KICK_END) { to(e, 'leave'); e.dir = -e.dir }
      break
    case 'leave':
      e.clip = 'walk'; e.clipT = -1; e.rate = 1.2
      if (!walk(e, LEAVE, dt, W)) e.dir = -e.dir
      if (e.t > 2.5) to(e, 'patrol')
      break
    case 'flying':
      // flung off the page, spinning, shrinking after 0.6 s
      e.clip = 'die'; e.clipT = 0.3
      e.spin += e.dir * 9 * dt
      fly(e, dt, W, false)
      e.squash = Math.max(0, 1 - Math.max(0, e.t - 0.6) / 0.4)
      if (e.t >= 1) { to(e, 'gone'); ev.push({ kind: 'gone', e }) }
      return
    case 'squashed':
      e.clip = 'die'; e.clipT = 0.2
      if (e.t >= 0.7) { to(e, 'gone'); ev.push({ kind: 'gone', e }) }
      return
  }
  // a stomp: his feet, coming down, over its middle (from the line above; a ground-pound counts)
  if (him.falling && him.y > e.y + 0.15 * e.S && overlaps(feetBox(him.x, him.y), lasagnaBody(e.x, e.y, e.S))) {
    to(e, 'squashed')
    ev.push({ kind: 'stomped', e })
  }
}

/** the squash (stomped): flattened (y 0.3, x/z 1.35 in 0.08 s), gone by 0.7 s; as a stretch of its size (x/z, y) */
export function squashShape(e: Lasagna): [number, number] {
  if (e.state !== 'squashed') return [1, 1]
  const s = e.t < 0.08 ? 1 - (e.t / 0.08) * 0.7 : 0.3, gone = Math.min(1, Math.max(0, e.t - 0.45) / 0.25)
  return [1.35 * (1 - gone) + 0.001, s * (1 - gone) + 0.001]
}

/** his smash (its strike box): it's flung off the page his way, spinning; true if it was hit */
export function smashLasagna(e: Lasagna, box: Box, dir: number) {
  if (!['patrol', 'alert', 'jump', 'charge', 'kick', 'leave'].includes(e.state) || !overlaps(box, lasagnaBody(e.x, e.y, e.S))) return false
  to(e, 'flying')
  e.dir = dir
  e.vx = 2.4 * dir
  e.vy = 2.6
  e.air = true
  return true
}

/**
 * A run's lasagnas: `n` lines, one in each of `n` stretches of the lower part of the page (they're met on the way
 * down), long enough to patrol, at least two lines from any of `avoid` (the UFOs' and shrimp's).
 */
export function lasagnaLines(lines: { x0: number; x1: number }[], start: number, finish: number, n: number, rnd: () => number, avoid: number[]) {
  const from = start + Math.round((finish - start) * 0.2), span = (finish - 1 - from) / n, out: number[] = []
  for (let k = 0; k < n; k++) {
    const lo = Math.round(from + k * span), hi = Math.round(from + (k + 1) * span) - 1
    let pick = -1
    for (let tries = 0; tries < 60 && pick < 0; tries++) {
      const line = lo + Math.floor(rnd() * (hi - lo + 1))
      if (lines[line].x1 - lines[line].x0 < 2.5 || avoid.some((a) => Math.abs(a - line) <= 1)) continue
      pick = line
    }
    if (pick >= 0) out.push(pick)
  }
  return out
}
