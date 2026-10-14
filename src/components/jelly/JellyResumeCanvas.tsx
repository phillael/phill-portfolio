'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createJellyEngine, type JellyEngine } from '@/lib/jelly/engine'
import { loadSnapshotOnce, releaseSnapshot } from '@/lib/jelly/snapshot'
import { containedRect, decodePhoto, releasePhoto } from '@/lib/jelly/hero'
import { useShroomActive } from '@/context/ShroomModeContext'
import { createMusicTap } from '@/lib/jelly/music'
import { getSiteMusic } from '@/lib/site-music'
import type { ResumeMode } from '@/components/jelly/resumeRoute'
import { clearIntent, getHeroImg, peekIntent } from '@/components/jelly/resumeTrigger'
import JellyFinder from '@/components/jelly/JellyFinder'
import JellyHudBar, { type HudToggles } from '@/components/jelly/JellyHudBar'
import JellyNavigator from '@/components/jelly/JellyNavigator'
import { FOCUS, PANEL } from '@/components/jelly/hudStyles'
import ResumeContent from '@/components/ResumeContent'

interface JellyResumeCanvasProps {
  /** overlay: opened from the home page (the hero dissolves into it); direct: a visit to /resume */
  mode?: ResumeMode
  /** run the Finder once the page lands (/resume?find=React) */
  find?: string | null
  /** the URL left /resume: play the close (in reverse onto the hero, or a fade), controls off */
  closing?: boolean
  /** × or Esc: ask the host to close (it changes the URL) */
  onClose: () => void
  /** the close has finished; the host unmounts it */
  onClosed?: () => void
  /**
   * the engine can't run here (no WebGL2, a lost context, a load that threw: 'webgl', for the rest
   * of the session) or the snapshot didn't arrive ('load', this time only): the host shows the plain page
   */
  onFail?: (reason: 'webgl' | 'load') => void
}

/** dev only: the cast's sliders (?tune); compiled out of production builds */
const JellyCastTune = process.env.NODE_ENV !== 'production' ? dynamic(() => import('@/components/jelly/JellyCastTune'), { ssr: false }) : null

const FADE_MS = 400
/** Still not open after this long (a slow connection): show × anyway */
const SLOW_MS = 2500

/** The home page under the overlay: it fades and blurs away as the hero dissolves, hides, then comes back. */
const pageClasses = (...add: string[]) => {
  const el = document.getElementById('shroom-target')
  if (!el) return
  el.classList.remove('jelly-dissolving', 'jelly-gone', 'jelly-returning')
  el.classList.add(...add)
}

/**
 * Everything under the overlay (the page, the skip link, the shroom UI) is out of reach while
 * it's up: hidden UI is inert. The resume's text equivalent is inside the dialog instead.
 * The shroom UI (the wizard and 💊 in shroom mode) sits above the overlay, so it also fades out.
 */
const pageInert = (on: boolean) => {
  for (const el of [document.getElementById('shroom-target'), document.getElementById('shroom-ui'), document.querySelector('a[href="#main"]')]) {
    if (el instanceof HTMLElement) el.inert = on
  }
  document.getElementById('shroom-ui')?.classList.toggle('jelly-ui-off', on)
  // and the page doesn't scroll under it (a wheel mid-dissolve would move the photo the close flies back to)
  document.documentElement.classList.toggle('jelly-lock', on)
}

/** The dissolve and the reverse close fly from and to the photo: only when a good part of it is on screen. */
const onScreen = (img: HTMLImageElement | null) => {
  if (!img) return null
  const r = containedRect(img)
  const w = Math.min(r.left + r.width, window.innerWidth) - Math.max(r.left, 0)
  const h = Math.min(r.top + r.height, window.innerHeight) - Math.max(r.top, 0)
  return w > 0 && h > 0 && w * h >= 0.25 * r.width * r.height ? img : null
}

/** A key meant for the resume: focus is in it or nowhere (not, say, in the music player's panel). */
const forResume = (e: KeyboardEvent, section: HTMLElement | null) => {
  const t = e.target
  return !(t instanceof Node) || t === document.body || !!section?.contains(t)
}

/** The HUD's emoji and symbols (keep in step with its labels). */
const HUD_GLYPHS = '🍄📱🔇🔊🕳⌕▶♫✥⟲⟳⤓'

/**
 * Lay the HUD's glyphs out once, off screen: their fallback fonts' first use costs ~45 ms
 * on a throttled phone, too much on top of the HUD's own first layout in the same frame.
 */
const warmGlyphs = (host: HTMLElement | null) => {
  if (!host) return
  const s = document.createElement('span')
  s.setAttribute('aria-hidden', 'true')
  s.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  s.textContent = HUD_GLYPHS
  host.appendChild(s)
  s.getBoundingClientRect()
  s.remove()
}

/** Whatever opened the resume (the hero, or the 🍄), so focus can go back to it. */
const openerFor = (el: HTMLElement | null | undefined) =>
  el && el.isConnected ? el : (getHeroImg()?.closest('button') as HTMLElement | null) ?? null

/**
 * The 3D Jelly Resume: one WebGL2 canvas (aria-hidden; the semantic resume stays the
 * accessible content) with its HUD: the Finder, the navigator, the bottom bar and ×.
 * Mounts the engine, loads the snapshot, opens (from the hero over the home page, or a
 * direct entrance) and closes (in reverse onto the hero, or a fade).
 * Load it with next/dynamic ({ ssr: false }); it's the engine's whole chunk.
 */
const JellyResumeCanvas = ({ mode = 'direct', find = null, closing = false, onClose, onClosed, onFail }: JellyResumeCanvasProps) => {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const finderRef = useRef<HTMLDivElement>(null)
  const finderInput = useRef<HTMLInputElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const [engine, setEngine] = useState<JellyEngine | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [opened, setOpened] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const onClosedRef = useRef(onClosed)
  useEffect(() => { onClosedRef.current = onClosed }, [onClosed])
  const onFailRef = useRef(onFail)
  useEffect(() => { onFailRef.current = onFail }, [onFail])
  const openerRef = useRef<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<number | null>(null)
  const [navMode, setNavMode] = useState<'rotate' | 'pan'>('rotate')
  const [toggles, setToggles] = useState<HudToggles>({ shroom: false, hole: false, sound: true, tilt: false })

  const findRef = useRef(find)
  const modeRef = useRef(mode)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const intent = peekIntent()
    openerRef.current = intent?.opener ?? null
    const tap = createMusicTap(getSiteMusic) // dance to the site's player (one player for the site and the resume)
    let e: JellyEngine | null = null
    let alive = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const frames: number[] = []
    // A step per frame, so a slow phone never blocks a frame for long: the browser lays out and paints the
    // overlay first, then the engine is created (shaders, the nebula), then it opens (sampling the photo).
    const later = (f: () => void) => frames.push(requestAnimationFrame(() => timers.push(setTimeout(() => alive && f(), 0))))
    // a lost context (a GPU reset, or the browser reclaiming it) doesn't come back here: the plain page instead
    const lost = () => {
      if (!alive) return
      console.warn('The 3D resume lost its WebGL context; showing the plain page')
      onFailRef.current?.('webgl')
    }
    canvas.addEventListener('webglcontextlost', lost)
    later(() => {
      try {
        e = createJellyEngine({
          canvas,
          music: tap.get,
          onFind: (q, n) => { setQuery(q); setMatches(n) }, // a deep link's Finder, once the page lands
          onOpen: () => {
            clearIntent()
            setOpened(true)
            if (modeRef.current === 'overlay') pageClasses('jelly-gone')
            // the trigger is hidden now: bring focus into the resume
            const a = document.activeElement
            if (!a || a === document.body || document.getElementById('shroom-target')?.contains(a)) sectionRef.current?.focus({ preventScroll: true })
          },
          // closing in reverse: the sparks are home on the photo, so the page comes back under them
          onLanded: () => {
            pageInert(false)
            pageClasses('jelly-returning')
          },
          onClosed: () => {
            openerFor(openerRef.current)?.focus({ preventScroll: true })
            onClosedRef.current?.()
          },
        })
      } catch (err) {
        console.warn('The 3D resume needs WebGL2; showing the plain page', err)
        onFailRef.current?.('webgl')
        return
      }
      const engine = e
      setEngine(engine)
      pageInert(true)
      // over the home page the hero dissolves into the resume (from the click; Forward replays it from the photo's center),
      // once the photo is decoded (off the main thread; the prefetch usually has it already). If the photo is off screen
      // (the 🍄 can summon it from anywhere), the resume opens directly instead.
      const img = modeRef.current === 'overlay' ? onScreen(getHeroImg()) : null
      const open = () => {
        if (img && engine.openFromHero({ img, origin: intent?.origin ?? null, tint: intent?.tint ?? 0, find: findRef.current })) pageClasses('jelly-dissolving')
        else engine.openDirect(findRef.current)
        // a failed load must not strand anyone on an empty nebula: the plain page instead
        loadSnapshotOnce().then(
          (snapshot) => {
            if (!alive) return
            engine
              .load(snapshot)
              // then the HUD, a frame after its glyphs: two first layouts, a frame each
              .then(() => later(() => { warmGlyphs(sectionRef.current); later(() => setLoaded(true)) }))
              .catch((err) => {
                console.warn('The 3D resume failed to build; showing the plain page', err)
                if (alive) onFailRef.current?.('webgl')
              })
          },
          (err) => {
            console.warn('The resume snapshot failed to load; showing the plain page', err)
            if (alive) onFailRef.current?.('load')
          },
        )
      }
      if (img) decodePhoto(img).then(() => later(open))
      else later(open)
    })
    return () => {
      alive = false
      canvas.removeEventListener('webglcontextlost', lost) // dispose gives the context back on purpose
      frames.forEach(cancelAnimationFrame)
      timers.forEach(clearTimeout)
      e?.dispose()
      tap.dispose()
      // the decoded layers and photo are ~25 MB: a reopen decodes them again (off the main thread)
      releaseSnapshot()
      releasePhoto()
      pageClasses()
      pageInert(false)
      setEngine(null)
      setLoaded(false)
      setOpened(false)
    }
  }, [])

  // The URL left /resume. Over the home page: the words burst into sparks that fly home to the hero photo
  // (the engine calls onLanded, then onClosed). Otherwise, or if the photo can't be used: fade out.
  useEffect(() => {
    if (!closing) return
    const img = modeRef.current === 'overlay' ? getHeroImg() : null
    if (engine && onScreen(img) && engine.close(img!)) return
    setFadeOut(true)
    pageInert(false)
    if (modeRef.current === 'overlay') {
      pageClasses('jelly-returning')
      if (img) img.style.visibility = ''
    }
    const t = setTimeout(() => {
      if (modeRef.current === 'overlay') openerFor(openerRef.current)?.focus({ preventScroll: true })
      onClosedRef.current?.()
    }, FADE_MS)
    return () => clearTimeout(t)
  }, [closing, engine])

  // Site shroom mode drives the resume's shroom look (the HUD's Shroom toggles it for the resume alone)
  const siteShroom = useShroomActive()
  useEffect(() => {
    if (!engine) return
    engine.setShroom(siteShroom)
    setToggles((s) => (s.shroom === siteShroom ? s : { ...s, shroom: siteShroom }))
  }, [engine, siteShroom])

  const search = useCallback((q: string) => setMatches(engine ? engine.find(q) : null), [engine])

  const close = useCallback(() => {
    if (!closing) onClose()
  }, [closing, onClose])

  // Esc works from the start: a slow (or failed) load must not trap anyone. The full shortcuts wait for the open.
  useEffect(() => {
    if (opened || closing) return
    const down = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !forResume(e, sectionRef.current)) return
      e.stopPropagation()
      close()
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [opened, closing, close])

  // × shows up anyway if the resume is slow to open (a phone on a slow connection has no Esc)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (opened) return
    const t = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(t)
  }, [opened])

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
    if (!engine || !opened || closing) return
    const ignore = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      // only for the resume (not while focus is in, say, the music player's panel); the Finder's
      // input handles its own keys, its chips are buttons like the rest
      return !forResume(e, sectionRef.current) || e.ctrlKey || e.metaKey || e.altKey || (!!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
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
        e.stopPropagation() // the resume's Esc only: not also site shroom mode's (it listens on window too)
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
      else if (k === 'p') getSiteMusic()?.toggle() // the site's player
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
    // keydown in the capture phase, ahead of the page's window listeners (as WizardChat does)
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up)
    }
  }, [engine, opened, closing, close, toggle, toggleNav, navMode])

  const uiOn = !!engine && opened && !closing
  const fadeIn = `transition-opacity duration-[600ms] ${uiOn ? 'opacity-100 delay-[400ms]' : 'pointer-events-none opacity-0'}`
  // × comes in with the HUD, or on its own when the open is slow
  const xOn = uiOn || (slow && !opened && !closing)

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Interactive resume"
      className={`fixed inset-0 z-50 font-body outline-none text-[13px] leading-[1.4] text-[#d7deea] transition-opacity duration-[400ms] ${fadeOut ? 'opacity-0' : ''} ${closing ? 'pointer-events-none' : ''}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full touch-none" />
      {/* the canvas is decoration: its words, as text, for screen readers */}
      <div className="sr-only">
        <p>A 3D, animated version of Phill&apos;s resume. Its text follows.</p>
        <ResumeContent idPrefix="jelly-resume-" links={false} />
      </div>
      {/* mounted once the resume has loaded (it opens after that): its first layout stays out of the busy first frames */}
      {engine && loaded && (
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
          {JellyCastTune && <JellyCastTune />}
        </div>
      )}
      <button
        type="button"
        aria-label="Close the resume (Esc)"
        title="Close (Esc)"
        inert={!xOn}
        onClick={close}
        className={`${PANEL} absolute right-3 top-2.5 z-[3] grid h-11 w-11 cursor-pointer place-items-center rounded-full p-0 text-[22px] leading-none text-[#d7deea] transition-opacity duration-[600ms] hover:border-[#80eaff] hover:text-[#80eaff] max-[820px]:right-2 max-[820px]:top-2 ${xOn ? `opacity-100 ${uiOn ? 'delay-[400ms]' : ''}` : 'pointer-events-none opacity-0'} ${FOCUS}`}
      >
        ×
      </button>
    </section>
  )
}

export default JellyResumeCanvas
