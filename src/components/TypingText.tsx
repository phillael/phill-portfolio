'use client'

import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface TypingTextProps {
  text: string
  /** Base delay between characters in ms (default: 50) */
  speed?: number
  /** Add random variation to typing speed for natural feel (default: true) */
  naturalSpeed?: boolean
  /** Show blinking cursor (default: true) */
  showCursor?: boolean
  /** Callback when typing completes */
  onComplete?: () => void
  /** CSS class for the text */
  className?: string
}

/**
 * TypingText - Typewriter effect component
 *
 * Displays text character by character with optional:
 * - Variable speed for natural typing rhythm
 * - Blinking cursor
 * - Completion callback
 *
 * Screen readers get the full text once (sr-only copy); the typed copy is
 * aria-hidden so live regions don't announce it character by character.
 * With reduced motion the text appears immediately.
 */
const TypingText = ({
  text,
  speed = 50,
  naturalSpeed = true,
  showCursor = true,
  onComplete,
  className = '',
}: TypingTextProps) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayedText(text)
      setIsComplete(true)
      onComplete?.()
      return
    }

    // Reset when text changes
    setDisplayedText('')
    setIsComplete(false)

    let currentIndex = 0
    let timer: ReturnType<typeof setTimeout>

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++

        // Calculate delay - add variation for natural feel
        let delay = speed
        if (naturalSpeed) {
          // Random variation ±30%
          delay = speed * (0.7 + Math.random() * 0.6)
          // Pause slightly longer after punctuation
          const lastChar = text[currentIndex - 1]
          if (['.', '!', '?'].includes(lastChar)) {
            delay += speed * 3
          } else if ([',', ';'].includes(lastChar)) {
            delay += speed * 1.5
          }
        }

        timer = setTimeout(typeNextChar, delay)
      } else {
        setIsComplete(true)
        onComplete?.()
      }
    }

    // Start typing after a brief delay. `timer` always holds the latest
    // pending step, so cleanup stops the whole chain, not just the first one.
    timer = setTimeout(typeNextChar, 200)

    return () => clearTimeout(timer)
  }, [text, speed, naturalSpeed, onComplete, shouldReduceMotion])

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {displayedText}
        {showCursor && !isComplete && (
          <motion.span
            className="inline-block ml-0.5 w-0.5 h-[1em] bg-current align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        )}
      </span>
    </span>
  )
}

export default TypingText
