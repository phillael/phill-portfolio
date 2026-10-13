'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { resumeRoute, type ResumeMode } from '@/components/jelly/resumeRoute'
import { registerNavigate } from '@/components/jelly/resumeTrigger'

// The engine's chunk: fetched only when the resume opens (never for reduced motion)
const JellyResumeCanvas = dynamic(() => import('@/components/jelly/JellyResumeCanvas'), { ssr: false })

interface Shown {
  mode: ResumeMode
  find: string | null
  key: number
}

/**
 * The 3D resume's overlay host, mounted once in the root layout outside the shroom
 * wrappers (their filters break position: fixed), above the page and the Nav, below
 * the music player. It follows the URL through `resumeRoute`: `/resume` opens the
 * overlay; leaving it closes it (in reverse onto the hero when it came from there, else
 * a fade). It keeps the canvas alive after the route segment unmounts so the close can
 * play. With reduced motion it never mounts the engine.
 */
const JellyResumeHost = () => {
  const router = useRouter()
  const request = useSyncExternalStore(resumeRoute.subscribe, resumeRoute.get, () => null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [shown, setShown] = useState<Shown | null>(null)
  const [closing, setClosing] = useState(false)
  const shownRef = useRef(shown)
  const closingRef = useRef(closing)
  useEffect(() => {
    shownRef.current = shown
    closingRef.current = closing
  }, [shown, closing])
  // one close per open: a second × / Esc before the route changes would go back twice and leave the page
  const closeRequested = useRef(false)

  useEffect(() => {
    if (reduced === undefined) return
    if (request) {
      if (reduced) {
        // the plain /resume page instead (the intercepted route would leave the home page up)
        if (request.mode === 'overlay') window.location.reload()
        return
      }
      if (closingRef.current) return // a close is playing; when it ends, onClosed opens again
      closeRequested.current = false
      setShown((s) => s ?? { mode: request.mode, find: request.find, key: request.key })
      return
    }
    if (shownRef.current) setClosing(true) // the URL left /resume
  }, [request, reduced])

  const onClosed = useCallback(() => {
    setClosing(false)
    closeRequested.current = false
    const r = resumeRoute.get() // Forward while it was closing: open again
    setShown(r ? { mode: r.mode, find: r.find, key: r.key } : null)
  }, [])

  // × or Esc: an overlay goes back to the page it covered; a direct visit goes home
  const close = useCallback(() => {
    const s = shownRef.current
    if (!s || closeRequested.current) return
    closeRequested.current = true
    if (s.mode === 'overlay') router.back()
    else router.push('/')
  }, [router])

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
  return (
    <JellyResumeCanvas
      key={shown.key}
      mode={shown.mode}
      find={shown.find}
      closing={closing}
      onClose={close}
      onClosed={onClosed}
    />
  )
}

export default JellyResumeHost
