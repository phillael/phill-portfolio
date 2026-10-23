/**
 * The Relic Vault's state machine, ported from the mockup's `step`, `go`, `watch` and drag handlers: the hall's spring,
 * settle → power on, the drag and its release, near changes and a pending Watch. Pure: what happens in the scene goes
 * through the engine's hooks, called in the mockup's order. src/__tests__/vault-state.test.ts covers it.
 */

import { clamp, lerp, releaseTarget, springStep } from './math'

export type Hooks = {
  /** the set nearest the camera changed (the tab and card follow): once per index change, never per frame */
  near(i: number): void
  powerOn(i: number): void
  powerOff(i: number): void
  openHolo(i: number): void
  /** a set's power-on (or off) animation is still running */
  tweening(i: number): boolean
}

export type VaultState = {
  n: number
  /** the camera's place along the arc, in sets (fractional between them) */
  pos: number
  vel: number
  target: number
  near: number
  /** the set that's powered on, or -1 */
  on: number
  settle: number
  /** the hologram's set, or -1 */
  holo: number
  /** Watch pressed on a set that isn't on yet: open once it is */
  pendingHolo: number
  /** the hologram's camera blend (0 the hall, 1 pulled back under the hologram) and its target */
  hc: number
  hcTo: number
  /** the pointer is down on the stage (nothing powers on) */
  held: boolean
  /** a sideways drag owns the camera (no spring) */
  dragging: boolean
  /** the stage is on screen */
  visible: boolean
  rm: boolean
  paused: boolean
  /** the scene's clock: stops while paused or reduced */
  time: number
}

const SETTLE = 0.06

export function createState(n: number, start: number, rm: boolean): VaultState {
  return {
    n,
    pos: start,
    vel: 0,
    target: start,
    near: start,
    on: -1,
    settle: 0,
    holo: -1,
    pendingHolo: -1,
    hc: 0,
    hcTo: 0,
    held: false,
    dragging: false,
    visible: false,
    rm,
    paused: rm,
    time: 0,
  }
}

function powerOff(s: VaultState, i: number, h: Hooks) {
  if (s.on === i) s.on = -1
  h.powerOff(i)
}

/** bring set i to the front (wrapping); false when it's already the target. A Watch waiting for another set is
 * dropped: the visitor moved on, and it mustn't open by itself when they come back */
export function go(s: VaultState, i: number, h: Hooks) {
  i = ((i % s.n) + s.n) % s.n
  if (i === s.target) return false
  if (s.pendingHolo !== i) s.pendingHolo = -1
  if (s.on >= 0 && s.on !== i) powerOff(s, s.on, h)
  s.target = i
  if (s.rm) {
    s.pos = i
    s.vel = 0
  }
  return true
}

/** Watch: the hologram now if the set is on and done powering on, else once it is */
export function watch(s: VaultState, i: number, h: Hooks) {
  if (s.on === i && !h.tweening(i)) return h.openHolo(i)
  go(s, i, h)
  s.pendingHolo = i
}

/** a sideways drag: the camera follows (a little past the ends), and the lit set powers off once it's left; a
 * pending Watch is dropped once the drag leaves its set */
export function dragMove(s: VaultState, pos: number, h: Hooks) {
  s.pos = clamp(pos, -0.35, s.n - 1 + 0.35)
  s.vel = 0
  if (s.pendingHolo >= 0 && Math.abs(s.pos - s.pendingHolo) > 0.3) s.pendingHolo = -1
  if (s.on >= 0 && Math.abs(s.pos - s.on) > 0.3) powerOff(s, s.on, h)
}

/** the drag let go at `vel` sets a second: throw to the nearest set past the flick */
export function dragEnd(s: VaultState, vel: number, h: Hooks) {
  const to = releaseTarget(s.pos, vel, s.n)
  s.vel = vel
  if (s.pendingHolo !== to) s.pendingHolo = -1
  if (s.on >= 0 && s.on !== to) powerOff(s, s.on, h)
  s.target = to
}

/** one frame: the clock, the hologram blend, the spring, near, settle → power on, a pending Watch */
export function tick(s: VaultState, dt: number, h: Hooks) {
  if (!s.paused && !s.rm) s.time += dt
  s.hc = s.rm ? s.hcTo : lerp(s.hc, s.hcTo, 1 - Math.exp(-dt * 5.5))
  if (Math.abs(s.hc - s.hcTo) < 0.001) s.hc = s.hcTo

  if (!s.dragging) {
    if (s.rm) {
      s.pos = s.target
      s.vel = 0
    } else {
      const next = springStep(s.pos, s.vel, s.target, dt)
      s.pos = next.pos
      s.vel = next.vel
    }
  }

  const near = clamp(Math.round(s.pos), 0, s.n - 1)
  if (near !== s.near) {
    s.near = near
    h.near(near)
  }

  // power the set in front once the hall stops
  const still = s.pos === s.target && !s.held && s.visible
  if (still && s.on !== s.target && s.holo < 0) {
    s.settle += dt
    if (s.settle > SETTLE) {
      s.on = s.target
      s.settle = 0
      h.powerOn(s.target)
    }
  } else s.settle = 0

  if (s.pendingHolo >= 0 && s.on === s.pendingHolo && !h.tweening(s.on)) {
    const i = s.pendingHolo
    s.pendingHolo = -1
    h.openHolo(i)
  }
}
