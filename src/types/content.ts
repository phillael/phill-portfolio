/**
 * TypeScript interfaces for portfolio content data structures.
 * These interfaces define the shape of data in /src/data/*.json files.
 * (The career, for the Experience section, is typed in src/data/career.ts; the skills in src/data/skills.ts.)
 */

/** The television an exhibit stands on in the Relic Vault (each one is built in src/lib/vault/sets.ts) */
export type ProjectTv = 'pocket' | 'tube' | 'terminal' | 'sphere' | 'portable' | 'console'

/**
 * Project - an exhibit in the Projects section (the Relic Vault); its video and poster are in projects-media.json
 */
export interface Project {
  id: string
  title: string
  /** the tab's name when the title is long */
  short?: string
  /** the repo's first commit: "Recovered from {year}" */
  year: number
  tv: ProjectTv
  /** the caption: "Displayed on {set}." */
  set: string
  description: string
  techStack: string[]
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
