'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import NavLinks from '@/components/NavLinks'
import SocialLinks from '@/components/SocialLinks'
import ResumeDownloadButton from '@/components/ResumeDownloadButton'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  hamburgerButtonRef: React.RefObject<HTMLButtonElement | null>
}

const MobileMenu = ({ isOpen, onClose, hamburgerButtonRef }: MobileMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }

      // Focus trap
      if (event.key === 'Tab' && isOpen && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Focus the close button when menu opens
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Return focus to hamburger button when menu closes
  useEffect(() => {
    if (!isOpen && hamburgerButtonRef.current) {
      hamburgerButtonRef.current.focus()
    }
  }, [isOpen, hamburgerButtonRef])

  const menuVariants: Variants = {
    closed: {
      x: '100%',
      opacity: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
  }

  const backdropVariants: Variants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.3,
      },
    },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <motion.div
            ref={menuRef}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-gradient-to-b from-background to-card z-50 md:hidden"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Neon border accent on left edge */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-secondary to-accent" />

            {/* Close button */}
            <div className="flex justify-end p-4">
              <motion.button
                ref={firstFocusableRef}
                className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={onClose}
                aria-label="Close navigation menu"
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            </div>

            {/* Navigation links, Resume Download, and Social links */}
            <nav className="flex flex-col items-center justify-center h-[calc(100%-80px)] px-8">
              <NavLinks onLinkClick={onClose} isMobile />

              {/* Resume Download Button */}
              <div className="mt-8 w-full max-w-xs">
                <ResumeDownloadButton variant="mobile" />
              </div>

              {/* Social Links */}
              <div className="mt-12 pt-8 border-t border-primary/30">
                <SocialLinks isMobile />
              </div>
            </nav>

            {/* Decorative neon glow at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileMenu
