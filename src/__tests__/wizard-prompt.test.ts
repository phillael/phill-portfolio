import {
  buildWizardSystemPrompt,
  __resetWizardPromptCache,
} from '../lib/wizard-prompt'

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
    expect(prompt).toMatch(/<education>[\s\S]+<\/education>/)
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
})
