'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { resumeRoute, type ResumeMode } from '@/components/jelly/resumeRoute'
import { registerNavigate } from '@/components/jelly/resumeTrigger'

// The engine's chunk: fetched only when the resume opens (never for reduced motion)
const JellyResumeCanvas = dynamic(() => import('@/components/jelly/JellyResumeCanvas'), { ssr: false })

const FADE_MS = 400

/**
 * The 3D resume's overlay host, mounted once in the root layout outside the shroom
 * wrappers (their filters break position: fixed), above the page and the Nav, below
 * the music player. It follows the URL through `resumeRoute`: `/resume` opens the
 * overlay, leaving it closes it. With reduced motion it never mounts the engine.
 */
const JellyResumeHost = () => {
  const router = useRouter()
  const request = useSyncExternalStore(resumeRoute.subscribe, resumeRoute.get, () => null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [shown, setShown] = useState<{ mode: ResumeMode; find: string | null } | null>(null)
  const [fading, setFading] = useState(false)
  // one close per open: a second × / Esc before the route changes would go back twice and leave the page
  const closeRequested = useRef(false)

  useEffect(() => {
    if (reduced === undefined) return
    if (request) {
      closeRequested.current = false
      if (reduced) {
        // the plain /resume page instead (the intercepted route would leave the home page up)
        if (request.mode === 'overlay') window.location.reload()
        return
      }
      setShown((s) => (s && s.mode === request.mode && s.find === request.find ? s : { mode: request.mode, find: request.find }))
      setFading(false)
      return
    }
    // the URL left /resume: fade out, then unmount (the engine is disposed with it)
    setFading(true)
    const t = setTimeout(() => setShown(null), FADE_MS)
    return () => clearTimeout(t)
  }, [request, reduced])

  // × or Esc: an overlay goes back to the page it covered; a direct visit fades out, then goes home
  const close = useCallback(() => {
    if (!shown || closeRequested.current) return
    closeRequested.current = true
    if (shown.mode === 'overlay') router.back()
    else {
      setFading(true)
      setTimeout(() => router.push('/'), FADE_MS)
    }
  }, [router, shown])

  // the triggers (hero, 🍄) open the resume through a soft navigation, so the home page stays mounted
  useEffect(() => {
    registerNavigate((url) => router.push(url, { scroll: false }))
    return () => registerNavigate(null)
  }, [router])

  // dev only: open the overlay without a trigger
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const w = window as unknown as { __jellyHost?: unknown }
    w.__jellyHost = { open: (find?: string) => router.push('/resume' + (find ? `?find=${encodeURIComponent(find)}` : ''), { scroll: false }), back: () => router.back() }
    return () => { delete w.__jellyHost }
  }, [router])

  if (!shown) return null
  return <JellyResumeCanvas key={shown.mode} mode={shown.mode} find={shown.find} fading={fading} onClose={close} />
}

export default JellyResumeHost
