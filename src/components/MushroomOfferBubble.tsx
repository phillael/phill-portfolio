'use client'

import { motion } from 'framer-motion'
import TypingText from './TypingText'

export interface MushroomOfferBubbleProps {
  /**
   * anchored = legacy speech-bubble next to the wizard, click-outside dismisses
   * centered = ceremony modal centered on viewport, click-outside does NOT dismiss
   */
  position: 'anchored' | 'centered'
  text: string
  onConfirm: () => void
  onCancel: () => void
}

export default function MushroomOfferBubble({
  position,
  text,
  onConfirm,
  onCancel,
}: MushroomOfferBubbleProps) {
  const backdropHandler = position === 'anchored' ? onCancel : undefined

  const bubbleClassName =
    position === 'centered'
      ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] md:w-[340px] z-[101]'
      : 'absolute bottom-full left-[60px] md:left-[80px] mb-2 w-[220px] md:w-[320px] z-[101]'

  const backdropClassName =
    position === 'centered'
      ? 'fixed inset-0 z-[100] bg-black/40 backdrop-blur-md'
      : 'fixed inset-0 z-[100]'

  return (
    <>
      <motion.div
        data-testid="offer-bubble-backdrop"
        className={backdropClassName}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={backdropHandler}
      />
      <motion.div
        className={bubbleClassName}
        initial={{ opacity: 0, scale: 0.8, y: position === 'centered' ? 0 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: position === 'centered' ? 0 : 20 }}
        style={{ filter: 'none' }}
      >
        <div
          className="relative p-3 md:p-4 rounded-2xl bg-card border-2 border-secondary/50"
          style={{
            boxShadow:
              '0 0 20px hsl(var(--secondary) / 0.4), 0 0 40px hsl(var(--secondary) / 0.2)',
          }}
        >
          {position === 'anchored' && (
            <>
              <div
                className="absolute -bottom-3 left-12 md:left-16 w-0 h-0"
                style={{
                  borderLeft: '12px solid transparent',
                  borderRight: '12px solid transparent',
                  borderTop: '12px solid hsl(var(--card))',
                  filter: 'drop-shadow(0 2px 4px hsl(var(--secondary) / 0.3))',
                }}
              />
              <div
                className="absolute -bottom-[14px] left-12 md:left-16 w-0 h-0"
                style={{
                  borderLeft: '12px solid transparent',
                  borderRight: '12px solid transparent',
                  borderTop: '12px solid hsl(var(--secondary) / 0.5)',
                  zIndex: -1,
                }}
              />
            </>
          )}
          <p className="font-heading text-sm md:text-lg text-secondary mb-3 md:mb-4">
            <TypingText text={text} speed={40} showCursor={true} />
          </p>
          <div className="flex gap-2 md:gap-3 justify-center">
            <motion.button
              className="min-w-[44px] min-h-[44px] px-3 md:px-4 py-1 md:py-1.5 rounded-md bg-muted text-foreground font-heading text-xs md:text-sm hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary"
              onClick={onCancel}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Ummm...no
            </motion.button>
            <motion.button
              className="min-w-[44px] min-h-[44px] px-3 md:px-4 py-1 md:py-1.5 rounded-md bg-secondary text-background font-heading font-bold text-xs md:text-sm hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary"
              style={{
                boxShadow: '0 0 10px hsl(var(--secondary) / 0.5)',
              }}
              onClick={onConfirm}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sure!
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
