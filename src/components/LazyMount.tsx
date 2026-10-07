'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface LazyMountProps {
  children: ReactNode
  /** Classes for the placeholder; give it the content's size to avoid layout shift */
  placeholderClassName?: string
  /** How far outside the viewport to start mounting */
  rootMargin?: string
}

/**
 * Mounts its children the first time the placeholder scrolls near the
 * viewport, then keeps them mounted. Use it to defer heavy below-the-fold
 * components (and the code-split chunks they pull in).
 */
const LazyMount = ({ children, placeholderClassName, rootMargin = '400px' }: LazyMountProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || isNear) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsNear(true)
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isNear, rootMargin])

  if (isNear) return <>{children}</>
  return <div ref={ref} className={placeholderClassName} aria-hidden="true" />
}

export default LazyMount
