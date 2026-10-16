'use client'

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { CareerTile } from '@/data/career'
import { richText } from '@/data/resume'
import css from './HighlightTile.module.css'
import { FINE_POINTER, REDUCED_MOTION, matches } from './motion'

const COUNT_MS = 1300
/** the reveal (fade, scan, flicker) starts at 12% in view, the count-up at 40% (as in the mockup) */
const REVEAL_AT = 0.12
const COUNT_AT = 0.4

/** "~5 wks" → { value: "~5", unit: "wks" }: the unit is set small next to the number */
export function splitMetric(metric: string) {
  const m = /^(.*?)(?:\s+([a-z]+))?$/.exec(metric)!
  return { value: m[1], unit: m[2] as string | undefined }
}

/** The count-up's text at progress k (0–1, eased), keeping prefix, suffix and thousands separators; null if no number */
export function countFrame(final: string, k: number): string | null {
  const m = /^([^\d]*)([\d.,]+)(.*)$/.exec(final)
  if (!m) return null
  const [, pre, raw, post] = m
  if (k >= 1) return final
  const num = raw.replace(/,/g, '')
  const to = parseFloat(num)
  const decimals = (num.split('.')[1] || '').length
  const v = to * (1 - Math.pow(1 - k, 3))
  return pre + (raw.includes(',') ? Math.round(v).toLocaleString('en-US') : v.toFixed(decimals)) + post
}

interface HighlightTileProps {
  tile: CareerTile
  /** the first tile: spans the row on wide screens, number on the left */
  wide?: boolean
  /** reveal stagger, ms */
  delay?: number
  /** grid placement from the parent */
  className?: string
}

/**
 * HighlightTile - one TimelyCare highlight (mockup E2's HUD tile): a glass panel whose button
 * opens one sentence of detail. Effects: the number counts up once in view (written into
 * React's own text node in rAF), a scan sweep and power-on flicker on reveal, a cursor
 * spotlight and tilt for fine pointers (CSS custom properties written in rAF), and a tap pulse
 * on touch. Reduced motion: no count-up, tilt, scan, flicker or pulse; shown at once.
 * Imperative state lives in data-* attributes (data-armed, data-in, data-tilt) so React's
 * re-renders never undo it.
 */
export default function HighlightTile({ tile, wide = false, delay = 0, className }: HighlightTileProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const tapRef = useRef<HTMLSpanElement>(null)
  const id = useId()
  const ids = { title: `${id}t`, metric: `${id}m`, label: `${id}l`, stack: `${id}s`, detail: `${id}d` }
  const { value, unit } = splitMetric(tile.metric)

  // Reveal + count-up, once, when the tile scrolls into view
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (matches(REDUCED_MOTION) || typeof IntersectionObserver === 'undefined') {
      el.dataset.in = ''
      return
    }
    el.dataset.armed = ''
    const text = countRef.current?.firstChild
    let raf = 0
    let timer = 0
    let counted = false
    const count = () => {
      if (!(text instanceof Text)) return
      const t0 = performance.now()
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / COUNT_MS)
        text.nodeValue = countFrame(value, k) ?? value
        raf = k < 1 ? requestAnimationFrame(tick) : 0
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          if (e.intersectionRatio >= REVEAL_AT - 0.01) el.dataset.in = ''
          if (!counted && e.intersectionRatio >= COUNT_AT - 0.01) {
            counted = true
            if (delay) timer = window.setTimeout(count, delay)
            else count()
          }
          if (counted && 'in' in el.dataset) io.disconnect()
        }
      },
      { threshold: [REVEAL_AT, COUNT_AT] },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      if (text instanceof Text) text.nodeValue = value // leave React's text as React rendered it
    }
  }, [value, delay])

  // Spotlight + tilt (fine pointers), tap pulse (touch)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let raf = 0
    let px = 0
    let py = 0
    let rect: DOMRect | null = null
    const forgetRect = () => (rect = null)
    const apply = () => {
      raf = 0
      if (!rect) return
      const x = (px - rect.left) / rect.width
      const y = (py - rect.top) / rect.height
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
      if (!matches(REDUCED_MOTION)) {
        el.style.setProperty('--ry', `${((x - 0.5) * 6).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${((0.5 - y) * 5).toFixed(2)}deg`)
      }
    }
    // the rect is read in the event (never in rAF), once per hover and again after a scroll
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !('in' in el.dataset)) return
      if (!rect) rect = el.getBoundingClientRect()
      px = e.clientX
      py = e.clientY
      el.dataset.tilt = 'on'
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') window.addEventListener('scroll', forgetRect, { passive: true })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      raf = 0
      rect = null
      window.removeEventListener('scroll', forgetRect)
      if (el.dataset.tilt !== 'on') return
      el.dataset.tilt = 'off'
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    const onDown = (e: PointerEvent) => {
      const tap = tapRef.current
      if (e.pointerType === 'mouse' || !tap?.animate || matches(REDUCED_MOTION)) return
      const r = el.getBoundingClientRect()
      tap.style.left = `${e.clientX - r.left}px`
      tap.style.top = `${e.clientY - r.top}px`
      tap.animate(
        [
          { transform: 'scale(0)', opacity: 1 },
          { transform: 'scale(55)', opacity: 0 },
        ],
        { duration: 750, easing: 'cubic-bezier(.2, .7, .2, 1)' },
      )
    }
    const fine = matches(FINE_POINTER)
    if (fine) {
      el.addEventListener('pointerenter', onEnter)
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
    }
    el.addEventListener('pointerdown', onDown)
    return () => {
      onLeave()
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onDown)
    }
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Escape' || !open) return
    e.stopPropagation() // the tile's Escape; not also shroom mode's
    setOpen(false)
    buttonRef.current?.focus()
  }

  const cls = [css.tile, wide && css.wide, open && css.open, className].filter(Boolean).join(' ')
  return (
    <div ref={rootRef} className={cls} style={{ '--d': `${delay}ms` } as CSSProperties}>
      <span className={css.sweep} aria-hidden="true" />
      <span className={css.fx} aria-hidden="true">
        <span className={css.fxClip}>
          <span className={css.scan} />
          <span className={css.sheen} />
          <span ref={tapRef} className={css.tap} />
        </span>
        <span className={css.spot} />
        <span className={css.frame}>
          <i />
        </span>
      </span>
      <button
        ref={buttonRef}
        type="button"
        className={css.btn}
        aria-expanded={open}
        aria-controls={ids.detail}
        aria-labelledby={ids.title}
        aria-describedby={`${ids.metric} ${ids.label} ${ids.stack}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={css.plus} aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5.5 2.35" />
          </svg>
        </span>
        <span className={css.name}>{tile.name}</span>
        <span className={css.metric}>
          <span className={css.num} aria-hidden="true">
            <span ref={countRef} data-count="">
              {value}
            </span>
            {unit && <span className={css.unit}>{unit}</span>}
          </span>
          <span id={ids.metric} className="sr-only">
            {tile.metric}
          </span>
          <span id={ids.label} className={css.numLabel}>
            {tile.metricLabel}
          </span>
        </span>
        <span id={ids.title} className={css.title}>
          {tile.title}
        </span>
        <span id={ids.stack} className={css.stack}>
          <span className="sr-only">Built with: </span>
          {tile.stack.map((tech, i) => (
            <Fragment key={tech}>
              {i > 0 && (
                <>
                  {' '}
                  <span className={css.dot} aria-hidden="true">
                    ·
                  </span>{' '}
                </>
              )}
              <span className={css.tech}>{tech}</span>
            </Fragment>
          ))}
        </span>
      </button>
      <div id={ids.detail} className={css.detail}>
        <div>
          <p>
            {richText(tile.detail).map((run, i) => (run.bold ? <strong key={i}>{run.text}</strong> : <Fragment key={i}>{run.text}</Fragment>))}
          </p>
        </div>
      </div>
    </div>
  )
}
