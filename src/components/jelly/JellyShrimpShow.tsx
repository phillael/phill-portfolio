'use client'

/**
 * SHRIMP!: eating a shrimp in Play mode flashes SHRIMP in big rainbow pixel letters, and 16 shrimp
 * rain down the screen a moment later (ported from Number Slayers' ShrimpCelebration: DOM + CSS
 * transforms and opacity only, no per-frame JS). Decoration (aria-hidden): the live region says it.
 * Its own chunk (with its CSS and Rubik Pixels), loaded with the Play HUD: none of it loads before Play starts.
 */

import { useEffect, useState } from 'react'
import { Rubik_Pixels } from 'next/font/google'
import type { JellyEngine } from '@/lib/jelly/engine'
import css from '@/components/jelly/JellyShrimpShow.module.css'

const rubik = Rubik_Pixels({ weight: '400', subsets: ['latin'], preload: false, display: 'swap' })

const COLORS = ['#ff5a24', '#ffd24a', '#3ef58c', '#43d9ff', '#ff4dd2', '#ff2d55', '#ffa63e']
const RAIN = 16
/** the shower trails the word by this long (ms), and the whole show is gone after SHOW_MS */
const SHOWER_DELAY_MS = 1500
const SHOW_MS = 4400

interface Drop { left: number; delay: number; dur: number; size: number; spin: number }

const roll = (): Drop[] => Array.from({ length: RAIN }, () => ({
  left: 2 + Math.random() * 96,
  delay: SHOWER_DELAY_MS + Math.random() * 900,
  dur: 1100 + Math.random() * 900,
  size: 1.6 + Math.random() * 2.2,
  spin: (Math.random() - 0.5) * 720,
}))

const JellyShrimpShow = ({ engine }: { engine: JellyEngine }) => {
  const [show, setShow] = useState<{ key: number; rain: Drop[] } | null>(null)

  // fetch the font now (Play just started), so the first SHRIMP! isn't in a fallback face
  useEffect(() => { document.fonts?.load(`64px ${rubik.style.fontFamily}`).catch(() => {}) }, [])

  useEffect(() => {
    let key = 0, timer: ReturnType<typeof setTimeout> | undefined
    const off = engine.play.onEvent((e) => {
      if (e.type !== 'shrimp') return
      // another one mid-show restarts it (a new key re-runs the animations)
      setShow({ key: ++key, rain: roll() })
      clearTimeout(timer)
      timer = setTimeout(() => setShow(null), SHOW_MS)
    })
    return () => { off(); clearTimeout(timer) }
  }, [engine])

  if (!show) return null
  return (
    <div key={show.key} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4] overflow-hidden">
      {show.rain.map((d, i) => (
        <span
          key={i}
          className={`${css.rain} absolute top-0`}
          style={{ left: `${d.left}%`, fontSize: `${d.size}rem`, animationDuration: `${d.dur}ms`, animationDelay: `${d.delay}ms`, ['--spin' as string]: `${d.spin}deg` }}
        >
          🍤
        </span>
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${rubik.className} ${css.word} select-none`}>
          {'SHRIMP'.split('').map((c, i) => (
            <span key={i} className={`${css.letter} inline-block`} style={{ color: COLORS[i % COLORS.length], animationDelay: `${i * 60}ms` }}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default JellyShrimpShow
