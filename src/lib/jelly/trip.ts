/**
 * Play mode round 2's trip (eating the mushroom), the parts apart from GL: its 12 s timeline (the look
 * eases in and out over a second; Phill flickers at 2.5 Hz in the last 2 s, like a power-up running
 * out: him, not the page) and its moon jumps (×1.5 high under ×0.6 gravity).
 */

import { PLAY_R2 } from './config'

/** how much of the trip's look is on, t seconds in (0 before and after) */
export const tripLook = (t: number, T = PLAY_R2.trip) => Math.max(0, Math.min(1, t, T - t))

/** hidden this moment (the last `tripFlicker` seconds: every other 0.2 s, 2.5 Hz) */
export const tripFlicker = (t: number, T = PLAY_R2.trip) => t > T - PLAY_R2.tripFlicker && t < T && Math.floor(t * PLAY_R2.flickerHz * 2) % 2 === 1

/** the jump: gravity, take-off speed and the tapped jump's height (moon: ×1.5 high, ×0.6 gravity) */
export function moonJump(P: { jumpHeight: number; tapHeight: number; apexTime: number }, moon: boolean) {
  const g0 = (2 * P.jumpHeight) / (P.apexTime * P.apexTime), h = P.jumpHeight * (moon ? PLAY_R2.moonJump : 1), g = g0 * (moon ? PLAY_R2.moonGravity : 1)
  return { g, v0: Math.sqrt(2 * g * h), tap: P.tapHeight * (moon ? PLAY_R2.moonJump : 1) }
}

/** A swelling word (its body), its middle and half-size (the ellipse: the word's half-size × 1.15) and how much it's swollen now (a: −0.35 … 1.2) */
export interface Swell {
  body: number
  cx: number
  cy: number
  hx: number
  hy: number
  a: number
}

/** how far out (in the ellipse's half-sizes) a swell reaches: past it, nothing moves */
export const SWELL_RING = 2.6

/**
 * The lens (the mockup's swell, run forward): a point at elliptical radius s moves to this radius. The middle
 * scales ×(1 + a); the ring around it is squeezed out to SWELL_RING (pulled in for a shrink); monotonic.
 */
export function swellRadius(s: number, a: number) {
  const k = 1 + a, inner = 1 / k
  if (s < inner) return s * k
  if (s < SWELL_RING) return 1 + ((s - inner) * (SWELL_RING - 1)) / (SWELL_RING - inner)
  return s
}

/**
 * Where the swells move a point (x, y) of word `body` from its home: (dx, dy) into out (computed from home each frame:
 * it never accumulates). The swelling word itself scales ×(1 + a) about its middle (so he rides it up); the words
 * around it move by the lens (pushed out, or pulled in for a shrink), nothing past the ring.
 */
export function swellOffset(swells: readonly Swell[], x: number, y: number, out: [number, number], body = -1) {
  out[0] = out[1] = 0
  for (const sw of swells) {
    const ex = x - sw.cx, ey = y - sw.cy
    if (sw.body === body) { out[0] += ex * sw.a; out[1] += ey * sw.a; continue }
    if (Math.abs(ex) >= SWELL_RING * sw.hx || Math.abs(ey) >= SWELL_RING * sw.hy || Math.abs(sw.a) < 1e-4) continue
    const s = Math.hypot(ex / sw.hx, ey / sw.hy)
    if (s >= SWELL_RING || s < 1e-6) continue
    const f = swellRadius(s, sw.a) / s - 1
    out[0] += ex * f
    out[1] += ey * f
  }
  return out
}

/** a swell's amount over its life (f: 0…1): up and back down, with a little wobble as it peaks */
export const swellEnvelope = (A: number, f: number) => A * Math.sin(Math.PI * f) * (1 + 0.18 * Math.sin(20 * f) * (1 - f))
