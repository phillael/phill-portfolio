/**
 * The Jelly Resume engine's pure helpers: the frozen config, snapshot parsing, the
 * Finder's matching, the reading-order handoff and the paper bend. (The engine itself
 * needs WebGL2, which jsdom doesn't have; it's checked in the browser.)
 */

import { readFileSync } from 'fs'
import path from 'path'
import { BendTable, bendZ } from '@/lib/jelly/bend'
import { JELLY_CONFIG, initialState } from '@/lib/jelly/config'
import { CHIPS, countMatches, findMatches, isMetric, wordToken } from '@/lib/jelly/finder'
import { galaxySlots } from '@/lib/jelly/galaxy'
import { lcg, smooth } from '@/lib/jelly/math'
import { bandKey, handoffMap, orderByKey } from '@/lib/jelly/order'
import { parseSnapshot, rgbHex, snapshotBodies } from '@/lib/jelly/snapshot'

const snapshotJson = () => JSON.parse(readFileSync(path.join(process.cwd(), 'public/resume/snapshot.json'), 'utf8'))

describe('JELLY_CONFIG', () => {
  // Phill's tuned playground defaults, as pasted into the site integration plan
  const TUNED = {"granularity":"word","space":"fly","stiffness":900,"damping":4,"homePull":60,"breakDist":0.45,"boldSoft":2.2,
    "contagion":0.35,"escape":0.15,"airDrag":0.35,"gravity":12,"bounce":0.5,"autoBurst":true,"floatTime":3.5,"burstSpeed":7,
    "clickBurst":true,"burstForce":5.4,"burstTime":2.2,"reformTime":1.1,"pSize":0.75,"pColor":"comet","returnTime":1.0,
    "trail":1.3,"swirl":1.4,"flash":0.95,"pGlow":1.5,"shockwave":0.5,"pDensity":1.2,"pageFinish":"paper","grain":0.5,
    "paperThick":0.08,"paperBend":0.5,"paperCurl":0.55,"inkFinish":"chrome","shine":0.75,"textDepth":0.5,
    "fingerRadius":0.7,"fingerForce":20,"flick":0.8,"smack":5,"slosh":0.4,"gummy":0,"jelly":"purple","tilt":0.05,"yaw":0,"zoom":1,
    "melt":0.7,"drip":0.5,"dropRate":0.3,"hueSpeed":0.12,"backdrop":"nebula","nebula":"philcodes","nebulaSeed":1,
    "nebulaBright":1,"starDensity":1.7,"mist":0.6,"fgMist":1,"mistDrift":1.3,"fog":0.55,"quality":"auto",
    "soundOn":true,"volume":0.7,"introTime":3,"holePull":1,"tiltForce":12,"shake":true,"dance":1,"danceStyle":"groove",
    "mosh":0,"pulse":0.7,"heroPath":"page","dissolveTime":2.1,"heroSparks":1}

  it("is exactly Phill's tuned look", () => {
    expect(JELLY_CONFIG).toEqual(TUNED)
  })

  it('is frozen; runtime state is a copy with shroom mode off', () => {
    expect(Object.isFrozen(JELLY_CONFIG)).toBe(true)
    const s = initialState()
    s.zoom = 0.5
    expect(JELLY_CONFIG.zoom).toBe(1)
    expect(s.shroom).toBe(false)
  })
})

describe('snapshot', () => {
  it('parses the shipped snapshot and turns its words into bodies in inches', () => {
    const snap = parseSnapshot(snapshotJson())
    expect(snap.dpr).toBe(2)
    expect(snap.images).toEqual({ text: 'text.webp', decor: 'decor.webp' })
    const bodies = snapshotBodies(snap)
    expect(bodies).toHaveLength(snap.words.length)
    const [first] = bodies, w0 = snap.words[0]
    expect(first.text).toBe('Phill')
    expect(first.x).toBeCloseTo(snap.page.marginX + w0.x / 96)
    expect(first.line.top).toBeCloseTo(-(snap.page.marginY + w0.y / 96))
    expect(first.crop).toEqual({ x: w0.x * 2, y: w0.y * 2, w: w0.w * 2, h: w0.h * 2 })
    expect(first.st.kind).toBe('heading')
  })

  it('rejects anything that is not a snapshot', () => {
    expect(() => parseSnapshot(null)).toThrow()
    expect(() => parseSnapshot({ dpr: 2, words: [] })).toThrow()
    expect(() => parseSnapshot({ ...snapshotJson(), words: [{ t: 'x' }] })).toThrow()
  })

  it('converts CSS rgb() colors to hex', () => {
    expect(rgbHex('rgb(15, 118, 110)')).toBe('#0f766e')
    expect(rgbHex('rgba(255, 255, 255, 0.5)')).toBe('#ffffff')
  })
})

describe('Finder', () => {
  const words = () => parseSnapshot(snapshotJson()).words.map((w) => wordToken(w.t))

  it('trims punctuation and splits on slashes', () => {
    expect(wordToken('(Anthropic')).toMatchObject({ tok: 'anthropic' })
    expect(wordToken('Postgres/Aurora,')).toMatchObject({ tok: 'postgres/aurora', parts: ['postgres', 'aurora'] })
    expect(wordToken('~4')).toMatchObject({ tok: '~4' })
    expect(wordToken('50%')).toMatchObject({ tok: '50%' })
  })

  it('finds metrics but not years', () => {
    expect(isMetric('~1.4m')).toBe(true)
    expect(isMetric('50%')).toBe(true)
    expect(isMetric('~2.7×')).toBe(true)
    expect(isMetric('50k+')).toBe(true)
    expect(isMetric('2023')).toBe(false)
    expect(isMetric('react')).toBe(false)
  })

  it('lights up the same words as the playground on the real page', () => {
    const ws = words()
    expect(countMatches(findMatches(ws, 'AI'))).toBe(27)
    expect(countMatches(findMatches(ws, 'React'))).toBe(14)
    // every chip finds something
    for (const [name] of CHIPS) expect(countMatches(findMatches(ws, name))).toBeGreaterThan(0)
  })

  it('treats free text as a prefix and phrases as consecutive words', () => {
    const ws = ['React', 'Native/Expo', 'and', 'react-ish', 'Reactive'].map(wordToken)
    expect(Array.from(findMatches(ws, 'reac'))).toEqual([1, 0, 0, 1, 1])
    expect(Array.from(findMatches(ws, 'react native'))).toEqual([1, 1, 0, 0, 0])
    expect(countMatches(findMatches(ws, 'r'))).toBe(0) // one letter matches nothing
    expect(countMatches(findMatches(ws, '   '))).toBe(0)
  })
})

describe('reading-order handoff', () => {
  it('orders top band first, then left to right', () => {
    // (u, v): v is down the page
    const pts = [[0.9, 0.0], [0.1, 0.5], [0.2, 0.01], [0.5, 0.99]]
    const order = orderByKey(Float32Array.from(pts.map(([u, v]) => bandKey(u, v))))
    expect(Array.from(order)).toEqual([2, 0, 1, 3])
  })

  it('pairs page sparks with hero sparks rank for rank, covering both ends', () => {
    const pageOrder = Int32Array.from([3, 0, 2, 1, 4, 5]) // 6 page sparks
    const heroOrder = Int32Array.from([2, 0, 1]) // 3 hero sparks
    const heroFor = handoffMap(pageOrder, heroOrder)
    // ranks 0-1 → hero rank 0 (spark 2), 2-3 → rank 1 (spark 0), 4-5 → rank 2 (spark 1)
    expect(Array.from(heroFor)).toEqual([2, 0, 0, 2, 1, 1])
  })

  it('never runs past the last hero spark when there are fewer page sparks', () => {
    const heroFor = handoffMap(Int32Array.from([0, 1]), Int32Array.from([4, 3, 2, 1, 0]))
    expect(Array.from(heroFor)).toEqual([4, 2])
  })
})

describe('paper bend and galaxy', () => {
  it('a flat page when the bend is off', () => {
    expect(bendZ({ a: 0, c: 0, t: 3, s: 0 }, 4.25, 5.5, 1, 2)).toBe(0)
  })

  it('the CPU table matches the formula at its grid points and interpolates between them', () => {
    const t = new BendTable()
    Object.assign(t.p, { a: 0.08, c: 0.33, t: 1.7, s: 0 })
    t.update(8.5, 11)
    // a grid corner (bottom-left) and the curling bottom-right corner region
    expect(t.at(-4.25, -5.5)).toBeCloseTo(bendZ(t.p, 4.25, 5.5, -4.25, -5.5), 5)
    const mid = t.at(3.9, -5.2), exact = bendZ(t.p, 4.25, 5.5, 3.9, -5.2)
    expect(Math.abs(mid - exact)).toBeLessThan(0.02)
    expect(mid).toBeGreaterThan(0) // the corner curls up toward the viewer
  })

  it('galaxy slots are repeatable for a seed', () => {
    expect(galaxySlots(50, lcg(23))).toEqual(galaxySlots(50, lcg(23)))
    const g = galaxySlots(1000, lcg(7))
    for (let k = 0; k < 1000; k++) expect(g[k * 3]).toBeGreaterThanOrEqual(3.2)
  })

  it('smooth clamps and eases', () => {
    expect(smooth(-1)).toBe(0)
    expect(smooth(0.5)).toBe(0.5)
    expect(smooth(2)).toBe(1)
  })
})
