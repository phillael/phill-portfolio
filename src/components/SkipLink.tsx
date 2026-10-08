/**
 * SkipLink - First tab stop on the page; jumps keyboard users past the nav.
 * Visually hidden until focused, then shown top-left with the standard focus ring.
 */
const SkipLink = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-3 focus:rounded-md focus:bg-background focus:text-primary focus:font-heading focus:border focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    Skip to main content
  </a>
)

export default SkipLink
