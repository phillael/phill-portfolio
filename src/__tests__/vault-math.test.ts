/**
 * @jest-environment node
 *
 * The Relic Vault's pure math (src/lib/vault/math.ts): the hologram's homography and hull, the CRT's cover crop,
 * the hologram's landing rect and camera look-up, the hall's spring and release snap, the scanline count.
 */

import {
  BAR_H,
  STEP,
  angleOf,
  coverCrop,
  cssH,
  finalRect,
  holoBack,
  hull,
  lookUp,
  mapH,
  releaseTarget,
  scanLines,
  springStep,
  sq2quad,
  startCorners,
  type Quad,
} from '@/lib/vault/math'

const close = (a: number[], b: number[], digits = 6) => a.forEach((x, k) => expect(x).toBeCloseTo(b[k], digits))

describe('sq2quad / mapH', () => {
  const quad: Quad = [
    [100, 80],
    [420, 120],
    [400, 330],
    [90, 300],
  ]

  it('maps the unit square’s corners onto the quad', () => {
    const H = sq2quad(quad)
    close(mapH(H, 0, 0), quad[0])
    close(mapH(H, 1, 0), quad[1])
    close(mapH(H, 1, 1), quad[2])
    close(mapH(H, 0, 1), quad[3])
  })

  it('gives an affine quad (a parallelogram) no perspective terms', () => {
    const H = sq2quad([
      [10, 10],
      [110, 30],
      [130, 130],
      [30, 110],
    ])
    expect(H.g).toBe(0)
    expect(H.h).toBe(0)
  })
})

describe('cssH', () => {
  it('round-trips a point: the CSS matrix3d puts (u·W, v·H) where mapH puts (u, v)', () => {
    const W = 640
    const Hh = 360
    const H = sq2quad([
      [120, 60],
      [700, 110],
      [660, 470],
      [140, 400],
    ])
    const m = cssH(H, W, Hh)
      .replace(/^matrix3d\(|\)$/g, '')
      .split(',')
      .map(Number)
    expect(m).toHaveLength(16)
    // CSS matrices are column-major: x' = m0·x + m4·y + m12, y' = m1·x + m5·y + m13, w = m3·x + m7·y + m15
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0.3, 0.7],
      [1, 1],
    ]) {
      const x = u * W
      const y = v * Hh
      const w = m[3] * x + m[7] * y + m[15]
      close([(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w], mapH(H, u, v), 4)
    }
  })
})

describe('hull', () => {
  it('drops a point inside a square', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]
    const h = hull([...square, [4, 6]])
    expect(h).toHaveLength(4)
    expect(h).toEqual(expect.arrayContaining(square))
  })
})

describe('coverCrop', () => {
  it('crops 16:9 on a 4:3 screen to its middle 75 % across', () => {
    close(coverCrop(16 / 9, 4 / 3), [0.75, 1])
  })

  it('crops a 9:16 phone video on the pocket set’s 0.607 screen top and bottom', () => {
    const [cx, cy] = coverCrop(9 / 16, 0.34 / 0.56)
    expect(cx).toBe(1)
    expect(cy).toBeCloseTo(9 / 16 / (0.34 / 0.56), 6)
  })
})

describe('finalRect', () => {
  it.each([
    [1280, 800, 16 / 9],
    [1440, 900, 16 / 9],
    [375, 812, 16 / 9],
    [1280, 800, 9 / 16],
    [375, 812, 9 / 16],
  ])('%i×%i at %f: fits under its maximum height, centred, under the bar', (vw, vh, aspect) => {
    const f = finalRect(aspect, vw, vh)
    const narrow = vw < 760
    const maxH = vh * (narrow ? 0.5 : 0.56) - f.y + (narrow ? 60 : 40)
    expect(f.h).toBeLessThanOrEqual(maxH + 1e-9)
    expect(f.w).toBeLessThanOrEqual(Math.min(vw - (narrow ? 32 : 96), 1000) + 1e-9)
    expect(f.w / f.h).toBeCloseTo(aspect, 9)
    expect(f.x + f.w / 2).toBeCloseTo(vw / 2, 9)
    expect(f.y).toBeGreaterThanOrEqual(16 + BAR_H)
  })
})

describe('startCorners', () => {
  it('puts the crop’s middle on the glass: the full picture overhangs the screen on the cropped sides', () => {
    const quad: Quad = [
      [100, 100],
      [400, 100],
      [400, 325],
      [100, 325],
    ]
    const c = startCorners(quad, [0.75, 1])
    // 300 px of glass shows 75 % of the width: the whole picture is 400 px, 50 px past each side
    close(c[0], [50, 100])
    close(c[1], [450, 100])
    close(c[2], [450, 325])
    close(c[3], [50, 325])
  })
})

describe('lookUp', () => {
  it('looks up (positive) so the set lands below the hologram, more for a taller panel', () => {
    const stage = { top: 50, height: 700 }
    const small = lookUp({ x: 0, y: 100, w: 400, h: 225 }, stage, 800, true, 4.4, 30)
    const tall = lookUp({ x: 0, y: 100, w: 600, h: 338 }, stage, 800, true, 4.4, 30)
    expect(small).toBeGreaterThan(0)
    expect(tall).toBeGreaterThan(small)
  })

  it('keeps the set on the stage (the clamp)', () => {
    const stage = { top: 50, height: 700 }
    const far = lookUp({ x: 0, y: 100, w: 400, h: 2000 }, stage, 800, true, 4.4, 30)
    const ndcY = 1 - (2 * (700 - 700 * 0.19)) / 700 // the lowest it may put the set: 19 % up from the stage's bottom
    expect(far).toBeCloseTo(-ndcY * (4.4 + holoBack(true)) * Math.tan((15 * Math.PI) / 180), 9)
  })
})

describe('the spring', () => {
  const run = (from: number, to: number, seconds: number, dt = 1 / 60) => {
    let s = { pos: from, vel: 0 }
    let peak = from
    for (let t = 0; t < seconds; t += dt) {
      s = springStep(s.pos, s.vel, to, dt)
      peak = to > from ? Math.max(peak, s.pos) : Math.min(peak, s.pos)
    }
    return { ...s, peak }
  }

  it.each([
    [1, 2],
    [0, 5],
    [5, 0],
    [2.3, 3],
  ])('settles from %f exactly on %f', (from, to) => {
    const s = run(from, to, 3)
    expect(s.pos).toBe(to)
    expect(s.vel).toBe(0)
  })

  it.each([
    [0, 5],
    [5, 0],
    [1, 2],
  ])('overshoots %f → %f by under 2 %', (from, to) => {
    const { peak } = run(from, to, 3)
    expect(Math.abs(peak - to)).toBeLessThanOrEqual(0.02 * Math.abs(to - from))
  })

  it('caps the speed at 9 sets a second', () => {
    const s = springStep(0, 0, 100, 0.05)
    expect(Math.abs(s.vel)).toBeLessThanOrEqual(9)
  })

  it('settles at 30 fps too', () => {
    expect(run(0, 4, 3, 1 / 30).pos).toBe(4)
  })
})

describe('releaseTarget', () => {
  it('snaps to the nearest set when let go still', () => {
    expect(releaseTarget(1.4, 0, 6)).toBe(1)
    expect(releaseTarget(1.6, 0, 6)).toBe(2)
  })

  it('throws forward with the flick’s velocity (× 0.16, capped at ±6)', () => {
    expect(releaseTarget(1.4, 3, 6)).toBe(2)
    expect(releaseTarget(1.4, -6, 6)).toBe(0)
    expect(releaseTarget(1, 60, 6)).toBe(2) // capped: 1 + 6 × 0.16
  })

  it('never leaves the hall', () => {
    expect(releaseTarget(-0.35, -6, 6)).toBe(0)
    expect(releaseTarget(5.35, 6, 6)).toBe(5)
  })
})

describe('angleOf and scanLines', () => {
  it('centres the arc: the middle of six sets is at 0', () => {
    expect(angleOf(2.5, 6)).toBeCloseTo(0, 12)
    expect(angleOf(0, 6)).toBeCloseTo(-2.5 * STEP, 12)
    expect(angleOf(5, 6) - angleOf(4, 6)).toBeCloseTo(STEP, 12)
  })

  it('draws a scanline every ~3.2 device px, between 50 and 240 lines', () => {
    expect(scanLines(320)).toBeCloseTo(100, 9)
    expect(scanLines(40)).toBe(50)
    expect(scanLines(4000)).toBe(240)
  })
})
