'use client'

import { motion } from 'framer-motion'

interface HamburgerButtonProps {
  isOpen: boolean
  onClick: () => void
}

const HamburgerButton = ({ isOpen, onClick }: HamburgerButtonProps) => {
  const lineVariants = {
    closed: {
      rotate: 0,
      translateY: 0,
    },
    open: {
      rotate: 45,
      translateY: 8,
    },
  }

  const middleLineVariants = {
    closed: {
      opacity: 1,
      scaleX: 1,
    },
    open: {
      opacity: 0,
      scaleX: 0,
    },
  }

  const bottomLineVariants = {
    closed: {
      rotate: 0,
      translateY: 0,
    },
    open: {
      rotate: -45,
      translateY: -8,
    },
  }

  return (
    <motion.button
      className="md:hidden relative flex flex-col justify-center items-center w-11 h-11 min-w-[44px] min-h-[44px] p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={onClick}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="absolute w-6 h-0.5 bg-primary rounded-full"
        style={{ top: '13px' }}
        variants={lineVariants}
        animate={isOpen ? 'open' : 'closed'}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute w-6 h-0.5 bg-primary rounded-full"
        style={{ top: '21px' }}
        variants={middleLineVariants}
        animate={isOpen ? 'open' : 'closed'}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute w-6 h-0.5 bg-primary rounded-full"
        style={{ top: '29px' }}
        variants={bottomLineVariants}
        animate={isOpen ? 'open' : 'closed'}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      />
    </motion.button>
  )
}

export default HamburgerButton
