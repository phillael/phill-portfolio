/**
 * Play mode round 2's shrimp pickups, the rules apart from GL: where a run's shrimp hover (spread
 * down the page, over plain words), whether he touches one, and the speed boost a shrimp gives.
 * Pure functions over the level; Play draws them through the cast and keeps the score.
 */

import { PLAY_R2 } from './config'
import type { Level } from './platforms'
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
