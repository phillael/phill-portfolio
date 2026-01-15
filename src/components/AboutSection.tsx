'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/AnimatedSection'
import GlitchText from '@/components/GlitchText'
import GlowEffect from '@/components/GlowEffect'
import Testimonials3DCarousel from '@/components/Testimonials3DCarousel'

/**
 * HighlightedText - Renders text with neon glow effect
 * Uses same neon-text-* classes as the hero tagline for consistency
 */
const HighlightedText = ({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent'
}) => {
  const variantClasses = {
    primary: 'neon-text-blue',
    secondary: 'neon-text-purple',
    accent: 'neon-text-green',
  }

  return (
    <span className={`font-semibold ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

/**
 * BioParagraph - Individual paragraph with staggered animation
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
        className="text-base md:text-lg lg:text-xl leading-relaxed text-[hsl(var(--foreground))]"
      >
        {children}
      </p>
    </AnimatedSection>
  )
}

/**
 * AboutSection - Personal bio section with 3D testimonials carousel
 *
 * Structure:
 * 1. Bio content with space llama image (readable, accessible)
 * 2. 3D cylindrical testimonials carousel below
 *
 * Features:
 * - All 4 bio paragraphs with HighlightedText neon effects
 * - BioParagraph staggered animations on scroll
 * - GlitchText effect on heading
 * - Space llama with neon glow
 * - 3D testimonials carousel with drag-to-rotate
 * - Responsive typography and spacing
 * - WCAG 2.1 AA compliant accessibility
 */
const AboutSection = () => {
  return (
    <section
      id="about"
      aria-label="About section"
      role="region"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6 lg:px-8 overflow-visible"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center mb-12 md:mb-16">
            <GlitchText as="span" className="neon-text-purple">
              About
            </GlitchText>
          </h2>
        </AnimatedSection>

        {/* Bio Content with Space Llama */}
        <div className="flex flex-col-reverse md:flex-row items-center md:items-start gap-6 md:gap-8 lg:gap-12">
          {/* Bio Text */}
          <div className="flex-1 space-y-4 md:space-y-6 lg:space-y-8">
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

            {/* Testimonials Preview - shown on mobile after bio text */}
            <div className="md:hidden pt-4">
              <AnimatedSection delay={0.5}>
                <Testimonials3DCarousel />
              </AnimatedSection>
            </div>
          </div>

          {/* Space Llama Image + Testimonials Preview (desktop only) */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <AnimatedSection delay={0.2} variant="scale-up">
              <div className="relative w-[200px] h-[200px] md:w-[250px] md:h-[250px] lg:w-[300px] lg:h-[300px]">
                <GlowEffect size="md" />
                <Image
                  src="/images/space_llama.png"
                  alt="Space llama astronaut mascot"
                  fill
                  className="object-contain relative z-10"
                  sizes="(max-width: 768px) 200px, (max-width: 1024px) 250px, 300px"
                  priority
                />
              </div>
            </AnimatedSection>

            {/* 3D Testimonials Carousel Preview - desktop only, under llama */}
            <div className="hidden md:block">
              <AnimatedSection delay={0.5}>
                <Testimonials3DCarousel />
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection
