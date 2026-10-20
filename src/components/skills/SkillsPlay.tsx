'use client'

import { useEffect, useRef } from 'react'
import { getSiteMusic } from '@/lib/site-music'
import { createLean } from '@/lib/skills/lean'
import type { Blaster, Shot } from '@/lib/skills/blaster'

const loadGame = () => import('@/lib/skills/blaster')

/** the click's point, or a keyboard shot's (Enter/Space: detail 0) from the button's centre */
function shotOf(e: MouseEvent): Shot | null {
  const target = e.target instanceof Element ? e.target : null
  if (!target) return null
  const skill = target.closest<HTMLButtonElement>('[data-skill]')
  const keyboard = e.detail === 0
  if (keyboard && skill) {
    const r = skill.getBoundingClientRect()
    return { skill, x: r.left + r.width / 2, y: r.top + r.height / 2, keyboard, target }
  }
  return { skill, x: e.clientX, y: e.clientY, keyboard, target }
}

/**
 * The Skills section's island: the magnet lean at rest, and the Skill blaster, which isn't on the page
 * until a skill is activated. The game's chunk is prefetched as the section nears the viewport (or on the
 * first pointer or focus inside it). The first activation gets the site player's AudioContext inside the
 * click, then imports and starts the game with that shot; every later click in the section goes to it.
 */
const SkillsPlay = () => {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = ref.current?.closest('section')
    if (!section) return
    const lean = createLean(section)
    let game: Blaster | null = null
    let loading = false
    let gone = false

    let prefetched = false
    const prefetch = () => {
      if (prefetched) return
      prefetched = true
      io.disconnect()
      section.removeEventListener('pointerover', prefetch)
      section.removeEventListener('focusin', prefetch)
      loadGame().catch(() => { prefetched = false })
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) prefetch() }, { rootMargin: '600px 0px' })
    io.observe(section)
    section.addEventListener('pointerover', prefetch)
    section.addEventListener('focusin', prefetch)

    const onClick = (e: MouseEvent) => {
      const shot = shotOf(e)
      if (!shot) return
      if (game) return game.shoot(shot)
      if (!shot.skill || loading) return
      // sound only ever starts on a click: the context is made and resumed here, before the import
      const ac = getSiteMusic()?.context() ?? new AudioContext()
      if (ac.state === 'suspended') ac.resume().catch(() => {})
      loading = true
      loadGame()
        .then(({ createBlaster }) => {
          if (gone) return
          game = createBlaster({ section, ac, lean })
          game.shoot(shot)
        })
        .catch(() => {})
        .finally(() => { loading = false })
    }
    // held Enter/Space doesn't machine-gun a skill
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && (e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.closest('[data-skill]')) e.preventDefault()
    }
    section.addEventListener('click', onClick)
    section.addEventListener('keydown', onKey)

    return () => {
      gone = true
      io.disconnect()
      section.removeEventListener('pointerover', prefetch)
      section.removeEventListener('focusin', prefetch)
      section.removeEventListener('click', onClick)
      section.removeEventListener('keydown', onKey)
      game?.dispose()
      lean.dispose()
    }
  }, [])

  return <span ref={ref} hidden />
}

export default SkillsPlay
