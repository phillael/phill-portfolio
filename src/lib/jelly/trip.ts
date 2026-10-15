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
