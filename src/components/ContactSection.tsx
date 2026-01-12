'use client'

import { motion } from 'framer-motion'
import AnimatedSection from '@/components/AnimatedSection'
import GlitchText from '@/components/GlitchText'

/**
 * LinkedIn CTA Button - Primary contact method with neon glow effect
 *
 * Features:
 * - Prominent styling with neon glow hover effect
 * - 44x44px minimum touch target
 * - Focus-visible ring for accessibility
 * - Opens in new tab with proper security attributes
 */
const LinkedInButton = () => {
  return (
    <motion.a
      href="https://www.linkedin.com/in/phill-aelony"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Connect with Phill on LinkedIn"
      className="
        inline-flex items-center justify-center gap-3
        px-8 py-4 min-h-[44px] min-w-[44px]
        bg-[hsl(var(--primary)/0.15)]
        border-2 border-[hsl(var(--primary))]
        rounded-md
        text-[hsl(var(--primary))]
        font-heading text-lg md:text-xl
        no-underline
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
      "
      whileHover={{
        scale: 1.05,
        backgroundColor: 'hsl(190 100% 75% / 0.25)',
        boxShadow: '0 0 20px hsl(190 100% 75% / 0.6), 0 0 40px hsl(190 100% 75% / 0.3)',
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* LinkedIn Icon */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
      Seeketh me upon the LinkedIn
    </motion.a>
  )
}

/**
 * GitHub Link - Secondary contact/social option
 *
 * Styled as a subtle text link to maintain visual hierarchy
 * with LinkedIn as the primary CTA
 */
const GitHubLink = () => {
  return (
    <motion.a
      href="https://github.com/phillael"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Visit Phill's GitHub profile"
      className="
        inline-flex items-center justify-center gap-2
        min-h-[44px] min-w-[44px]
        text-[hsl(var(--foreground)/0.7)]
        no-underline
        transition-all duration-200 ease-out
        hover:text-[hsl(var(--primary))]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        rounded-md px-4 py-2
      "
      whileHover={{
        scale: 1.05,
        filter: 'drop-shadow(0 0 8px hsl(190 100% 75%))',
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* GitHub Icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
      <span className="font-body">GitHub</span>
    </motion.a>
  )
}

/**
 * ContactSection - Simplified contact section featuring LinkedIn as primary contact method
 *
 * Features:
 * - LinkedIn featured prominently as primary contact CTA
 * - Clear messaging: "The best way to reach me is through LinkedIn"
 * - GitHub as secondary social link
 * - NO email address displayed (available in resume PDF only)
 * - NO contact form
 * - Cyberpunk aesthetic with neon glow effects
 * - GlitchText effect on heading for hover interaction
 * - Accessible with proper ARIA labels and focus states
 */
const ContactSection = () => {
  return (
    <section
      id="contact"
      aria-label="Contact section"
      role="region"
      className="py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Section Heading with glitch effect */}
        <AnimatedSection variant="fade-up">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading mb-8 md:mb-12">
            <GlitchText as="span" className="neon-text-blue">
              Contact
            </GlitchText>
          </h2>
        </AnimatedSection>

        {/* Explanatory text */}
        <AnimatedSection variant="fade-in" delay={0.1}>
          <p className="text-lg md:text-xl text-[hsl(var(--foreground)/0.8)] mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed">
       You can contact me via telepathy, oouija board, or fax machine. If those don't work, you can reach out on LinkedIn.
          </p>
        </AnimatedSection>

        {/* Primary CTA - LinkedIn Button */}
        <AnimatedSection variant="scale-up" delay={0.2}>
          <div className="mb-8">
            <LinkedInButton />
          </div>
        </AnimatedSection>

        {/* Secondary - GitHub Link */}
        <AnimatedSection variant="fade-in" delay={0.3}>
          <div className="flex items-center justify-center gap-4">
            <span className="text-[hsl(var(--foreground)/0.5)] text-sm">
              Also find me on
            </span>
            <GitHubLink />
          </div>
        </AnimatedSection>

        {/* Footer copyright */}
        <AnimatedSection variant="fade-in" delay={0.4}>
          <div className="mt-16 md:mt-24 pt-8 border-t border-[hsl(var(--primary)/0.2)]">
            <p className="text-sm text-[hsl(var(--foreground)/0.5)]">
              {new Date().getFullYear()} Phill Aelony. Built React, Typescript, and Next.js.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default ContactSection
