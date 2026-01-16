'use client'

import HeroImage from '@/components/HeroImage'
import { AnimatedTagline } from '@/components/AnimatedHeadline'
import { Ripple } from '@/components/ui/Ripple'
import { Vortex } from '@/components/ui/Vortex'

const HeroSection = () => {
  return (
    <section
      id="hero"
      aria-label="Hero section"
      role="region"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-hidden"
    >
      {/* Vortex sparkles effect */}
      <Vortex
        particleCount={200}
        baseHue={190}
        rangeY={200}
        baseSpeed={0.05}
        rangeSpeed={0.5}
        baseRadius={1}
        rangeRadius={1.5}
        containerClassName="absolute inset-0 z-0"
      />

      {/* Ripple effect behind hero content */}
      <Ripple
        mainCircleSize={50}
        mainCircleOpacity={0.12}
        numCircles={6}
        circleColor="hsl(190 100% 50% / 0.15)"
        className="z-[1]"
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-7xl mx-auto w-full">
        <HeroImage />
        <AnimatedTagline />
      </div>
    </section>
  )
}

export default HeroSection
