'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion, PanInfo } from 'framer-motion'
import Image from 'next/image'
import AnimatedSection from '@/components/AnimatedSection'
import GlitchText from '@/components/GlitchText'
import TestimonialCard from '@/components/TestimonialCard'
import ParticleBackground from '@/components/ParticleBackground'
import { testimonials } from '@/data/testimonials'

/**
 * HighlightedText - Renders text with subtle neon glow effect
 * Preserved from original AboutSection component
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
 * Preserved from original AboutSection component
 *
 * Responsive typography:
 * - Mobile: text-base
 * - Tablet (md): text-lg
 * - Desktop (lg): text-xl
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
 * Slide titles for ARIA announcements
 */
const SLIDE_TITLES = [
  'About Me',
  ...testimonials.map((t) => `${t.name}'s Testimonial`),
]

/**
 * Total number of slides in the carousel
 */
const TOTAL_SLIDES = 1 + testimonials.length // 1 About slide + 5 testimonials = 6

/**
 * Drag threshold for triggering slide change (in pixels)
 */
const DRAG_THRESHOLD = 50

/**
 * Velocity threshold for triggering slide change (in pixels per second)
 */
const VELOCITY_THRESHOLD = 200

/**
 * AboutCarousel - Multi-slide carousel featuring bio content and testimonials
 *
 * Features:
 * - 6 slides: 1 About slide with space llama + 5 testimonial slides
 * - Arrow navigation, dot indicators, keyboard navigation, and swipe/drag gestures
 * - Framer Motion AnimatePresence for smooth slide transitions
 * - React Three Fiber ParticleBackground as ambient background
 * - ARIA live region for screen reader announcements
 * - Respects prefers-reduced-motion accessibility preference
 * - Focus trap when carousel is actively navigated
 *
 * Responsive Design:
 * - Mobile (320px - 768px): Stack layout, swipe-primary navigation, smaller/hidden arrows
 * - Tablet (768px - 1024px): Side-by-side About content, arrows visible and tappable
 * - Desktop (1024px+): Max-width container, all navigation options visible
 */
const AboutCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isCarouselFocused, setIsCarouselFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const slidePanelRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion() ?? false

  /**
   * Slide transition animation variants
   */
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  }

  /**
   * Track direction for animation purposes
   */
  const [direction, setDirection] = useState(0)

  /**
   * Navigate with direction tracking for animations
   */
  const navigateWithDirection = useCallback((newSlide: number) => {
    setDirection(newSlide > currentSlide ? 1 : -1)
    setCurrentSlide(newSlide)
  }, [currentSlide])

  /**
   * Handle dot indicator click - navigate to specific slide
   */
  const handleDotClick = useCallback((index: number) => {
    if (index >= 0 && index < TOTAL_SLIDES && index !== currentSlide) {
      navigateWithDirection(index)
    }
  }, [currentSlide, navigateWithDirection])

  /**
   * Handle dot indicator keyboard activation (Enter/Space)
   */
  const handleDotKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDotClick(index)
    }
  }, [handleDotClick])

  /**
   * Navigate to next slide with direction tracking
   */
  const handleNext = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setDirection(1)
      setCurrentSlide((prev) => prev + 1)
    }
  }, [currentSlide])

  /**
   * Navigate to previous slide with direction tracking
   */
  const handlePrevious = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((prev) => prev - 1)
    }
  }, [currentSlide])

  /**
   * Handle drag/swipe gesture end with direction tracking
   * Uses velocity and offset to determine direction and intent
   */
  const handleDragEndWithDirection = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { velocity, offset } = info

      // Swipe left (negative) -> go to next slide
      if (velocity.x < -VELOCITY_THRESHOLD || offset.x < -DRAG_THRESHOLD) {
        if (currentSlide < TOTAL_SLIDES - 1) {
          setDirection(1)
          setCurrentSlide((prev) => prev + 1)
        }
      }
      // Swipe right (positive) -> go to previous slide
      else if (velocity.x > VELOCITY_THRESHOLD || offset.x > DRAG_THRESHOLD) {
        if (currentSlide > 0) {
          setDirection(-1)
          setCurrentSlide((prev) => prev - 1)
        }
      }
    },
    [currentSlide]
  )

  /**
   * Handle keyboard navigation with direction tracking
   * Arrow keys navigate slides, Tab moves through elements
   */
  const handleKeyDownWithDirection = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handlePrevious()
      }
    },
    [handleNext, handlePrevious]
  )

  /**
   * Focus trap implementation - keeps focus within carousel when actively navigating
   * References pattern from MobileMenu.tsx
   */
  useEffect(() => {
    if (!isCarouselFocused || !containerRef.current) return

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [role="tab"], [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift+Tab from first element -> wrap to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      }
      // Tab from last element -> wrap to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleFocusTrap)

    return () => {
      document.removeEventListener('keydown', handleFocusTrap)
    }
  }, [isCarouselFocused])

  /**
   * Track focus state for focus trap activation
   */
  const handleFocus = useCallback(() => {
    setIsCarouselFocused(true)
  }, [])

  const handleBlur = useCallback((event: React.FocusEvent) => {
    // Only mark as unfocused if focus is leaving the carousel entirely
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setIsCarouselFocused(false)
    }
  }, [])

  // Compute disabled states for navigation buttons
  const isPrevDisabled = currentSlide === 0
  const isNextDisabled = currentSlide === TOTAL_SLIDES - 1

  // Generate unique IDs for ARIA linking
  const getTabId = (index: number) => `carousel-tab-${index}`
  const getTabPanelId = (index: number) => `carousel-tabpanel-${index}`

  return (
    <section
      ref={containerRef}
      id="about"
      aria-label="About section"
      role="region"
      aria-roledescription="carousel"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6 lg:px-8 relative overflow-hidden"
      onKeyDown={handleKeyDownWithDirection}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
    >
      {/* Particle Background */}
      <ParticleBackground className="z-0" />

      {/* ARIA Live Region for slide announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Slide {currentSlide + 1} of {TOTAL_SLIDES}: {SLIDE_TITLES[currentSlide]}
      </div>

      {/* Carousel Content Container - max-w-4xl matches existing AboutSection */}
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Heading with glitch effect - responsive typography */}
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center mb-12 md:mb-16">
            <GlitchText as="span" className="neon-text-purple">
              About
            </GlitchText>
          </h2>
        </AnimatedSection>

        {/* Slides Container with tabpanel role - responsive min-height */}
        <div className="relative min-h-[500px] md:min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              ref={slidePanelRef}
              key={currentSlide}
              custom={direction}
              variants={shouldReduceMotion ? undefined : slideVariants}
              initial={shouldReduceMotion ? { opacity: 1 } : 'enter'}
              animate={shouldReduceMotion ? { opacity: 1 } : 'center'}
              exit={shouldReduceMotion ? { opacity: 1 } : 'exit'}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 300, damping: 30 }
              }
              drag={shouldReduceMotion ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEndWithDirection}
              className="w-full"
              role="tabpanel"
              id={getTabPanelId(currentSlide)}
              aria-labelledby={getTabId(currentSlide)}
              data-testid="carousel-slide"
            >
              {currentSlide === 0 ? (
                /* About Slide (Slide 0) */
                <AboutSlideContent />
              ) : (
                /* Testimonial Slides (Slides 1-5) - responsive padding */
                <div className="px-2 md:px-4 lg:px-6">
                  <TestimonialCard
                    testimonial={testimonials[currentSlide - 1]}
                    isActive={true}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls - responsive layout and sizing */}
        <div className="flex items-center justify-center gap-2 md:gap-4 mt-8">
          {/* Previous Arrow Button - smaller on mobile, normal on tablet/desktop */}
          <motion.button
            onClick={handlePrevious}
            disabled={isPrevDisabled}
            aria-label="Previous slide"
            className={`
              flex items-center justify-center
              min-w-[44px] min-h-[44px]
              w-9 h-9 md:w-11 md:h-11
              rounded-full
              border-2 border-primary/50
              bg-card/80 backdrop-blur-sm
              transition-all duration-150 ease-out
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              ${isPrevDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5),0_0_24px_hsl(var(--primary)/0.3)]'
              }
            `}
            whileHover={shouldReduceMotion || isPrevDisabled ? undefined : { scale: 1.05 }}
            whileTap={shouldReduceMotion || isPrevDisabled ? undefined : { scale: 0.95 }}
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>

          {/* Dot Indicators - responsive gap and touch targets */}
          <div
            role="tablist"
            aria-label="Slide indicators"
            className="flex items-center gap-1 md:gap-2"
          >
            {Array.from({ length: TOTAL_SLIDES }).map((_, index) => (
              <button
                key={index}
                id={getTabId(index)}
                role="tab"
                aria-selected={currentSlide === index}
                aria-controls={getTabPanelId(index)}
                aria-label={`Go to slide ${index + 1}: ${SLIDE_TITLES[index]}`}
                onClick={() => handleDotClick(index)}
                onKeyDown={(e) => handleDotKeyDown(e, index)}
                tabIndex={currentSlide === index ? 0 : -1}
                className={`
                  min-w-[44px] min-h-[44px]
                  flex items-center justify-center
                  transition-transform duration-150
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-background
                  ${currentSlide !== index ? 'hover:scale-110' : ''}
                `}
              >
                <span
                  className={`
                    w-2.5 h-2.5 md:w-3 md:h-3 rounded-full
                    transition-all duration-200
                    ${
                      currentSlide === index
                        ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)),0_0_16px_hsl(var(--primary))]'
                        : 'bg-muted hover:bg-muted-foreground/50'
                    }
                  `}
                />
              </button>
            ))}
          </div>

          {/* Next Arrow Button - smaller on mobile, normal on tablet/desktop */}
          <motion.button
            onClick={handleNext}
            disabled={isNextDisabled}
            aria-label="Next slide"
            className={`
              flex items-center justify-center
              min-w-[44px] min-h-[44px]
              w-9 h-9 md:w-11 md:h-11
              rounded-full
              border-2 border-primary/50
              bg-card/80 backdrop-blur-sm
              transition-all duration-150 ease-out
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              ${isNextDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5),0_0_24px_hsl(var(--primary)/0.3)]'
              }
            `}
            whileHover={shouldReduceMotion || isNextDisabled ? undefined : { scale: 1.05 }}
            whileTap={shouldReduceMotion || isNextDisabled ? undefined : { scale: 0.95 }}
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.button>
        </div>
      </div>
    </section>
  )
}

/**
 * AboutSlideContent - The bio content with space llama image
 * Preserves all existing AboutSection content
 *
 * Responsive Layout:
 * - Mobile: flex-col-reverse (image above text), 200px image
 * - Tablet: flex-row (side-by-side), 250px image
 * - Desktop: flex-row with larger gaps, 300px image
 */
const AboutSlideContent = () => {
  return (
    <div className="flex flex-col-reverse md:flex-row items-center md:items-start gap-6 md:gap-8 lg:gap-12">
      {/* Bio Content - responsive spacing */}
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
      </div>

      {/* Space Llama Image - responsive sizing */}
      <div className="flex-shrink-0">
        <AnimatedSection delay={0.2} variant="scale-up">
          <div
            className="relative w-[200px] h-[200px] md:w-[250px] md:h-[250px] lg:w-[300px] lg:h-[300px]"
            style={{
              filter: `
                drop-shadow(0 0 10px hsl(280, 100%, 75%))
                drop-shadow(0 0 20px hsl(280, 100%, 65%))
                drop-shadow(0 0 30px hsl(280, 100%, 55%))
              `,
            }}
          >
            <Image
              src="/images/space_llama.png"
              alt="Space llama astronaut mascot"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 200px, (max-width: 1024px) 250px, 300px"
              priority
            />
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}

export default AboutCarousel
