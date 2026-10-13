/** The Jelly Resume HUD's look (the playground's: dark glass panels, thin borders, cyan accents). */

/** A translucent glass panel. */
export const PANEL = 'bg-[rgba(8,10,16,0.72)] border border-[#1e2431] backdrop-blur-[6px]'

const FOCUS = 'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80eaff]'

/** A HUD button: compact on desktop, 44 px tall on phones. */
export const BTN = `inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[7px] border border-[#1e2431] bg-[#121621] px-[11px] py-[7px] min-h-[32px] text-[13px] leading-[1.4] text-[#d7deea] no-underline cursor-pointer hover:border-[#80eaff] ${FOCUS} max-[820px]:min-h-[44px] max-[820px]:px-[10px] max-[820px]:py-2`

/** A toggled-on button. */
export const ON = 'border-[#80eaff] text-[#80eaff] shadow-[0_0_12px_rgba(128,234,255,0.3)]'

/** The keyboard-shortcut part of a label: keys mean nothing on a phone. */
export const KEY = 'max-[820px]:hidden'

export { FOCUS }
