/**
 * Data Architecture Tests
 *
 * Verifies that all JSON data files are properly formatted and
 * conform to their TypeScript interfaces.
 */

import projectsData from '@/data/projects.json'
import projectDetailsData from '@/data/project-details.json'
import educationData from '@/data/education.json'
import type { Project, ProjectDetails, Education } from '@/types/content'

describe('Data Architecture', () => {
  // The career (the Experience section, the Wizard, the JSON-LD): src/__tests__/career-data.test.ts
  // The skills (the Skills section, the Wizard, the JSON-LD): src/__tests__/skills-data.test.ts

  describe('Projects Data', () => {
    it('imports projects.json without errors', () => {
      expect(projectsData).toBeDefined()
      expect(Array.isArray(projectsData)).toBe(true)
    })

    it('contains the six exhibits, in order', () => {
      expect(projectsData.map((p) => p.id)).toEqual([
        'quadzilla',
        'number-slayers',
        'rezmancer',
        'jelly-resume',
        'pickleball-2079',
        'pong',
      ])
    })

    it('each project has required fields', () => {
      projectsData.forEach((project) => {
        const proj = project as Project
        expect(proj.id).toBeDefined()
        expect(proj.title).toBeDefined()
        expect(proj.description).toBeDefined()
        expect(Array.isArray(proj.techStack)).toBe(true)
        // the vault's data: the first commit's year (the Wizard reads it), the television, "Displayed on {set}."
        expect(Number.isInteger(proj.year)).toBe(true)
        expect(proj.year).toBeGreaterThanOrEqual(2015)
        expect(['pocket', 'tube', 'terminal', 'sphere', 'portable', 'console']).toContain(proj.tv)
        expect(proj.set).toMatch(/^a .+, c\. \d{4}$/)
        // the posters replace the screenshots
        expect(project).not.toHaveProperty('imageUrl')
      })
    })

    it('stands each project on its own television', () => {
      expect(new Set(projectsData.map((p) => p.tv)).size).toBe(projectsData.length)
    })

    it('links each project validly: https out, internal pages by path, code on GitHub', () => {
      projectsData.forEach((project) => {
        const proj = project as Project
        if (proj.liveUrl !== undefined) expect(proj.liveUrl).toMatch(/^(https:\/\/|\/[a-z])/)
        if (proj.repoUrl !== undefined) expect(proj.repoUrl).toMatch(/^https:\/\/github\.com\/phillael\//)
      })
      expect(projectsData.find((p) => p.id === 'jelly-resume')?.liveUrl).toBe('/resume')
    })

    it('includes Pickleball 2079 on a portable set, with no links (a private repo)', () => {
      const pickleball = projectsData.find((p) => p.id === 'pickleball-2079') as Project | undefined
      expect(pickleball).toMatchObject({
        title: 'Pickleball 2079',
        year: 2026,
        tv: 'portable',
        set: 'a portable colour set, c. 1986',
        techStack: ['TypeScript', 'three.js', 'Vite', 'Deterministic sim'],
      })
      expect(pickleball?.liveUrl).toBeUndefined()
      expect(pickleball?.repoUrl).toBeUndefined()
    })

    it('gives Pong a short name for its tab', () => {
      const pong = projectsData.find((p) => p.id === 'pong') as Project | undefined
      expect(pong?.title).toBe('Pong Multiverse Alpaca Squadron')
      expect(pong?.short).toBe('Pong')
      expect(projectsData.filter((p) => 'short' in p)).toHaveLength(1)
    })

    it('includes Number Slayers project', () => {
      const numberSlayers = projectsData.find((p) => p.id === 'number-slayers')
      expect(numberSlayers).toBeDefined()
      expect(numberSlayers?.techStack).toContain('Colyseus')
      expect(numberSlayers?.liveUrl).toBe('https://numberslayers.com')
      expect(numberSlayers?.repoUrl).toBe('https://github.com/phillael/number-slayers')
    })

    it('has no TimelyCare card (it lives in Experience now)', () => {
      expect(projectsData.find((p) => /timelycare/i.test(p.id))).toBeUndefined()
    })
  })

  describe('Project Details Data', () => {
    it('imports project-details.json without errors', () => {
      expect(projectDetailsData).toBeDefined()
      expect(Array.isArray(projectDetailsData)).toBe(true)
    })

    it('each entry has required fields', () => {
      projectDetailsData.forEach((entry) => {
        const details = entry as ProjectDetails
        expect(typeof details.id).toBe('string')
        expect(typeof details.architecture).toBe('string')
        expect(typeof details.keyPatterns).toBe('string')
        expect(typeof details.notableDetails).toBe('string')
      })
    })

    it('covers Quadzilla, Rezmancer, the Jelly Resume and Pickleball 2079 for the Wizard', () => {
      const ids = projectDetailsData.map((entry) => entry.id)
      expect(ids).toEqual(expect.arrayContaining(['quadzilla', 'rezmancer', 'jelly-resume', 'pickleball-2079']))
    })

    it('each id is a unique non-empty string', () => {
      const ids = projectDetailsData.map((entry) => entry.id)
      ids.forEach((id) => {
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      })
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('Education Data', () => {
    it('imports education.json without errors', () => {
      expect(educationData).toBeDefined()
      expect(Array.isArray(educationData)).toBe(true)
    })

    it('contains three education entries', () => {
      expect(educationData.length).toBe(3)
    })

    it('each education entry has required fields', () => {
      educationData.forEach((entry) => {
        const edu = entry as Education
        expect(edu.id).toBeDefined()
        expect(edu.credential).toBeDefined()
        expect(edu.institution).toBeDefined()
      })
    })

    it('includes BA Jazz Studies from UNT', () => {
      const untDegree = educationData.find((e) => e.id === 'unt-jazz')
      expect(untDegree).toBeDefined()
      expect(untDegree?.credential).toBe('BA Jazz Studies')
      expect(untDegree?.institution).toBe('University of North Texas')
    })

    it('includes MongoDB certificate', () => {
      const mongoDb = educationData.find((e) => e.id === 'mongodb-fullstack')
      expect(mongoDb).toBeDefined()
      expect(mongoDb?.platform).toBe('Online Course')
    })
  })
})
