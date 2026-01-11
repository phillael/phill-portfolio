'use client'

import AnimatedSection from '@/components/AnimatedSection'
import TimelineCard from '@/components/TimelineCard'
import GlitchText from '@/components/GlitchText'
import experienceData from '@/data/experience.json'
import { Experience } from '@/types/content'

/**
 * TimelineDot - Individual timeline dot with neon glow effect
 */
const TimelineDot = () => (
  <div className="timeline-dot w-4 h-4 rounded-full flex-shrink-0" />
)

/**
 * TimelineEntry - Single timeline entry with connector dot and card
 */
const TimelineEntry = ({
  experience,
  index,
}: {
  experience: Experience
  index: number
}) => {
  return (
    <AnimatedSection delay={0.1 * index}>
      <div className="relative flex items-start gap-4 md:gap-6">
        {/* Timeline Dot - Visible on all screen sizes */}
        <div className="flex-shrink-0 relative z-10 mt-6">
          <TimelineDot />
        </div>

        {/* Card - Takes remaining space */}
        <div className="flex-1 pb-8 md:pb-12">
          <TimelineCard experience={experience} />
        </div>
      </div>
    </AnimatedSection>
  )
}

/**
 * ExperienceSection - Work experience timeline section
 *
 * Features:
 * - Section ID for navigation anchor
 * - Vertical timeline with glowing cyan line
 * - Timeline dots at each entry point with neon glow
 * - Expandable HUD-style cards for each experience
 * - Responsive layout: dots on left with cards on right
 * - Entries ordered reverse-chronologically
 * - AnimatedSection wrapper with slide-from-right variant for heading
 * - GlitchText effect on heading for hover interaction
 */
const ExperienceSection = () => {
  // Data is already ordered reverse-chronologically in the JSON
  const experiences = experienceData as Experience[]

  return (
    <section
      id="experience"
      aria-label="Work Experience"
      role="region"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Heading - slide-from-right animation variant with glitch effect */}
        <AnimatedSection variant="slide-from-right">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center mb-8 md:mb-10">
            <GlitchText as="span" className="neon-text-purple">
              Experience
            </GlitchText>
          </h2>
        </AnimatedSection>

        {/* Timeline Container */}
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div
            className="timeline-line absolute left-[7px] md:left-[7px] top-0 bottom-0 w-0.5"
            aria-hidden="true"
          />

          {/* Timeline Entries */}
          <div className="relative">
            {experiences.map((experience, index) => (
              <TimelineEntry
                key={experience.id}
                experience={experience}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ExperienceSection
