/**
 * The Skills content (src/data/skills.ts): the copy is the Skill blaster mockup's
 * (docs/design/skills-game/skills.js), exact. Plan: docs/plans/2026-10-20-skills-blaster-plan.md, Binding §3.
 */

import { SKILLS, skillCount } from '@/data/skills'

const names = SKILLS.groups.flatMap((g) => g.skills.map((s) => s.name))

describe('the Skills content', () => {
  it('has the headline and lede', () => {
    expect(SKILLS.headline).toBe('AI first. Full stack.')
    expect(SKILLS.lede).toBe(
      'What I build with, agents and LLM features first, then the web, mobile and cloud stack under them.'
    )
  })

  it('has the seven groups in order, with their counts', () => {
    expect(SKILLS.groups.map((g) => [g.id, g.name, g.skills.length])).toEqual([
      ['ai', 'AI', 16],
      ['frontend', 'Frontend & mobile', 15],
      ['backend', 'Backend & data', 14],
      ['cloud', 'Cloud & DevOps', 12],
      ['quality', 'Quality & security', 10],
      ['product', 'Product', 8],
      ['music', 'Music & more', 6],
    ])
  })

  it('counts 81 skills', () => {
    expect(names).toHaveLength(81)
    expect(skillCount).toBe(81)
  })

  it('features AI, with its caption', () => {
    const [ai, ...rest] = SKILLS.groups
    expect(ai).toMatchObject({ featured: true, caption: 'Agents, tools and LLM features in production' })
    for (const g of rest) {
      expect(g.featured).toBeFalsy()
      expect(g.caption).toBeUndefined()
    }
  })

  it('gives every AI skill a note, and no other skill one', () => {
    for (const g of SKILLS.groups) {
      for (const s of g.skills) {
        if (g.id === 'ai') expect(s.note).toMatch(/\S/)
        else expect(s.note).toBeUndefined()
      }
    }
  })

  it('names each skill once', () => {
    expect(new Set(names).size).toBe(names.length)
  })

  it('keeps employer SaaS generic', () => {
    expect(names).toContain('SSO / OIDC')
    expect(names).toContain('Feature flags')
  })
})
