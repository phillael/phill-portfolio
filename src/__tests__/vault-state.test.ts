/**
 * @jest-environment node
 *
 * The Relic Vault's state machine (src/lib/vault/state.ts): the hall's spring, settle → power on, the drag and its
 * release, near changes, and a pending Watch. Pure: the engine passes hooks for what it does in the scene.
 */

import { createState, dragEnd, dragMove, go, tick, watch, type Hooks, type VaultState } from '@/lib/vault/state'

const DT = 1 / 60

const hooks = (tweening: (i: number) => boolean = () => false): jest.Mocked<Hooks> => ({
  near: jest.fn(),
  powerOn: jest.fn(),
  powerOff: jest.fn(),
  openHolo: jest.fn(),
  tweening: jest.fn(tweening),
})

const ticks = (s: VaultState, h: Hooks, seconds: number) => {
  for (let t = 0; t < seconds; t += DT) tick(s, DT, h)
}

describe('createState', () => {
  it('starts on the given set, nothing on, near announced by the engine itself', () => {
    const s = createState(6, 1, false)
    expect(s).toMatchObject({ n: 6, pos: 1, target: 1, near: 1, on: -1, holo: -1, pendingHolo: -1, visible: false })
  })
})

describe('settle → power on', () => {
  it('powers the set in front on 0.06 s after the hall stops, once', () => {
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks()
    tick(s, 0.03, h)
    tick(s, 0.02, h)
    expect(h.powerOn).not.toHaveBeenCalled()
    tick(s, 0.02, h)
    expect(h.powerOn).toHaveBeenCalledTimes(1)
    expect(h.powerOn).toHaveBeenCalledWith(1)
    expect(s.on).toBe(1)
    ticks(s, h, 1)
    expect(h.powerOn).toHaveBeenCalledTimes(1)
  })

  it('never powers on while the stage is off screen', () => {
    const s = createState(6, 1, false)
    const h = hooks()
    ticks(s, h, 2)
    expect(h.powerOn).not.toHaveBeenCalled()
    s.visible = true
    ticks(s, h, 0.1)
    expect(h.powerOn).toHaveBeenCalledWith(1)
  })

  it('waits while the pointer is down, and while the hologram is up', () => {
    const s = createState(6, 1, false)
    s.visible = true
    s.held = true
    const h = hooks()
    ticks(s, h, 0.5)
    expect(h.powerOn).not.toHaveBeenCalled()
    s.held = false
    s.holo = 3
    ticks(s, h, 0.5)
    expect(h.powerOn).not.toHaveBeenCalled()
  })
})

describe('go', () => {
  it('powers off the lit set, springs to the new one, announces near once per index, then powers it on', () => {
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks()
    ticks(s, h, 0.2)
    expect(go(s, 4, h)).toBe(true)
    expect(h.powerOff).toHaveBeenCalledWith(1)
    expect(s.on).toBe(-1)
    ticks(s, h, 3)
    expect(s.pos).toBe(4)
    expect(h.near.mock.calls.map(([i]) => i)).toEqual([2, 3, 4])
    expect(h.powerOn.mock.calls.map(([i]) => i)).toEqual([1, 4])
  })

  it('wraps an index and ignores the set already targeted', () => {
    const s = createState(6, 1, false)
    const h = hooks()
    expect(go(s, 7, h)).toBe(false)
    expect(go(s, -1, h)).toBe(true)
    expect(s.target).toBe(5)
  })

  it('moves at once with reduced motion', () => {
    const s = createState(6, 1, true)
    const h = hooks()
    go(s, 4, h)
    expect(s.pos).toBe(4)
    tick(s, DT, h)
    expect(h.near).toHaveBeenCalledTimes(1)
    expect(h.near).toHaveBeenCalledWith(4)
  })
})

describe('the drag', () => {
  it('follows the pointer within the hall’s ends (± 0.35) and powers off once it leaves the lit set', () => {
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks()
    ticks(s, h, 0.2)
    s.held = s.dragging = true
    dragMove(s, 1.2, h)
    expect(h.powerOff).not.toHaveBeenCalled()
    dragMove(s, 1.4, h)
    expect(h.powerOff).toHaveBeenCalledWith(1)
    dragMove(s, -3, h)
    expect(s.pos).toBe(-0.35)
    dragMove(s, 9, h)
    expect(s.pos).toBe(5.35)
  })

  it('doesn’t spring while dragging', () => {
    const s = createState(6, 1, false)
    const h = hooks()
    s.held = s.dragging = true
    dragMove(s, 2.4, h)
    ticks(s, h, 0.5)
    expect(s.pos).toBe(2.4)
  })

  it('releases toward the flick and settles there', () => {
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks()
    s.held = s.dragging = true
    dragMove(s, 1.45, h)
    s.held = s.dragging = false
    dragEnd(s, 4, h)
    expect(s.target).toBe(2)
    ticks(s, h, 3)
    expect(s.pos).toBe(2)
    expect(h.powerOn).toHaveBeenLastCalledWith(2)
  })
})

describe('watch', () => {
  it('opens the hologram at once on the lit set when its power-on is done', () => {
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks()
    ticks(s, h, 0.2)
    watch(s, 1, h)
    expect(h.openHolo).toHaveBeenCalledWith(1)
    expect(s.pendingHolo).toBe(-1)
  })

  it('goes to another set first and opens once it is on and its power-on tween has finished, once', () => {
    let busy = true
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks(() => busy)
    watch(s, 3, h)
    expect(s.pendingHolo).toBe(3)
    ticks(s, h, 3)
    expect(s.on).toBe(3)
    expect(h.openHolo).not.toHaveBeenCalled()
    busy = false
    tick(s, DT, h)
    expect(h.openHolo).toHaveBeenCalledTimes(1)
    expect(h.openHolo).toHaveBeenCalledWith(3)
    ticks(s, h, 0.5)
    expect(h.openHolo).toHaveBeenCalledTimes(1)
  })

  /** set 1 on and still powering on (its tween), Watch pressed: pending */
  const pendingOn1 = () => {
    let busy = true
    const s = createState(6, 1, false)
    s.visible = true
    const h = hooks(() => busy)
    ticks(s, h, 0.2)
    expect(s.on).toBe(1)
    watch(s, 1, h)
    expect(s.pendingHolo).toBe(1)
    return { s, h, done: () => (busy = false) }
  }

  it('forgets a pending Watch when the visitor goes to another set (the arrows, a tab, a click on a set)', () => {
    const { s, h, done } = pendingOn1()
    go(s, 2, h)
    expect(s.pendingHolo).toBe(-1)
    done()
    ticks(s, h, 3)
    expect(s.on).toBe(2)
    // back to set 1 later, without Watch: no hologram of its own accord
    go(s, 1, h)
    ticks(s, h, 3)
    expect(s.on).toBe(1)
    expect(h.openHolo).not.toHaveBeenCalled()
  })

  it('keeps a pending Watch when the set it waits for is chosen again', () => {
    const { s, h, done } = pendingOn1()
    go(s, 1, h)
    expect(s.pendingHolo).toBe(1)
    done()
    tick(s, DT, h)
    expect(h.openHolo).toHaveBeenCalledWith(1)
  })

  it('forgets a pending Watch once a drag leaves its set, even if the drag comes back', () => {
    const { s, h, done } = pendingOn1()
    s.dragging = true
    dragMove(s, 1.1, h)
    expect(s.pendingHolo).toBe(1) // a small wobble keeps it
    dragMove(s, 1.6, h)
    expect(s.pendingHolo).toBe(-1)
    dragMove(s, 1.05, h)
    s.dragging = false
    dragEnd(s, 0, h)
    done()
    ticks(s, h, 3)
    expect(s.on).toBe(1)
    expect(h.openHolo).not.toHaveBeenCalled()
  })

  it('forgets a pending Watch when a drag is thrown to another set', () => {
    const { s, h } = pendingOn1()
    s.dragging = true
    dragMove(s, 1.2, h)
    s.dragging = false
    dragEnd(s, 9, h)
    expect(s.target).not.toBe(1)
    expect(s.pendingHolo).toBe(-1)
  })
})

describe('the clock and the hologram’s camera blend', () => {
  it('runs the clock unless paused or reduced', () => {
    const s = createState(6, 1, false)
    const h = hooks()
    ticks(s, h, 1)
    expect(s.time).toBeGreaterThan(0.95)
    s.paused = true
    const t = s.time
    ticks(s, h, 1)
    expect(s.time).toBe(t)
  })

  it('eases hc toward hcTo, and jumps with reduced motion', () => {
    const s = createState(6, 1, false)
    const h = hooks()
    s.hcTo = 1
    tick(s, DT, h)
    expect(s.hc).toBeGreaterThan(0)
    expect(s.hc).toBeLessThan(1)
    ticks(s, h, 3)
    expect(s.hc).toBe(1)
    const r = createState(6, 1, true)
    r.hcTo = 1
    tick(r, DT, h)
    expect(r.hc).toBe(1)
  })
})
