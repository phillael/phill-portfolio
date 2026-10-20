/**
 * The magnets: the Skills section's words lean toward a fine pointer, like filings, and settle back when
 * it leaves. Fine pointers only and never with reduced motion. A rAF runs only while something is still
 * moving; the words' centres are measured in event handlers (on the pointer's way in, or by the game after
 * a reflow), never inside the frame. Ported from the round 6 mockup (blaster-synth.js, "the magnets").
 */

const LEAN_R = 120, LEAN_PX = 4.5, LEAN_DEG = 7
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

interface Word {
  label: HTMLElement
  cx: number
  cy: number
  lx: number
  ly: number
  lr: number
  ls: number
}

export interface Lean {
  /** re-reads the words' centres (a layout read: call it outside any frame) */
  measure(): void
  /** every word back to rest now */
  reset(): void
  dispose(): void
}

/** the element a skill's motion and letters belong to: an AI skill's name, or the word itself */
export const labelOf = (skill: HTMLElement) => skill.querySelector<HTMLElement>('[data-name]') ?? skill

export function createLean(section: HTMLElement): Lean {
  const words: Word[] = [...section.querySelectorAll<HTMLElement>('[data-skill]')].map((el) => ({ label: labelOf(el), cx: 0, cy: 0, lx: 0, ly: 0, lr: 0, ls: 0 }))
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ptr = { on: false, cx: 0, cy: 0, x: 0, y: 0 }
  let raf = 0, last = 0, visible = true, stale = true

  function measure() {
    words.forEach((w) => { w.label.style.transform = ''; w.lx = w.ly = w.lr = w.ls = 0 })
    words.forEach((w) => { const r = w.label.getBoundingClientRect(); w.cx = r.left + scrollX + r.width / 2; w.cy = r.top + scrollY + r.height / 2 })
    stale = false
  }
  function reset() {
    ptr.on = false
    if (raf) { cancelAnimationFrame(raf); raf = 0 }
    words.forEach((w) => { w.label.style.transform = ''; w.lx = w.ly = w.lr = w.ls = 0 })
  }
  function kick() { if (!raf && visible && !rmQuery.matches) { last = performance.now(); raf = requestAnimationFrame(frame) } }
  function frame(t: number) {
    raf = 0
    const dt = Math.min(0.033, Math.max(0.001, (t - last) / 1000))
    last = t
    const k1 = 1 - Math.exp(-dt * 14)
    let busy = false
    for (const w of words) {
      let tx = 0, ty = 0, tr = 0, ts = 0
      if (ptr.on) {
        const dx = ptr.x - w.cx, dy = ptr.y - w.cy, d = Math.hypot(dx, dy)
        if (d < LEAN_R && d > 0.5) {
          const s = (1 - d / LEAN_R) ** 2
          tx = (dx / d) * LEAN_PX * s
          ty = (dy / d) * LEAN_PX * s
          let a = (Math.atan2(dy, dx) * 180) / Math.PI // a filing has no head or tail
          if (a > 90) a -= 180
          if (a < -90) a += 180
          tr = clamp(a * 0.2, -LEAN_DEG, LEAN_DEG) * s
          ts = 0.05 * s
        }
      }
      const nx = w.lx + (tx - w.lx) * k1, ny = w.ly + (ty - w.ly) * k1, nr = w.lr + (tr - w.lr) * k1, ns = w.ls + (ts - w.ls) * k1
      const settled = Math.abs(nx - tx) < 0.02 && Math.abs(ny - ty) < 0.02 && Math.abs(nr - tr) < 0.02 && Math.abs(ns - ts) < 0.0005
      const fx = settled ? tx : nx, fy = settled ? ty : ny, fr = settled ? tr : nr, fs = settled ? ts : ns
      if (fx !== w.lx || fy !== w.ly || fr !== w.lr || fs !== w.ls) {
        w.lx = fx; w.ly = fy; w.lr = fr; w.ls = fs
        w.label.style.transform = fx || fy || fr || fs ? `translate3d(${fx.toFixed(2)}px, ${fy.toFixed(2)}px, 0) rotate(${fr.toFixed(2)}deg) scale(${(1 + fs).toFixed(4)})` : ''
      }
      if (!settled) busy = true
    }
    if (busy && visible) raf = requestAnimationFrame(frame)
  }

  const onEnter = () => { stale = true } // the page above may have reflowed since the last visit
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !fine.matches || rmQuery.matches) return
    if (stale && !ptr.on) measure()
    ptr.on = true; ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.x = e.pageX; ptr.y = e.pageY
    kick()
  }
  const onLeave = () => { ptr.on = false; kick() }
  const onScroll = () => { if (ptr.on) { ptr.x = ptr.cx + scrollX; ptr.y = ptr.cy + scrollY; kick() } }
  const onMotion = () => { if (rmQuery.matches) reset() }
  section.addEventListener('pointerenter', onEnter)
  section.addEventListener('pointermove', onMove, { passive: true })
  section.addEventListener('pointerleave', onLeave)
  window.addEventListener('scroll', onScroll, { passive: true })
  rmQuery.addEventListener?.('change', onMotion)
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0 }
  })
  io.observe(section)
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { stale = true })
  ro?.observe(section)

  return {
    measure,
    reset,
    dispose() {
      reset()
      section.removeEventListener('pointerenter', onEnter)
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('scroll', onScroll)
      rmQuery.removeEventListener?.('change', onMotion)
      io.disconnect()
      ro?.disconnect()
    },
  }
}
