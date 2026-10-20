/**
 * The summoned Shroom Wizard stands bottom-left. The Skill blaster asks it to step aside (walk off-screen) while
 * the game plays where its readout can't clear the wizard (phones; Phill's call, 2026-10-20), and to come back
 * when the readout goes. ShroomWizard3D listens (useSyncExternalStore).
 */

let aside = false
const listeners = new Set<() => void>()

export const isWizardAside = () => aside

export function setWizardAside(on: boolean) {
  if (on === aside) return
  aside = on
  for (const cb of [...listeners]) cb()
}

export function subscribeWizardAside(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
