'use client'

import { motion } from 'framer-motion'
import AnimatedSection from '@/components/AnimatedSection'
import ProjectCard from '@/components/ProjectCard'
import projectsData from '@/data/projects.json'
import { Project } from '@/types/content'

/**
 * ProjectsSection - Project gallery section with featured projects
 *
 * Features:
 * - Section ID for navigation anchor (#projects)
 * - Proper accessibility attributes (role, aria-label)
 * - Section heading with neon-text-purple effect
 * - Data imported from /src/data/projects.json
 * - ProjectCard for each project with staggered entrance animations
 * - Responsive grid: single column on mobile, 3 columns on desktop (lg+)
 */
const ProjectsSection = () => {
  const projects = projectsData as Project[]

  return (
    <section
      id="projects"
      aria-label="Projects"
      role="region"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <AnimatedSection>
          <motion.h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center neon-text-purple mb-12 md:mb-16">
            Projects
          </motion.h2>
        </AnimatedSection>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              delay={0.1 * (index + 1)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProjectsSection
