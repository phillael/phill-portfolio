/**
 * Play mode's run: the rules, apart from the controller (and GL), so they can be tested.
 * The clock starts on the first move and stops at the finish (the bottom line); a coin (an
 * Impact number) counts once; checkpoints (the roles, newest first) are reached in reading
 * order by standing on their line or any below it; the best time lives in localStorage.
 * The SCORE (round 2): awards and a kick's penalty (never below 0), a time bonus at the
 * finish, and the best score beside the best time.
 */

import { PLAY_R2, type AwardKind } from './config'
import type { Checkpoint, Level } from './platforms'

export interface RunResult {
  timeMs: number
  /** the best time after this run (it may be this one) */
  bestMs: number
  newBest: boolean
  coins: number
  total: number
  /** the score with the time bonus in it, the bonus, the best score after this run (null: never scored) */
  score: number
  bonus: number
  bestScore: number | null
  newBestScore: boolean
  shrimp: number
  shrimpTotal: number
}

export interface BestStore {
  get(): number | null
  set(ms: number): void
}

const KEY = 'jelly-play-best'
export const BEST_SCORE_KEY = 'jelly-play-best-score'

/** The best time (ms; or under `key`, the best score) in localStorage; storage may be blocked (a private window): then nothing is kept. */
export function bestStore(key = KEY): BestStore {
  return {
    get: () => {
      try {
        const v = Number(localStorage.getItem(key))
        return Number.isFinite(v) && v > 0 ? v : null
      } catch {
        return null
      }
    },
    set: (ms) => {
      try { localStorage.setItem(key, String(Math.round(ms))) } catch {}
    },
  }
}

export function createRun(level: Level, store: BestStore, scoreStore: BestStore) {
  const coinSet = new Set(level.coins)
  const collected = new Set<number>()
  let timeMs = 0, started = false, finished = false, checkpoint = -1, score = 0, shrimp = 0

  return {
    get timeMs() { return timeMs },
    get started() { return started },
    get finished() { return finished },
    /** the last checkpoint reached (index into level.checkpoints; -1: none yet) */
    get checkpoint() { return checkpoint },
    get coins() { return collected.size },
    get total() { return coinSet.size },
    get score() { return score },
    get shrimp() { return shrimp },
    get shrimpTotal() { return PLAY_R2.shrimp },
    /** points for something done (a kick takes them away, never below 0): what it actually changed the score by */
    award(kind: AwardKind) {
      if (finished) return 0
      const before = score
      score = Math.max(0, score + PLAY_R2.points[kind])
      if (kind === 'shrimp') shrimp++
      return score - before
    },
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
      const bonus = Math.round((Math.max(0, PLAY_R2.par * 1000 - timeMs) / 1000) * PLAY_R2.bonusPerSec)
      score += bonus
      const prevScore = scoreStore.get(), newBestScore = score > (prevScore ?? 0)
      if (newBestScore) scoreStore.set(score)
      return {
        timeMs, bestMs: newBest ? timeMs : prev!, newBest, coins: collected.size, total: coinSet.size,
        score, bonus, bestScore: newBestScore ? score : prevScore, newBestScore, shrimp, shrimpTotal: PLAY_R2.shrimp,
      }
    },
    best: () => store.get(),
    bestScore: () => scoreStore.get(),
    reset() {
      timeMs = 0
      started = finished = false
      checkpoint = -1
      score = shrimp = 0
      collected.clear()
    },
  }
}

export type Run = ReturnType<typeof createRun>
