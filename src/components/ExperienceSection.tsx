'use client'

import { Fragment, useRef, type MouseEvent } from 'react'
import { career } from '@/data/career'
import { RESUME_PDF, richText } from '@/data/resume'
import { getSiteMusic } from '@/lib/site-music'
import { openResume, prefetchResume } from '@/components/jelly/resumeTrigger'
import ExperienceTrack from '@/components/experience/ExperienceTrack'
import HighlightTile from '@/components/experience/HighlightTile'
import HudButton from '@/components/experience/HudButton'
import TitleLadder from '@/components/experience/TitleLadder'
import { useReveal } from '@/components/experience/useReveal'
import css from '@/components/experience/Experience.module.css'

/** `**bold**` runs as <strong> */
const Rich = ({ text }: { text: string }) => (
  <>
    {richText(text).map((run, i) => (run.bold ? <strong key={i}>{run.text}</strong> : <Fragment key={i}>{run.text}</Fragment>))}
  </>
)

/** "React · React Native · TypeScript", the dots decoration */
const Stack = ({ items }: { items: string[] }) => (
  <>
    {items.map((item, i) => (
      <Fragment key={item}>
        {i > 0 && (
          <span className={css.dot} aria-hidden="true">
            ·
          </span>
        )}
        {item}
      </Fragment>
    ))}
  </>
)

/** Open the 3D resume in place, from the click (keyboard: from the photo's center); modified clicks are the browser's */
const open3d = (e: MouseEvent<HTMLElement>) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  openResume({ origin: e.detail === 0 ? null : { x: e.clientX, y: e.clientY }, tint: 0, opener: e.currentTarget }, null)
}

/**
 * ExperienceSection - the career as mockup E2 tells it (docs/design/experience-refresh/round2/e2-hud.html),
 * from src/data/career.ts: the "Senior AI Engineer" headline, then a rail down the left that
 * fills with the scroll and lights a node per stop. TimelyCare first (now): its titles as a
 * ladder of promotions and four HUD tiles; then one line per earlier job; music last, in
 * magenta, with Listen (opens the site's one music player); then the HUD buttons to the 3D
 * resume and the PDF.
 */
const ExperienceSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  useReveal(sectionRef)
  const [timelycare, ...earlier] = career.jobs
  const { music } = career

  return (
    <section ref={sectionRef} id="experience" aria-labelledby="experience-heading" className={css.section}>
      <header className={css.reveal} data-reveal="">
        <h2 id="experience-heading" className={css.eyebrow}>
          Experience
        </h2>
        <p className={`${css.headline} neon-text-purple`}>{career.headline}</p>
        <p className={css.lede}>{career.intro}</p>
      </header>

      <ExperienceTrack>
        <ol className={css.stops}>
          <li className={`${css.stop} ${css.now}`} data-stop="">
            <span className={css.node} aria-hidden="true" />
            <div className={css.reveal} data-reveal="">
              <span className={css.live}>Now</span>
              <div className={css.stopHead}>
                <h3 className={`${css.company} neon-text-blue`}>{timelycare.company}</h3>
                <span className={css.dates}>{timelycare.dates}</span>
              </div>
              <p className={css.blurb}>{timelycare.blurb}</p>
              <TitleLadder company={timelycare.company} roles={timelycare.roles} />
            </div>
            <div className={css.bento}>
              {timelycare.tiles.map((tile, i) => (
                <HighlightTile key={tile.id} tile={tile} wide={i === 0} delay={i * 90} />
              ))}
            </div>
            {timelycare.line && (
              <div className={`${css.after} ${css.reveal}`} data-reveal="">
                <p className={css.earlierLine}>
                  <Rich text={timelycare.line} />
                </p>
              </div>
            )}
          </li>

          {earlier.map((job) => (
            <li key={job.id} className={css.stop} data-stop="">
              <span className={css.node} aria-hidden="true" />
              <div className={css.reveal} data-reveal="">
                <div className={css.stopHead}>
                  <h3 className={`${css.company} neon-text-blue`}>{job.company}</h3>
                  <span className={css.dates}>{job.dates}</span>
                </div>
                <p className={css.role}>{job.roles[0].title}</p>
                {job.line && (
                  <p className={css.one}>
                    <Rich text={job.line} />
                  </p>
                )}
                <p className={css.meta}>
                  <Stack items={job.stack} />
                </p>
              </div>
            </li>
          ))}

          <li className={`${css.stop} ${css.music}`} data-stop="">
            <span className={css.node} aria-hidden="true" />
            <div className={css.reveal} data-reveal="">
              <div className={css.stopHead}>
                <h3 className={`${css.company} ${css.neonMagenta}`}>{music.title}</h3>
                <span className={css.dates}>{music.dates}</span>
              </div>
              <p className={css.role}>{music.company}</p>
              <p className={css.one}>
                <Rich text={music.line} />
              </p>
              <p className={css.meta}>{music.education}</p>
              <HudButton
                variant="music"
                icon="headphones"
                ariaLabel="Listen: open the music player"
                className={css.listen}
                onClick={() => getSiteMusic()?.open()}
              >
                Listen
              </HudButton>
            </div>
          </li>
        </ol>

        <div className={`${css.cta} ${css.reveal}`} data-reveal="">
          <HudButton variant="primary" icon="cube" href="/resume" onClick={open3d} onPointerEnter={prefetchResume} onFocus={prefetchResume}>
            Open the 3D resume
          </HudButton>
          <HudButton variant="secondary" icon="download" href={RESUME_PDF} download>
            Download the PDF
          </HudButton>
        </div>
      </ExperienceTrack>
    </section>
  )
}

export default ExperienceSection
