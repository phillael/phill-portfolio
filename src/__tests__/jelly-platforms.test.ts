/**
 * Play mode's level: the resume's visual lines as jump-through platforms, built from the real
 * snapshot (public/resume/snapshot.json). The words' ink comes from the glyph atlas in the
 * browser; here a fixture stands in for it (the line structure doesn't need it).
 */

import { readFileSync } from 'fs'
import path from 'path'
import { HOME, initialState, LOOSE, PAD_TOP, RETURN, BURST, DRIP } from '@/lib/jelly/config'
import { MusicFeatures } from '@/lib/jelly/music'
import { buildLevel, solid, surfaceAt, type Level, type Surface } from '@/lib/jelly/platforms'
import type { Sfx } from '@/lib/jelly/sfx'
import { parseSnapshot, snapshotBodies } from '@/lib/jelly/snapshot'
import { createWorld, physicsSteps, type World } from '@/lib/jelly/world'

const world = () => {
  const snap = parseSnapshot(JSON.parse(readFileSync(path.join(process.cwd(), 'public/resume/snapshot.json'), 'utf8')))
  const w = createWorld(initialState(), false, {} as Sfx, new MusicFeatures(() => {}))
  w.pageW = snap.page.w
  w.pageH = snap.page.h
  w.pageBottom = -w.pageH / 2
  for (const _ of physicsSteps(w, snapshotBodies(snap))) void _
  return w
}

/** fixture ink: each word's glyphs start a fifth of its line box below the box's top */
const inkFixture = (w: World) => (bi: number) => {
  const b = w.bodies[bi].b
  return (PAD_TOP + 0.2 * b.line.lh) / (PAD_TOP + b.line.lh * (1 + DRIP))
}

const words = (w: World, lv: Level, line: number) => lv.lines[line].bodies.map((bi) => w.bodies[bi].b.text).join(' ')
const inkL = (w: World, bi: number) => w.bodies[bi].x0 + 0.035 + 1e-3
const inkR = (w: World, bi: number) => w.bodies[bi].x1 - 0.035 - 1e-3

describe('buildLevel', () => {
  let w: World
  let lv: Level
  beforeAll(() => {
    w = world()
    lv = buildLevel(w, inkFixture(w))
  })

  it('clusters the words into the 48 visual lines, top to bottom, each left to right', () => {
    expect(lv.lines).toHaveLength(48)
    for (let i = 1; i < lv.lines.length; i++) expect(lv.lines[i].inkTop).toBeLessThan(lv.lines[i - 1].inkTop - 0.15)
    for (const line of lv.lines) {
      const xs = line.bodies.map((bi) => w.bodies[bi].x0)
      expect(xs).toEqual([...xs].sort((a, b) => a - b))
    }
    expect(lv.lines.reduce((n, l) => n + l.bodies.length, 0)).toBe(w.bodies.length)
    lv.lines.forEach((l, i) => l.bodies.forEach((bi) => expect(lv.lineOf[bi]).toBe(i)))
    // a heading and the smaller text beside it share a line
    expect(words(w, lv, 1)).toMatch(/^Senior AI Engineer Full-stack/)
  })

  it('starts at the name and finishes on the bottom line (you read the resume walking down it)', () => {
    expect(lv.start).toBe(0)
    expect(words(w, lv, lv.start)).toBe('Phill Aelony')
    expect(lv.finish).toBe(47)
    expect(words(w, lv, lv.finish)).toBe('EDUCATION B.A. Jazz Studies · University of North Texas')
  })

  it('makes a checkpoint of each role, newest first, in reading order', () => {
    expect(lv.checkpoints.map((c) => [c.year, c.title])).toEqual([
      [2026, 'Generative AI Engineer'],
      [2025, 'Senior Software Engineer II'],
      [2023, 'Software Engineer'],
      [2022, 'Software Engineer · Sessions'],
      [2021, 'Front End Developer · Designit for Microsoft'],
      [2018, 'Freelance Developer · phillcodes.com'],
      [1998, 'Guitarist & Composer · The Funky Knuckles · Strange Loop Games'],
    ])
    // reading order: each one lower down the page
    for (let i = 1; i < lv.checkpoints.length; i++) expect(lv.checkpoints[i].line).toBeGreaterThan(lv.checkpoints[i - 1].line)
    // the TimelyCare company line (2023) heads the roles; it isn't one
    expect(lv.lines.find((l) => l.title.startsWith('TimelyCare'))?.year).toBe(2023)
  })

  it("turns the Finder's Impact numbers into the 27 coins", () => {
    expect(lv.coins).toHaveLength(27)
    const texts = lv.coins.map((bi) => w.bodies[bi].b.text)
    expect(texts).toEqual(expect.arrayContaining(['~1.4M', '50K+']))
    expect(texts.some((t) => /^(19|20)\d\d$/.test(t))).toBe(false)
  })

  it("stands each line on its tallest glyphs' top, below the boxes' line-height padding", () => {
    const line = lv.lines[lv.finish], bi = line.bodies[0], bd = w.bodies[bi]
    expect(line.inkTop).toBeLessThan(bd.yTop - PAD_TOP)
    expect(line.inkTop).toBeGreaterThan(line.bottom)
  })
})

describe('surfaceAt', () => {
  let w: World
  let lv: Level
  const out: Surface = { y: 0, z: 0, body: -1, line: -1 }
  beforeEach(() => {
    w = world()
    lv = buildLevel(w, inkFixture(w))
  })

  it("finds the ink top of the word under a foot, with the lattice's z", () => {
    const line = lv.lines[lv.finish], bi = line.bodies[2] // "Jazz"
    const x = (inkL(w, bi) + inkR(w, bi)) / 2
    expect(surfaceAt(w, lv, x, 0.05, line.inkTop + 0.3, out)).toBe(true)
    expect(out.body).toBe(bi)
    expect(out.line).toBe(lv.finish)
    expect(out.y).toBeCloseTo(line.inkTop, 5)
    expect(out.z).toBeCloseTo(w.pos[w.bodies[bi].p0 * 3 + 2], 3)
  })

  it('takes the highest surface at or below a height (one-way: lines above are skipped)', () => {
    const line = lv.lines[lv.finish - 1], bi = line.bodies[0]
    const x = (inkL(w, bi) + inkR(w, bi)) / 2
    expect(surfaceAt(w, lv, x, 0.05, line.inkTop + 0.01, out)).toBe(true)
    expect(out.line).toBe(lv.finish - 1)
    expect(surfaceAt(w, lv, x, 0.05, line.inkTop - 0.01, out)).toBe(true) // just under it: the next one down
    expect(out.line).toBe(lv.finish)
  })

  it('follows the lattice as it wobbles', () => {
    const line = lv.lines[lv.finish], bi = line.bodies[2], bd = w.bodies[bi]
    for (let p = bd.p0; p < bd.p1; p++) w.pos[p * 3 + 1] += 0.05
    expect(surfaceAt(w, lv, (inkL(w, bi) + inkR(w, bi)) / 2, 0.05, line.inkTop + 0.3, out)).toBe(true)
    expect(out.y).toBeCloseTo(line.inkTop + 0.05, 5)
  })

  it('has nothing past the end of the bottom line, nor in a gap wider than the foot', () => {
    const bottom = lv.lines[lv.finish]
    expect(surfaceAt(w, lv, bottom.x1 + 0.5, 0.05, bottom.inkTop + 0.3, out)).toBe(false)
    // the pit before the last checkpoint's date: "… Strange Loop Games      1998 – Present"
    const last = lv.checkpoints[lv.checkpoints.length - 1]
    const cp = lv.lines[last.line], ix = cp.bodies.findIndex((bi) => w.bodies[bi].b.text === '1998')
    const gap0 = inkR(w, cp.bodies[ix - 1]), gap1 = inkL(w, cp.bodies[ix])
    expect(gap1 - gap0).toBeGreaterThan(0.3)
    const found = surfaceAt(w, lv, (gap0 + gap1) / 2, 0.05, cp.inkTop + 0.01, out)
    expect(found && out.line === last.line).toBe(false)
  })

  it("only holds him on solid words: home, or springing back at half strength or more", () => {
    const line = lv.lines[lv.finish], bi = line.bodies[2], bd = w.bodies[bi]
    const x = (inkL(w, bi) + inkR(w, bi)) / 2
    bd.state = LOOSE
    expect(solid(bd)).toBe(false)
    expect(surfaceAt(w, lv, x, 0.05, line.inkTop + 0.3, out)).toBe(false)
    bd.state = RETURN
    bd.strength = 0.3
    expect(solid(bd)).toBe(false)
    bd.strength = 0.6
    expect(solid(bd)).toBe(true)
    bd.state = BURST
    expect(solid(bd)).toBe(false)
    bd.state = HOME
    expect(solid(bd)).toBe(true)
  })
})
