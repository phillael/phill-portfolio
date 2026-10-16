import type { CareerRole } from '@/data/career'
import css from './Experience.module.css'

/**
 * TitleLadder - a job's titles on ticks off the rail, newest first: "Promoted · Apr 2026" over
 * each promotion, "Joined · Feb 2023" over the first. The current title is white with a cyan tick.
 */
export default function TitleLadder({ company, roles }: { company: string; roles: CareerRole[] }) {
  return (
    <ol className={css.ladder} aria-label={`Titles at ${company}, newest first`}>
      {roles.map((role, i) => (
        <li key={role.title} className={i === 0 ? css.current : undefined}>
          <span className={css.kicker}>
            {i === roles.length - 1 ? 'Joined' : 'Promoted'} · {role.start}
          </span>
          <span className={css.rung}>
            {role.title}
            {i === 0 && <span className="sr-only"> (current title)</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
