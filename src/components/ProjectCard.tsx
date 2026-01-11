'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Project } from '@/types/content'

interface ProjectCardProps {
  project: Project
  delay?: number
}

/**
 * ProjectCard - Individual project card with image, description, and action links
 *
 * Features:
 * - Next.js Image component for optimized screenshot display
 * - Gradient placeholder fallback when image is unavailable
 * - Project title with neon text effect
 * - Description text
 * - Tech stack rendered as badges (same pattern as SkillChip)
 * - Live Demo and View Code action buttons with neon border effects
 * - Gradient card base styling with hover hue-rotate effect
 * - Links open in new tab with proper security attributes
 */
const ProjectCard = ({ project, delay = 0 }: ProjectCardProps) => {
  const [imageError, setImageError] = useState(false)

  return (
    <motion.article
      className="gradient-card rounded-lg overflow-hidden flex flex-col h-full"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay }}
    >
      {/* Project Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {!imageError ? (
          <Image
            src={project.imageUrl}
            alt={`${project.title} screenshot`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 project-placeholder-gradient flex items-center justify-center">
            <span className="text-foreground/40 font-heading text-lg md:text-xl text-center px-4">
              {project.title}
            </span>
          </div>
        )}
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-grow p-5 md:p-6">
        {/* Title */}
        <h3 className="text-xl md:text-2xl font-heading neon-text-blue mb-3">
          {project.title}
        </h3>

        {/* Description */}
        <p className="text-foreground/80 text-sm md:text-base leading-relaxed mb-4 flex-grow">
          {project.description}
        </p>

        {/* Tech Stack Badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="
                inline-flex items-center
                px-2.5 py-1
                text-xs md:text-sm
                font-medium
                text-accent bg-muted
                rounded-md
              "
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-auto">
          {project.liveUrl && (
            <motion.a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center justify-center
                px-4 py-2
                text-sm font-medium
                text-primary bg-transparent
                border-2 border-primary
                rounded-md
                no-underline
                transition-all duration-200
                hover:bg-primary/10
                hover:shadow-[0_0_12px_hsl(var(--primary)/0.5),0_0_24px_hsl(var(--primary)/0.3)]
                hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card
              "
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.15 }}
            >
              Live Demo
            </motion.a>
          )}

          {project.repoUrl && (
            <motion.a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center justify-center
                px-4 py-2
                text-sm font-medium
                text-secondary bg-transparent
                border-2 border-secondary/60
                rounded-md
                no-underline
                transition-all duration-200
                hover:border-secondary
                hover:bg-secondary/10
                hover:shadow-[0_0_12px_hsl(var(--secondary)/0.5),0_0_24px_hsl(var(--secondary)/0.3)]
                hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-card
              "
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.15 }}
            >
              View Code
            </motion.a>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export default ProjectCard
