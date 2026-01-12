'use client'

import { motion } from 'framer-motion'

interface HamburgerButtonProps {
  isOpen: boolean
  onClick: () => void
}

/**
 * Custom hamburger (food) SVG icon - Neon sign style
 * Simple single-color outline like a Tokyo midnight burger joint sign
 */
const BurgerIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Top bun - dome shape */}
    <path d="M3 11h18c0-4-4-7-9-7s-9 3-9 7z" />
    {/* Lettuce/toppings - wavy line */}
    <path d="M3 13c1.5 0 2-1 3-1s1.5 1 3 1 2-1 3-1 1.5 1 3 1 2-1 3-1 1.5 1 3 1" />
    {/* Patty */}
    <rect x="3" y="15" width="18" height="2" rx="1" />
    {/* Bottom bun */}
    <path d="M3 19h18c0 1.5-1.5 3-4 3H7c-2.5 0-4-1.5-4-3z" />
  </svg>
)

/**
 * X close icon
 */
const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/**
 * HamburgerButton - A literal hamburger 🍔 menu button!
 *
 * Features:
 * - Custom SVG burger icon
 * - Wiggles/bounces on hover
 * - Transforms to X when open
 * - Fun and memorable for a portfolio site
 */
const HamburgerButton = ({ isOpen, onClick }: HamburgerButtonProps) => {
  return (
    <motion.button
      className="md:hidden relative flex justify-center items-center w-9 h-9 min-w-[44px] min-h-[44px] bg-transparent border-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={onClick}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
      whileHover={{
        scale: 1.15,
        rotate: [0, -8, 8, -8, 0],
        transition: { rotate: { duration: 0.4 } }
      }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        className="w-7 h-7"
        style={{
          filter: isOpen
            ? 'drop-shadow(0 0 4px hsl(280 100% 75%)) drop-shadow(0 0 10px hsl(280 100% 75%)) drop-shadow(0 0 20px hsl(280 100% 65%))'
            : 'drop-shadow(0 0 3px hsl(190 100% 75%)) drop-shadow(0 0 8px hsl(190 100% 75%))'
        }}
        animate={isOpen ? {
          rotate: 180,
          scale: [1, 0.8, 1],
        } : {
          rotate: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeInOut',
        }}
      >
        {isOpen ? (
          <CloseIcon className="w-full h-full text-secondary" />
        ) : (
          <BurgerIcon className="w-full h-full text-primary" />
        )}
      </motion.div>
    </motion.button>
  )
}

export default HamburgerButton
