'use client'

import { motion } from 'framer-motion'

const ScrollIndicator = () => {
  const handleScrollToAbout = () => {
    const aboutSection = document.getElementById('about')
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.button
      className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={handleScrollToAbout}
      aria-label="Scroll to about section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.5 }}
    >
      <motion.div
        className="flex flex-col items-center gap-2"
        animate={{ y: [0, 10, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span className="text-sm font-body text-muted-foreground">Scroll</span>
        <svg
          className="w-6 h-6 text-primary scroll-indicator-chevron"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        <svg
          className="w-6 h-6 text-primary/70 -mt-4 scroll-indicator-chevron"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </motion.div>
    </motion.button>
  )
}

export default ScrollIndicator
