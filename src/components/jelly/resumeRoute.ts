/**
 * Which resume the URL asks for, shared by the route segments and the overlay host.
 *
 * `/resume` opened from the home page renders the intercepted `@modal/(.)resume` slot
 * ("overlay": the home page stays mounted underneath); a direct visit renders
 * `app/resume/page.tsx` ("direct": the semantic page underneath). Each renders a
 * `JellyResumeRoute` that opens this on mount and closes it on unmount; the host in
 * the root layout owns the canvas and plays the transitions, so it can outlive the
 * segment (Back unmounts the slot at once).
 */

export type ResumeMode = 'overlay' | 'direct'

export interface ResumeRequest {
  mode: ResumeMode
  find: string | null
  /** which mount opened it, so a stale unmount can't close a newer request */
  key: number
}

let current: ResumeRequest | null = null
let nextKey = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

export const resumeRoute = {
  get: () => current,
  subscribe(f: () => void) {
    listeners.add(f)
    return () => {
      listeners.delete(f)
    }
  },
  open(mode: ResumeMode, find: string | null) {
    current = { mode, find, key: nextKey++ }
    emit()
    return current.key
  },
  close(key: number) {
    if (current?.key !== key) return
    current = null
    emit()
  },
}
