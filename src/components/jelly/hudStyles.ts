/** The Jelly Resume HUD's look (the playground's: dark glass panels, thin borders, cyan accents). */

/** A translucent glass panel. */
export const PANEL = 'bg-[rgba(8,10,16,0.72)] border border-[#1e2431] backdrop-blur-[6px]'

const FOCUS = 'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80eaff]'

/** A HUD button's shape (no colors): compact on desktop, 44 px tall on phones. */
const BTN_SHAPE = `inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[7px] border px-[11px] py-[7px] min-h-[32px] text-[13px] leading-[1.4] no-underline cursor-pointer ${FOCUS} max-[820px]:min-h-[44px] max-[820px]:px-[10px] max-[820px]:py-2`

/** A HUD button. */
export const BTN = `${BTN_SHAPE} border-[#1e2431] bg-[#121621] text-[#d7deea] hover:border-[#80eaff]`

/** The "try me" button (🎮 Play): the ON border and text, a soft glow and a faint fill. */
export const PLAY_BTN = `${BTN_SHAPE} border-[#80eaff] bg-[rgba(128,234,255,0.09)] font-bold text-[#80eaff] shadow-[0_0_14px_rgba(128,234,255,0.4)] hover:bg-[rgba(128,234,255,0.16)]`

/** A button that's busy or unavailable. */
export const BTN_MUTED = `${BTN_SHAPE} border-[#2a3142] bg-[#121621] text-[#7c8798]`

/** A toggled-on button. */
export const ON = 'border-[#80eaff] text-[#80eaff] shadow-[0_0_12px_rgba(128,234,255,0.3)]'

/** The keyboard-shortcut part of a label: keys mean nothing on a phone (narrow, or a touch screen). */
export const KEY = 'max-[820px]:hidden [@media(pointer:coarse)]:hidden'

export { FOCUS }
