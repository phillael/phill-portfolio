'use client'

/**
 * Dev only (never in a production build): sliders for the cast (Phill's orbit, the shrimp),
 * like the playground's sidebar. Open the resume with ?tune. Values stay in this browser;
 * "Copy" puts them on the clipboard as CAST_CONFIG for src/lib/jelly/config.ts.
 */

import { useEffect, useState } from 'react'
import { CAST_CONFIG, type CastConfig } from '@/lib/jelly/config'

type NumKey = { [K in keyof CastConfig]: CastConfig[K] extends number ? K : never }[keyof CastConfig]

const SLIDERS: [NumKey, string, number, number, number][] = [
  ['size', 'Phill size', 1, 8, 0.1],
  ['phoneScale', 'Phone: size ×', 0.2, 1.2, 0.05],
  ['phoneLift', 'Phone: height', -4, 4, 0.1],
  ['orbitX', 'Orbit width (past the page)', -2, 8, 0.1],
  ['orbitZ', 'Orbit depth', 0, 12, 0.1],
  ['tilt', 'Orbit tilt', -8, 8, 0.1],
  ['lift', 'Orbit height', -6, 6, 0.1],
  ['lap', 'Seconds per lap', 6, 120, 1],
  ['face', 'Faces you → faces travel', 0, 1, 0.05],
  ['bob', 'Bob', 0, 1.5, 0.05],
  ['danceRate', 'Dance speed', 0.25, 2.5, 0.05],
  ['ambient', 'Ambient light', 0, 1, 0.02],
  ['rim', 'Neon rim', 0, 2, 0.05],
  ['shrimp', 'Shrimp at once', 0, 4, 1],
  ['shrimpSize', 'Shrimp size', 0.5, 10, 0.1],
  ['shrimpGap', 'Seconds between shrimp', 1, 60, 1],
  ['shrimpSpeed', 'Shrimp speed', 0.1, 4, 0.05],
]

const KEY = 'jelly-cast-tune'

interface Dev {
  cast?: { params: CastConfig; kickAll: () => void; debug: () => { shrimp: { on: boolean; wait: number }[] } }
}

const dev = () => (window as unknown as { __jelly?: Dev }).__jelly?.cast

const JellyCastTune = () => {
  const [on, setOn] = useState(false)
  const [vals, setVals] = useState<CastConfig>({ ...CAST_CONFIG })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('tune')) return
    let saved: Partial<CastConfig> = {}
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}
    const t = setInterval(() => {
      const c = dev()
      if (!c) return
      clearInterval(t)
      Object.assign(c.params, saved)
      setVals({ ...c.params })
      setOn(true)
    }, 300)
    return () => clearInterval(t)
  }, [])

  if (!on) return null

  const set = (k: NumKey, v: number) => {
    const c = dev()
    if (!c) return
    c.params[k] = v
    const next = { ...c.params }
    setVals(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  const reset = () => {
    const c = dev()
    if (!c) return
    Object.assign(c.params, CAST_CONFIG)
    setVals({ ...c.params })
    try { localStorage.removeItem(KEY) } catch {}
  }

  const copy = () => {
    const body = Object.entries(vals).map(([k, v]) => `${k}: ${typeof v === 'number' ? +v.toFixed(3) : v}`).join(', ')
    navigator.clipboard?.writeText(`{ ${body} }`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) })
  }

  const shrimpNow = () => dev()?.debug().shrimp.forEach((s) => { if (!s.on) s.wait = 0 })

  return (
    <div className="absolute left-3 top-[132px] z-[4] max-h-[calc(100vh-240px)] w-[250px] overflow-y-auto rounded-xl border border-[rgba(128,234,255,0.35)] bg-[rgba(5,8,18,0.86)] p-3 text-[12px] text-[#d7deea]">
      <div className="mb-2 flex items-center justify-between font-semibold text-[#80eaff]">
        <span>Cast (dev)</span>
        <span className="flex gap-1">
          <button type="button" className="rounded border border-[#80eaff55] px-1.5" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" className="rounded border border-[#80eaff55] px-1.5" onClick={reset}>Reset</button>
        </span>
      </div>
      {SLIDERS.map(([k, label, min, max, step]) => (
        <label key={k} className="mb-1.5 block">
          <span className="flex justify-between"><span>{label}</span><span className="tabular-nums text-[#80eaff]">{+vals[k].toFixed(2)}</span></span>
          <input type="range" min={min} max={max} step={step} value={vals[k]} onChange={(e) => set(k, +e.target.value)} className="w-full accent-[#80eaff]" />
        </label>
      ))}
      <div className="mt-2 flex gap-2">
        <button type="button" className="rounded border border-[#80eaff55] px-2 py-1" onClick={() => dev()?.kickAll()}>Knock all</button>
        <button type="button" className="rounded border border-[#80eaff55] px-2 py-1" onClick={shrimpNow}>Shrimp now</button>
      </div>
    </div>
  )
}

export default JellyCastTune
