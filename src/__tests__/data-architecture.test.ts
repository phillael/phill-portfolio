/**
 * Data Architecture Tests
 *
 * Verifies that all JSON data files are properly formatted and
 * conform to their TypeScript interfaces.
 */

import experienceData from '@/data/experience.json'
import skillsData from '@/data/skills.json'
import projectsData from '@/data/projects.json'
import educationData from '@/data/education.json'
import type { Experience, SkillCategory, Project, Education } from '@/types/content'

describe('Data Architecture', () => {
  describe('Experience Data', () => {
    it('imports experience.json without errors', () => {
      expect(experienceData).toBeDefined()
      expect(Array.isArray(experienceData)).toBe(true)
    })

    it('contains the expected number of experience entries', () => {
      expect(experienceData.length).toBe(6)
    })

    it('each experience entry has required fields', () => {
      experienceData.forEach((entry) => {
        const experience = entry as Experience
        expect(experience.id).toBeDefined()
        expect(experience.title).toBeDefined()
        expect(experience.company).toBeDefined()
        expect(experience.dateRange).toBeDefined()
        expect(experience.description).toBeDefined()
        expect(Array.isArray(experience.bulletPoints)).toBe(true)
        expect(Array.isArray(experience.techStack)).toBe(true)
        expect(['tech', 'music', 'education']).toContain(experience.type)
      })
    })

    it('includes TimelyCare as the most recent entry', () => {
      const timelycare = experienceData.find((e) => e.id === 'timelycare')
      expect(timelycare).toBeDefined()
      expect(timelycare?.company).toBe('TimelyCare')
      expect(timelycare?.title).toBe('Senior Software Engineer II')
    })

    it('includes music career entry', () => {
      const musicCareer = experienceData.find((e) => e.type === 'music')
      expect(musicCareer).toBeDefined()
      expect(musicCareer?.company).toContain('Funky Knuckles')
    })
  })

  describe('Skills Data', () => {
    it('imports skills.json without errors', () => {
      expect(skillsData).toBeDefined()
      expect(Array.isArray(skillsData)).toBe(true)
    })

    it('contains three skill categories', () => {
      expect(skillsData.length).toBe(3)
    })

    it('each category has required fields', () => {
      skillsData.forEach((category) => {
        const skillCategory = category as SkillCategory
        expect(skillCategory.category).toBeDefined()
        expect(typeof skillCategory.category).toBe('string')
        expect(Array.isArray(skillCategory.skills)).toBe(true)
        expect(skillCategory.skills.length).toBeGreaterThan(0)
      })
    })

    it('includes Technical Skills category with core skills', () => {
      const technicalSkills = skillsData.find(
        (c) => c.category === 'Technical Skills'
      )
      expect(technicalSkills).toBeDefined()
      expect(technicalSkills?.skills).toContain('JavaScript')
      expect(technicalSkills?.skills).toContain('TypeScript')
      expect(technicalSkills?.skills).toContain('React')
    })

    it('includes Professional Skills category', () => {
      const professionalSkills = skillsData.find(
        (c) => c.category === 'Professional Skills'
      )
      expect(professionalSkills).toBeDefined()
      expect(professionalSkills?.skills).toContain('Software Engineering')
    })

    it('includes Other Skills category', () => {
      const otherSkills = skillsData.find((c) => c.category === 'Other Skills')
      expect(otherSkills).toBeDefined()
      expect(otherSkills?.skills).toContain('Guitar')
    })
  })

  describe('Projects Data', () => {
    it('imports projects.json without errors', () => {
      expect(projectsData).toBeDefined()
      expect(Array.isArray(projectsData)).toBe(true)
    })

    it('contains three project entries', () => {
      expect(projectsData.length).toBe(3)
    })

    it('each project has required fields', () => {
      projectsData.forEach((project) => {
        const proj = project as Project
        expect(proj.id).toBeDefined()
        expect(proj.title).toBeDefined()
        expect(proj.description).toBeDefined()
        expect(Array.isArray(proj.techStack)).toBe(true)
        expect(proj.imageUrl).toBeDefined()
      })
    })

    it('includes Number Slayers project', () => {
      const numberSlayers = projectsData.find((p) => p.id === 'number-slayers')
      expect(numberSlayers).toBeDefined()
      expect(numberSlayers?.techStack).toContain('Three.js')
    })

    it('includes TimelyCare project with liveUrl', () => {
      const timelycare = projectsData.find(
        (p) => p.id === 'timelycare-platform'
      )
      expect(timelycare).toBeDefined()
      expect(timelycare?.liveUrl).toBe('https://timelycare.com')
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
