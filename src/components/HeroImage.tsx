'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const HeroImage = () => {
  return (
    <motion.div
      className="hero-image-container relative w-full max-w-[400px] sm:max-w-[550px] md:max-w-[670px] lg:max-w-[800px] aspect-[4/3] overflow-visible"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.8,
      }}
    >
      {/* Glow effect - extends vertically but contained horizontally to prevent overflow */}
      <div className="hero-image-glow absolute -inset-y-10 inset-x-0 rounded-full" />
      <div className="relative w-full h-full">
        <Image
          src="/images/hero-image-phill-llamas.png"
          alt="Phill Aelony wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas"
          fill
          className="object-contain z-10"
          priority
          sizes="(max-width: 640px) 400px, (max-width: 768px) 550px, (max-width: 1024px) 670px, 800px"
        />
      </div>
    </motion.div>
  )
}

export default HeroImage
