'use client'

/**
 * Play mode's touch controls (coarse pointers only): ◀ ▶ bottom-left (hold to run; slide from
 * one to the other without lifting to turn), A jump (hold: higher), B smash and ▼ drop (in the
 * air: ground-pound) bottom-right, all at once with several fingers. They write Play's input
 * directly and show pressed through a data attribute (no React state while you play).
 */

import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { JellyEngine } from '@/lib/jelly/engine'

type Action = 'jump' | 'smash' | 'down'

const GLASS = 'grid place-items-center select-none touch-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] border-[1.5px] border-[rgba(215,222,234,0.28)] bg-[rgba(8,10,16,0.5)] backdrop-blur-[4px] text-[22px] text-[rgba(215,222,234,0.9)] data-[pressed]:border-[#80eaff] data-[pressed]:bg-[rgba(128,234,255,0.3)] data-[pressed]:text-white data-[pressed]:shadow-[0_0_16px_rgba(128,234,255,0.55)]'
const LABEL = 'pointer-events-none absolute -bottom-[15px] whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-[0.5px] text-[rgba(215,222,234,0.6)]'

interface JellyTouchPadsProps {
  engine: JellyEngine
  /** the bottom of the play area: the camera keeps the page above the pads */
  rootRef: RefObject<HTMLDivElement | null>
}

const capture = (e: ReactPointerEvent<HTMLElement>) => {
  try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch {}
}
const block = (e: { preventDefault: () => void }) => e.preventDefault()

const JellyTouchPads = ({ engine, rootRef }: JellyTouchPadsProps) => {
  const input = engine.play.input

  // ---- the move pad: one finger steers; which half it's over picks the direction (so a slide turns him) ----
  const mover = useRef<number | null>(null)
  const steer = (pad: HTMLElement, clientX: number) => {
    const r = pad.getBoundingClientRect(), right = clientX >= r.left + r.width / 2
    input.left = !right
    input.right = right
    pad.querySelector('[data-dir="left"]')?.toggleAttribute('data-pressed', !right)
    pad.querySelector('[data-dir="right"]')?.toggleAttribute('data-pressed', right)
  }
  const moveDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (mover.current !== null) return
    mover.current = e.pointerId
    capture(e)
    steer(e.currentTarget, e.clientX)
  }
  const moveMove = (e: ReactPointerEvent<HTMLDivElement>) => { if (e.pointerId === mover.current) steer(e.currentTarget, e.clientX) }
  const moveUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== mover.current) return
    mover.current = null
    input.left = input.right = false
    for (const b of e.currentTarget.querySelectorAll('[data-pressed]')) b.removeAttribute('data-pressed')
  }

  // ---- the action buttons: held while a finger's on them ----
  const press = (a: Action) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    capture(e)
    input[a] = true
    input.pressed.add(a)
    e.currentTarget.setAttribute('data-pressed', '')
    engine.gesture()
  }
  const release = (a: Action) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    input[a] = false
    e.currentTarget.removeAttribute('data-pressed')
  }
  const action = (a: Action) => ({ onPointerDown: press(a), onPointerUp: release(a), onPointerCancel: release(a), onLostPointerCapture: release(a), onContextMenu: block })

  return (
    <div ref={rootRef} data-testid="jelly-pads" className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[150px]">
      <div
        onPointerDown={moveDown}
        onPointerMove={moveMove}
        onPointerUp={moveUp}
        onPointerCancel={moveUp}
        onLostPointerCapture={moveUp}
        onContextMenu={block}
        className="pointer-events-auto absolute flex touch-none gap-2 bottom-[calc(32px+env(safe-area-inset-bottom))] left-[calc(16px+env(safe-area-inset-left))] [@media(max-height:559px)]:bottom-[calc(24px+env(safe-area-inset-bottom))]"
      >
        <button type="button" tabIndex={-1} aria-label="Run left" data-dir="left" className={`${GLASS} h-16 w-16 rounded-2xl`}>◀</button>
        <button type="button" tabIndex={-1} aria-label="Run right" data-dir="right" className={`${GLASS} h-16 w-16 rounded-2xl`}>▶</button>
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Jump (A; hold for higher)"
        {...action('jump')}
        className={`${GLASS} pointer-events-auto absolute bottom-[calc(40px+env(safe-area-inset-bottom))] right-[calc(16px+env(safe-area-inset-right))] h-[72px] w-[72px] rounded-full border-[rgba(128,234,255,0.7)] font-extrabold text-[#80eaff]`}
      >
        A<span className={LABEL}>jump</span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Smash (B)"
        {...action('smash')}
        className={`${GLASS} pointer-events-auto absolute bottom-[calc(24px+env(safe-area-inset-bottom))] right-[calc(100px+env(safe-area-inset-right))] h-16 w-16 rounded-full border-[rgba(213,128,255,0.7)] font-extrabold text-[#d580ff]`}
      >
        B<span className={LABEL}>smash</span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Drop through (in the air: ground-pound)"
        {...action('down')}
        className={`${GLASS} pointer-events-auto absolute bottom-[calc(104px+env(safe-area-inset-bottom))] right-[calc(104px+env(safe-area-inset-right))] h-11 w-14 rounded-xl text-[16px]`}
      >
        ▼
      </button>
    </div>
  )
}

export default JellyTouchPads
