'use client'

import AnimatedSection from '@/components/AnimatedSection'
import GlitchText from '@/components/GlitchText'

/**
 * HighlightedText - Renders text with subtle neon glow effect
 */
const HighlightedText = ({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent'
}) => {
  const variantClasses = {
    primary: 'text-[hsl(var(--primary))] neon-text-blue',
    secondary: 'text-[hsl(var(--secondary))] neon-text-purple',
    accent: 'text-[hsl(var(--accent))] neon-text-green',
  }

  return (
    <span className={`font-semibold ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

/**
 * BioParagraph - Individual paragraph with semantic role
 */
const BioParagraph = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) => {
  return (
    <AnimatedSection delay={delay}>
      <p
        role="paragraph"
        className="text-lg md:text-xl leading-relaxed text-[hsl(var(--foreground))]"
      >
        {children}
      </p>
    </AnimatedSection>
  )
}

/**
 * AboutSection - Personal bio section with animated reveals
 *
 * Features:
 * - Section ID for navigation anchor
 * - Staggered paragraph animations on scroll
 * - Key term highlighting with neon effects
 * - GlitchText effect on heading for hover interaction
 * - Responsive typography and spacing
 */
const AboutSection = () => {
  return (
    <section
      id="about"
      aria-label="About section"
      role="region"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Heading with glitch effect */}
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center mb-12 md:mb-16">
            <GlitchText as="span" className="neon-text-purple">
              About
            </GlitchText>
          </h2>
        </AnimatedSection>

        {/* Bio Content */}
        <div className="space-y-8 md:space-y-10">
          {/* Paragraph 1: Minneapolis origin, music beginnings */}
          <BioParagraph delay={0.1}>
            I was born and raised in{' '}
            <HighlightedText variant="primary">Minneapolis, MN</HighlightedText>
            ! I began playing music at a young age and eventually went to the{' '}
            <HighlightedText variant="primary">
              University of North Texas
            </HighlightedText>{' '}
            to study jazz guitar.
          </BioParagraph>

          {/* Paragraph 2: Band career, touring */}
          <BioParagraph delay={0.2}>
            I spent many years playing in bands, touring, recording, teaching,
            and traveling the world. I crushed it. I played with an epic band
            called{' '}
            <HighlightedText variant="secondary">
              The Funky Knuckles
            </HighlightedText>
            . However all of this grew tiresome, so I used my insanely powerful
            mind and firey unparallelled discipline to teach myself computer
            programming.
          </BioParagraph>

          {/* Paragraph 3: Eco video game */}
          <BioParagraph delay={0.3}>
            Oh yeah I also composed a ton of music for a video game called{' '}
            <HighlightedText variant="accent">Eco</HighlightedText> which is
            available on Steam and I did an awesome job.
          </BioParagraph>

          {/* Paragraph 4: Programming career */}
          <BioParagraph delay={0.4}>
            I was so good at programming that my first job was at{' '}
            <HighlightedText variant="primary">Microsoft</HighlightedText>. That
            grew tiresome so I moved on to work at some more interesting
            startups, and now I am doing full stack development for a company
            called{' '}
            <HighlightedText variant="secondary">TimelyCare</HighlightedText>{' '}
            and it is awesome and I do great work.
          </BioParagraph>
        </div>
      </div>
    </section>
  )
}

export default AboutSection
