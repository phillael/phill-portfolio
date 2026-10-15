'use client'

/**
 * PLAYER 1 START is printed on the resume's paper (the engine paints it into the page texture, top
 * right, so it tilts, bends and lights with the sheet). This is its real control: a transparent
 * button over the art's projected box (at least 44 × 44 px), moved in engine.onFrame with transform
 * writes only (a 100 px box translated and scaled: no layout per frame). Its hover and focus ring is
 * the paper's pixel cursor; pressing it drops the art a pixel, then Play starts.
 */

import { useEffect, useRef } from 'react'
import type { JellyEngine } from '@/lib/jelly/engine'
import type { PlayStatus } from '@/components/jelly/JellyHudBar'

interface JellyPlayerStartProps {
  engine: JellyEngine
  visible: boolean
  status: PlayStatus
  onStart: () => void
}

/** the button's own size, scaled to the art's box */
const BOX = 100
/** the art drops a pixel this long before Play starts */
const PRESS_MS = 120

const JellyPlayerStart = ({ engine, visible, status, onStart }: JellyPlayerStartProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const shown = useRef(visible)
  useEffect(() => {
    shown.current = visible
    if (!visible) engine.setStartArt({ cursor: false })
  }, [engine, visible])
  useEffect(() => { engine.setStartArt({ status }) }, [engine, status])

  useEffect(() => {
    let last = '', hidden = false
    return engine.onFrame(() => {
      const el = ref.current
      if (!el || !shown.current) return // (inert while playing: no per-frame work)
      const q = engine.startQuad()
      if (!q) {
        if (!hidden) { el.style.visibility = 'hidden'; hidden = true }
        return
      }
      if (hidden) { el.style.visibility = ''; hidden = false }
      let l = Math.min(q[0], q[2], q[4], q[6]), r = Math.max(q[0], q[2], q[4], q[6])
      let t = Math.min(q[1], q[3], q[5], q[7]), b = Math.max(q[1], q[3], q[5], q[7])
      const gw = Math.max(0, 44 - (r - l)) / 2, gh = Math.max(0, 44 - (b - t)) / 2
      l -= gw; r += gw; t -= gh; b += gh
      const tf = `translate(${l.toFixed(1)}px, ${t.toFixed(1)}px) scale(${((r - l) / BOX).toFixed(3)}, ${((b - t) / BOX).toFixed(3)})`
      if (tf !== last) { el.style.transform = tf; last = tf }
    })
  }, [engine])

  const press = useRef(0)
  useEffect(() => () => clearTimeout(press.current), [])
  const start = () => {
    if (press.current) return
    engine.pressStart()
    press.current = window.setTimeout(() => { press.current = 0; onStart() }, PRESS_MS)
  }
  const keyboardFocus = (el: HTMLElement) => {
    try { return el.matches(':focus-visible') } catch { return true }
  }

  const gone = status === 'unavailable'
  return (
    <button
      ref={ref}
      type="button"
      onClick={start}
      onPointerEnter={() => engine.setStartArt({ cursor: true })}
      onPointerLeave={() => engine.setStartArt({ cursor: false })}
      onFocus={(e) => engine.setStartArt({ cursor: keyboardFocus(e.currentTarget) })}
      onBlur={() => engine.setStartArt({ cursor: false })}
      inert={!visible}
      disabled={gone}
      aria-busy={status === 'loading'}
      aria-keyshortcuts="J"
      aria-label={gone ? "Play mode couldn't load" : 'Player 1 start: play as Phill (J)'}
      title={gone ? "Play mode couldn't load" : 'Play as Phill (J)'}
      style={{ width: BOX, height: BOX, transform: 'translate(-9999px, -9999px)', transformOrigin: '0 0' }}
      className={`absolute left-0 top-0 z-[2] cursor-pointer appearance-none border-0 bg-transparent p-0 outline-none disabled:cursor-default ${visible ? '' : 'pointer-events-none'}`}
    />
  )
}

export default JellyPlayerStart
