import { render } from '@testing-library/react'
import HomePage from '@/app/page'
import { buildStructuredData, serializeJsonLd } from '@/lib/structured-data'
import { socials } from '@/data/socials'
import { career } from '@/data/career'
import { SKILLS } from '@/data/skills'
import { SITE_URL } from '@/lib/site'

// AboutSection reads shroom mode; the real provider lives in the root layout
jest.mock('@/context/ShroomModeContext', () => ({
  useShroomMode: () => ({ isActive: false, setIsActive: jest.fn() }),
}))

type Node = Record<string, unknown> & { '@type': string }

const graph = () => buildStructuredData()['@graph'] as Node[]
const person = () => graph().find((n) => n['@type'] === 'Person')!

describe('structured data', () => {
  it('is a WebSite + Person graph', () => {
    const data = buildStructuredData()
    expect(data['@context']).toBe('https://schema.org')
    expect(graph().map((n) => n['@type'])).toEqual(['WebSite', 'Person'])
    expect(graph()[0]).toMatchObject({ url: SITE_URL })
  })

  it('reads the Person from the data files', () => {
    expect(person()).toMatchObject({
      name: 'Phill Aelony',
      url: SITE_URL,
      jobTitle: 'Generative AI Engineer', // the real title (career.ts, from resume.ts)
      worksFor: { '@type': 'Organization', name: career.jobs[0].company },
      sameAs: [socials.github, socials.linkedin],
    })
    const tech = SKILLS.groups
      .filter((g) => ['ai', 'frontend', 'backend', 'cloud', 'quality'].includes(g.id))
      .flatMap((g) => g.skills.map((s) => s.name))
    expect(person().knowsAbout).toEqual(tech)
    expect(person().knowsAbout).toEqual(expect.arrayContaining(['Claude Code', 'TypeScript', 'Postgres', 'Terraform', 'Playwright']))
    expect(person().knowsAbout).not.toContain('Guitar') // music & product are not the tech list
    expect(person().image).toMatch(new RegExp(`^${SITE_URL}/`))
  })

  it('serializes without a raw "<"', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(json).not.toContain('<')
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>' })
  })

  it('renders exactly one ld+json script on the home page', () => {
    const { container } = render(<HomePage />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(1)
    expect(JSON.parse(scripts[0].innerHTML)).toEqual(buildStructuredData())
  })
})
