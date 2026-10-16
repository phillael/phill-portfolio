'use client'

import { useEffect, type RefObject } from 'react'
import { REDUCED_MOTION, matches } from './motion'

/**
 * Fade the `[data-reveal]` blocks inside `root` up once each as it enters the view (12% in,
 * 6% above the bottom edge, as in the mockup). They're hidden only once armed here, so no-JS
 * and reduced motion show everything at once.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el || matches(REDUCED_MOTION) || typeof IntersectionObserver === 'undefined') return
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-in', '')
          io.unobserve(e.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    for (const item of items) {
      if (item.hasAttribute('data-in')) continue
      item.setAttribute('data-armed', '')
      io.observe(item)
    }
    return () => io.disconnect()
  }, [root])
}
