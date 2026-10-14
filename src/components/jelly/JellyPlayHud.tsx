'use client'

/**
 * Play mode's HUD (mounted while playing): the stats (time, Impact coins, best), the climb
 * meter down the right edge, the key legend, the checkpoint toast and flags, the "+1 IMPACT"
 * pops, ✕ Exit, the finish card and a polite live region. Everything that moves per frame is
 * written through refs in engine.onFrame (text ≤ 10×/s); React state changes only on Play's events.
 */

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { JellyEngine } from '@/lib/jelly/engine'
import type { PlayEvent } from '@/lib/jelly/play'
import type { RunResult } from '@/lib/jelly/playRun'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { BTN, FOCUS, KEY, PANEL, PLAY_BTN } from '@/components/jelly/hudStyles'
import { RESUME_PDF } from '@/components/jelly/JellyHudBar'

/** 0:24.6 (— when there's none) */
export const fmtTime = (ms: number | null | undefined) => {
  if (ms == null) return '—'
  const t = Math.max(0, ms) / 1000, m = Math.floor(t / 60)
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`
}

/** the climb meter: full (labels), slim (phones: ticks and the current era), or none (short screens) */
export const meterMode = (short: boolean, narrow: boolean) => (short ? 'none' : narrow ? 'slim' : 'full')

const KBD = 'inline-block min-w-[20px] rounded border border-[#39425a] border-b-2 bg-[#151a26] px-[5px] text-center text-[11px] font-semibold leading-4 text-[#d7deea]'
const TOAST_MS = 2500
const POP_MS = 900
const ANNOUNCE_COINS_MS = 1500

interface Toast { key: number; year: number; title: string }
interface Pop { key: number; x: number; y: number }
interface Flag { key: number; at: [number, number, number] }

interface JellyPlayHudProps {
  engine: JellyEngine
  /** the stats (top) and the legend (bottom): the camera keeps the page between them */
  topRef: RefObject<HTMLDivElement | null>
  bottomRef: RefObject<HTMLDivElement | null>
}

const JellyPlayHud = ({ engine, topRef, bottomRef }: JellyPlayHudProps) => {
  const short = useMediaQuery('(max-height: 559px)')
  const narrow = useMediaQuery('(max-width: 820px)')
  const mode = meterMode(!!short, !!narrow)
  const [toast, setToast] = useState<Toast | null>(null)
  const [pops, setPops] = useState<Pop[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [message, setMessage] = useState('')
  const timeRef = useRef<HTMLSpanElement>(null)
  const coinsRef = useRef<HTMLSpanElement>(null)
  const yearRef = useRef<HTMLSpanElement>(null)
  const bestRef = useRef<HTMLDivElement>(null)
  const flagEls = useRef(new Map<number, HTMLDivElement>())

  // Play's events: the toast, flags, pops, the finish card and the announcements (no per-frame state)
  useEffect(() => {
    let key = 0, lastCoinSay = -Infinity
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const later = (f: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); f() }, ms); timers.add(t) }
    setMessage('Play mode. Run with the arrow keys or A and D, jump with W or up, drop with down, smash with Space. Escape leaves.')
    const off = engine.play.onEvent((e: PlayEvent) => {
      if (e.type === 'checkpoint') {
        const k = ++key
        setToast({ key: k, year: e.year, title: e.title })
        later(() => setToast((t) => (t?.key === k ? null : t)), TOAST_MS)
        setFlags((f) => [...f, { key: k, at: e.at }])
        setMessage(`Checkpoint: ${e.year}, ${e.title}`)
      } else if (e.type === 'coin') {
        const at = engine.project(e.at), k = ++key
        if (at) {
          setPops((p) => [...p, { key: k, x: at[0], y: at[1] }])
          later(() => setPops((p) => p.filter((q) => q.key !== k)), POP_MS)
        }
        const now = performance.now()
        if (now - lastCoinSay > ANNOUNCE_COINS_MS || e.coins === e.total) {
          lastCoinSay = now
          setMessage(`Impact ${e.coins} of ${e.total}`)
        }
      } else if (e.type === 'finish') {
        setResult(e.result)
        const r = e.result
        setMessage(`The end. Your time: ${fmtTime(r.timeMs)}. Impact ${r.coins} of ${r.total}. Best ${fmtTime(r.bestMs)}.${r.newBest ? ' A new best!' : ''}`)
      } else if (e.type === 'again') {
        setResult(null)
        setFlags([])
        setToast(null)
        setMessage('Play again: back at the top.')
      }
    })
    return () => {
      off()
      timers.forEach(clearTimeout)
    }
  }, [engine])

  // the stats' text (≤ 10×/s) and the flags (each frame), through refs
  useEffect(() => {
    let last = -Infinity, lastText = ''
    return engine.onFrame(() => {
      for (const f of flagEls.current) {
        const flag = flags.find((g) => g.key === f[0]), p = flag && engine.project(flag.at)
        if (p) f[1].style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`
      }
      const now = performance.now()
      if (now - last < 100) return
      last = now
      const s = engine.play.state()
      if (!s) return
      const info = engine.play.levelInfo()
      const era = s.checkpoint >= 0 && info ? String(info.checkpoints[s.checkpoint].year) : ''
      const text = `${fmtTime(s.timeMs)}|${s.coins}/${s.total}|${era}|${fmtTime(s.bestMs)}|${s.finished}`
      if (text === lastText) return
      lastText = text
      if (timeRef.current) {
        timeRef.current.textContent = `⏱ ${fmtTime(s.timeMs)}`
        timeRef.current.style.color = s.finished ? '#00ff2b' : ''
      }
      if (coinsRef.current) coinsRef.current.textContent = `✦ ${s.coins}/${s.total}`
      if (yearRef.current) yearRef.current.textContent = era
      if (bestRef.current) bestRef.current.textContent = `BEST ${fmtTime(s.bestMs)}`
    })
  }, [engine, flags])

  const leave = () => engine.play.exit()

  return (
    <>
      {/* stats: time and Impact, the best under them (on phones one 44 px row; short screens add the year) */}
      <div
        ref={topRef}
        className={`${PANEL} pointer-events-none absolute left-3 top-2.5 z-[3] flex flex-col gap-[5px] rounded-[10px] px-3 pb-[7px] pt-2 max-[820px]:left-2 max-[820px]:top-2 max-[820px]:h-11 max-[820px]:justify-center max-[820px]:py-0`}
      >
        <div className="flex items-center gap-4 font-pixel text-[14px] leading-none max-[820px]:gap-3 max-[820px]:text-[11px]">
          <span ref={timeRef}>⏱ 0:00.0</span>
          <span className="text-[#00ff2b] [text-shadow:0_0_8px_rgba(0,255,43,0.55)]">
            <span ref={coinsRef}>✦ 0/27</span>
            <small className="ml-1 text-[9px] text-[#7fd98e] [text-shadow:none] max-[820px]:hidden">IMPACT</small>
          </span>
          <span ref={yearRef} className="hidden text-[11px] text-[#80eaff] [@media(max-height:559px)]:inline" />
        </div>
        <div ref={bestRef} className="font-pixel text-[9px] tracking-[0.5px] text-[#7c8798] max-[820px]:hidden">BEST —</div>
      </div>

      <button
        type="button"
        onClick={leave}
        aria-label="Leave Play mode (Esc)"
        title="Leave Play (Esc)"
        className={`${PANEL} absolute right-3 top-2.5 z-[3] inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-[#d7deea] hover:border-[#80eaff] hover:text-[#80eaff] max-[820px]:right-2 max-[820px]:top-2 ${FOCUS}`}
      >
        <span aria-hidden="true" className="text-[18px] leading-none">✕</span> Exit<span className={`${KEY} font-normal text-[#7c8798]`}> (Esc)</span>
      </button>

      {mode !== 'none' && <ClimbMeter engine={engine} slim={mode === 'slim'} />}

      {/* the keys, always up (desktop) */}
      <div
        ref={bottomRef}
        className={`${PANEL} pointer-events-none absolute bottom-3.5 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-3.5 whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] text-[#b9c6da] [@media(pointer:coarse)]:hidden`}
      >
        <span><kbd className={KBD}>←</kbd> <kbd className={KBD}>→</kbd> run</span>
        <span aria-hidden="true" className="text-[#3a4356]">·</span>
        <span><kbd className={KBD}>W</kbd> / <kbd className={KBD}>↑</kbd> jump</span>
        <span aria-hidden="true" className="text-[#3a4356]">·</span>
        <span><kbd className={KBD}>↓</kbd> drop <span className="text-[#7c8798]">(in the air: pound)</span></span>
        <span aria-hidden="true" className="text-[#3a4356]">·</span>
        <span><kbd className={KBD}>Space</kbd> smash</span>
        <span aria-hidden="true" className="text-[#3a4356]">·</span>
        <span><kbd className={KBD}>Esc</kbd> exit</span>
      </div>

      {toast && (
        <div
          aria-hidden="true"
          className={`${PANEL} pointer-events-none absolute left-1/2 top-3 z-[3] flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-[10px] border-[rgba(128,234,255,0.55)] px-3.5 py-2 shadow-[0_0_18px_rgba(128,234,255,0.25)] max-[820px]:top-[60px]`}
        >
          <span className="rounded bg-[#00ff2b] px-1.5 py-1 font-pixel text-[9px] leading-none text-[#0b0d12]"><span className="font-body text-[10px] font-extrabold">✓</span> CHECKPOINT</span>
          <span className="text-[13px]"><b className="mr-1.5 font-pixel text-[11px] font-normal text-[#80eaff]">{toast.year}</b>{toast.title}</span>
        </div>
      )}

      {flags.map((f) => (
        <div
          key={f.key}
          ref={(el) => { if (el) flagEls.current.set(f.key, el); else flagEls.current.delete(f.key) }}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-[2]"
          style={{ transform: 'translate(-999px, -999px)' }}
        >
          <svg width="16" height="24" viewBox="0 0 16 24" className="-translate-y-full overflow-visible drop-shadow-[0_0_4px_rgba(128,234,255,0.9)]">
            <line x1="1" y1="24" x2="1" y2="2" stroke="#5d6879" strokeWidth="1.6" />
            <path d="M1 2 L14 6.5 L1 11 Z" fill="#80eaff" />
          </svg>
        </div>
      ))}

      {pops.map((p) => (
        <div
          key={p.key}
          aria-hidden="true"
          className="jelly-pop pointer-events-none absolute z-[3] whitespace-nowrap rounded-[3px] border border-[rgba(0,255,43,0.6)] bg-[rgba(8,10,16,0.82)] px-2 pb-1 pt-1.5 font-pixel text-[12px] leading-none text-[#00ff2b] [text-shadow:0_0_4px_rgba(0,255,43,0.9)]"
          style={{ left: p.x, top: p.y }}
        >
          +1 IMPACT
        </div>
      ))}

      {result && <FinishCard result={result} onAgain={() => engine.play.again()} onLeave={leave} />}

      <p className="sr-only" aria-live="polite">{message}</p>
    </>
  )
}

/** The run's end: THE END, the time, Impact and best, and what next (focus on Play again) */
const FinishCard = ({ result, onAgain, onLeave }: { result: RunResult; onAgain: () => void; onLeave: () => void }) => {
  const again = useRef<HTMLButtonElement>(null)
  useEffect(() => { again.current?.focus({ preventScroll: true }) }, [])
  const cell = 'rounded-lg border border-[#1e2431] bg-[rgba(18,22,33,0.7)] px-1 pb-2 pt-[9px]'
  return (
    <div
      role="dialog"
      aria-label="The end"
      className={`${PANEL} absolute right-[90px] top-1/2 z-[4] w-[380px] -translate-y-1/2 rounded-[14px] border-[rgba(128,234,255,0.5)] bg-[rgba(8,10,16,0.82)] px-[22px] pb-[18px] pt-5 text-center shadow-[0_0_40px_rgba(128,234,255,0.18),0_20px_60px_rgba(0,0,0,0.5)] max-[820px]:left-4 max-[820px]:right-4 max-[820px]:top-[62%] max-[820px]:w-auto`}
    >
      <h3 className="m-0 font-heading text-[30px] leading-[1.1] tracking-[2px] text-[#80eaff] [text-shadow:0_0_16px_rgba(128,234,255,0.6)]">THE END</h3>
      <p className="mb-3.5 mt-1.5 text-[13.5px] text-[#b9c6da]">Now → 1998. You read the whole career.</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className={cell}><div className="font-pixel text-[8px] tracking-[0.5px] text-[#7c8798]">TIME</div><div className="mt-2 font-pixel text-[14px] leading-none">{fmtTime(result.timeMs)}</div></div>
        <div className={cell}><div className="font-pixel text-[8px] tracking-[0.5px] text-[#7c8798]">IMPACT</div><div className="mt-2 font-pixel text-[14px] leading-none text-[#00ff2b] [text-shadow:0_0_8px_rgba(0,255,43,0.5)]">{result.coins}/{result.total}</div></div>
        <div className={cell}>
          <div className="font-pixel text-[8px] tracking-[0.5px] text-[#7c8798]">BEST</div>
          <div className="mt-2 font-pixel text-[14px] leading-none">{fmtTime(result.bestMs)}</div>
          {result.newBest && <div className="mt-1.5 inline-block rounded-[3px] bg-[#00ff2b] px-[5px] py-[3px] font-pixel text-[7px] leading-none text-[#0b0d12]">NEW BEST!</div>}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-[820px]:flex-col">
        <button ref={again} type="button" onClick={onAgain} aria-keyshortcuts="Enter" className={`${PLAY_BTN} flex-auto`}>
          <span aria-hidden="true">↻</span> Play again<span className={KEY}> (Enter)</span>
        </button>
        <a href={RESUME_PDF} download="Phillip_Aelony_Resume.pdf" className={`${BTN} flex-auto`}>
          <span aria-hidden="true">⤓</span> Resume PDF
        </a>
        <button type="button" onClick={onLeave} aria-keyshortcuts="Escape" className={`${BTN} flex-auto`}>
          Back to the resume<span className={KEY}> (Esc)</span>
        </button>
      </div>
    </div>
  )
}

/**
 * Down the right edge: the page from NOW (the name) at the top to 1998 at the bottom, a tick at each
 * checkpoint at its true height (labels nudged apart where they crowd), lit once reached, and a marker
 * at his height. Decoration (aria-hidden): the live region announces the checkpoints.
 */
const ClimbMeter = ({ engine, slim }: { engine: JellyEngine; slim: boolean }) => {
  const box = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  const era = useRef<HTMLDivElement>(null)
  const tickEls = useRef<(HTMLDivElement | null)[]>([])
  const labelEls = useRef<(HTMLDivElement | null)[]>([])
  const [h, setH] = useState(0)
  const info = engine.play.levelInfo()

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.clientHeight))
    ro.observe(el)
    setH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const at = (y: number) => (info ? Math.max(0, Math.min(1, (info.top - y) / (info.top - info.bottom))) * h : 0)
  // NOW at the top, then the checkpoints; labels nudged apart, from the bottom up
  const ticks = info ? [{ year: 'NOW', y: info.top }, ...info.checkpoints.map((c) => ({ year: String(c.year), y: c.y }))] : []
  const labelY: number[] = []
  let last = Infinity
  for (let i = ticks.length - 1; i >= 0; i--) { labelY[i] = Math.min(at(ticks[i].y), last - 11); last = labelY[i] }

  useEffect(() => {
    let lastLit = -2
    return engine.onFrame(() => {
      const s = engine.play.state()
      if (!s || !info) return
      const y = at(s.y)
      if (marker.current) marker.current.style.top = `${y.toFixed(1)}px`
      if (fill.current) fill.current.style.height = `${y.toFixed(1)}px`
      if (era.current) era.current.style.top = `${y.toFixed(1)}px`
      if (s.checkpoint === lastLit) return
      lastLit = s.checkpoint
      ticks.forEach((_, i) => {
        const on = i === 0 || i - 1 <= s.checkpoint
        tickEls.current[i]?.toggleAttribute('data-on', on)
        labelEls.current[i]?.toggleAttribute('data-on', on)
      })
      if (era.current) era.current.textContent = s.checkpoint >= 0 ? ticks[s.checkpoint + 1].year : 'NOW'
    })
  })

  return (
    <div
      ref={box}
      aria-hidden="true"
      data-mode={slim ? 'slim' : 'full'}
      className={`pointer-events-none absolute z-[3] ${slim ? 'bottom-[206px] right-1.5 top-[70px] w-5' : 'bottom-[104px] right-2.5 top-[76px] w-[54px]'}`}
    >
      <div className={`${PANEL} absolute -bottom-3 -top-3 rounded-[10px] ${slim ? 'left-0 right-0' : '-left-1 -right-0.5'}`} />
      <div className="absolute bottom-0 right-2 top-0 w-1 rounded-sm bg-[rgba(124,135,152,0.35)]" />
      <div ref={fill} className="absolute right-2 top-0 h-0 w-1 rounded-sm bg-[#80eaff] shadow-[0_0_8px_#80eaff]" />
      {ticks.map((t, i) => (
        <div key={t.year + i}>
          <div
            ref={(el) => { tickEls.current[i] = el }}
            className="absolute right-[5px] h-0.5 w-2.5 bg-[#5d6879] data-[on]:bg-[#80eaff] data-[on]:shadow-[0_0_6px_#80eaff]"
            style={{ top: at(t.y) - 1 }}
          />
          {!slim && (
            <div
              ref={(el) => { labelEls.current[i] = el }}
              className="absolute right-5 -translate-y-1/2 whitespace-nowrap font-pixel text-[8px] leading-none text-[#7c8798] data-[on]:text-[#80eaff]"
              style={{ top: labelY[i] }}
            >
              {t.year}
            </div>
          )}
        </div>
      ))}
      {slim && (
        <div ref={era} className="absolute right-[22px] -translate-y-1/2 whitespace-nowrap rounded bg-[rgba(8,10,16,0.7)] px-1 py-[3px] font-pixel text-[8px] leading-none text-[#80eaff]">
          NOW
        </div>
      )}
      <div
        ref={marker}
        className="absolute right-px grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full border-2 border-[#80eaff] bg-[#0b0e16] text-[9px] text-[#80eaff] shadow-[0_0_10px_#80eaff]"
        style={{ top: 0 }}
      >
        ▼
      </div>
    </div>
  )
}

export default JellyPlayHud
