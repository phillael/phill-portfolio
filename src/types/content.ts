/**
 * TypeScript interfaces for portfolio content data structures.
 * These interfaces define the shape of data in /src/data/*.json files.
 * (The career, for the Experience section, is typed in src/data/career.ts.)
 */

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
  /** none yet: the card shows a placeholder */
  imageUrl?: string
  /** an internal path (e.g. /resume) opens in the same tab */
  liveUrl?: string
  repoUrl?: string
}

/**
 * ProjectDetails - Deep technical context for the wizard's knowledge
 */
export interface ProjectDetails {
  id: string
  architecture: string
  keyPatterns: string
  notableDetails: string
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

/**
 * Track - Audio track entry for the music player
 */
export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  audioUrl: string
  artworkUrl?: string
  description?: string
}
