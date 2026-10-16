/**
 * The site's one music player, published for the 3D resume: it taps the player's audio
 * source with its own analyser (so the words dance to the song) and P toggles playback.
 * The Experience section's Listen button opens the player's panel. The player registers
 * itself while mounted; nothing else owns audio.
 */

export interface SiteMusic {
  /** the player's audio source; null until the first play creates the audio graph */
  getSource(): MediaElementAudioSourceNode | null
  isPlaying(): boolean
  toggle(): void
  /** expands the player's panel (focus moves into it, as when its button opens it) */
  open(): void
}

let current: SiteMusic | null = null

export const registerSiteMusic = (m: SiteMusic | null) => {
  current = m
}

export const getSiteMusic = () => current
