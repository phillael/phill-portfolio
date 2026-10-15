/**
 * Play mode's run (the rules, no GL): the timer starts on the first move, smashing a coin
 * counts it once, checkpoints are reached in reading order (newest first) by standing on
 * their line or below it, the bottom line finishes the run, and the best time is kept.
 * Round 2: the SCORE (awards, the kick's penalty, the time bonus, the best score) and the shrimp.
 */

import { readFileSync } from 'fs'
import path from 'path'
import { DRIP, PAD_TOP, initialState } from '@/lib/jelly/config'
import { MusicFeatures } from '@/lib/jelly/music'
import { buildLevel, type Level } from '@/lib/jelly/platforms'
import { BEST_SCORE_KEY, createRun, bestStore } from '@/lib/jelly/playRun'
import type { Sfx } from '@/lib/jelly/sfx'
import { parseSnapshot, snapshotBodies } from '@/lib/jelly/snapshot'
import { createWorld, physicsSteps } from '@/lib/jelly/world'

let level: Level
beforeAll(() => {
  const snap = parseSnapshot(JSON.parse(readFileSync(path.join(process.cwd(), 'public/resume/snapshot.json'), 'utf8')))
  const w = createWorld(initialState(), false, {} as Sfx, new MusicFeatures(() => {}))
  w.pageW = snap.page.w
  w.pageH = snap.page.h
  w.pageBottom = -w.pageH / 2
  for (const _ of physicsSteps(w, snapshotBodies(snap))) void _
  level = buildLevel(w, (bi) => (PAD_TOP + 0.2 * w.bodies[bi].b.line.lh) / (PAD_TOP + w.bodies[bi].b.line.lh * (1 + DRIP)))
})

const memory = (start: number | null = null) => {
  let v = start
  return { get: () => v, set: (ms: number) => { v = ms } }
}

describe('createRun', () => {
  it('starts the clock on the first move, not on entering, and stops it at the finish', () => {
    const run = createRun(level, memory(), memory())
    run.tick(1)
    expect(run.timeMs).toBe(0)
    run.begin()
    run.tick(1.5)
    run.tick(0.25)
    expect(run.timeMs).toBeCloseTo(1750)
    expect(run.finish()).not.toBeNull()
    run.tick(5)
    expect(run.timeMs).toBeCloseTo(1750)
  })

  it('counts each coin once, and only the Impact numbers', () => {
    const run = createRun(level, memory(), memory())
    const [a, b] = level.coins
    expect(run.total).toBe(27)
    expect(run.collect(a)).toBe(true)
    expect(run.collect(a)).toBe(false)
    expect(run.collect(b)).toBe(true)
    const notCoin = level.lines[0].bodies[0] // "Phill"
    expect(run.collect(notCoin)).toBe(false)
    expect(run.coins).toBe(2)
  })

  it('reaches the checkpoints in reading order, newest first, all the ones he has walked past', () => {
    const run = createRun(level, memory(), memory())
    const cps = level.checkpoints
    expect(run.reach(5).map((c) => c.year)).toEqual([]) // above them all
    expect(run.reach(cps[0].line).map((c) => c.year)).toEqual([2026])
    expect(run.reach(cps[0].line).map((c) => c.year)).toEqual([]) // once
    expect(run.reach(cps[3].line + 1).map((c) => c.year)).toEqual([2023, 2022, 2021]) // dropped past three
    expect(run.checkpoint).toBe(3)
    expect(run.reach(cps[0].line).map((c) => c.year)).toEqual([]) // never backwards
    expect(run.checkpoint).toBe(3)
  })

  it('finishes once, keeps the best time, and says when it is a new best', () => {
    const store = memory(42_000)
    const slow = createRun(level, store, memory())
    slow.begin()
    slow.tick(50)
    slow.collect(level.coins[0])
    expect(slow.finish()).toMatchObject({ timeMs: 50_000, bestMs: 42_000, newBest: false, coins: 1, total: 27 })
    expect(slow.finish()).toBeNull()
    expect(store.get()).toBe(42_000)
    const fast = createRun(level, store, memory())
    fast.begin()
    fast.tick(30)
    expect(fast.finish()).toMatchObject({ timeMs: 30_000, bestMs: 30_000, newBest: true })
    expect(store.get()).toBe(30_000)
    const first = createRun(level, memory(), memory())
    first.begin()
    first.tick(60)
    expect(first.finish()).toMatchObject({ newBest: true, bestMs: 60_000 })
  })

  it('starts over: clock, coins, checkpoints and the finish', () => {
    const run = createRun(level, memory(), memory())
    run.begin()
    run.tick(3)
    run.collect(level.coins[0])
    run.reach(level.finish)
    run.finish()
    run.reset()
    expect(run).toMatchObject({ timeMs: 0, coins: 0, checkpoint: -1, finished: false, started: false })
    expect(run.collect(level.coins[0])).toBe(true)
  })
})

describe('the score', () => {
  it('awards points (coin 100, shrimp 500, UFO 200, mushroom 1,000, lasagna 300) and a kick costs 250, never below 0', () => {
    const run = createRun(level, memory(), memory())
    expect(run.score).toBe(0)
    expect(run.award('coin')).toBe(100)
    expect(run.award('shrimp')).toBe(500)
    expect(run.award('ufo')).toBe(200)
    expect(run.award('mushroom')).toBe(1000)
    expect(run.award('lasagna')).toBe(300)
    expect(run.score).toBe(2100)
    expect(run.award('hurt')).toBe(-250)
    expect(run.score).toBe(1850)
    const poor = createRun(level, memory(), memory())
    poor.award('coin')
    expect(poor.award('hurt')).toBe(-100) // (what it actually cost)
    expect(poor.score).toBe(0)
    expect(poor.award('hurt')).toBe(0)
  })

  it('counts the shrimp eaten (5 a run)', () => {
    const run = createRun(level, memory(), memory())
    expect(run.shrimpTotal).toBe(5)
    run.award('shrimp')
    run.award('shrimp')
    expect(run.shrimp).toBe(2)
  })

  it('adds a time bonus at the finish (100 a second under 1:00) and keeps the best score', () => {
    const scores = memory(3000)
    const fast = createRun(level, memory(), scores)
    fast.begin()
    fast.tick(42.3)
    fast.award('shrimp')
    fast.award('coin')
    const r = fast.finish()!
    expect(r).toMatchObject({ bonus: 1770, score: 2370, bestScore: 3000, newBestScore: false, shrimp: 1, shrimpTotal: 5 })
    expect(fast.score).toBe(2370)
    expect(fast.award('coin')).toBe(0) // (after the finish, nothing counts)
    expect(scores.get()).toBe(3000)
    const slow = createRun(level, memory(), scores)
    slow.begin()
    slow.tick(75)
    slow.award('mushroom')
    slow.award('mushroom')
    slow.award('mushroom')
    expect(slow.finish()).toMatchObject({ bonus: 0, score: 3000, newBestScore: false })
    const best = createRun(level, memory(), scores)
    best.begin()
    best.tick(30)
    best.award('mushroom')
    expect(best.finish()).toMatchObject({ bonus: 3000, score: 4000, bestScore: 4000, newBestScore: true })
    expect(scores.get()).toBe(4000)
  })

  it('a run that scores nothing has no best score to show', () => {
    const run = createRun(level, memory(), memory())
    run.begin()
    run.tick(90)
    expect(run.finish()).toMatchObject({ score: 0, bestScore: null, newBestScore: false })
  })

  it('starts over at 0 points and no shrimp', () => {
    const run = createRun(level, memory(), memory())
    run.award('shrimp')
    run.reset()
    expect(run).toMatchObject({ score: 0, shrimp: 0 })
  })
})

describe('bestStore', () => {
  afterEach(() => localStorage.clear())

  it('keeps the best time in localStorage (jelly-play-best, ms)', () => {
    const s = bestStore()
    expect(s.get()).toBeNull()
    s.set(41_234)
    expect(localStorage.getItem('jelly-play-best')).toBe('41234')
    expect(bestStore().get()).toBe(41_234)
    localStorage.setItem('jelly-play-best', 'nonsense')
    expect(bestStore().get()).toBeNull()
  })

  it('keeps the best score beside it (jelly-play-best-score)', () => {
    bestStore(BEST_SCORE_KEY).set(4300)
    expect(localStorage.getItem('jelly-play-best-score')).toBe('4300')
    expect(bestStore().get()).toBeNull()
  })

  it('never throws when storage is unavailable', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const s = bestStore()
    expect(s.get()).toBeNull()
    expect(() => s.set(1)).not.toThrow()
    get.mockRestore()
    set.mockRestore()
  })
})
