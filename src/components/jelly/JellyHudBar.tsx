'use client'

import type { RefObject } from 'react'
import type { JellyEngine } from '@/lib/jelly/engine'
import { BTN, BTN_MUTED, KEY, ON, PANEL, PLAY_BTN } from '@/components/jelly/hudStyles'
import { RESUME_PDF } from '@/data/resume'

export { RESUME_PDF }

export interface HudToggles {
  shroom: boolean
  hole: boolean
  sound: boolean
  tilt: boolean
}

/** Play mode's button: ready, loading (Phill or the Play code; Play starts when they're in), or failed */
export type PlayStatus = 'ready' | 'loading' | 'unavailable'

interface JellyHudBarProps {
  engine: JellyEngine
  toggles: HudToggles
  onToggle: (k: keyof HudToggles) => void
  play: PlayStatus
  onPlay: () => void
  rootRef: RefObject<HTMLDivElement | null>
}

/**
 * The bottom bar: 🎮 Play, ⤓ PDF, Chaos, Burst all, Heal all, Shroom, Black hole, Tilt (phones),
 * Sound, Intro, View, and the hints. It leaves room on the right for the site's ♫ button.
 */
const JellyHudBar = ({ engine, toggles, onToggle, play, onPlay, rootRef }: JellyHudBarProps) => (
  <div
    ref={rootRef}
    className={`${PANEL} absolute bottom-3 left-3 right-[92px] z-[2] flex flex-wrap items-center gap-2 rounded-[10px] px-2.5 py-2 max-md:right-[68px] max-[820px]:bottom-2 max-[820px]:left-2 max-[820px]:gap-1.5 max-[820px]:p-1.5`}
  >
    <button
      type="button"
      aria-keyshortcuts="J"
      aria-busy={play === 'loading'}
      disabled={play === 'unavailable'}
      title={play === 'unavailable' ? "Play mode couldn't load" : 'Play as Phill (J)'}
      onClick={onPlay}
      className={play === 'ready' ? PLAY_BTN : BTN_MUTED}
    >
      {play === 'loading' ? 'Loading…' : play === 'unavailable' ? 'Play unavailable' : <><span aria-hidden="true">🎮</span> Play<span className={KEY}> (J)</span></>}
    </button>
    <a href={RESUME_PDF} download="Phill_Aelony_Resume.pdf" aria-label="Download the PDF" title="Download the PDF" className={BTN}>
      <span aria-hidden="true">⤓</span> PDF
    </a>
    <button type="button" aria-keyshortcuts="C" onClick={() => engine.chaos()} className={BTN}>
      Chaos<span className={KEY}> (C)</span>
    </button>
    <button type="button" aria-keyshortcuts="B" onClick={() => engine.burstAll()} className={BTN}>
      Burst all<span className={KEY}> (B)</span>
    </button>
    <button type="button" aria-keyshortcuts="H" onClick={() => engine.healAll()} className={BTN}>
      Heal all<span className={KEY}> (H)</span>
    </button>
    <button
      type="button"
      aria-pressed={toggles.shroom}
      aria-keyshortcuts="S"
      onClick={() => onToggle('shroom')}
      className={`${BTN} ${toggles.shroom ? 'border-[#ff4fd8] text-[#ff4fd8] shadow-[0_0_12px_rgba(255,79,216,0.35)]' : ''}`}
    >
      <span aria-hidden="true">🍄</span> Shroom<span className={KEY}> mode (S)</span>
    </button>
    <button
      type="button"
      aria-pressed={toggles.hole}
      aria-keyshortcuts="G"
      title="Then press and hold on the page. On desktop you can also hold Space."
      onClick={() => onToggle('hole')}
      className={`${BTN} ${toggles.hole ? ON : ''}`}
    >
      <span aria-hidden="true">🕳</span> Black hole<span className={KEY}> (G)</span>
    </button>
    <button
      type="button"
      aria-pressed={toggles.tilt}
      title="Tilt the phone to slide loose words; shake to scramble"
      onClick={() => onToggle('tilt')}
      className={`${BTN} hidden [@media(pointer:coarse)]:inline-flex ${toggles.tilt ? ON : ''}`}
    >
      <span aria-hidden="true">📱</span> Tilt
    </button>
    <button
      type="button"
      aria-pressed={toggles.sound}
      aria-keyshortcuts="M"
      title="Mute or unmute (M)"
      onClick={() => onToggle('sound')}
      className={`${BTN} ${toggles.sound ? ON : ''}`}
    >
      <span aria-hidden="true">{toggles.sound ? '🔊' : '🔇'}</span> Sound
    </button>
    <button type="button" aria-keyshortcuts="I" title="Replay the entrance (I)" onClick={() => engine.replayIntro()} className={BTN}>
      <span aria-hidden="true">▶</span> Intro
    </button>
    <button type="button" aria-keyshortcuts="R" title="Reset the view (R or double-click)" onClick={() => engine.resetView()} className={BTN}>
      <span aria-hidden="true">⟲</span> View
    </button>
    <p className="order-10 m-0 flex-[1_1_420px] text-[11px] leading-normal text-[#7c8798] max-[820px]:hidden">
      Click: knock loose · click loose word: burst · drag: rotate · hold Space: black hole · /: find
      <br />
      Scroll: pan (or ✥ Pan mode, O) · Ctrl-scroll / pinch: zoom at cursor · double-click: zoom in · 0: whole page
    </p>
  </div>
)

export default JellyHudBar
