import JellyResumeRoute from '@/components/jelly/JellyResumeRoute'

/**
 * /resume opened from the home page (a soft navigation): the home page stays mounted
 * underneath and the overlay host opens the 3D resume over it. A direct visit renders
 * app/resume/page.tsx instead.
 */
export default function ResumeOverlay() {
  return <JellyResumeRoute mode="overlay" />
}
