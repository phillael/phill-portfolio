/**
 * Pointer input on the canvas. Mouse: click knocks words loose (a loose word bursts),
 * drag rotates (✥ Pan mode pans when zoomed in), wheel pans, Ctrl/pinch zooms at the
 * cursor, double-click zooms in. Touch: one finger rotates (or pans), tap knocks loose,
 * pinch zooms and pans. The black hole takes a press-and-hold when its mode is on.
 */

import { orbitBy, panBy, pickParticle, planeZ, pxToWorld, rayAt, resetView, zoomAt, type Ray, type UiInsets } from './camera'
import { HOME, ZMIN } from './config'
import { clickAt, releaseHole, startHole } from './physics'
import type { World } from './world'

export interface InputContext {
  w: World
  canvas: HTMLCanvasElement
  ui: UiInsets
  /** false while the resume isn't open or is mid-transition: input is ignored */
  enabled(): boolean
  navMode(): 'rotate' | 'pan'
  holeMode(): boolean
  /** the last mouse ray (where Space opens the black hole) */
  setLastRay(ray: Ray): void
  /** a user gesture: unlock audio */
  gesture(): void
}

export function attachInput(ctx: InputContext) {
  const { w, canvas, ui } = ctx
  const cam = w.cam
  let down: { x: number; y: number; moved: boolean; hit: number; mode: 'orbit' | 'pan' } | null = null
  const touches = new Map<number, { x: number; y: number }>()
  let pinch: { d: number; mx: number; my: number } | null = null
  let holePointer: number | null = null
  const rect = () => canvas.getBoundingClientRect()

  // drag velocity, for a fling when you let go
  const fling = { vx: 0, vy: 0, t: 0 }
  const trackFling = (dxPx: number, dyPx: number) => {
    const now = performance.now(), dt = Math.max(0.008, (now - fling.t) / 1000), k = pxToWorld(w, rect())
    if (now - fling.t > 100) fling.vx = fling.vy = 0
    fling.vx = fling.vx * 0.6 + 0.4 * ((-dxPx * k) / dt)
    fling.vy = fling.vy * 0.6 + 0.4 * ((dyPx * k) / dt)
    fling.t = now
  }
  const releaseFling = () => {
    if (performance.now() - fling.t < 80 && Math.hypot(fling.vx, fling.vy) > 0.5) cam.mom = { x: fling.vx, y: fling.vy }
    fling.vx = fling.vy = 0
  }

  function onMove(e: PointerEvent) {
    if (!ctx.enabled()) return
    const rc = rect(), ray = rayAt(w, rc, e.clientX, e.clientY)
    if (e.pointerType !== 'touch') ctx.setLastRay(ray)
    if (w.hole.on && (holePointer === e.pointerId || (holePointer === null && e.pointerType !== 'touch'))) { w.hole.p = planeZ(ray, 0.25); return }
    if (e.pointerType === 'touch') {
      const t = touches.get(e.pointerId)
      if (!t) return
      const px = t.x, py = t.y
      t.x = e.clientX
      t.y = e.clientY
      if (pinch && touches.size >= 2) {
        // pinch zooms at the point between your fingers; moving both fingers pans
        const [a, b] = [...touches.values()], d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        zoomAt(w, rc, ui, mx, my, pinch.d / d)
        pinch.d = d
        panBy(w, rc, mx - pinch.mx, my - pinch.my)
        pinch.mx = mx
        pinch.my = my
        return
      }
      if (!down) return
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true
      if (down.moved) {
        if (down.mode === 'orbit') orbitBy(w, e.clientX - px, e.clientY - py)
        else { panBy(w, rc, e.clientX - px, e.clientY - py); trackFling(e.clientX - px, e.clientY - py) }
      }
      return
    }
    if (down) {
      // a drag rotates (or pans in ✥ Pan mode); a press that doesn't move is a click
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down.moved = true; canvas.style.cursor = 'grabbing' }
      if (down.moved) {
        if (down.mode === 'orbit') orbitBy(w, e.clientX - down.x, e.clientY - down.y)
        else { panBy(w, rc, e.clientX - down.x, e.clientY - down.y); trackFling(e.clientX - down.x, e.clientY - down.y) }
        down.x = e.clientX
        down.y = e.clientY
      }
      return
    }
    canvas.style.cursor = pickParticle(w, e.clientX - rc.left, e.clientY - rc.top, rc) >= 0 ? 'pointer' : 'grab'
    // hover: the cursor squishes the words under it
    const f = w.finger, now = performance.now(), hit = planeZ(ray, 0.3)
    if (f.last) {
      const dt = Math.max(0.008, (now - f.last.t) / 1000)
      for (let a = 0; a < 3; a++) f.vel[a] = f.vel[a] * 0.5 + (0.5 * (hit[a] - f.last.p[a])) / dt
    }
    f.last = { p: hit, t: now }
    f.active = true
    f.eye = ray.eye
    f.dir = ray.dir
  }

  function onLeave(e: PointerEvent) {
    if (e.pointerType !== 'touch') { w.finger.active = false; w.finger.last = null }
  }

  // What a drag does: rotate by default; ✥ Pan mode pans when zoomed in (rotates when the whole page fits); right-, Shift- or Option-drag always rotates
  const dragMode = (e: PointerEvent) => (e.shiftKey || e.altKey || e.button === 2 || ctx.navMode() === 'rotate' || !cam.canPan ? 'orbit' : 'pan')

  function onDown(e: PointerEvent) {
    if (!ctx.enabled()) return
    try { canvas.setPointerCapture(e.pointerId) } catch {}
    ctx.gesture()
    cam.mom = null
    const rc = rect()
    if (ctx.holeMode() && !w.hole.on && e.button === 0) { holePointer = e.pointerId; startHole(w, planeZ(rayAt(w, rc, e.clientX, e.clientY), 0.25)); return }
    const sx = e.clientX - rc.left, sy = e.clientY - rc.top
    if (e.pointerType === 'touch') {
      w.finger.active = false
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size >= 2) {
        down = null
        const [a, b] = [...touches.values()]
        pinch = { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
        return
      }
      down = { x: e.clientX, y: e.clientY, moved: false, hit: pickParticle(w, sx, sy, rc, 28), mode: ctx.navMode() === 'rotate' ? 'orbit' : 'pan' }
      return
    }
    down = { x: e.clientX, y: e.clientY, moved: false, hit: e.button === 0 ? pickParticle(w, sx, sy, rc) : -1, mode: dragMode(e) }
  }

  function onUp(e: PointerEvent) {
    if (holePointer === e.pointerId) { holePointer = null; releaseHole(w); return }
    const rc = rect()
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
      if (down && e.type === 'pointerup' && ctx.enabled()) {
        if (!down.moved && down.hit >= 0) clickAt(w, rayAt(w, rc, e.clientX, e.clientY), down.hit)
        else if (down.moved && down.mode === 'pan' && touches.size === 0) releaseFling()
      }
      down = null
      return
    }
    if (down && e.type === 'pointerup' && ctx.enabled()) {
      if (!down.moved && down.hit >= 0) clickAt(w, rayAt(w, rc, e.clientX, e.clientY), down.hit)
      else if (down.moved && down.mode === 'pan') releaseFling()
    }
    if (down) canvas.style.cursor = 'grab'
    down = null
  }

  // Double-click empty space or paper: zoom in there (all the way in → back to the whole page)
  function onDbl(e: MouseEvent) {
    if (!ctx.enabled()) return
    const rc = rect()
    if (pickParticle(w, e.clientX - rc.left, e.clientY - rc.top, rc) >= 0) return
    if (w.s.zoom <= ZMIN * 1.5) resetView(w)
    else zoomAt(w, rc, ui, e.clientX, e.clientY, 0.45, false)
  }

  function onWheel(e: WheelEvent) {
    if (!ctx.enabled()) return
    e.preventDefault()
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1
    let dx = e.deltaX * unit, dy = e.deltaY * unit
    // trackpad pinch arrives as Ctrl+wheel; zoom toward the cursor
    if (e.ctrlKey || e.metaKey) { zoomAt(w, rect(), ui, e.clientX, e.clientY, Math.exp(Math.max(-50, Math.min(50, dy)) * 0.01)); return }
    if (e.shiftKey && !dx) { dx = dy; dy = 0 }
    cam.mom = null
    if (cam.canPan) panBy(w, rect(), -dx, -dy) // the whole page in view: nothing to scroll (the slosh below still jiggles it)
    // a little jelly slosh as you scroll: capped, so a long trackpad scroll wobbles the words but never flings them
    const kick = -Math.max(-30, Math.min(30, e.deltaY)) * w.s.slosh * 0.02, cap = 0.6 * w.s.slosh
    for (const bd of w.bodies) if (bd.state === HOME) {
      const k = kick * (0.7 + 0.6 * bd.seed)
      for (let i = bd.p0; i < bd.p1; i++) { const o = i * 3 + 1; w.vel[o] = Math.max(-cap, Math.min(cap, w.vel[o] + k)) }
    }
  }

  const noMenu = (e: Event) => e.preventDefault()
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('contextmenu', noMenu)
  canvas.addEventListener('dblclick', onDbl)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  const detach = () => {
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerleave', onLeave)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('contextmenu', noMenu)
    canvas.removeEventListener('dblclick', onDbl)
    canvas.removeEventListener('wheel', onWheel)
  }
  /** true while a press-and-hold (not Space) is holding the black hole open */
  const pointerHole = () => holePointer !== null
  return { detach, pointerHole }
}
