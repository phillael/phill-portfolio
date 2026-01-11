/**
 * TypeScript interfaces for portfolio content data structures.
 * These interfaces define the shape of data in /src/data/*.json files.
 */

/**
 * Experience - Work history entry for the timeline section
 */
export interface Experience {
  id: string
  title: string
  company: string
  dateRange: string
  description: string
  bulletPoints: string[]
  techStack: string[]
  type: 'tech' | 'music' | 'education'
}

/**
 * SkillCategory - Grouped skills for the skills showcase section
 */
export interface SkillCategory {
  category: string
  skills: string[]
}

/**
 * Project - Featured project for the project gallery section
 */
export interface Project {
  id: string
  title: string
  description: string
  techStack: string[]
  imageUrl: string
  liveUrl?: string
  repoUrl?: string
}

/**
 * Education - Education and certification entry
 */
export interface Education {
  id: string
  credential: string
  institution: string
  platform?: string
  year?: string
}
