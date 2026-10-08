import experience from '@/data/experience.json'
import skills from '@/data/skills.json'
import { socials } from '@/data/socials'
import { SITE_URL } from '@/lib/site'

const PERSON_ID = `${SITE_URL}/#person`

/**
 * schema.org graph for the home page. Built from the data files so a content
 * update (new job title, skills, socials) updates SEO with it.
 */
export function buildStructuredData() {
  const current = experience[0]
  const technicalSkills =
    skills.find((category) => category.category === 'Technical Skills')?.skills ?? []

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Phil Codes',
        url: SITE_URL,
        author: { '@id': PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: 'Phill Aelony',
        url: SITE_URL,
        image: `${SITE_URL}/images/hero-image-phill-llamas.png`,
        jobTitle: current.title,
        worksFor: { '@type': 'Organization', name: current.company },
        sameAs: [socials.github, socials.linkedin],
        knowsAbout: technicalSkills,
      },
    ],
  }
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so it can't close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
