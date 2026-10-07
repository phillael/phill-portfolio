import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribe to a CSS media query.
 *
 * Returns `undefined` during SSR and hydration, then the live match. Use it to
 * decide whether to *mount* something heavy (a WebGL canvas, an animation
 * loop) — CSS `hidden` only hides an element, its loops keep running.
 */
export function useMediaQuery(query: string): boolean | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => undefined,
  )
}

/** Matches Tailwind's `md` breakpoint. */
export const MD_UP = '(min-width: 768px)'
