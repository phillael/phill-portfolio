'use client'

import { MotionConfig } from 'framer-motion'

/**
 * MotionProvider - Makes every Framer Motion animation honor the OS
 * "reduce motion" setting (transforms off, opacity fades kept). Components
 * that already call useReducedMotion keep their own fallbacks.
 */
const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
)

export default MotionProvider
