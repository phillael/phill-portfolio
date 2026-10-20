/**
 * The Skill blaster's runtime (src/lib/skills/blaster.ts), a smoke test in jsdom: the first shot starts the
 * game, a skill lights up after the first bar, a hit scores, Escape stops, idling pauses, and the live region
 * says so. jsdom has no layout, no Web Audio and no Web Animations: the skills get fake boxes, the audio clock
 * is a fake AudioContext advanced with the fake timers, and animate() returns a stub. Reduced motion is on
 * (jsdom has no Range boxes for the letters); the pure rules are in skills-rules.test.ts.
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import SkillsSection from '@/components/SkillsSection'
import { createBlaster, type Blaster, type Shot } from '@/lib/skills/blaster'
import { BAR } from '@/lib/skills/synth'
import { isWizardAside, setWizardAside, subscribeWizardAside } from '@/lib/wizard-aside'
import { FakeAudioContext } from './helpers/fakeAudio'

jest.mock('@/components/skills/SkillsPlay', () => ({ __esModule: true, default: () => null }))

interface Dev {
  G: { state: string; score: number; wave: number; active: Set<{ k: { el: HTMLElement; label: HTMLElement } }> }
}
const dev = () => (window as unknown as { __skills: Dev }).__skills

const realMatchMedia = window.matchMedia
const realRect = HTMLElement.prototype.getBoundingClientRect
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  Element.prototype.animate = function () {
    return { cancel() {}, pause() {}, play() {}, onfinish: null, oncancel: null, effect: { getComputedTiming: () => ({ endTime: 0 }) } } as unknown as Animation
  }
  // every skill a box on screen, in reading order; the readout near the bottom
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const skill = this.closest('[data-skill]')
    if (skill) {
      const i = [...document.querySelectorAll('[data-skill]')].indexOf(skill)
      const x = 20 + (i % 6) * 160, y = 80 + Math.floor(i / 6) * 40
      return { left: x, top: y, right: x + 100, bottom: y + 24, width: 100, height: 24, x, y, toJSON() {} } as DOMRect
    }
    if (this.classList.contains('bl-hud')) return { left: 16, top: 700, right: 300, bottom: 752, width: 284, height: 52, x: 16, y: 700, toJSON() {} } as DOMRect
    return realRect.call(this)
  }
})
afterAll(() => {
  window.matchMedia = realMatchMedia
  HTMLElement.prototype.getBoundingClientRect = realRect
})

let ac: FakeAudioContext
let game: Blaster
beforeEach(() => {
  jest.useFakeTimers()
  localStorage.clear()
  render(<SkillsSection />)
  ac = new FakeAudioContext()
  game = createBlaster({ section: document.getElementById('skills')!, ac: ac as unknown as AudioContext, lean: null })
})
afterEach(() => {
  game.dispose()
  jest.useRealTimers()
})

/** time passes: the timers and the audio clock together */
const pass = (ms: number) => act(() => {
  for (let t = 0; t < ms; t += 20) { ac.currentTime += 0.02; jest.advanceTimersByTime(20) }
})
const shotAt = (el: HTMLElement): Shot => ({ skill: el.closest('button'), x: 50, y: 50, keyboard: false, target: el })
const live = () => document.querySelector('[data-sk-live]')!.textContent
const hud = () => document.querySelector('.bl-hud')!

describe('the Skill blaster', () => {
  it('starts with the first shot: the readout shows, the shot scores and the live region says what started', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(dev().G.state).toBe('intro')
    expect(document.getElementById('skills')).toHaveClass('bl-on')
    expect(hud()).toHaveClass('on')
    expect(dev().G.score).toBe(100)
    pass(100)
    expect(live()).toMatch(/^Skill blaster\. A beat starts; hit the skills that light up to play over it\. Escape stops\./)
    expect(document.querySelector('.bl-screen')?.parentElement).toBe(document.body) // screen-wide effects live on <body>
  })

  it('lights a skill after the first bar, and a hit on it scores', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 900)
    expect(dev().G.state).toBe('wave')
    expect(dev().G.wave).toBe(0)
    const [lit] = [...dev().G.active]
    expect(lit).toBeDefined()
    expect(lit.k.label).toHaveClass('bl-lit')
    expect(document.querySelector('.bl-layer .bl-ring')).not.toBeNull()

    act(() => game.shoot(shotAt(lit.k.el)))
    expect(dev().G.score).toBe(200)
    expect(lit.k.label).not.toHaveClass('bl-lit')
    pass(1400)
    expect(live()).toMatch(/\. 200 points\.$/)
  })

  it('Escape stops it: back to the list, and the live region says the score', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(300)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dev().G.state).toBe('rest')
    expect(document.getElementById('skills')).not.toHaveClass('bl-on')
    expect(hud()).not.toHaveClass('on')
    pass(100)
    expect(live()).toBe('Stopped. 100 points.')
    expect(localStorage.getItem('skill-blaster-best')).toBe('100')
  })

  it('Escape stops only the game: the wizard and shroom mode behind it don’t hear it', () => {
    const behind = jest.fn()
    window.addEventListener('keydown', behind) // ShroomMode's listener
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dev().G.state).toBe('rest')
    expect(behind).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' }) // at rest, Escape is the site's again
    expect(behind).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', behind)
  })

  it('pauses after 5 s without a shot, and a shot picks it up again', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 4500)
    expect(dev().G.state).toBe('wave') // a wave's start counts as a shot
    pass(1100)
    expect(dev().G.state).toBe('paused')
    expect(live()).toBe('Paused. shoot any skill to go on')
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' }))))
    expect(['wave', 'between']).toContain(dev().G.state)
  })

  it('an unlit skill only grazes (no points)', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 900)
    const lit = new Set([...dev().G.active].map((t) => t.k.el))
    const unlit = screen.getAllByRole('button').find((b) => b.dataset.skill && !lit.has(b) && b.dataset.skill !== 'Docker')!
    const before = dev().G.score
    act(() => game.shoot(shotAt(unlit)))
    expect(dev().G.score).toBe(before)
  })
})

describe('the summoned Shroom Wizard', () => {
  afterEach(() => {
    document.getElementById('shroom-ui')?.remove()
    setWizardAside(false)
  })

  it('steps aside while the game plays where the readout can’t clear it, and comes back when the readout goes', () => {
    const ui = document.createElement('div')
    ui.id = 'shroom-ui'
    ui.appendChild(document.createElement('canvas')) // jsdom: no room beside it, as on a phone
    document.body.appendChild(ui)
    const heard: boolean[] = []
    const off = subscribeWizardAside(() => heard.push(isWizardAside()))
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(isWizardAside()).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isWizardAside()).toBe(false)
    expect(heard).toEqual([true, false])
    off()
  })

  it('stays put when it isn’t out', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(isWizardAside()).toBe(false)
  })
})
