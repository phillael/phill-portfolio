/**
 * Play mode's run (the rules, no GL): the timer starts on the first move, smashing a coin
 * counts it once, checkpoints are reached in reading order (newest first) by standing on
 * their line or below it, the bottom line finishes the run, and the best time is kept.
 */

import { readFileSync } from 'fs'
import path from 'path'
import { DRIP, PAD_TOP, initialState } from '@/lib/jelly/config'
import { MusicFeatures } from '@/lib/jelly/music'
import { buildLevel, type Level } from '@/lib/jelly/platforms'
import { createRun, bestStore } from '@/lib/jelly/playRun'
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
    const run = createRun(level, memory())
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
    const run = createRun(level, memory())
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
    const run = createRun(level, memory())
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
    const slow = createRun(level, store)
    slow.begin()
    slow.tick(50)
    slow.collect(level.coins[0])
    expect(slow.finish()).toEqual({ timeMs: 50_000, bestMs: 42_000, newBest: false, coins: 1, total: 27 })
    expect(slow.finish()).toBeNull()
    expect(store.get()).toBe(42_000)
    const fast = createRun(level, store)
    fast.begin()
    fast.tick(30)
    expect(fast.finish()).toMatchObject({ timeMs: 30_000, bestMs: 30_000, newBest: true })
    expect(store.get()).toBe(30_000)
    const first = createRun(level, memory())
    first.begin()
    first.tick(60)
    expect(first.finish()).toMatchObject({ newBest: true, bestMs: 60_000 })
  })

  it('starts over: clock, coins, checkpoints and the finish', () => {
    const run = createRun(level, memory())
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
