import type { Metadata } from 'next'
import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
import JellyResumeRoute from '@/components/jelly/JellyResumeRoute'
import ResumeContent from '@/components/ResumeContent'
import { RESUME_PDF as PDF } from '@/data/resume'
import { SITE_URL } from '@/lib/site'

const TITLE = 'Phill Aelony | Resume'
const DESCRIPTION =
  'Resume of Phill Aelony, Senior AI Engineer: full-stack, agentic systems, TypeScript, React, Node and AWS. 8 years shipping production software across web, mobile and cloud.'
// The site's share card (app/opengraph-image.tsx). Setting openGraph here replaces the
// layout's, file-based image included, so it's named again.
const SHARE_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Phill Aelony - Software Engineer in cyberpunk Tokyo with llamas',
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/resume' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/resume`,
    siteName: 'Phill Aelony Portfolio',
    locale: 'en_US',
    type: 'website',
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ ...SHARE_IMAGE, url: '/twitter-image' }],
  },
}

const action =
  'inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-4 rounded-md border font-body text-sm font-medium no-underline transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/**
 * The semantic resume: what search engines, screen readers, no-JS visitors and
 * reduced-motion visitors get. The 3D Jelly Resume draws the same words.
 */
const ResumePage = () => (
  <>
    {/* tabIndex -1 so the skip link moves focus here, not just the scroll */}
    <main id="main" tabIndex={-1} className="min-h-screen px-4 md:px-6 pt-6 pb-8 md:pt-10 focus:outline-none">
      <article
        aria-labelledby="resume-name"
        className="max-w-3xl mx-auto rounded-xl border border-primary/35 bg-card/90 neon-border-subtle"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 px-4 py-3">
          <Link href="/" className={`${action} border-primary/30 text-foreground hover:border-primary hover:text-primary`}>
            <span aria-hidden="true">←</span> Back to home
          </Link>
          <a href={PDF} download className={`${action} border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 hover:border-primary`}>
            <span aria-hidden="true">⤓</span> Download PDF
          </a>
        </div>

        <div className="px-5 md:px-8 pb-8 font-body text-[15px] leading-relaxed text-foreground/90">
          <ResumeContent />
        </div>
      </article>
    </main>
    <SiteFooter />
    {/* the overlay host (root layout) opens the 3D resume over this page; not for reduced motion */}
    <JellyResumeRoute mode="direct" />
  </>
)

export default ResumePage
