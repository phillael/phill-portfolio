/**
 * Play mode round 2's pickups, the rules apart from GL: where a run's shrimp and UFOs hover (spread
 * down the page, over plain words), whether he touches a shrimp, the speed boost a shrimp gives, and
 * the mushroom's walk along the lines. Pure functions over the level; Play draws them through the
 * cast and keeps the score.
 */

import { PLAY_R2 } from './config'
import type { Level, Surface } from './platforms'
import type { World } from './world'

export interface ShrimpSpot {
  line: number
  /** the word it hovers over, and where (world x, its middle) */
  body: number
  x: number
}

/** how far apart (in lines) two shrimp hover, at least */
const MIN_GAP = 4

/**
 * `n` shrimp, one in each of `n` bands of lines between the name and the bottom line (so they're
 * spread down the page), over a word that isn't an Impact coin or part of a checkpoint's title.
 */
export function placeShrimp(w: World, level: Level, n: number, rnd: () => number): ShrimpSpot[] {
  const avoid = new Set(level.coins)
  for (const c of level.checkpoints) for (const bi of level.lines[c.line].bodies.slice(0, c.title.split(' ').length)) avoid.add(bi)
  const first = level.start + 1, last = level.finish - 1, band = (last - first + 1) / n
  const out: ShrimpSpot[] = []
  for (let k = 0; k < n; k++) {
    const lo = Math.round(first + k * band), hi = Math.round(first + (k + 1) * band) - 1
    const prev = out.length ? out[out.length - 1].line : -Infinity
    let pick: ShrimpSpot | null = null
    for (let tries = 0; tries < 40 && !pick; tries++) {
      const line = lo + Math.floor(rnd() * (hi - lo + 1))
      if (line - prev < MIN_GAP && tries < 30) continue
      const words = level.lines[line].bodies.filter((bi) => !avoid.has(bi))
      if (!words.length) continue
      const body = words[Math.floor(rnd() * words.length)], bd = w.bodies[body]
      pick = { line, body, x: (bd.x0 + bd.x1) / 2 }
    }
    if (pick) out.push(pick)
  }
  return out
}

/**
 * `n` UFOs, one in each of `n` stretches of the page (a third each, for three), over a word (not a coin)
 * on a line at least two from any of `avoid` (the shrimp's), its 0.42 width over the paper.
 */
export function placeUfos(w: World, level: Level, n: number, rnd: () => number, avoid: number[]): ShrimpSpot[] {
  const coins = new Set(level.coins), span = (level.finish - level.start) / n
  const out: ShrimpSpot[] = []
  for (let k = 0; k < n; k++) {
    const lo = Math.max(level.start + 1, Math.ceil(level.start + k * span)), hi = Math.min(level.finish - 1, Math.floor(level.start + (k + 1) * span))
    let pick: ShrimpSpot | null = null
    for (let tries = 0; tries < 60 && !pick; tries++) {
      const line = lo + Math.floor(rnd() * (hi - lo + 1))
      if (avoid.some((a) => Math.abs(a - line) <= 1)) continue
      const words = level.lines[line].bodies.filter((bi) => !coins.has(bi) && Math.abs((w.bodies[bi].x0 + w.bodies[bi].x1) / 2) + 0.25 < w.pageW / 2)
      if (!words.length) continue
      const body = words[Math.floor(rnd() * words.length)], bd = w.bodies[body]
      pick = { line, body, x: (bd.x0 + bd.x1) / 2 }
    }
    if (pick) out.push(pick)
  }
  return out
}

/** his body (±0.1 around his feet, up to 0.46) overlaps a shrimp hovering at (sx, sy) (±0.12 × ±0.07) */
export function touchesShrimp(x: number, y: number, sx: number, sy: number) {
  return Math.abs(sx - x) < 0.1 + 0.12 && sy + 0.07 > y && sy - 0.07 < y + 0.46
}

/** A shrimp's speed boost: +35% for 8 s; a second stacks (+70%); another renews the older one. */
export class Boost {
  private stacks: number[] = []

  add() {
    if (this.stacks.length < PLAY_R2.boostStack) this.stacks.push(PLAY_R2.boostTime)
    else this.stacks[this.stacks.indexOf(Math.min(...this.stacks))] = PLAY_R2.boostTime
  }

  step(dt: number) {
    this.stacks = this.stacks.map((t) => t - dt).filter((t) => t > 0)
  }

  /** his run speed × this */
  get mul() { return 1 + PLAY_R2.boost * this.stacks.length }

  /** how much of the longest one is left (0…1), for the draining bar */
  get left() { return this.stacks.length ? Math.max(...this.stacks) / PLAY_R2.boostTime : 0 }

  reset() { this.stacks = [] }
}

/** The mushroom on the move: its feet, which way it walks, the line under it, and why it's gone ('' while it's out). */
export interface Walker {
  x: number
  y: number
  vy: number
  dir: number
  grounded: boolean
  line: number
  t: number
  lost: '' | 'edge' | 'time' | 'void'
}

/** how fast it walks (units/s), falls (units/s²), how far a wobbling line may rise or sink under it, and how long it lasts (s) */
const WALK = 1.2
const FALL_G = 12
const STEP_UP = 0.06
const STEP_DOWN = 0.1
const LIFE = 15

export const createWalker = (x: number, y: number, dir: number): Walker => ({ x, y, vy: 0, dir, grounded: true, line: -1, t: 0, lost: '' })

/**
 * One step: it walks along the live surface (riding the jelly), drops off line ends and pits onto the lines
 * below (it never climbs), and is lost past the page's edge, below the page, or after 15 s.
 * `ground(x, maxY, out)`: the highest surface under it at or below maxY (platforms' surfaceAt).
 */
export function stepWalker(m: Walker, dt: number, ground: (x: number, maxY: number, out: Surface) => boolean, pageW: number, pageBottom: number) {
  if (m.lost) return m
  m.t += dt
  if (m.t >= LIFE) { m.lost = 'time'; return m }
  m.x += m.dir * WALK * dt
  if (Math.abs(m.x) > pageW / 2 + 0.05) { m.lost = 'edge'; return m }
  if (m.grounded) {
    if (ground(m.x, m.y + STEP_UP, probe) && probe.y >= m.y - STEP_DOWN) { m.y = probe.y; m.line = probe.line }
    else { m.grounded = false; m.vy = 0 }
  }
  if (!m.grounded) {
    m.vy -= FALL_G * dt
    const ny = m.y + m.vy * dt
    if (ground(m.x, m.y, probe) && ny <= probe.y) { m.y = probe.y; m.line = probe.line; m.vy = 0; m.grounded = true }
    else m.y = ny
    if (m.y < pageBottom - 0.3) m.lost = 'void'
  }
  return m
}
const probe: Surface = { y: 0, z: 0, body: -1, line: -1 }
