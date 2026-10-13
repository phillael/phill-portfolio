'use client'

import { useEffect, useRef } from 'react'
import { createJellyEngine } from '@/lib/jelly/engine'
import { loadSnapshot } from '@/lib/jelly/snapshot'

interface JellyResumeCanvasProps {
  /** run the Finder once the page lands (/resume?find=React) */
  find?: string | null
}

/**
 * The 3D Jelly Resume: one WebGL2 canvas over the semantic resume, which stays in the
 * DOM as the accessible content (the canvas is aria-hidden). Mounts the engine, loads
 * the snapshot and plays the direct-visit entrance: a quick galaxy intro.
 * Load it with next/dynamic ({ ssr: false }); it's the engine's whole chunk.
 */
const JellyResumeCanvas = ({ find = null }: JellyResumeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let engine: ReturnType<typeof createJellyEngine>
    try {
      engine = createJellyEngine({ canvas })
    } catch (err) {
      console.error('The 3D resume needs WebGL2', err)
      return
    }
    let alive = true
    engine.openDirect(find)
    loadSnapshot()
      .then((loaded) => alive && engine.load(loaded))
      .catch((err) => console.error('The resume failed to load', err))
    return () => {
      alive = false
      engine.dispose()
    }
  }, [find])

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-50 block h-full w-full touch-none" />
}

export default JellyResumeCanvas
