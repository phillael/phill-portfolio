'use client'

import { useEffect, useCallback, useRef } from 'react'

interface ScreenShakeWrapperProps {
  children: React.ReactNode
}

/**
 * ScreenShakeWrapper - Listens for 'screenShake' custom events and shakes the content
 *
 * Applies shake animation to wrapper div, not body.
 * This allows fixed-positioned elements rendered via Portal to body to stay stable.
 * Respects prefers-reduced-motion via CSS.
 */
const ScreenShakeWrapper = ({ children }: ScreenShakeWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const triggerShake = useCallback(() => {
    if (wrapperRef.current) {
      wrapperRef.current.classList.add('screen-shake')
      setTimeout(() => {
        wrapperRef.current?.classList.remove('screen-shake')
      }, 500)
    }
  }, [])

  useEffect(() => {
    const handleShake = () => triggerShake()

    window.addEventListener('screenShake', handleShake)
    return () => window.removeEventListener('screenShake', handleShake)
  }, [triggerShake])

  return (
    <div ref={wrapperRef} className="shake-wrapper">
      {children}
    </div>
  )
}

export default ScreenShakeWrapper
