/**
 * The Skills section at rest (mockup: docs/design/skills-game/round6/blaster-synth.html, its rest state):
 * the header, the AI skills in a glass panel with a note each, the other groups as quiet lines of words.
 * Every skill is a button that looks like text: the list stays the content for readers, search and
 * screen readers, and a click is what reveals the game.
 */

import { render, screen, within } from '@testing-library/react'
import SkillsSection from '@/components/SkillsSection'
import { markLineEnds } from '@/components/skills/markLineEnds'
import { SKILLS, skillCount } from '@/data/skills'

describe('SkillsSection', () => {
  it('is the region named Skills, at #skills', () => {
    render(<SkillsSection />)
    const region = screen.getByRole('region', { name: 'Skills' })
    expect(region).toHaveAttribute('id', 'skills')
    expect(screen.getByRole('heading', { level: 2, name: 'Skills' })).toHaveAttribute('id', 'skills-h')
  })

  it('says what it is: the headline and the lede', () => {
    render(<SkillsSection />)
    expect(screen.getByText(SKILLS.headline)).toBeInTheDocument()
    expect(screen.getByText(SKILLS.lede)).toBeInTheDocument()
  })

  it('has a heading per group, AI first, and each group’s list is labelled by it', () => {
    render(<SkillsSection />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(SKILLS.groups.map((g) => g.name))
    for (const g of SKILLS.groups) expect(screen.getByRole('list', { name: g.name })).toBeInTheDocument()
  })

  it('makes every skill a button named by the skill (an AI skill’s name includes its note)', () => {
    render(<SkillsSection />)
    const region = screen.getByRole('region', { name: 'Skills' })
    expect(within(region).getAllByRole('button')).toHaveLength(skillCount)
    for (const g of SKILLS.groups) {
      for (const s of g.skills) {
        const button = within(region).getByRole('button', { name: s.note ? `${s.name} ${s.note}` : s.name })
        expect(button).toHaveAttribute('type', 'button')
        expect(button).toHaveAttribute('data-skill', s.name)
        expect(button).toHaveAttribute('data-group', g.id)
      }
    }
  })

  it('hides the dots between words from screen readers', () => {
    render(<SkillsSection />)
    const dots = screen.getAllByText('·')
    expect(dots).toHaveLength(skillCount - SKILLS.groups[0].skills.length) // one after every word outside the AI panel
    for (const dot of dots) expect(dot).toHaveAttribute('aria-hidden', 'true')
  })

  it('has a polite live region for the game', () => {
    render(<SkillsSection />)
    const region = screen.getByRole('region', { name: 'Skills' })
    expect(region.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})

describe('the dots never end a line', () => {
  /** a list whose items sit at these offsetTops (jsdom has no layout) */
  const list = (tops: number[]) => {
    const root = document.createElement('div')
    const ul = document.createElement('ul')
    ul.setAttribute('data-words', '')
    for (const top of tops) {
      const li = document.createElement('li')
      Object.defineProperty(li, 'offsetTop', { value: top, configurable: true })
      ul.appendChild(li)
    }
    root.appendChild(ul)
    return { root, items: [...ul.children] }
  }

  it('marks the last word on each visual line but the last', () => {
    const { root, items } = list([0, 0, 0, 30, 30, 60])
    markLineEnds(root)
    expect(items.map((li) => li.hasAttribute('data-eol'))).toEqual([false, false, true, false, true, false])
  })

  it('unmarks words that no longer end a line', () => {
    const { root, items } = list([0, 30])
    items[0].setAttribute('data-eol', '')
    Object.defineProperty(items[1], 'offsetTop', { value: 0 })
    markLineEnds(root)
    expect(items[0].hasAttribute('data-eol')).toBe(false)
  })
})
