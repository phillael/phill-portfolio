/**
 * Play mode round 2's enemy, the lasagna: its hit boxes and its state machine (pure), on a page of
 * flat lines 0.17 apart (lines are one-way platforms: it lands only coming down).
 */

import { bodyBox, feetBox, lasagnaBody, lasagnaKick, overlaps, smashBox, trampleBox } from '@/lib/jelly/hitboxes'
import { createLasagna, lasagnaLines, smashLasagna, stepLasagna, type EnemyEvent, type EnemyWorld, type Him } from '@/lib/jelly/enemies'
import type { Surface } from '@/lib/jelly/platforms'

/** lines at y = 2, 1.83, 1.66, … (index 0 at the top), all from x −3 to 3 */
const LINES = Array.from({ length: 10 }, (_, i) => 2 - i * 0.17)
const W: EnemyWorld = {
  ground: (x: number, maxY: number, out: Surface) => {
    if (Math.abs(x) > 3) return false
    const i = LINES.findIndex((y) => y <= maxY + 1e-9)
    if (i < 0) return false
    out.y = LINES[i]; out.z = 0; out.line = i; out.body = -1
    return true
  },
  pageW: 8.5,
  pageBottom: -5.5,
}
const him = (x: number, line: number, extra: Partial<Him> = {}): Him => ({ x, y: LINES[line], vy: 0, line, falling: false, inv: false, ...extra })
const run = (e: ReturnType<typeof createLasagna>, h: Him | (() => Him), secs: number, ev: EnemyEvent[] = []) => {
  for (let t = 0; t < secs; t += 1 / 60) stepLasagna(e, 1 / 60, typeof h === 'function' ? h() : h, W, ev)
  return ev
}

describe('hit boxes', () => {
  it("scale with the lasagna's size; the kick is in front of it", () => {
    expect(lasagnaBody(0, 0, 1)).toEqual({ x0: -0.15, x1: 0.15, y0: 0, y1: 0.3 })
    expect(lasagnaBody(0, 0, 4)).toEqual({ x0: -0.6, x1: 0.6, y0: 0, y1: 1.2 })
    expect(lasagnaKick(0, 0, 1, 1)).toEqual({ x0: 0.05, x1: 0.34, y0: 0, y1: 0.16 })
    expect(lasagnaKick(0, 0, -1, 1)).toEqual({ x0: -0.34, x1: -0.05, y0: 0, y1: 0.16 })
    expect(trampleBox(0, 0, 4)).toEqual({ x0: -0.4, x1: 0.4, y0: 0, y1: 0.4 })
    expect(feetBox(1, 2)).toEqual({ x0: 0.89, x1: 1.11, y0: 1.98, y1: 2.07 })
    expect(overlaps(bodyBox(0.2, 0), lasagnaKick(0, 0, 1, 1))).toBe(true)
    expect(overlaps(smashBox(-0.3, 0, 1, 0.5, 0.42), lasagnaBody(0, 0, 1))).toBe(true)
  })
})

describe('the lasagna', () => {
  it('patrols its line and turns at its end', () => {
    const e = createLasagna(2.8, LINES[3], 3, 1)
    run(e, him(-2.9, 0), 2) // (he's far away)
    expect(e.state).toBe('patrol')
    expect(e.dir).toBe(-1) // turned at the line's end
    expect(e.x).toBeLessThan(3)
    expect(e.y).toBeCloseTo(LINES[3])
  })

  it('notices him on its line or the next up or down (a "!" and a 0.45 s wind-up), jumps up a line toward him, charges and kicks', () => {
    const e = createLasagna(1.5, LINES[4], 4, -1)
    const ev = run(e, him(0, 3), 1.2)
    expect(ev.map((x) => x.kind)).toContain('alert')
    const alertAt = ev.findIndex((x) => x.kind === 'alert')
    expect(alertAt).toBeGreaterThanOrEqual(0)
    // the wind-up, the jump up to his line, the charge and the kick, in that order
    run(e, him(0, 3), 3, ev)
    const kinds = ev.map((x) => x.kind)
    expect(kinds.indexOf('alert')).toBeLessThan(kinds.indexOf('jump'))
    expect(kinds.indexOf('jump')).toBeLessThan(kinds.indexOf('kick'))
    expect(e.line).toBe(3)
  })

  it('waits out its wind-up before it jumps', () => {
    const e = createLasagna(1.5, LINES[4], 4, -1)
    const ev: EnemyEvent[] = []
    let alertT = -1, jumpT = -1
    for (let t = 0; t < 2; t += 1 / 60) {
      stepLasagna(e, 1 / 60, him(0, 3), W, ev)
      if (alertT < 0 && ev.some((x) => x.kind === 'alert')) alertT = t
      if (jumpT < 0 && ev.some((x) => x.kind === 'jump')) jumpT = t
    }
    expect(jumpT - alertT).toBeCloseTo(0.45, 1)
  })

  it("its kick hurts him only in the kick window, once, and never while he's invulnerable", () => {
    const e = createLasagna(0.3, LINES[3], 3, -1)
    e.state = 'charge'
    const ev = run(e, him(0.1, 3), 2.2)
    expect(ev.filter((x) => x.kind === 'hurt')).toHaveLength(1)
    const f = createLasagna(0.3, LINES[3], 3, -1)
    f.state = 'charge'
    const ev2 = run(f, him(0.1, 3, { inv: true }), 2.2)
    expect(ev2.filter((x) => x.kind === 'hurt')).toHaveLength(0)
  })

  it('is stomped only from above (his feet, falling, over its middle): from the line above, not from its own', () => {
    const e = createLasagna(0, LINES[3], 3, 1)
    const ev: EnemyEvent[] = []
    stepLasagna(e, 1 / 60, him(0, 3, { falling: false, vy: 0 }), W, ev) // standing beside/inside it on its own line
    expect(e.state).not.toBe('squashed')
    stepLasagna(e, 1 / 60, { x: 0, y: LINES[3] + 0.28, vy: -2, line: -1, falling: true, inv: false }, W, ev)
    expect(e.state).toBe('squashed')
    expect(ev.map((x) => x.kind)).toContain('stomped')
    const g = createLasagna(0, LINES[3], 3, 1)
    stepLasagna(g, 1 / 60, { x: 0, y: LINES[3] + 0.1, vy: -2, line: -1, falling: true, inv: false }, W, [])
    expect(g.state).not.toBe('squashed') // (his feet below its middle: no)
    const h = createLasagna(0, LINES[3], 3, 1)
    stepLasagna(h, 1 / 60, { x: 0, y: LINES[3] + 0.28, vy: 2, line: -1, falling: false, inv: false }, W, [])
    expect(h.state).not.toBe('squashed') // (his feet over it but going up: no; feet only while falling)
    run(e, him(-2, 0), 1)
    expect(e.state).toBe('gone')
  })

  it("its lines: one in each stretch of the page's lower 80%, long enough to patrol, away from the shrimp and UFOs", () => {
    const lines = Array.from({ length: 47 }, (_, i) => (i % 5 === 0 ? { x0: -0.5, x1: 0.5 } : { x0: -3, x1: 3 }))
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let k = 0; k < 20; k++) {
      const out = lasagnaLines(lines, 1, 46, 2, rnd, [20, 30])
      expect(out).toHaveLength(2)
      expect(out[0]).toBeGreaterThanOrEqual(10)
      expect(out[0]).toBeLessThan(out[1])
      expect(out[1]).toBeLessThan(46)
      for (const l of out) {
        expect(l % 5).not.toBe(0) // (the short lines)
        expect([19, 20, 21, 29, 30, 31]).not.toContain(l)
      }
    }
  })

  it('falls when there is nothing under it (the word it stood on was smashed), onto the next line down', () => {
    const e = createLasagna(0, LINES[3] + 0.05, 3, 1) // (a little above its line: the word under it is gone)
    const narrow: EnemyWorld = { ...W, ground: (x, maxY, out) => (maxY < LINES[3] + 0.04 ? W.ground(x, Math.min(maxY, LINES[5]), out) : false) }
    for (let t = 0; t < 1; t += 1 / 60) stepLasagna(e, 1 / 60, him(-2.9, 0), narrow, [])
    expect(e.line).toBe(5)
    expect(e.y).toBeCloseTo(LINES[5])
  })

  it('a smash flings it off, spinning, and it shrinks away', () => {
    const e = createLasagna(0.3, LINES[3], 3, -1)
    expect(smashLasagna(e, smashBox(0, LINES[3], 1, 0.5, 0.42), 1)).toBe(true)
    expect(e.state).toBe('flying')
    expect(e.vx).toBeCloseTo(2.4)
    expect(e.vy).toBeCloseTo(2.6)
    expect(smashLasagna(e, smashBox(0, LINES[3], 1, 0.5, 0.42), 1)).toBe(false) // (once)
    run(e, him(-2, 0), 0.5)
    expect(Math.abs(e.spin)).toBeGreaterThan(3)
    run(e, him(-2, 0), 1)
    expect(e.state).toBe('gone')
    const far = createLasagna(2, LINES[3], 3, -1)
    expect(smashLasagna(far, smashBox(0, LINES[3], 1, 0.5, 0.42), 1)).toBe(false)
  })
})
