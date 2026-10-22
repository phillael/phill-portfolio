'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Project } from '@/types/content'
import type { MediaEntry, Vault } from '@/lib/vault/vault'
import { START } from '@/lib/vault/math'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import css from './Projects.module.css'

const loadVault = () => import('@/lib/vault/vault')

const nn = (i: number) => String(i + 1).padStart(2, '0')
const PLAY_ICON = 'M8 5.5v13l11-6.5z'

type Props = { projects: Project[]; media: Record<string, MediaEntry> }

/**
 * The Relic Vault's island: the stage (the hall's canvas, the arrows, the power button, the hint), the museum card
 * (six tab panels, all in the HTML), the exhibit names (the tab list) and the live region. The engine
 * (src/lib/vault/vault.ts, its own chunk with three) is imported once the section is within 800 px of the viewport;
 * it tells the island which exhibit is nearest (onNear: index changes only), and the island tells it where to go.
 * Without WebGL the stage shows the exhibit's poster in a CSS screen, and Watch still lifts the hologram from it.
 * The first click in here hands the sound effects the site player's AudioContext.
 */
const ProjectsVault = ({ projects, media }: Props) => {
  const N = projects.length
  const [sel, setSel] = useState(START)
  const [paused, setPausedState] = useState(false)
  const [hint, setHint] = useState(true)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [live, setLive] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const vaultRef = useRef<Vault | null>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const rmRef = useRef(false)
  const pausedRef = useRef(false)

  const announce = useCallback((i: number) => setLive(`Exhibit ${i + 1} of ${N}: ${projects[i].title}`), [N, projects])

  // reduced motion: no camera moves or power-on, and nothing plays until asked (Play, or Watch)
  useEffect(() => {
    if (reduced === undefined) return
    rmRef.current = reduced
    pausedRef.current = reduced
    setPausedState(reduced)
    vaultRef.current?.setReducedMotion(reduced)
    vaultRef.current?.setPaused(reduced)
  }, [reduced])

  // the engine, once the section nears
  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const videoHolder = holderRef.current
    if (!stage || !canvas || !videoHolder) return
    let gone = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        loadVault()
          .then(({ createVault }) => {
            if (gone) return
            const vault = createVault({
              stage,
              canvas,
              projects,
              media,
              videoHolder,
              reducedMotion: rmRef.current,
              onNear: setSel,
              onReady: () => setReady(true),
              onFail: () => setFailed(true),
              onAnnounce: announce,
              onInteract: () => setHint(false),
            })
            vault.setPaused(pausedRef.current)
            vaultRef.current = vault
          })
          .catch(() => setFailed(true))
      },
      { rootMargin: '800px 0px' },
    )
    io.observe(stage)
    return () => {
      gone = true
      io.disconnect()
      vaultRef.current?.destroy()
      vaultRef.current = null
    }
  }, [projects, media, announce])

  const go = (i: number) => {
    i = ((i % N) + N) % N
    setHint(false)
    if (vaultRef.current) vaultRef.current.go(i)
    else setSel(i)
  }
  const step = (dir: 1 | -1) => {
    setHint(false)
    if (vaultRef.current) return vaultRef.current.step(dir)
    const i = (sel + dir + N) % N
    setSel(i)
    announce(i)
  }
  const togglePaused = () => {
    const p = !paused
    pausedRef.current = p
    setPausedState(p)
    vaultRef.current?.setPaused(p)
  }
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = tabsRef.current.indexOf(document.activeElement as HTMLButtonElement)
    const cur = from >= 0 ? from : sel
    let i: number
    if (e.key === 'ArrowRight') i = (cur + 1) % N
    else if (e.key === 'ArrowLeft') i = (cur - 1 + N) % N
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = N - 1
    else return
    e.preventDefault()
    go(i)
    tabsRef.current[i]?.focus()
  }
  // sound effects only after a click in here: the context is made inside the click
  const armSound = () => vaultRef.current?.armSound()

  const front = projects[sel]
  const frontMedia = media[front.id]

  return (
    <div onClickCapture={armSound}>
      <div className={css.vault}>
        <div ref={stageRef} className={css.stage} data-ready={ready} data-failed={failed}>
          <canvas ref={canvasRef} className={css.canvas} aria-hidden="true" />
          {failed && (
            <div className={css.fallback}>
              <div className={css.screen} data-vault-screen="" data-tall={frontMedia.h > frontMedia.w}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a poster in a CSS screen, already sized by the encode */}
                <img src={frontMedia.poster} alt="" width={frontMedia.w} height={frontMedia.h} />
              </div>
            </div>
          )}
          <button type="button" className={`${css.btn} ${css.arrow} ${css.prev}`} aria-label="Previous exhibit" onClick={() => step(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" className={`${css.btn} ${css.arrow} ${css.next}`} aria-label="Next exhibit" onClick={() => step(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            className={`${css.btn} ${css.power}`}
            data-paused={paused}
            aria-label={paused ? 'Play the televisions' : 'Pause the televisions'}
            onClick={togglePaused}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path className={css.iPause} d="M9 6v12M15 6v12" />
              <path className={css.iPlay} d={PLAY_ICON} />
            </svg>
            <span className={css.powerLabel} aria-hidden="true">
              {paused ? 'Play' : 'Pause'}
            </span>
          </button>
          <p className={css.hint} aria-hidden="true" data-gone={!hint}>
            <span className={css.fine}>
              Drag to browse <span className={css.dot}>·</span> click a screen to watch
            </span>
            <span className={css.coarse}>
              Swipe to browse <span className={css.dot}>·</span> tap a screen to watch
            </span>
          </p>
          <div ref={holderRef} className={css.videos} aria-hidden="true" />
        </div>

        <div className={css.cards}>
          {projects.map((p, i) => {
            const name = p.short ?? p.title
            const internal = p.liveUrl?.startsWith('/') ?? false
            return (
              <div key={p.id} id={`pv-p-${p.id}`} className={css.card} role="tabpanel" aria-labelledby={`pv-t-${p.id}`} hidden={i !== sel}>
                <p className={css.meta}>
                  Exhibit {nn(i)} <span aria-hidden="true">·</span> Recovered from {p.year}
                </p>
                <h3 className={css.name}>{p.title}</h3>
                <p className={css.desc}>{p.description}</p>
                <p className={css.stack}>
                  <span className="sr-only">Built with: </span>
                  {p.techStack.map((t, k) => (
                    <span key={t}>
                      {k > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="sr-only">, </span>
                        </>
                      )}
                      {t}
                    </span>
                  ))}
                </p>
                <div className={css.acts}>
                  <button type="button" className={css.watch} onClick={() => vaultRef.current?.watch(i)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 4.5v15l12.5-7.5z" />
                    </svg>
                    Watch<span className="sr-only"> the {name} video</span>
                  </button>
                  {p.liveUrl && (
                    <a href={p.liveUrl} {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
                      Live
                      {!internal && <span className="sr-only"> (opens in a new tab)</span>}
                      &nbsp;<span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {p.repoUrl && (
                    <a href={p.repoUrl} target="_blank" rel="noopener noreferrer">
                      Code<span className="sr-only"> (opens in a new tab)</span>&nbsp;<span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
                <p className={css.set}>Displayed on {p.set}.</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className={css.tabs} role="tablist" aria-label="Exhibits" onKeyDown={onTabKey}>
        {projects.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              tabsRef.current[i] = el
            }}
            type="button"
            role="tab"
            id={`pv-t-${p.id}`}
            aria-selected={i === sel}
            aria-controls={`pv-p-${p.id}`}
            tabIndex={i === sel ? 0 : -1}
            onClick={() => go(i)}
          >
            <span className={css.n} aria-hidden="true">
              {nn(i)}
            </span>
            {p.short ?? p.title}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  )
}

export default ProjectsVault
