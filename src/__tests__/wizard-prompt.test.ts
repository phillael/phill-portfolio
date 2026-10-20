import {
  buildWizardSystemPrompt,
  __resetWizardPromptCache,
} from '../lib/wizard-prompt'
import { career } from '@/data/career'

const section = (prompt: string, tag: string) => prompt.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? ''

describe('buildWizardSystemPrompt', () => {
  beforeEach(() => {
    __resetWizardPromptCache()
  })

  it('returns a non-empty string containing the persona header', () => {
    const prompt = buildWizardSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(500)
    expect(prompt).toContain('Shroom Wizard')
  })

  it('embeds each data file inside its own tagged section', () => {
    const prompt = buildWizardSystemPrompt()
    expect(prompt).toMatch(/<projects>[\s\S]+<\/projects>/)
    expect(prompt).toMatch(/<project-details>[\s\S]+<\/project-details>/)
    expect(prompt).toMatch(/<skills>[\s\S]+<\/skills>/)
    expect(prompt).toMatch(/<experience>[\s\S]+<\/experience>/)
    expect(prompt).toMatch(/<career-notes>[\s\S]+<\/career-notes>/)
    expect(prompt).toMatch(/<education>[\s\S]+<\/education>/)
  })

  it('tells the new career story from career.ts', () => {
    const prompt = buildWizardSystemPrompt()
    const experience = section(prompt, 'experience')
    expect(experience).toContain('Generative AI Engineer')
    expect(experience).toContain('Senior Software Engineer II')
    expect(experience).toContain('Customer.io')
    expect(experience).toContain('MCP')
    expect(experience).toContain('Guitarist & Composer')
    expect(experience).not.toContain('**') // bold markers are page markup
    expect(section(prompt, 'summary')).toMatch(/^\s*Phill Aelony is a Senior AI Engineer \(his title: Generative AI Engineer at TimelyCare\)/)
    // the 2025 story is gone, everywhere
    expect(prompt).not.toMatch(/Agent OS|5-10x|5–10x|6\+ years/)
  })

  it('gives the Wizard the career notes as true details it may share', () => {
    const prompt = buildWizardSystemPrompt()
    const notes = section(prompt, 'career-notes')
    for (const note of career.notes) expect(notes).toContain(`- ${note}`)
    expect(prompt).toMatch(/career-notes.*true/i)
  })

  it('carries the skills from skills.ts, AI first with their notes', () => {
    const skills = section(buildWizardSystemPrompt(), 'skills')
    expect(skills).toContain('MCP servers')
    expect(skills).toContain('a person confirms every write')
    expect(skills).toContain('"Human-in-the-loop: a person confirms every write"')
    expect(skills).toContain('"group": "Music & more"')
    expect(skills.indexOf('"group": "AI"')).toBeLessThan(skills.indexOf('"group": "Frontend & mobile"'))
  })

  it('includes project architecture details in the prompt', () => {
    const prompt = buildWizardSystemPrompt()
    expect(prompt).toContain('Colyseus')
    expect(prompt).toContain('monorepo')
  })

  it('includes the inviolable rule set', () => {
    const prompt = buildWizardSystemPrompt()
    expect(prompt).toContain('NEVER swear')
    expect(prompt).toContain('NEVER discuss drugs')
    expect(prompt).toContain('NEVER break character')
    expect(prompt).toContain('WALRUS')
    expect(prompt).toContain('MYCOLOGY')
    expect(prompt).toContain('multiverse')
  })

  it('mentions the offer_mushroom tool', () => {
    const prompt = buildWizardSystemPrompt()
    expect(prompt).toContain('offer_mushroom')
  })

  it('memoizes — subsequent calls return the same reference', () => {
    const a = buildWizardSystemPrompt()
    const b = buildWizardSystemPrompt()
    expect(a).toBe(b)
  })
  it('tells the wizard when to offer the resume (a tool call, never described)', () => {
    const prompt = buildWizardSystemPrompt()
    expect(prompt).toContain('offer_resume')
    expect(prompt).toMatch(/RESUME OFFERS/)
  })
})
