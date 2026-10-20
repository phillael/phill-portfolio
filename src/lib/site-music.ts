/**
 * The site's one music player, published for the 3D resume: it taps the player's audio
 * source with its own analyser (so the words dance to the song) and P toggles playback.
 * The Experience section's Listen button opens the player's panel. The Skill blaster plays
 * its synth through the player's AudioContext, pauses the song while it plays and hands it
 * back after. The player registers itself while mounted; nothing else owns audio.
 */

export interface SiteMusic {
  /** the player's audio source; null until the first play creates the audio graph */
  getSource(): MediaElementAudioSourceNode | null
  isPlaying(): boolean
  toggle(): void
  /** expands the player's panel (focus moves into it, as when its button opens it) */
  open(): void
  /** the player's AudioContext, created on the first call (call it from a click only); null without Web Audio */
  context(): AudioContext | null
  pause(): void
  /** resumes the current track */
  play(): void
  /** told when the player starts or stops; returns the unsubscribe */
  onChange(cb: (playing: boolean) => void): () => void
}

let current: SiteMusic | null = null

export const registerSiteMusic = (m: SiteMusic | null) => {
  current = m
}

export const getSiteMusic = () => current
