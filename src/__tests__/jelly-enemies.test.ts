/**
 * Play mode round 2's enemy, the lasagna: its hit boxes and its state machine (pure), on a page of
 * flat lines 0.17 apart (lines are one-way platforms: it lands only coming down).
 */

import { bodyBox, feetBox, lasagnaBody, lasagnaKick, overlaps, smashBox, trampleBox } from '@/lib/jelly/hitboxes'
import { createLasagna, dropGiant, growLasagna, lasagnaLines, shrinkLasagna, smashLasagna, stepLasagna, type EnemyEvent, type EnemyWorld, type Him } from '@/lib/jelly/enemies'
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
    expect(smashLasagna(e, smashBox(0, LINES[3], 1, 0.5, 0.42), 1)).toBe('flung')
    expect(e.state).toBe('flying')
    expect(e.vx).toBeCloseTo(2.4)
    expect(e.vy).toBeCloseTo(2.6)
    expect(smashLasagna(e, smashBox(0, LINES[3], 1, 0.5, 0.42), 1)).toBe(null) // (once)
    run(e, him(-2, 0), 0.5)
    expect(Math.abs(e.spin)).toBeGreaterThan(3)
    run(e, him(-2, 0), 1)
    expect(e.state).toBe('gone')
    const far = createLasagna(2, LINES[3], 3, -1)
    expect(smashLasagna(far, smashBox(0, LINES[3], 1, 0.5, 0.42), 1)).toBe(null)
  })
})

describe('the giant (in the trip)', () => {
  /** as Play does it: hurt, he's invulnerable for 1.5 s */
  const runInv = (e: ReturnType<typeof createLasagna>, h: Him, secs: number) => {
    const ev: EnemyEvent[] = []
    let inv = 0
    for (let i = 0; i < Math.round(secs * 60); i++) {
      const n = ev.length
      stepLasagna(e, 1 / 60, { ...h, inv: h.inv || inv > 0 }, W, ev)
      inv = ev.slice(n).some((x) => x.kind === 'hurt') ? 1.5 : inv - 1 / 60
    }
    return ev
  }
  const grown = (x = 2, line = 3) => {
    const e = createLasagna(x, LINES[line], line, -1)
    expect(growLasagna(e)).toBe(true)
    const ev = run(e, him(-2.9, 0), 1)
    return { e, ev }
  }

  it('grows 4× over 0.9 s (a back-out overshoot), then "!!" once', () => {
    const e = createLasagna(2, LINES[3], 3, -1)
    growLasagna(e)
    let peak = 0
    const ev: EnemyEvent[] = []
    for (let t = 0; t < 1; t += 1 / 60) { stepLasagna(e, 1 / 60, him(-2.9, 0), W, ev); peak = Math.max(peak, e.S) }
    expect(peak).toBeGreaterThan(4.05)
    expect(e.S).toBeCloseTo(4)
    expect(e.state).toBe('chase')
    expect(ev.filter((x) => x.kind === 'huge')).toHaveLength(1)
    expect(growLasagna(e)).toBe(false) // (already huge)
    shrinkLasagna(e)
    run(e, him(-2.9, 0), 0.4)
    const mid = e.S
    expect(growLasagna(e)).toBe(true) // (another mushroom as it shrinks: it grows again, from where it was)
    stepLasagna(e, 1 / 60, him(-2.9, 0), W, [])
    expect(e.S).toBeGreaterThanOrEqual(mid - 0.01)
    expect(growLasagna(Object.assign(createLasagna(0, LINES[3], 3, 1), { state: 'flying' as const }))).toBe(false)
  })

  it("can't be hurt: a smash goes TINK (it stays), a stomp bounces off its head", () => {
    const { e } = grown()
    expect(smashLasagna(e, smashBox(e.x - 0.3, LINES[3], 1, 0.5, 0.42), 1)).toBe('tink')
    expect(e.state).toBe('chase')
    const ev: EnemyEvent[] = []
    stepLasagna(e, 1 / 60, { x: e.x, y: LINES[3] + 1.15, vy: -2, line: -1, falling: true, inv: false }, W, ev) // (its head: 1.2 up)
    expect(ev.map((x) => x.kind)).toContain('bounce')
    expect(ev.map((x) => x.kind)).not.toContain('stomped')
    expect(e.state).not.toBe('squashed')
  })

  it('its feet trample him (once, not while invulnerable); its kick reaches 4× as far', () => {
    const { e } = grown(0.3)
    const ev = runInv(e, him(0, 3), 0.5)
    expect(ev.filter((x) => x.kind === 'hurt')).toHaveLength(1)
    const f = grown(0.3).e
    expect(run(f, him(0, 3, { inv: true }), 0.5).filter((x) => x.kind === 'hurt')).toHaveLength(0)
    const g = grown(1.5).e
    const kev = runInv(g, him(0.4, 3), 1.4)
    expect(kev.map((x) => x.kind)).toContain('kick')
    expect(kev.filter((x) => x.kind === 'hurt')).toHaveLength(1)
  })

  it('chases at 1.6 u/s, waits under him when he is out of reach, and drops down the lines after him', () => {
    const { e } = grown(2.5)
    const x0 = e.x
    for (let i = 0; i < 30; i++) stepLasagna(e, 1 / 60, him(-2.5, 0), W, [])
    expect((x0 - e.x) / 0.5).toBeCloseTo(1.6, 2)
    expect(e.clip).toBe('walk')
    expect(e.rate).toBeCloseTo(0.9)
    // he's two lines above it, out of reach: it walks under him and waits
    run(e, him(0, 1), 3)
    expect(Math.abs(e.x)).toBeLessThan(0.15)
    expect(e.line).toBe(3)
    expect(e.clip).toBe('idle')
    // he's down the page: it drops through its lines after him
    run(e, him(0.2, 6), 3)
    expect(e.line).toBe(6)
  })

  it("never follows him off the page's edge (he's flailing out there): it waits at the edge", () => {
    const wide: EnemyWorld = { ...W, ground: (x, maxY, out) => (Math.abs(x) > 4.1 ? false : W.ground(Math.max(-3, Math.min(3, x)), maxY, out)) }
    const { e } = grown(3)
    for (let i = 0; i < 180; i++) stepLasagna(e, 1 / 60, { x: 4.8, y: LINES[3] - 0.6, vy: -1, line: -1, falling: true, inv: true }, wide, [])
    expect(e.state).not.toBe('gone')
    expect(e.line).toBe(3)
    expect(e.x).toBeLessThan(4.1)
    const n = createLasagna(3.5, LINES[3], 3, 1)
    n.state = 'charge'
    for (let i = 0; i < 180; i++) stepLasagna(n, 1 / 60, { x: 4.8, y: LINES[3] - 0.6, vy: -1, line: -1, falling: true, inv: true }, wide, [])
    expect(n.line).toBe(3)
  })

  it('steps over the gaps between words (a normal one turns at them)', () => {
    const gappy: EnemyWorld = { ...W, ground: (x, maxY, out) => (x > 0.8 && x < 1.3 ? false : W.ground(x, maxY, out)) }
    const { e } = grown(2.5)
    for (let i = 0; i < 120; i++) stepLasagna(e, 1 / 60, him(-2.5, 3, { inv: true }), gappy, [])
    expect(e.x).toBeLessThan(0.8)
    expect(e.line).toBe(3)
    const n = createLasagna(2, LINES[3], 3, -1)
    for (let i = 0; i < 240; i++) stepLasagna(n, 1 / 60, him(-2.9, 0), gappy, [])
    expect(n.x).toBeGreaterThan(1.2)
  })

  it('shrinks back over 0.8 s at the trip\'s end and is beatable again', () => {
    const { e } = grown()
    shrinkLasagna(e)
    const ev = run(e, him(-2.9, 0), 0.4)
    expect(e.S).toBeGreaterThan(1.5)
    expect(e.S).toBeLessThan(4)
    run(e, him(-2.9, 0), 0.5, ev)
    expect(e.S).toBe(1)
    expect(e.state).toBe('patrol')
    expect(ev.map((x) => x.kind)).toContain('shrunk')
    expect(smashLasagna(e, smashBox(e.x - 0.3, LINES[3], 1, 0.5, 0.42), 1)).toBe('flung')
    const f = grown().e
    shrinkLasagna(f)
    run(f, him(-2.9, 0), 1)
    const sev: EnemyEvent[] = []
    stepLasagna(f, 1 / 60, { x: f.x, y: LINES[3] + 0.28, vy: -2, line: -1, falling: true, inv: false }, W, sev)
    expect(f.state).toBe('squashed')
    expect(sev.map((x) => x.kind)).toContain('stomped')
  })

  it('a giant dropped in from the top of the screen lands on his line (or below), says "!!" and chases', () => {
    const e = dropGiant(1, 3, 5, -1)
    expect(e.S).toBe(4)
    const ev = run(e, him(-2.5, 5), 1.2)
    expect(e.line).toBe(5)
    expect(ev.filter((x) => x.kind === 'huge')).toHaveLength(1)
    expect(e.state).toBe('chase')
  })
})
