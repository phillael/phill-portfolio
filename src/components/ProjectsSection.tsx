import projectsData from '@/data/projects.json'
import mediaData from '@/data/projects-media.json'
import type { Project } from '@/types/content'
import type { MediaEntry } from '@/lib/vault/vault'
import ProjectsVault from '@/components/projects/ProjectsVault'
import css from '@/components/projects/Projects.module.css'

const projects = projectsData as Project[]
const media = mediaData as Record<string, MediaEntry>

/**
 * ProjectsSection - the Relic Vault (mockup docs/design/projects-vault/; plan
 * docs/plans/2026-10-22-projects-vault-plan.md): it's the year 4789, and a museum shows the apps on the
 * televisions it believes are period-correct. The header follows the Skills section's; ProjectsVault holds the
 * hall (a lazy three.js engine, src/lib/vault/), the museum card (every exhibit's tab panel is in the HTML)
 * and the exhibit names. Content: src/data/projects.json; videos and posters: projects-media.json (generated
 * by scripts/encode-projects.mjs).
 */
const ProjectsSection = () => (
  <section id="projects" aria-labelledby="projects-h" className={css.section}>
    <header>
      <h2 id="projects-h" className={css.eyebrow}>
        Projects
      </h2>
      <p className={`${css.title} neon-text-purple`}>Some Stuff I Built</p>
      <p className={css.lede}>Here are a few things I am working on in my free time.</p>
    </header>
    <ProjectsVault projects={projects} media={media} />
  </section>
)

export default ProjectsSection
