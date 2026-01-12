'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { X } from 'lucide-react'

interface MusicPlayerPanelProps {
  isExpanded: boolean
  onClose: () => void
  children: React.ReactNode
  fabRef?: React.RefObject<HTMLButtonElement | null>
}

/**
 * Expanded player panel component.
 *
 * Features:
 * - Slides up from FAB location with Framer Motion animation
 * - Fixed positioning in bottom-right corner
 * - 320px width on desktop, near-full-width on mobile
 * - gradient-card background with neon border accent
 * - X button to close with focus management
 * - Focus trap within panel when open
 * - Escape key closes panel
 * - Returns focus to FAB when closed
 *
 * @param isExpanded - Whether the panel is visible
 * @param onClose - Callback to close the panel
 * @param children - Panel content (controls, track info, etc.)
 * @param fabRef - Reference to FAB button for focus return
 */
const MusicPlayerPanel = ({
  isExpanded,
  onClose,
  children,
  fabRef
}: MusicPlayerPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Animation variants - simple fade, no slide
  const panelVariants: Variants = {
    hidden: {
      opacity: 0,
      transition: {
        duration: 0.15
      }
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15
      }
    }
  }

  const backdropVariants: Variants = {
    hidden: {
      opacity: 0,
      transition: {
        duration: 0.2
      }
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  }

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap
      if (event.key === 'Tab' && isExpanded && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    [isExpanded, onClose]
  )

  // Set up keyboard listener, focus management, and scroll lock
  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown)
      // Simple overflow hidden
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      // Focus the close button when panel opens
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isExpanded, handleKeyDown])

  // Return focus to FAB when panel closes
  useEffect(() => {
    if (!isExpanded && fabRef?.current) {
      fabRef.current.focus()
    }
  }, [isExpanded, fabRef])

  return (
    <AnimatePresence>
      {isExpanded && (
        <>
          {/* Backdrop - visible on mobile */}
          <motion.div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            aria-hidden="true"
            data-testid="panel-backdrop"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="
              fixed z-50
              md:bottom-24 md:right-6 md:w-[320px] md:rounded-lg md:inset-x-auto
              inset-x-0 bottom-0 w-full rounded-t-lg
              max-h-[85vh] overflow-y-auto custom-scrollbar
              bg-background md:gradient-card
              border border-primary/30
            "
            style={{
              boxShadow: '0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.1)',
              overscrollBehavior: 'contain'
            }}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Music player"
            data-testid="music-player-panel"
          >
            {/* Neon border accent on top edge */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary" />

            {/* Header with close button */}
            <div className="flex justify-between items-center p-3 border-b border-primary/20">
              <h2 className="text-sm font-heading text-primary">Now Playing</h2>
              <motion.button
                ref={closeButtonRef}
                className="
                  flex items-center justify-center
                  w-11 h-11 min-w-[44px] min-h-[44px]
                  -mr-2
                  rounded-md
                  text-foreground/60 hover:text-foreground
                  transition-colors duration-150
                  focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card
                "
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close music player"
                data-testid="panel-close-button"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </motion.button>
            </div>

            {/* Content area */}
            <div className="p-4">
              {children}
            </div>

            {/* Decorative neon glow at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MusicPlayerPanel
