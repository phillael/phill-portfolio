'use client'

/**
 * Dev only (never in a production build): sliders for Play mode (his size, run, jump, smash,
 * camera and the jelly), shown while playing with ?tune. Values stay in this browser; "Copy"
 * puts them on the clipboard as PLAY_CONFIG for src/lib/jelly/config.ts.
 */

import { useEffect, useState } from 'react'
import { PLAY_CONFIG, type PlayConfig } from '@/lib/jelly/config'

type NumKey = { [K in keyof PlayConfig]: PlayConfig[K] extends number ? K : never }[keyof PlayConfig]

const SLIDERS: [NumKey, string, number, number, number][] = [
  ['size', 'His height (units)', 0.2, 1.5, 0.05],
  ['runSpeed', 'Run speed', 0.5, 8, 0.1],
  ['accel', 'Acceleration', 2, 60, 1],
  ['decel', 'Braking', 2, 60, 1],
  ['air', 'Air control', 0, 1, 0.05],
  ['jumpHeight', 'Jump height (held)', 0.2, 3, 0.05],
  ['tapHeight', 'Jump height (tapped)', 0.1, 2, 0.05],
  ['apexTime', 'Seconds to the apex', 0.15, 0.8, 0.01],
  ['fallMul', 'Falling gravity ×', 1, 4, 0.05],
  ['maxFall', 'Top fall speed', 2, 20, 0.5],
  ['coyote', 'Coyote time (s)', 0, 0.3, 0.01],
  ['buffer', 'Jump buffer (s)', 0, 0.3, 0.01],
  ['dropTime', 'Drop-through (s)', 0.05, 0.6, 0.01],
  ['poundSpeed', 'Ground-pound speed', 2, 25, 0.5],
  ['reach', 'Smash reach', 0.1, 1.5, 0.02],
  ['hit', 'Smash hit frame (s)', 0, 2.87, 0.01],
  ['smashCooldown', 'Smash cooldown (s)', 0, 1, 0.02],
  ['hitStop', 'Hit-stop (s)', 0, 0.2, 0.005],
  ['shake', 'Camera shake', 0, 1, 0.01],
  ['pxDesktop', 'On screen, desktop (px)', 40, 200, 1],
  ['pxPhone', 'On screen, phone (px)', 30, 150, 1],
  ['lookAhead', 'Camera lead', 0, 2, 0.05],
  ['tilt', 'Camera tilt', -0.3, 0.6, 0.01],
  ['lean', 'Camera lean', 0, 0.4, 0.01],
  ['squash', 'Landing squash', 0, 0.5, 0.01],
  ['weight', 'Standing weight', 0, 3, 0.05],
  ['wake', 'Wake through lines', 0, 4, 0.05],
  ['face', 'Turned toward you (rad)', 0, 1.2, 0.05],
  ['sink', 'Soles into the text', -0.05, 0.08, 0.002],
  ['idleDance', 'Still before he dances (s)', 0.5, 6, 0.1],
  ['runRate', 'Walk clip rate at full speed', 0.5, 3, 0.05],
]

const KEY = 'jelly-play-tune'

interface Dev {
  play?: { params: PlayConfig; state: () => { x: number; y: number; line: number; clip: string | null } | null }
}

const dev = () => (window as unknown as { __jelly?: Dev }).__jelly?.play

const JellyPlayTune = () => {
  const [on, setOn] = useState(false)
  const [vals, setVals] = useState<PlayConfig>({ ...PLAY_CONFIG })
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState('')

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('tune')) return
    let saved: Partial<PlayConfig> = {}
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}
    const p = dev()
    if (!p) return
    Object.assign(p.params, saved)
    setVals({ ...p.params })
    setOn(true)
  }, [])

  // where he is, a few times a second (a dev panel; never per frame)
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => {
      const s = dev()?.state()
      setNow(s ? `line ${s.line} · ${s.clip ?? ''} · (${s.x.toFixed(2)}, ${s.y.toFixed(2)})` : '')
    }, 400)
    return () => clearInterval(t)
  }, [on])

  if (!on) return null

  const save = (next: PlayConfig) => {
    setVals(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }
  const set = (k: NumKey, v: number) => {
    const p = dev()
    if (!p) return
    p.params[k] = v
    save({ ...p.params })
  }
  const setStrike = (i: 0 | 1, v: number) => {
    const p = dev()
    if (!p) return
    const s: [number, number] = [p.params.strike[0], p.params.strike[1]]
    s[i] = v
    p.params.strike = s
    save({ ...p.params })
  }
  const reset = () => {
    const p = dev()
    if (!p) return
    Object.assign(p.params, PLAY_CONFIG)
    setVals({ ...p.params })
    try { localStorage.removeItem(KEY) } catch {}
  }
  const copy = () => {
    const body = Object.entries(vals)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.map((x) => +(+x).toFixed(3)).join(', ')}] as const` : +(+v).toFixed(3)}`)
      .join(', ')
    navigator.clipboard?.writeText(`{ ${body} }`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) })
  }

  const slider = (key: string, label: string, v: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <label key={key} className="mb-1.5 block">
      <span className="flex justify-between"><span>{label}</span><span className="tabular-nums text-[#80eaff]">{+v.toFixed(3)}</span></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[#80eaff]" />
    </label>
  )

  return (
    <div className="absolute bottom-[100px] right-3 z-[4] max-h-[calc(100vh-180px)] w-[250px] overflow-y-auto rounded-xl border border-[rgba(128,234,255,0.35)] bg-[rgba(5,8,18,0.86)] p-3 text-[12px] text-[#d7deea]">
      <div className="mb-2 flex items-center justify-between font-semibold text-[#80eaff]">
        <span>Play (dev)</span>
        <span className="flex gap-1">
          <button type="button" className="rounded border border-[#80eaff55] px-1.5" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" className="rounded border border-[#80eaff55] px-1.5" onClick={reset}>Reset</button>
        </span>
      </div>
      <p className="mb-2 text-[11px] text-[#8a93a6]">{now || '…'}</p>
      {SLIDERS.map(([k, label, min, max, step]) => slider(k, label, vals[k], min, max, step, (v) => set(k, v)))}
      {slider('strikeA', 'Smash strike from (s)', vals.strike[0], 0, 2.87, 0.01, (v) => setStrike(0, v))}
      {slider('strikeB', 'Smash strike to (s)', vals.strike[1], 0, 2.87, 0.01, (v) => setStrike(1, v))}
    </div>
  )
}

export default JellyPlayTune
