'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createJellyEngine, type JellyEngine } from '@/lib/jelly/engine'
import { loadSnapshot } from '@/lib/jelly/snapshot'
import JellyFinder from '@/components/jelly/JellyFinder'
import JellyHudBar, { type HudToggles } from '@/components/jelly/JellyHudBar'
import JellyNavigator from '@/components/jelly/JellyNavigator'
import { FOCUS, PANEL } from '@/components/jelly/hudStyles'

interface JellyResumeCanvasProps {
  /** run the Finder once the page lands (/resume?find=React) */
  find?: string | null
  /** × or Esc, after the overlay has faded out */
  onClose: () => void
}

const FADE_MS = 400

/**
 * The 3D Jelly Resume: one WebGL2 canvas (aria-hidden; the semantic resume stays the
 * accessible content) with its HUD: the Finder, the navigator, the bottom bar and ×.
 * Mounts the engine, loads the snapshot and plays the direct-visit entrance.
 * Load it with next/dynamic ({ ssr: false }); it's the engine's whole chunk.
 */
const JellyResumeCanvas = ({ find = null, onClose }: JellyResumeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const finderRef = useRef<HTMLDivElement>(null)
  const finderInput = useRef<HTMLInputElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const [engine, setEngine] = useState<JellyEngine | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [closing, setClosing] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<number | null>(null)
  const [navMode, setNavMode] = useState<'rotate' | 'pan'>('rotate')
  const [toggles, setToggles] = useState<HudToggles>({ shroom: false, hole: false, sound: true, tilt: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let e: JellyEngine
    try {
      e = createJellyEngine({
        canvas,
        onFind: (q, n) => { setQuery(q); setMatches(n) }, // a deep link's Finder, once the page lands
      })
    } catch (err) {
      console.error('The 3D resume needs WebGL2', err)
      return
    }
    let alive = true
    setEngine(e)
    e.openDirect(find)
    loadSnapshot()
      .then((snapshot) => {
        if (!alive) return
        e.load(snapshot)
        setLoaded(true)
      })
      .catch((err) => console.error('The resume failed to load', err))
    return () => {
      alive = false
      e.dispose()
      setEngine(null)
      setLoaded(false)
    }
  }, [find])

  const search = useCallback((q: string) => setMatches(engine ? engine.find(q) : null), [engine])

  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, FADE_MS)
  }, [closing, onClose])

  const toggle = useCallback(
    (k: keyof HudToggles) => {
      if (!engine) return
      engine.gesture()
      const on = !toggles[k]
      if (k === 'tilt') {
        engine.setTilt(on).then((t) => setToggles((s) => ({ ...s, tilt: t })))
        return
      }
      if (k === 'shroom') engine.setShroom(on)
      else if (k === 'hole') engine.setHoleMode(on)
      else if (k === 'sound') engine.setSound(on)
      setToggles((s) => ({ ...s, [k]: on }))
    },
    [engine, toggles],
  )

  const toggleNav = useCallback(
    (m: 'rotate' | 'pan') => {
      engine?.setNavMode(m)
      setNavMode(m)
    },
    [engine],
  )

  // The page fits between the Finder (top) and the bar (bottom); on phones the navigator sits under the Finder
  useEffect(() => {
    if (!engine) return
    const measure = () => {
      const H = window.innerHeight, f = finderRef.current?.getBoundingClientRect(), h = hudRef.current?.getBoundingClientRect()
      if (!f || !h || H < 10) return
      engine.setUiInsets(Math.min(0.3, (f.bottom + 6) / H), Math.min(0.35, (H - h.top + 6) / H))
      if (navRef.current) navRef.current.style.top = window.matchMedia('(max-width: 820px)').matches ? `${f.bottom + 6}px` : ''
    }
    const ro = new ResizeObserver(measure)
    if (finderRef.current) ro.observe(finderRef.current)
    if (hudRef.current) ro.observe(hudRef.current)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [engine])

  // Keyboard shortcuts while the resume is open
  const queryRef = useRef(query)
  useEffect(() => { queryRef.current = query }, [query])
  useEffect(() => {
    if (!engine || !loaded || closing) return
    const ignore = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      // (the Finder's input handles its own keys; its chips are buttons like the rest)
      return e.ctrlKey || e.metaKey || e.altKey || (!!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
    }
    const onButton = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest?.('button, a')
    const down = (e: KeyboardEvent) => {
      if (ignore(e)) return
      engine.gesture()
      if ((e.key === 'Enter' || e.key === ' ') && onButton(e)) return // let the focused button work
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) engine.holeAtCursor(); return }
      const k = e.key.toLowerCase()
      if (k === '/') { e.preventDefault(); finderInput.current?.focus(); finderInput.current?.select(); return }
      if (k === 'escape') {
        if (queryRef.current) { setQuery(''); setMatches(engine.find('')) } else close()
        return
      }
      if (k === 's') toggle('shroom')
      else if (k === 'c') engine.chaos()
      else if (k === 'b') engine.burstAll()
      else if (k === 'h') engine.healAll()
      else if (k === 'r' || e.key === '0') engine.resetView()
      else if (k === 'g') toggle('hole')
      else if (k === 'm') toggle('sound')
      else if (k === 'i') engine.replayIntro()
      else if (k === 'o') toggleNav(navMode === 'rotate' ? 'pan' : 'rotate')
      else if (e.key === '+' || e.key === '=') engine.zoomBy(0.75)
      else if (e.key === '-' || e.key === '_') engine.zoomBy(1 / 0.75)
      else if (/^(Arrow|Page)|^(Home|End)$/.test(e.key)) { e.preventDefault(); engine.panKey(e.key) }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || ignore(e) || onButton(e)) return
      e.preventDefault()
      engine.releaseHoleKey()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [engine, loaded, closing, close, toggle, toggleNav, navMode])

  const uiOn = !!engine && loaded && !closing
  const fadeIn = `transition-opacity duration-[600ms] ${uiOn ? 'opacity-100 delay-[400ms]' : 'pointer-events-none opacity-0'}`

  return (
    <section
      aria-label="Interactive resume"
      className={`fixed inset-0 z-50 font-body text-[13px] leading-[1.4] text-[#d7deea] transition-opacity duration-[400ms] ${closing ? 'opacity-0' : ''}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full touch-none" />
      {engine && (
        <div inert={!uiOn} className={fadeIn}>
          <JellyFinder
            query={query}
            matches={matches}
            onType={setQuery}
            onSearch={search}
            inputRef={finderInput}
            rootRef={finderRef}
          />
          <JellyNavigator engine={engine} loaded={loaded} navMode={navMode} onNavMode={toggleNav} rootRef={navRef} />
          <JellyHudBar engine={engine} toggles={toggles} onToggle={toggle} rootRef={hudRef} />
          <button
            type="button"
            aria-label="Close the resume (Esc)"
            title="Close (Esc)"
            onClick={close}
            className={`${PANEL} absolute right-3 top-2.5 z-[3] grid h-11 w-11 cursor-pointer place-items-center rounded-full p-0 text-[22px] leading-none text-[#d7deea] hover:border-[#80eaff] hover:text-[#80eaff] max-[820px]:right-2 max-[820px]:top-2 ${FOCUS}`}
          >
            ×
          </button>
        </div>
      )}
    </section>
  )
}

export default JellyResumeCanvas
