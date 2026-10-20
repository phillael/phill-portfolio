import { SKILLS } from '@/data/skills'
import LineEnds from '@/components/skills/LineEnds'
import css from '@/components/skills/Skills.module.css'

/**
 * SkillsSection - the skills as the Skill blaster mockup lays them out at rest
 * (docs/design/skills-game/round6/blaster-synth.html; plan docs/plans/2026-10-20-skills-blaster-plan.md),
 * from src/data/skills.ts: the header, the AI skills in a glass panel with a note each, then the other
 * groups as quiet lines of words. Every skill is a button that looks like text, so the list stays the
 * content (readable, focusable, searchable); a click is what reveals the game. JS hooks: data-skill and
 * data-group on each skill, data-sk-group on each group's box, data-name on an AI skill's name.
 */
const SkillsSection = () => {
  const [ai, ...rest] = SKILLS.groups

  return (
    <section id="skills" aria-labelledby="skills-h" className={css.section}>
      <header className={css.head}>
        <h2 id="skills-h" className={css.eyebrow}>
          Skills
        </h2>
        <p className={`${css.title} neon-text-purple`}>{SKILLS.headline}</p>
        <p className={css.lede}>{SKILLS.lede}</p>
      </header>

      <div className={css.list} data-sk-list="">
        <div className={css.ai} data-sk-group={ai.id}>
          <div className={css.aiHead}>
            <h3 id={`skg-${ai.id}`} className={css.h}>
              {ai.name}
            </h3>
            <p className={css.cap}>{ai.caption}</p>
          </div>
          <ul className={css.aiGrid} aria-labelledby={`skg-${ai.id}`}>
            {ai.skills.map((s) => (
              <li key={s.name}>
                <button type="button" className={css.aiItem} data-skill={s.name} data-group={ai.id}>
                  <span className={css.name} data-name="">
                    {s.name}
                  </span>{' '}
                  <span className={css.note}>{s.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={css.groups}>
          {rest.map((g) => (
            <div key={g.id} className={g.id === 'music' ? `${css.group} ${css.music}` : css.group} data-sk-group={g.id}>
              <h3 id={`skg-${g.id}`} className={css.h}>
                {g.name}
              </h3>
              <ul className={css.words} data-words="" aria-labelledby={`skg-${g.id}`}>
                {g.skills.map((s) => (
                  <li key={s.name}>
                    <button type="button" className={css.w} data-skill={s.name} data-group={g.id}>
                      {s.name}
                    </button>
                    <span className={css.dot} aria-hidden="true">
                      ·
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className={css.live} aria-live="polite" data-sk-live="" />
      <LineEnds />
    </section>
  )
}

export default SkillsSection
