import { render } from '@testing-library/react'
import HomePage from '@/app/page'
import { buildStructuredData, serializeJsonLd } from '@/lib/structured-data'
import { socials } from '@/data/socials'
import experience from '@/data/experience.json'
import skills from '@/data/skills.json'
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
      jobTitle: experience[0].title,
      worksFor: { '@type': 'Organization', name: experience[0].company },
      sameAs: [socials.github, socials.linkedin],
    })
    const technical = skills.find((c) => c.category === 'Technical Skills')!.skills
    expect(person().knowsAbout).toEqual(technical)
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
