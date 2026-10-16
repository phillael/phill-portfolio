'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import css from './Experience.module.css'
import { REDUCED_MOTION, matches } from './motion'

/**
 * ExperienceTrack - the rail down the left of the stops: a hairline whose gradient fill grows
 * with the scroll (`--p` on the track) and lights each stop (`data-lit` on its `[data-stop]`)
 * as the fill reaches its node. One passive scroll listener, added only while the track is on
 * screen; it reads the scroll position and asks for a frame, and the frame only writes. The
 * geometry is measured outside rAF: on mount, when the track resizes (a tile opening), on a
 * window resize and each time the track comes into view. Without JS or with reduced motion
 * the rail is fully drawn and every node lit (CSS, no `data-live`).
 */
export default function ExperienceTrack({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || matches(REDUCED_MOTION) || typeof IntersectionObserver === 'undefined') return
    let top = 0
    let height = 1
    let vh = window.innerHeight
    let scrollY = window.scrollY
    let stops: { el: HTMLElement; top: number }[] = []
    let raf = 0
    let listening = false

    const measure = () => {
      scrollY = window.scrollY
      vh = window.innerHeight
      const r = track.getBoundingClientRect()
      top = r.top + scrollY
      height = Math.max(1, r.height)
      stops = Array.from(track.querySelectorAll<HTMLElement>('[data-stop]'), (el) => ({ el, top: el.offsetTop }))
    }
    const draw = () => {
      raf = 0
      const p = Math.max(0, Math.min(1, (vh * 0.6 - (top - scrollY)) / height))
      track.style.setProperty('--p', p.toFixed(4))
      track.style.setProperty('--head', p > 0 && p < 1 ? '1' : '0')
      const reach = p * height
      for (const s of stops) s.el.toggleAttribute('data-lit', s.top + 12 <= reach)
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const onScroll = () => {
      scrollY = window.scrollY
      request()
    }
    const onResize = () => {
      measure()
      request()
    }

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !listening) {
        listening = true
        measure()
        request()
        window.addEventListener('scroll', onScroll, { passive: true })
      } else if (!e.isIntersecting && listening) {
        listening = false
        window.removeEventListener('scroll', onScroll)
        onScroll() // settle the last position
      }
    })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)

    track.dataset.live = ''
    measure()
    draw()
    io.observe(track)
    ro?.observe(track)
    window.addEventListener('resize', onResize)
    return () => {
      io.disconnect()
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      delete track.dataset.live
    }
  }, [])

  return (
    <div ref={trackRef} className={css.track}>
      <div className={css.rail} aria-hidden="true">
        <div className={css.railFill} />
        <div className={css.railHead} />
      </div>
      {children}
    </div>
  )
}
