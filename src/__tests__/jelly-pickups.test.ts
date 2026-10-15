/**
 * Play mode round 2's shrimp pickups on the real snapshot: five a run, spread down the page,
 * never on the name or the bottom line, a coin or a checkpoint title; touching one; and the
 * speed boost a shrimp gives (+35% for 8 s, stacking once). The UFOs (three a run) and the
 * mushroom's walk along the real lines (off line ends onto lower ones, lost past the edge).
 */

import { readFileSync } from 'fs'
import path from 'path'
import { DRIP, PAD_TOP, initialState } from '@/lib/jelly/config'
import { lcg } from '@/lib/jelly/math'
import { MusicFeatures } from '@/lib/jelly/music'
import { overlaps, smashBox, ufoBox } from '@/lib/jelly/hitboxes'
import { Boost, createWalker, placeShrimp, placeUfos, stepWalker, touchesShrimp } from '@/lib/jelly/pickups'
import { buildLevel, surfaceAt, type Level, type Surface } from '@/lib/jelly/platforms'
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

describe('placeUfos', () => {
  it('puts three down the page (a third each), never on the name or the bottom line, nor next to a shrimp', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const shrimp = placeShrimp(w, level, 5, lcg(seed))
      const ufos = placeUfos(w, level, 3, lcg(seed + 100), shrimp.map((s) => s.line))
      expect(ufos).toHaveLength(3)
      const third = (level.finish - level.start) / 3
      ufos.forEach((u, k) => {
        expect(u.line).toBeGreaterThan(level.start)
        expect(u.line).toBeLessThan(level.finish)
        expect(u.line).toBeGreaterThanOrEqual(Math.floor(level.start + k * third))
        expect(u.line).toBeLessThanOrEqual(Math.ceil(level.start + (k + 1) * third))
        for (const s of shrimp) expect(Math.abs(u.line - s.line)).toBeGreaterThan(1)
        expect(level.coins).not.toContain(u.body)
        // (it's 0.42 wide: it hovers over the page, not out past its edge)
        expect(Math.abs(u.x) + 0.21).toBeLessThan(w.pageW / 2)
      })
    }
  })
})

describe('the mushroom walker', () => {
  const ground = (x: number, maxY: number, out: Surface) => surfaceAt(w, level, x, 0.06, maxY, out)
  /** a line whose right end drops onto a line below it (with the page's edge further on) */
  const ledge = () => {
    for (let li = 3; li < level.finish - 3; li++) if (level.lines[li].x1 < 2 && level.lines[li + 1].x1 > level.lines[li].x1 + 0.6) return li
    throw new Error('no ledge')
  }

  it('follows its line, walks off the end onto a lower line, never climbs', () => {
    const li = ledge(), l = level.lines[li]
    const m = createWalker(l.x1 - 0.5, l.inkTop, 1)
    let lines = [li], maxY = m.y
    for (let i = 0; i < 60 * 3 && !m.lost; i++) {
      stepWalker(m, 1 / 60, ground, w.pageW, w.pageBottom)
      if (m.grounded) lines.push(m.line)
      maxY = Math.max(maxY, m.y)
    }
    lines = lines.filter((v, i, a) => a.indexOf(v) === i)
    expect(lines[0]).toBe(li)
    expect(lines.length).toBeGreaterThan(1) // it dropped onto another line
    for (let i = 1; i < lines.length; i++) expect(lines[i]).toBeGreaterThan(lines[i - 1]) // only ever down the page
    expect(maxY).toBeLessThanOrEqual(l.inkTop + 1e-6)
  })

  it('walks at 1.2 units a second along a line', () => {
    const l = level.lines[20], m = createWalker(l.x0 + 0.3, l.inkTop, 1)
    stepWalker(m, 0.5, ground, w.pageW, w.pageBottom)
    expect(m.x - (l.x0 + 0.3)).toBeCloseTo(0.6, 5)
    expect(m.grounded).toBe(true)
    expect(m.y).toBeCloseTo(l.inkTop, 2)
  })

  it('is lost past the page edge, or after 15 s', () => {
    const l = level.lines[20], off = createWalker(l.x1 - 0.1, l.inkTop, 1)
    for (let i = 0; i < 60 * 10 && !off.lost; i++) stepWalker(off, 1 / 60, ground, w.pageW, w.pageBottom)
    expect(off.lost).toBe('edge')
    const slow = createWalker(0, level.lines[20].inkTop, 1)
    slow.t = 14.99
    stepWalker(slow, 0.02, () => false, w.pageW, w.pageBottom)
    expect(slow.lost).toBe('time')
  })
})

describe('hit boxes', () => {
  it("a smash reaches a UFO hovering over his line, in front of him (not behind him, not from two lines down)", () => {
    const ink = 1, ufo = ufoBox(0.3, ink + 0.2)
    expect(overlaps(smashBox(0, ink, 1, 0.5, 0.42), ufo)).toBe(true)
    expect(overlaps(smashBox(0, ink, -1, 0.5, 0.42), ufo)).toBe(false)
    expect(overlaps(smashBox(0, ink + 0.17, 1, 0.5, 0.42), ufo)).toBe(true) // from the line above
    expect(overlaps(smashBox(0, ink - 0.34, 1, 0.5, 0.42), ufo)).toBe(false)
    expect(overlaps(smashBox(-0.3, ink, 1, 0.5, 0.42), ufo)).toBe(true) // (its near edge is at 0.09; he reaches 0.42)
    expect(overlaps(smashBox(-0.4, ink, 1, 0.5, 0.42), ufo)).toBe(false)
  })
})
