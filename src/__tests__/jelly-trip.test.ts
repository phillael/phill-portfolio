/**
 * Play mode round 2's trip (eating the mushroom): its 12 s timeline (eased in and out over a second,
 * Phill flickering at 2.5 Hz in the last 2 s) and its moon jumps (×1.5 high, ×0.6 gravity).
 */

import { readFileSync } from 'fs'
import path from 'path'
import { initialState } from '@/lib/jelly/config'
import { updateTargets } from '@/lib/jelly/dance'
import { MusicFeatures } from '@/lib/jelly/music'
import type { Sfx } from '@/lib/jelly/sfx'
import { parseSnapshot, snapshotBodies } from '@/lib/jelly/snapshot'
import { moonJump, SWELL_RING, swellEnvelope, swellOffset, swellRadius, tripFlicker, tripLook, type Swell } from '@/lib/jelly/trip'
import { createWorld, physicsSteps } from '@/lib/jelly/world'

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

describe('swelling words', () => {
  it('the lens: the middle ×(1 + a), the ring squeezed out to 2.6×, nothing beyond', () => {
    const a = 1, k = 1 + a
    expect(swellRadius(0.3, a)).toBeCloseTo(0.6)
    expect(swellRadius(1 / k, a)).toBeCloseTo(1) // continuous where the ring starts
    let prev = 0
    for (let s = 0; s <= SWELL_RING + 0.5; s += 0.01) {
      const r = swellRadius(s, a)
      expect(r).toBeGreaterThanOrEqual(prev) // monotonic: nothing folds over
      expect(r).toBeGreaterThanOrEqual(s - 1e-9) // a swell only ever pushes out
      prev = r
    }
    expect(swellRadius(SWELL_RING, a)).toBeCloseTo(SWELL_RING)
    expect(swellRadius(3, a)).toBe(3)
  })

  it('a shrink (a = −0.35) pulls the middle in and the neighbors with it', () => {
    expect(swellRadius(1, -0.35)).toBeCloseTo(0.65)
    for (let s = 1.6; s < SWELL_RING; s += 0.1) expect(swellRadius(s, -0.35)).toBeLessThan(s)
  })

  it('scales the word itself ×(1 + a) about its middle, and moves its neighbors by the lens (two add up; none past the ring)', () => {
    const sw: Swell = { body: 7, cx: 1, cy: 2, hx: 0.2, hy: 0.1, a: 1 }
    const out: [number, number] = [0, 0]
    swellOffset([sw], 1.15, 2.06, out, 7) // the word's own point: ×2 from its middle
    expect(out[0]).toBeCloseTo(0.15)
    expect(out[1]).toBeCloseTo(0.06)
    swellOffset([sw], 1.05, 2, out) // a neighbor's point well inside the ring's middle: ×2 too (the lens)
    expect(out[0]).toBeCloseTo(0.05)
    expect(out[1]).toBeCloseTo(0)
    swellOffset([sw], 1 + 0.2 * 2.7, 2, out)
    expect(out).toEqual([0, 0])
    swellOffset([sw], 1, 2.15, out) // the line above: pushed up
    expect(out[1]).toBeGreaterThan(0)
    const one = out[1]
    swellOffset([sw, { ...sw }], 1, 2.15, out)
    expect(out[1]).toBeCloseTo(2 * one)
  })

  it('swells up and back down (a(t) = A·sin(πf)·(1 + 0.18·sin(20f)·(1 − f)))', () => {
    expect(swellEnvelope(1, 0)).toBe(0)
    expect(swellEnvelope(1, 0.5)).toBeCloseTo(1 + 0.18 * Math.sin(10) * 0.5)
    expect(swellEnvelope(1, 1)).toBeCloseTo(0)
  })

  it("never accumulates: the words' targets settle on the field, frame after frame", () => {
    const snap = parseSnapshot(JSON.parse(readFileSync(path.join(process.cwd(), 'public/resume/snapshot.json'), 'utf8')))
    const w = createWorld(initialState(), false, {} as Sfx, new MusicFeatures(() => {}))
    w.pageW = snap.page.w
    w.pageH = snap.page.h
    w.pageBottom = -w.pageH / 2
    for (const _ of physicsSteps(w, snapshotBodies(snap))) void _
    const bd = w.bodies[40], p = bd.p0 + 1, o = p * 3
    w.swells.push({ body: 40, cx: bd.hcx, cy: bd.hcy, hx: (bd.x1 - bd.x0) / 2, hy: 0.1, a: 1 })
    const want: [number, number] = [0, 0]
    swellOffset(w.swells, w.home[o], w.home[o + 1], want, 40)
    expect(Math.abs(want[0]) + Math.abs(want[1])).toBeGreaterThan(0.01)
    for (let f = 0; f < 120; f++) updateTargets(w, 1 / 60)
    const after1 = [w.off[o], w.off[o + 1]]
    for (let f = 0; f < 120; f++) updateTargets(w, 1 / 60)
    expect(w.off[o]).toBeCloseTo(after1[0], 6)
    expect(w.off[o]).toBeCloseTo(want[0], 4)
    expect(w.off[o + 1]).toBeCloseTo(want[1], 4)
    // its own springs grow with it (else the lattice keeps its size and only slides), and come back exactly
    for (let q = bd.s0; q < bd.s1; q++) expect(w.srest[q]).toBeCloseTo(w.srest0[q] * 2, 5)
    expect(w.srest[w.bodies[41].s0]).toBe(w.srest0[w.bodies[41].s0])
    w.swells.length = 0
    for (let f = 0; f < 120; f++) updateTargets(w, 1 / 60)
    expect(Math.abs(w.off[o]) + Math.abs(w.off[o + 1])).toBeLessThan(1e-4) // and they go home after
    for (let q = bd.s0; q < bd.s1; q++) expect(w.srest[q]).toBe(w.srest0[q])
  })
})
