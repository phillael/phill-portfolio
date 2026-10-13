'use client'

import { useEffect } from 'react'
import { resumeRoute, type ResumeMode } from '@/components/jelly/resumeRoute'

/**
 * Renders nothing: tells the overlay host that the URL is `/resume` (and how we got
 * here) while this route segment is mounted. `?find=React` is read on the client
 * because both pages are static.
 */
const JellyResumeRoute = ({ mode }: { mode: ResumeMode }) => {
  useEffect(() => {
    const key = resumeRoute.open(mode, new URLSearchParams(window.location.search).get('find'))
    return () => resumeRoute.close(key)
  }, [mode])
  return null
}

export default JellyResumeRoute
