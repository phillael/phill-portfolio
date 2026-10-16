import type { FocusEventHandler, MouseEventHandler, PointerEventHandler, ReactNode } from 'react'
import css from './HudButton.module.css'

const ICONS = {
  cube: (
    <svg className={css.cube} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M10 2 17 6v8l-7 4-7-4V6z" />
      <path d="M3 6l7 4 7-4M10 10v8" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <g className={css.dlArrow}>
        <path d="M10 3v9" />
        <path d="M6.5 8.5 10 12l3.5-3.5" />
      </g>
      <path d="M3.5 13.5v2.5h13v-2.5" />
    </svg>
  ),
  headphones: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 12.5V10a6.5 6.5 0 0 1 13 0v2.5" />
      <rect x="2.75" y="11.5" width="3.5" height="5.5" rx="1.2" />
      <rect x="13.75" y="11.5" width="3.5" height="5.5" rx="1.2" />
    </svg>
  ),
}

interface HudButtonCommon {
  /** primary: energized cyan fill + marching chevrons; secondary: outline; music: magenta + equalizer */
  variant: 'primary' | 'secondary' | 'music'
  icon: keyof typeof ICONS
  children: ReactNode
  /** replaces the visible label as the accessible name */
  ariaLabel?: string
  className?: string
  onClick?: MouseEventHandler<HTMLElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onPointerEnter?: PointerEventHandler<HTMLElement>
}

export type HudButtonProps = HudButtonCommon &
  ({ href: string; download?: boolean } | { href?: undefined; download?: undefined })

/**
 * HudButton - the Experience section's glass HUD button (mockup E2): a link with `href`,
 * otherwise a `<button type="button">`. Its scanlines, sweep, icon, chevrons and equalizer
 * are decoration (aria-hidden); CSS only, and still with reduced motion.
 */
export default function HudButton({
  variant,
  icon,
  children,
  ariaLabel,
  className,
  href,
  download,
  ...handlers
}: HudButtonProps) {
  const cls = [css.btn, css[variant], className].filter(Boolean).join(' ')
  const inner = (
    <>
      <span className={css.clip} aria-hidden="true">
        <span className={css.sweep} />
      </span>
      <span className={css.ico} aria-hidden="true">
        {ICONS[icon]}
      </span>
      <span>{children}</span>
      {variant === 'primary' && (
        <span className={css.chev} aria-hidden="true">
          <svg viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2l5 5-5 5" />
            <path d="M10 2l5 5-5 5" />
            <path d="M18 2l5 5-5 5" />
          </svg>
        </span>
      )}
      {variant === 'music' && (
        <span className={css.eq} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </>
  )

  return href !== undefined ? (
    <a href={href} download={download || undefined} className={cls} aria-label={ariaLabel} {...handlers}>
      {inner}
    </a>
  ) : (
    <button type="button" className={cls} aria-label={ariaLabel} {...handlers}>
      {inner}
    </button>
  )
}
