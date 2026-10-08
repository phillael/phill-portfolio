'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Tab cycling + focus on the close button. Focus goes back to the hamburger
  // explicitly below, since Safari doesn't focus buttons on click.
  useFocusTrap(menuRef, isOpen && mounted, {
    initialFocusRef: firstFocusableRef,
    returnFocus: false,
  })

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Simple overflow hidden - works for most cases
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Return focus to hamburger button when menu closes (not on first mount,
  // which would steal focus from the top of the page)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false
      hamburgerButtonRef.current?.focus()
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

  // Don't render on server
  if (!mounted) return null

  // Portal to body so it's outside #shroom-target filter
  return createPortal(
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
            className="fixed inset-0 w-full h-full bg-gradient-to-b from-background to-card z-50 md:hidden flex flex-col overflow-hidden"
            style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
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
            <div className="flex justify-end p-4 flex-shrink-0">
              <motion.button
                ref={firstFocusableRef}
                className="flex items-center justify-center w-9 h-9 min-w-[44px] min-h-[44px] bg-transparent border-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={onClose}
                aria-label="Close navigation menu"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.1 }}
              >
                <div
                  className="w-7 h-7"
                  style={{
                    filter: 'drop-shadow(0 0 4px hsl(280 100% 75%)) drop-shadow(0 0 10px hsl(280 100% 75%)) drop-shadow(0 0 20px hsl(280 100% 65%))'
                  }}
                >
                  <svg
                    className="w-full h-full text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </motion.button>
            </div>

            {/* Navigation links, Resume Download, and Social links */}
            <nav className="flex-1 flex flex-col items-center justify-center px-8 pb-6 gap-2">
              <NavLinks onLinkClick={onClose} isMobile />

              {/* Resume Download Button */}
              <div className="mt-4 w-full max-w-xs">
                <ResumeDownloadButton variant="mobile" />
              </div>

              {/* Social Links */}
              <div className="mt-4 pt-4 border-t border-primary/30">
                <SocialLinks isMobile />
              </div>
            </nav>

            {/* Decorative neon glow at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default MobileMenu
