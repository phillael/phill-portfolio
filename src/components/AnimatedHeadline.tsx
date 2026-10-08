'use client'

import { motion, Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
}

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 12,
    },
  },
}

export const AnimatedTagline = () => {
  return (
    <motion.div
      className="text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-center gap-1 md:gap-0 text-base md:text-lg lg:text-xl font-body"
        variants={lineVariants}
      >
        <span className="neon-text-green">Legendary Code Sorcerer</span>
        <span className="hidden md:inline mx-2 text-foreground/50">|</span>
        <span className="neon-text-purple">Vanquisher of Bugs</span>
        <span className="hidden md:inline mx-2 text-foreground/50">|</span>
        <span className="neon-text-blue">Builder of Dreams</span>
      </motion.div>
    </motion.div>
  )
}
