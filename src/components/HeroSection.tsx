'use client'

import HeroImage from '@/components/HeroImage'
import { AnimatedTagline } from '@/components/AnimatedHeadline'

const HeroSection = () => {
  return (
    <section
      id="hero"
      aria-label="Hero section"
      role="region"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8"
    >
      <div className="flex flex-col items-center gap-6 max-w-7xl mx-auto w-full">
        <HeroImage />
        <AnimatedTagline />
      </div>
    </section>
  )
}

export default HeroSection
