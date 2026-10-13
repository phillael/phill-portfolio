import { Fragment } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
import { resume, richText } from '@/data/resume'
import { SITE_URL } from '@/lib/site'

const TITLE = 'Phill Aelony | Resume'
const DESCRIPTION =
  'Resume of Phill Aelony, Senior AI Engineer: full-stack, agentic systems, TypeScript, React, Node and AWS. 8 years shipping production software across web, mobile and cloud.'
const PDF = '/Phillip_Aelony_Resume_2025.pdf'
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

/** Text with `**bold**` runs rendered as <strong>. */
const Rich = ({ text }: { text: string }) => (
  <>
    {richText(text).map((run, i) =>
      run.bold ? (
        <strong key={i} className="font-bold text-foreground">
          {run.text}
        </strong>
      ) : (
        <Fragment key={i}>{run.text}</Fragment>
      ),
    )}
  </>
)

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="mt-8">
    <h2
      id={id}
      className="text-xs font-bold uppercase tracking-[0.14em] text-primary border-b border-primary/25 pb-1 mb-3"
    >
      {title}
    </h2>
    {children}
  </section>
)

/** A title on the left, dates on the right (stacked on phones). */
const EntryHead = ({ title, dates }: { title: string; dates: string }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
    <h3 className="text-base md:text-lg font-bold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">{dates}</p>
  </div>
)

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
          <header className="mt-6">
            <h1 id="resume-name" className="font-heading text-3xl md:text-4xl text-primary neon-text-blue">
              {resume.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              <span className="font-bold text-foreground">{resume.headline}</span> · {resume.subheadline}
            </p>
            <ul aria-label="Contact" className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
              {resume.contact.map((c, i) => (
                <li key={c.label}>
                  {i > 0 && <span aria-hidden="true" className="mr-3">·</span>}
                  {c.href ? (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block py-2 text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                    >
                      {c.label}
                    </a>
                  ) : (
                    <span className="inline-block py-2">{c.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </header>

          <p className="mt-4">
            <Rich text={resume.summary} />
          </p>

          <Section id="resume-skills" title="Skills">
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto,1fr]">
              {resume.skills.map((s) => (
                <Fragment key={s.label}>
                  <dt className="font-bold text-foreground">{s.label}</dt>
                  <dd className="mb-2 sm:mb-0">{s.items}</dd>
                </Fragment>
              ))}
            </dl>
          </Section>

          <Section id="resume-experience" title="Experience">
            {resume.experience.map((job) => (
              <article key={job.company}>
                <EntryHead title={job.company} dates={job.dates} />
                <p className="text-sm text-muted-foreground">{job.blurb}</p>
                <ul aria-label={`Roles at ${job.company}`} className="mt-2">
                  {job.roles.map((r) => (
                    <li key={r.title} className="flex flex-wrap justify-between gap-x-4">
                      <span className="font-semibold text-primary">{r.title}</span>
                      <span className="text-sm text-muted-foreground">{r.dates}</span>
                    </li>
                  ))}
                </ul>
                <ul aria-label={`Highlights at ${job.company}`} className="mt-3 list-disc space-y-2 pl-5 marker:text-primary">
                  {job.bullets.map((b) => (
                    <li key={b.id}>
                      <Rich text={b.text} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </Section>

          <Section id="resume-projects" title="Selected projects">
            <div className="space-y-4">
              {resume.projects.map((p) => (
                <article key={p.name}>
                  <h3 className="text-base md:text-lg font-bold text-foreground">
                    {p.name}{' '}
                    <span className="font-normal text-sm text-muted-foreground">
                      · {p.blurb}
                      {p.link && (
                        <>
                          {' · '}
                          <a
                            href={p.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block py-2 text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                          >
                            {p.link.label}
                          </a>
                        </>
                      )}
                    </span>
                  </h3>
                  <p className="text-sm text-primary">{p.stack}</p>
                  <p>
                    <Rich text={p.text} />
                  </p>
                </article>
              ))}
            </div>
          </Section>

          <Section id="resume-earlier" title="Earlier experience">
            <div className="space-y-4">
              {[...resume.earlier, resume.music].map((e) => (
                <article key={e.title}>
                  <EntryHead title={e.title} dates={e.dates} />
                  <p className="text-sm text-muted-foreground">{e.company}</p>
                  {e.text && (
                    <p>
                      <Rich text={e.text} />
                    </p>
                  )}
                </article>
              ))}
            </div>
          </Section>

          <Section id="resume-education" title="Education">
            {resume.education.map((e) => (
              <p key={e.degree}>
                <strong className="font-bold text-foreground">{e.degree}</strong> · {e.school}
              </p>
            ))}
          </Section>
        </div>
      </article>
    </main>
    <SiteFooter />
  </>
)

export default ResumePage
