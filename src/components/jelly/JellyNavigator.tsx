'use client'

import { useEffect, useRef, type RefObject } from 'react'
import type { JellyEngine } from '@/lib/jelly/engine'
import { BTN, ON, PANEL } from '@/components/jelly/hudStyles'

interface JellyNavigatorProps {
  engine: JellyEngine
  loaded: boolean
  navMode: 'rotate' | 'pan'
  onNavMode: (m: 'rotate' | 'pan') => void
  rootRef: RefObject<HTMLDivElement | null>
}

/**
 * The navigator: a mini map of the page with the view box (click or drag it to jump,
 * scroll on it to zoom), the ✥ Pan / ⟳ Rotate toggle and − / Fit / +. The view box
 * follows the camera every frame by writing styles directly (no React state).
 */
const JellyNavigator = ({ engine, loaded, navMode, onNavMode, rootRef }: JellyNavigatorProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loaded && canvasRef.current) engine.drawMiniMap(canvasRef.current)
  }, [engine, loaded])

  useEffect(() => {
    let fit: boolean | null = null
    return engine.onFrame(() => {
      const root = rootRef.current, map = mapRef.current, view = viewRef.current
      if (!root || !map || !view) return
      const v = engine.navView()
      if (v.fit !== fit) { fit = v.fit; root.dataset.fit = String(fit) }
      if (fit) return
      const W = map.clientWidth, H = map.clientHeight
      view.style.left = v.left * W + 'px'
      view.style.top = v.top * H + 'px'
      view.style.width = v.width * W + 'px'
      view.style.height = v.height * H + 'px'
    })
  }, [engine, rootRef])

  // scroll on the map zooms (a native listener: React's wheel handlers are passive)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      engine.zoomBy(Math.exp(Math.max(-50, Math.min(50, e.deltaY)) * 0.01))
    }
    map.addEventListener('wheel', onWheel, { passive: false })
    return () => map.removeEventListener('wheel', onWheel)
  }, [engine])

  const drag = useRef(false)
  const navTo = (e: React.PointerEvent) => {
    const r = mapRef.current!.getBoundingClientRect()
    engine.navTo((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Page navigator"
      data-fit="true"
      className={`group ${PANEL} absolute right-16 top-2.5 z-[2] flex flex-col items-stretch gap-1.5 rounded-[10px] p-1.5 max-[820px]:right-2 max-[820px]:p-1`}
    >
      <div
        ref={mapRef}
        aria-hidden="true"
        className="relative w-[104px] cursor-pointer touch-none overflow-hidden rounded transition-[height,opacity] duration-[250ms] group-data-[fit=true]:!h-0 group-data-[fit=true]:opacity-0 max-[820px]:w-16"
        onPointerDown={(e) => { drag.current = true; try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} navTo(e) }}
        onPointerMove={(e) => { if (drag.current) navTo(e) }}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
      >
        <canvas ref={canvasRef} className="block h-auto w-full" />
        <div ref={viewRef} className="pointer-events-none absolute rounded-sm border-[1.5px] border-[#80eaff] bg-[rgba(128,234,255,0.12)] shadow-[0_0_10px_rgba(128,234,255,0.45)]" />
      </div>
      <div role="group" aria-label="Drag to" className="flex gap-1 max-[820px]:flex-col">
        {([['pan', '✥ Pan', 'Drag to move around the page'], ['rotate', '⟳ Rotate', 'Drag to rotate the page in 3D (the default; O switches)']] as const).map(([m, label, title]) => (
          <button
            key={m}
            type="button"
            aria-pressed={navMode === m}
            title={title}
            onClick={() => onNavMode(m)}
            className={`${BTN} min-h-[32px] flex-1 px-1.5 py-0.5 text-xs ${navMode === m ? ON : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 max-[820px]:hidden">
        <button type="button" aria-label="Zoom out (−)" onClick={() => engine.zoomBy(1 / 0.6)} className={`${BTN} min-w-[32px] flex-1 px-1.5 py-0.5 text-[15px]`}>−</button>
        <button type="button" aria-label="Show the whole page (0)" onClick={() => engine.resetView()} className={`${BTN} min-w-[32px] flex-1 px-1.5 py-0.5 text-[11px]`}>Fit</button>
        <button type="button" aria-label="Zoom in (+)" onClick={() => engine.zoomBy(0.6)} className={`${BTN} min-w-[32px] flex-1 px-1.5 py-0.5 text-[15px]`}>+</button>
      </div>
    </div>
  )
}

export default JellyNavigator
