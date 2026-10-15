/**
 * Play mode round 2's shrimp pickups on the real snapshot: five a run, spread down the page,
 * never on the name or the bottom line, a coin or a checkpoint title; touching one; and the
 * speed boost a shrimp gives (+35% for 8 s, stacking once).
 */

import { readFileSync } from 'fs'
import path from 'path'
import { DRIP, PAD_TOP, initialState } from '@/lib/jelly/config'
import { lcg } from '@/lib/jelly/math'
import { MusicFeatures } from '@/lib/jelly/music'
import { Boost, placeShrimp, touchesShrimp } from '@/lib/jelly/pickups'
import { buildLevel, type Level } from '@/lib/jelly/platforms'
import type { Sfx } from '@/lib/jelly/sfx'
import { parseSnapshot, snapshotBodies } from '@/lib/jelly/snapshot'
import { createWorld, physicsSteps, type World } from '@/lib/jelly/world'

let w: World
let level: Level
beforeAll(() => {
  const snap = parseSnapshot(JSON.parse(readFileSync(path.join(process.cwd(), 'public/resume/snapshot.json'), 'utf8')))
  w = createWorld(initialState(), false, {} as Sfx, new MusicFeatures(() => {}))
  w.pageW = snap.page.w
  w.pageH = snap.page.h
  w.pageBottom = -w.pageH / 2
  for (const _ of physicsSteps(w, snapshotBodies(snap))) void _
  level = buildLevel(w, (bi) => (PAD_TOP + 0.2 * w.bodies[bi].b.line.lh) / (PAD_TOP + w.bodies[bi].b.line.lh * (1 + DRIP)))
})

describe('placeShrimp', () => {
  it('puts five down the page, spread out, never on the name, the bottom line, a coin or a checkpoint title', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const spots = placeShrimp(w, level, 5, lcg(seed))
      expect(spots).toHaveLength(5)
      const lines = spots.map((s) => s.line)
      expect([...lines].sort((a, b) => a - b)).toEqual(lines) // top to bottom
      for (let i = 1; i < lines.length; i++) expect(lines[i] - lines[i - 1]).toBeGreaterThanOrEqual(4)
      const titles = new Set(level.checkpoints.flatMap((c) => level.lines[c.line].bodies.slice(0, c.title.split(' ').length)))
      for (const s of spots) {
        expect(s.line).toBeGreaterThan(level.start)
        expect(s.line).toBeLessThan(level.finish)
        expect(level.lineOf[s.body]).toBe(s.line)
        expect(level.coins).not.toContain(s.body)
        expect(titles.has(s.body)).toBe(false)
        const bd = w.bodies[s.body]
        expect(s.x).toBeGreaterThan(bd.x0)
        expect(s.x).toBeLessThan(bd.x1)
      }
    }
  })

  it('is the same for a seed and changes with it (re-rolled on Play again)', () => {
    expect(placeShrimp(w, level, 5, lcg(7))).toEqual(placeShrimp(w, level, 5, lcg(7)))
    expect(placeShrimp(w, level, 5, lcg(7))).not.toEqual(placeShrimp(w, level, 5, lcg(8)))
  })
})

describe('touchesShrimp', () => {
  // his body: ±0.1 around his feet, from them up to 0.46; the shrimp: ±0.12 × ±0.07 around its middle
  it('is his body overlapping it', () => {
    expect(touchesShrimp(0, 0, 0.15, 0.15)).toBe(true) // walking into it on its line
    expect(touchesShrimp(0, 0, 0.23, 0.15)).toBe(false)
    expect(touchesShrimp(0, 0.5, 0, 0.15)).toBe(false) // jumping over it
    expect(touchesShrimp(0, -0.25, 0, 0.15)).toBe(true) // (he's ~3 lines tall: from the line under it too)
    expect(touchesShrimp(0, -0.4, 0, 0.15)).toBe(false) // three lines under it
    expect(touchesShrimp(0, 0.2, 0.05, 0.15)).toBe(true)
  })
})

describe('Boost', () => {
  it('is +35% for 8 s, a second stacks to +70%, and a third renews the older one', () => {
    const b = new Boost()
    expect(b.mul).toBe(1)
    b.add()
    expect(b.mul).toBeCloseTo(1.35)
    b.step(4)
    expect(b.left).toBeCloseTo(0.5)
    b.add()
    expect(b.mul).toBeCloseTo(1.7)
    expect(b.left).toBeCloseTo(1) // (the bar shows the longest one)
    b.add()
    expect(b.mul).toBeCloseTo(1.7) // never past two
    b.step(7.9)
    expect(b.mul).toBeCloseTo(1.7)
    b.step(0.2)
    expect(b.mul).toBe(1)
    expect(b.left).toBe(0)
    b.add()
    b.reset()
    expect(b.mul).toBe(1)
  })
})
