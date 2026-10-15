/**
 * Play mode round 2's trip (eating the mushroom): its 12 s timeline (eased in and out over a second,
 * Phill flickering at 2.5 Hz in the last 2 s) and its moon jumps (×1.5 high, ×0.6 gravity).
 */

import { moonJump, tripFlicker, tripLook } from '@/lib/jelly/trip'

describe('the trip', () => {
  it('eases in over a second, holds, and eases out over the last second of 12', () => {
    expect(tripLook(0)).toBe(0)
    expect(tripLook(0.5)).toBeCloseTo(0.5)
    expect(tripLook(1)).toBe(1)
    expect(tripLook(6)).toBe(1)
    expect(tripLook(11)).toBeCloseTo(1)
    expect(tripLook(11.5)).toBeCloseTo(0.5)
    expect(tripLook(12)).toBe(0)
    expect(tripLook(13)).toBe(0)
  })

  it('flickers (Phill) at 2.5 Hz in its last 2 s only, never faster than 3 Hz', () => {
    const at = (t: number) => tripFlicker(t)
    expect([0, 5, 9.9].map(at)).toEqual([false, false, false])
    // 10.0–10.2 shown, 10.2–10.4 hidden, …: a change every 0.2 s = 2.5 flashes a second
    expect([10.05, 10.25, 10.45, 10.65, 11.7].map(at)).toEqual([false, true, false, true, false])
    let changes = 0
    for (let t = 10; t < 11; t += 0.001) if (at(t) !== at(t + 0.001)) changes++
    expect(changes / 2).toBeLessThanOrEqual(3) // (an on and an off per flash)
  })

  it('moon jumps: 1.5× as high under 0.6× the gravity', () => {
    const P = { jumpHeight: 1, tapHeight: 0.45, apexTime: 0.36 }
    const plain = moonJump(P, false), moon = moonJump(P, true)
    expect(plain.g).toBeCloseTo((2 * 1) / (0.36 * 0.36))
    expect(plain.v0).toBeCloseTo((2 * 1) / 0.36)
    expect(moon.g).toBeCloseTo(plain.g * 0.6)
    expect((moon.v0 * moon.v0) / (2 * moon.g)).toBeCloseTo(1.5) // the apex
    expect(moon.tap).toBeCloseTo(0.45 * 1.5)
  })
})
