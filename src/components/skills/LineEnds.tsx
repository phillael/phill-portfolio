'use client'

import { useEffect, useRef } from 'react'
import { markLineEnds } from './markLineEnds'

/** Marks the Skills section's line ends on render, once the fonts are in, and after a resize */
const LineEnds = () => {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const section = ref.current?.closest('section')
    if (!section) return
    const run = () => markLineEnds(section)
    run()
    let live = true
    document.fonts?.ready.then(() => live && run())
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = window.setTimeout(run, 120)
    }
    window.addEventListener('resize', onResize)
    return () => {
      live = false
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return <span ref={ref} hidden />
}

export default LineEnds
