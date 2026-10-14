/**
 * Play mode's run: the rules, apart from the controller (and GL), so they can be tested.
 * The clock starts on the first move and stops at the finish (the bottom line); a coin (an
 * Impact number) counts once; checkpoints (the roles, newest first) are reached in reading
 * order by standing on their line or any below it; the best time lives in localStorage.
 */

import type { Checkpoint, Level } from './platforms'

export interface RunResult {
  timeMs: number
  /** the best time after this run (it may be this one) */
  bestMs: number
  newBest: boolean
  coins: number
  total: number
}

export interface BestStore {
  get(): number | null
  set(ms: number): void
}

const KEY = 'jelly-play-best'

/** The best time in localStorage (ms); storage may be blocked (a private window): then nothing is kept. */
export function bestStore(): BestStore {
  return {
    get: () => {
      try {
        const v = Number(localStorage.getItem(KEY))
        return Number.isFinite(v) && v > 0 ? v : null
      } catch {
        return null
      }
    },
    set: (ms) => {
      try { localStorage.setItem(KEY, String(Math.round(ms))) } catch {}
    },
  }
}

export function createRun(level: Level, store: BestStore) {
  const coinSet = new Set(level.coins)
  const collected = new Set<number>()
  let timeMs = 0, started = false, finished = false, checkpoint = -1

  return {
    get timeMs() { return timeMs },
    get started() { return started },
    get finished() { return finished },
    /** the last checkpoint reached (index into level.checkpoints; -1: none yet) */
    get checkpoint() { return checkpoint },
    get coins() { return collected.size },
    get total() { return coinSet.size },
    /** the first move starts the clock */
    begin() { started = true },
    tick(dt: number) { if (started && !finished) timeMs += dt * 1000 },
    /** a smashed word: true if it's a coin not counted yet */
    collect(bi: number) {
      if (!coinSet.has(bi) || collected.has(bi) || finished) return false
      collected.add(bi)
      return true
    },
    isCollected: (bi: number) => collected.has(bi),
    /** standing on a line: the checkpoints this reaches (on their line or below it), in order */
    reach(line: number): Checkpoint[] {
      const out: Checkpoint[] = []
      while (checkpoint + 1 < level.checkpoints.length && line >= level.checkpoints[checkpoint + 1].line) out.push(level.checkpoints[++checkpoint])
      return out
    },
    /** the run's end (once): the clock stops; the best time is kept */
    finish(): RunResult | null {
      if (finished) return null
      finished = true
      const prev = store.get(), newBest = prev === null || timeMs < prev
      if (newBest) store.set(timeMs)
      return { timeMs, bestMs: newBest ? timeMs : prev!, newBest, coins: collected.size, total: coinSet.size }
    },
    best: () => store.get(),
    reset() {
      timeMs = 0
      started = finished = false
      checkpoint = -1
      collected.clear()
    },
  }
}

export type Run = ReturnType<typeof createRun>
