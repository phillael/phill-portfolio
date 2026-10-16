/** Media queries the Experience section's effects check when they run (not per frame). */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'

export const matches = (query: string) => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
