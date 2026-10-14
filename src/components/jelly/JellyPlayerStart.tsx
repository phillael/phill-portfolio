'use client'

/**
 * PLAYER 1 START on the resume itself: an arcade button beside the name, at the right end of
 * its line (rising into the top margin), that follows the page (projected in engine.onFrame;
 * style only). It starts Play mode, like the HUD's 🎮 Play and J. Shown while the resume is
 * open and not playing.
 */

import { useEffect, useRef } from 'react'
import type { JellyEngine } from '@/lib/jelly/engine'
import type { PlayStatus } from '@/components/jelly/JellyHudBar'
import { FOCUS } from '@/components/jelly/hudStyles'

interface JellyPlayerStartProps {
  engine: JellyEngine
  visible: boolean
  status: PlayStatus
  onStart: () => void
}

const JellyPlayerStart = ({ engine, visible, status, onStart }: JellyPlayerStartProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const shown = useRef(visible)
  useEffect(() => { shown.current = visible }, [visible])

  useEffect(() => {
    let spot: [number, number, number] | null = null
    return engine.onFrame(() => {
      const el = ref.current
      if (!el || !shown.current) return // (hidden while playing: no per-frame work)
      spot ??= engine.startSpot()
      const p = spot && engine.project(spot)
      if (!p) return
      // its bottom right corner at the end of the name's line, level with the bottom of the name
      el.style.transform = `translate(${(p[0] - el.offsetWidth).toFixed(1)}px, ${(p[1] - el.offsetHeight).toFixed(1)}px)`
    })
  }, [engine])

  return (
    <button
      ref={ref}
      type="button"
      onClick={onStart}
      inert={!visible}
      disabled={status === 'unavailable'}
      aria-busy={status === 'loading'}
      aria-keyshortcuts="J"
      aria-label={status === 'unavailable' ? "Play mode couldn't load" : 'Player 1 start: play as Phill (J)'}
      title={status === 'unavailable' ? "Play mode couldn't load" : 'Play as Phill (J)'}
      style={{ transform: 'translate(-9999px, -9999px)' }}
      className={`absolute left-0 top-0 z-[2] inline-flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-2 border-[#80eaff] bg-[rgba(8,10,16,0.82)] px-3.5 py-2 font-pixel text-[11px] leading-none text-[#80eaff] shadow-[0_0_14px_rgba(128,234,255,0.55),inset_0_0_10px_rgba(128,234,255,0.15)] [text-shadow:0_0_6px_rgba(128,234,255,0.8)] transition-opacity duration-500 hover:bg-[rgba(128,234,255,0.14)] disabled:cursor-default disabled:opacity-50 max-[820px]:px-2.5 max-[820px]:text-[9px] ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'} ${FOCUS}`}
    >
      <span aria-hidden="true" className="jelly-blink">▶</span>
      {status === 'loading' ? 'LOADING…' : 'PLAYER 1 START'}
    </button>
  )
}

export default JellyPlayerStart
