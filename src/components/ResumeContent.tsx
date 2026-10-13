import { Fragment } from 'react'
import { resume, richText } from '@/data/resume'

interface ResumeContentProps {
  /** prefix for the section heading ids (two copies can be on a page) */
  idPrefix?: string
  /** LinkedIn, GitHub and numberslayers.com as links (the screen-reader copy in the 3D view has no focusable parts) */
  links?: boolean
}

const LINK =
  'inline-block py-2 text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm'

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
 * The resume as semantic HTML, from src/data/resume.ts: the /resume page's content, and the
 * text equivalent inside the 3D view (whose canvas is aria-hidden).
 */
const ResumeContent = ({ idPrefix = 'resume-', links = true }: ResumeContentProps) => (
  <>
    <header className="mt-6">
      <h1 id={`${idPrefix}name`} className="font-heading text-3xl md:text-4xl text-primary neon-text-blue">
        {resume.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        <span className="font-bold text-foreground">{resume.headline}</span> · {resume.subheadline}
      </p>
      <ul aria-label="Contact" className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        {resume.contact.map((c, i) => (
          <li key={c.label}>
            {i > 0 && <span aria-hidden="true" className="mr-3">·</span>}
            {c.href && links ? (
              <a href={c.href} target="_blank" rel="noopener noreferrer" className={LINK}>
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

    <Section id={`${idPrefix}skills`} title="Skills">
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto,1fr]">
        {resume.skills.map((s) => (
          <Fragment key={s.label}>
            <dt className="font-bold text-foreground">{s.label}</dt>
            <dd className="mb-2 sm:mb-0">{s.items}</dd>
          </Fragment>
        ))}
      </dl>
    </Section>

    <Section id={`${idPrefix}experience`} title="Experience">
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

    <Section id={`${idPrefix}projects`} title="Selected projects">
      <div className="space-y-4">
        {resume.projects.map((p) => (
          <article key={p.name}>
            <h3 className="text-base md:text-lg font-bold text-foreground">
              {p.name}
              <span className="font-normal text-sm text-muted-foreground">
                {' · '}
                {p.blurb}
                {p.link && (
                  <>
                    {' · '}
                    {links ? (
                      <a href={p.link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                        {p.link.label}
                      </a>
                    ) : (
                      p.link.label
                    )}
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

    <Section id={`${idPrefix}earlier`} title="Earlier experience">
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

    <Section id={`${idPrefix}education`} title="Education">
      {resume.education.map((e) => (
        <p key={e.degree}>
          <strong className="font-bold text-foreground">{e.degree}</strong> · {e.school}
        </p>
      ))}
    </Section>
  </>
)

export default ResumeContent
