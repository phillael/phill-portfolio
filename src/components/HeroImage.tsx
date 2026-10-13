'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import GlowEffect from '@/components/GlowEffect'
import { openResume, prefetchResume, registerHero } from '@/components/jelly/resumeTrigger'

const HINT =
  'pointer-events-none absolute z-20 whitespace-nowrap rounded-full border border-[rgba(128,234,255,0.55)] bg-[rgba(5,8,18,0.82)] font-body text-[13px] font-semibold text-[#e9fbff] shadow-[0_0_14px_rgba(128,234,255,0.35)]'

/**
 * The hero photo, and the way into the 3D resume: a real button. Hover or focus brightens
 * the glow, lifts the photo and shows a hint that follows the cursor (touch screens get a
 * small tag instead); clicking dissolves the photo into the resume from the click point.
 */
const HeroImage = () => {
  const moveHint = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--tx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--ty', `${e.clientY - r.top}px`)
  }
  const resetHint = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.removeProperty('--tx')
    e.currentTarget.style.removeProperty('--ty')
  }

  return (
    <motion.div
      className="group/hero hero-image-container relative w-full max-w-[400px] sm:max-w-[550px] md:max-w-[670px] lg:max-w-[800px] aspect-[4/3] overflow-visible"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.8,
      }}
    >
      {/* Animated glow effect - extends vertically but contained horizontally; brighter while the photo is hovered or focused */}
      <GlowEffect
        inset="-inset-y-10 inset-x-0"
        className="transition-[transform,filter] duration-300 group-hover/hero:brightness-150 group-focus-within/hero:brightness-150 motion-safe:group-hover/hero:scale-[1.12] motion-safe:group-focus-within/hero:scale-[1.12]"
      />

      <button
        type="button"
        aria-label="Open the interactive resume"
        // detail 0: Enter/Space, so the dissolve starts from the photo's center
        onClick={(e) => openResume({ origin: e.detail === 0 ? null : { x: e.clientX, y: e.clientY }, tint: 0, opener: e.currentTarget })}
        onPointerEnter={prefetchResume}
        onFocus={prefetchResume}
        onTouchStart={prefetchResume}
        onPointerMove={moveHint}
        onPointerLeave={resetHint}
        className="group/btn relative block h-full w-full cursor-pointer rounded-xl border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-safe:transition-transform motion-safe:duration-[250ms] motion-safe:hover:-translate-y-1.5 motion-safe:focus-visible:-translate-y-1.5"
      >
        <Image
          ref={registerHero}
          src="/images/hero-image-phill-llamas.png"
          alt="Phill Aelony wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas"
          fill
          className="object-contain z-10"
          priority
          sizes="(max-width: 640px) 400px, (max-width: 768px) 550px, (max-width: 1024px) 670px, 800px"
        />
        {/* the hint follows the cursor (--tx/--ty, set without re-rendering) */}
        <span
          aria-hidden="true"
          className={`${HINT} left-[var(--tx,50%)] top-[var(--ty,88%)] -translate-x-1/2 -translate-y-[150%] px-3 py-1.5 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100 [@media(pointer:coarse)]:hidden`}
        >
          ✨ click to open my resume
        </span>
        <span aria-hidden="true" className={`${HINT} bottom-3 left-1/2 hidden -translate-x-1/2 px-3 py-1 [@media(pointer:coarse)]:block`}>
          ✨ tap to open my resume
        </span>
      </button>
    </motion.div>
  )
}

export default HeroImage
