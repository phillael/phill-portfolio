/**
 * src/data/career.ts: the home page's Experience section, the Wizard and the JSON-LD read it.
 * Titles, companies and dates come from resume.ts; every number it adds must be sourced.
 */

import { career, FACTS } from '@/data/career'
import { resume } from '@/data/resume'

/** Every string in a value, depth first */
const strings = (v: unknown): string[] =>
  typeof v === 'string'
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(strings)
      : v && typeof v === 'object'
        ? Object.values(v).flatMap(strings)
        : []

/** The numbers in a string, digits only (`6,700+` → `6700`, `~1.4M` → `14`) */
const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/\D/g, ''))

const timelycare = career.jobs[0]

describe('career data', () => {
  it('takes the headline, titles, companies and dates from resume.ts', () => {
    expect(career.headline).toBe(resume.headline)

    expect(timelycare.company).toBe('TimelyCare')
    expect(timelycare.dates).toBe(resume.experience[0].dates)
    expect(timelycare.current).toBe(true)
    expect(timelycare.roles).toEqual([
      { title: 'Generative AI Engineer', start: 'Apr 2026', dates: 'Apr 2026 – Present' },
      { title: 'Senior Software Engineer II', start: 'Apr 2025', dates: 'Apr 2025 – Apr 2026' },
      { title: 'Software Engineer', start: 'Feb 2023', dates: 'Feb 2023 – Apr 2025' },
    ])
    expect(timelycare.roles.map(({ title, dates }) => ({ title, dates }))).toEqual(resume.experience[0].roles)

    const earlier = career.jobs.slice(1)
    expect(earlier.map((j) => j.company)).toEqual(['Sessions', 'Designit for Microsoft'])
    earlier.forEach((job, i) => {
      const entry = resume.earlier[i]
      expect(job.company).toBe(entry.company)
      expect(job.dates).toBe(entry.dates)
      expect(job.current).toBe(false)
      expect(job.roles).toEqual([{ title: entry.title, start: entry.dates.split(' – ')[0], dates: entry.dates }])
      expect(job.tiles).toEqual([])
      expect(job.line).toBeTruthy()
    })

    expect(career.music).toMatchObject({
      title: resume.music.title,
      company: resume.music.company,
      dates: resume.music.dates,
      education: 'B.A. Jazz Studies, University of North Texas',
    })
  })

  it('gives TimelyCare four tiles, the wide one first', () => {
    expect(timelycare.tiles.map((t) => [t.name, t.metric, t.metricLabel])).toEqual([
      ['Marketing platform', '~5 wks', 'prototype to production'],
      ['Provider payments', '~750', 'clinicians paid through it'],
      ['AI resource platform', '~68K', 'community resources'],
      ['Care operations', '6,700+', 'tickets a year removed'],
    ])
    // what a screen reader says for each number
    expect(timelycare.tiles.map((t) => t.srMetric)).toEqual(['about 5 weeks', 'about 750', 'about 68 thousand', '6,700 plus'])
    for (const tile of timelycare.tiles) {
      expect(tile.title).toBeTruthy()
      expect(tile.detail).toBeTruthy()
      expect(tile.stack.length).toBeGreaterThan(0)
    }
    expect(new Set(timelycare.tiles.map((t) => t.id)).size).toBe(4)
  })

  it('traces every number to resume.ts or a sourced fact', () => {
    const known = new Set([...numbers(JSON.stringify(resume)), ...FACTS.flatMap((f) => numbers(f.value))])
    const unsourced = strings(career).flatMap((s) =>
      numbers(s)
        .filter((n) => !known.has(n))
        .map((n) => `${n} in "${s}"`),
    )
    expect(unsourced).toEqual([])
  })

  it('names a source for every fact', () => {
    expect(FACTS.length).toBeGreaterThan(0)
    for (const fact of FACTS) {
      expect(numbers(fact.value).length).toBeGreaterThan(0)
      expect(fact.src.trim()).not.toBe('')
    }
  })

  it('keeps the rejected wording out', () => {
    const all = strings(career)
    expect(all.filter((s) => /dormant/i.test(s))).toEqual([])
    expect(all.filter((s) => /replaced Customer\.io/i.test(s))).toEqual([])
    expect(all.filter((s) => /\bOkta\b/.test(s))).toEqual([]) // the only vendor named is Customer.io
    const nurture = timelycare.tiles.find((t) => t.name === 'Marketing platform')
    expect(strings(nurture).filter((s) => /from scratch/i.test(s))).toEqual([])
  })

  it('carries the Wizard notes, never shown on the page', () => {
    expect(career.notes).toHaveLength(16)
    expect(career.notes[1]).toMatch(/Software Engineer \(Feb 2023\), promoted to Senior Software Engineer II \(Apr 2025\), then to Generative AI Engineer \(Apr 2026\)/)
    // Phill, 2026-10-16: the current role is engineer, designer and product manager in one
    expect(career.notes[15]).toMatch(/^In his current role he is the engineer, designer and product manager in one/)
    expect(career.intro).toMatch(/as engineer, designer and product manager/)
  })
})
