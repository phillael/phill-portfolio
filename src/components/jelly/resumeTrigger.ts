/**
 * The ways into the 3D resume (the hero photo, and later the 🍄 summon). Small on purpose:
 * it's in the home page's first load, so it only imports the engine lazily.
 *
 * A trigger calls `openResume({ origin, tint })`: the intent waits here, and the overlay
 * host (which has the router) soft-navigates to /resume; the overlay then takes the
 * intent to start the dissolve from the hero photo registered here.
 */

export interface OpenIntent {
  /** the click (client px); null: from the photo's center (keyboard) */
  origin: { x: number; y: number } | null
  /** the 🍄 summon: the sparks heat blue-violet */
  tint: number
  /** focus returns here on close */
  opener: HTMLElement | null
}

let intent: OpenIntent | null = null
let heroImg: HTMLImageElement | null = null
let navigate: ((url: string) => void) | null = null
let prefetched = false
let hardNavigate = (url: string) => window.location.assign(url)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const PLAIN_KEY = 'jelly-resume-plain'
let plain = false
/**
 * Set when the 3D resume can't run here (no WebGL2, or its context was lost): from then on
 * this session gets the plain /resume page (kept in sessionStorage, so it survives the reload
 * that swaps an overlay for the page).
 */
export const plainResume = {
  get() {
    if (plain) return true
    try {
      return (plain = window.sessionStorage.getItem(PLAIN_KEY) === '1')
    } catch {
      return false
    }
  },
  set() {
    plain = true
    try {
      window.sessionStorage.setItem(PLAIN_KEY, '1')
    } catch {}
  },
  clear() {
    plain = false
    try {
      window.sessionStorage.removeItem(PLAIN_KEY)
    } catch {}
  },
}

/** The hero <img> the dissolve samples (null when the home page isn't mounted). */
export const registerHero = (img: HTMLImageElement | null) => {
  heroImg = img
}
export const getHeroImg = () => (heroImg && heroImg.isConnected ? heroImg : null)

/** The host provides the soft navigation (router.push without scrolling). */
export const registerNavigate = (f: ((url: string) => void) | null) => {
  navigate = f
}

/** The pending intent (read, not consumed: dev StrictMode mounts the overlay twice). */
export const peekIntent = () => intent
/** Consumed once the resume has opened. */
export const clearIntent = () => {
  intent = null
}

/** Warm the engine chunk, the snapshot and the decoded photo (hover, focus or touchstart on a trigger). */
export function prefetchResume() {
  if (prefetched || reducedMotion() || plainResume.get()) return // reduced motion (or no WebGL) never loads the engine
  prefetched = true
  import('@/components/jelly/JellyResumeCanvas').catch(() => (prefetched = false))
  import('@/lib/jelly/snapshot')
    .then((m) => m.loadSnapshotOnce())
    .catch(() => (prefetched = false))
  import('@/lib/jelly/hero')
    .then((m) => {
      const img = getHeroImg()
      if (img) m.decodePhoto(img)
    })
    .catch(() => {})
}

/** Open the 3D resume (with reduced motion, or where it can't run, the plain /resume page). */
export function openResume(i: OpenIntent, find?: string | null) {
  const url = '/resume' + (find ? `?find=${encodeURIComponent(find)}` : '')
  if (reducedMotion() || plainResume.get() || !navigate) {
    hardNavigate(url) // the plain page: no canvas, no engine
    return
  }
  intent = i
  prefetchResume()
  navigate(url)
}

// Test helper: jsdom can't navigate
export const __setHardNavigate = (f: (url: string) => void) => {
  hardNavigate = f
}
