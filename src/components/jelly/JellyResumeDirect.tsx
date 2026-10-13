'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// The engine's chunk: only fetched when this mounts (never for reduced motion)
const JellyResumeCanvas = dynamic(() => import('@/components/jelly/JellyResumeCanvas'), { ssr: false })

/**
 * A direct visit to /resume: the 3D resume opens over the semantic page with a quick
 * galaxy intro. With prefers-reduced-motion the engine never mounts; the semantic
 * page is the whole experience.
 */
const JellyResumeDirect = () => {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [find, setFind] = useState<string | null | undefined>(undefined)

  // ?find=React runs the Finder once the page lands (read on the client: the page is static)
  useEffect(() => {
    setFind(new URLSearchParams(window.location.search).get('find'))
  }, [])

  if (reduced !== false || find === undefined) return null
  return <JellyResumeCanvas find={find} />
}

export default JellyResumeDirect
