/*
 * GENERATED: do not edit. The Skill blaster's sound, every setting of src/lib/skills/synth.ts, as Phill tuned it in the
 * Sound lab: the defaults of docs/design/skills-game/round6/synth.js, written here by
 * docs/design/sound-lab/tools/bake-skills-config.mjs. To change the sound, change synth.js's SCHEMA defaults (the lab's
 * source) and run `node docs/design/sound-lab/tools/bake-skills-config.mjs`; src/__tests__/skills-synth.test.ts fails
 * while the two disagree.
 */

/** Bass (Backend & data) */
export interface SynthBackendConfig {
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  unison: number
  detune: number
  drive: number
  reese: number
  subWave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  sub: number
  cutoff: number
  cutEnd: number
  sweep: number
  res: number
  wobble: number
  wobbleRate: number
  attack: number
  length: number
  release: number
  glide: number
  level: number
  pan: number
  octave: number
  delay: number
  verb: number
}

/** Chords (Cloud & DevOps) */
export interface SynthCloudConfig {
  stabWave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  unison: number
  stabDetune: number
  stabCut: number
  stabCutEnd: number
  stabSweep: number
  stabRes: number
  stabAttack: number
  stabDecay: number
  stabLevel: number
  stabDelay: number
  stabVerb: number
  padWave: 'sawtri' | 'sine' | 'triangle' | 'sawtooth' | 'square'
  padOctave: number
  padDetune: number
  padCut: number
  padRes: number
  padAttack: number
  padHold: number
  padRelease: number
  padLevel: number
  padDelay: number
  padVerb: number
  level: number
  pan: number
  octave: number
}

/** Arp (Frontend & mobile) */
export interface SynthFrontendConfig {
  steps: number
  rate: 1 | 2 | 3
  pattern: 'up' | 'down' | 'updown' | 'skip'
  fade: number
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  cutoff: number
  cutEnd: number
  sweep: number
  res: number
  attack: number
  decay: number
  level: number
  pan: number
  octave: number
  delay: number
  verb: number
}

/** Lead (AI) */
export interface SynthAiConfig {
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  unison: number
  detune: number
  subWave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  sub: number
  subOct: number
  cutoff: number
  peak: number
  sustainCut: number
  fAttack: number
  fDecay: number
  res: number
  attack: number
  decay: number
  sustain: number
  length: number
  release: number
  vibRate: number
  vibDepth: number
  vibDelay: number
  glide: number
  glideWindow: number
  level: number
  pan: number
  octave: number
  delay: number
  verb: number
}

/** Bleeps (Quality & security) */
export interface SynthQualityConfig {
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  wave2: 'sine' | 'triangle' | 'sawtooth' | 'square'
  mix: number
  tone: number
  drop: number
  dropTime: number
  attack: number
  decay: number
  echoAt: number
  echoNote: number
  echoVel: number
  level: number
  pan: number
  octave: number
  delay: number
  verb: number
}

/** Bells (Product) */
export interface SynthProductConfig {
  carrier: 'sine' | 'triangle' | 'sawtooth' | 'square'
  ratio: number
  index: number
  indexEnd: number
  bright: number
  attack: number
  decay: number
  secondAt: number
  second: number
  secondVel: number
  level: number
  pan: number
  octave: number
  delay: number
  verb: number
}

/** Vox (Music & more) */
export interface SynthMusicConfig {
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  vowel: 'cycle' | 'ah' | 'oh' | 'eh' | 'oo'
  formant: number
  q: number
  breath: number
  scoop: number
  scoopTime: number
  attack: number
  hold: number
  release: number
  level: number
  pan: number
  octave: number
  delay: number
  verb: number
}

/** Drums (The beat) */
export interface SynthDrumsConfig {
  kick: number
  kickPitch: number
  kickLow: number
  kickSweep: number
  kickDecay: number
  kickClick: number
  snare: number
  snareTone: number
  snareSnap: number
  snareDecay: number
  snareBody: number
  snareBodyLvl: number
  ghost: number
  hats: number
  hatTone: number
  hatDecay: number
  openDecay: number
  shaker: number
  crashType: 'meinl18' | 'meinl16' | 'b8' | 'savannah' | 'big' | 'synth'
  crash: number
  crashLen: number
  crashTone: number
  crashPitch: number
  rideType: 'meinl' | 'ping' | 'k' | 'savannah' | 'soft22' | 'crisp' | 'meinlBell' | 'pingBell' | 'kBell' | 'savBell' | 'metal'
  ride: number
  rideLen: number
  rideTone: number
  ridePitch: number
  riserType: 'short' | 'noise' | 'synthNoise' | 'perc' | 'uplifter' | 'synth'
  riser: number
  impactType: 'subdrop' | 'bassdrop' | 'cinematic' | 'synthdrop' | 'deep' | 'synth'
  impact: number
  impactPitch: number
  bus: number
  verb: number
}

/** Space (Delay, reverb, mix) */
export interface SynthSpaceConfig {
  dTime: 1 | 2 | 3 | 4 | 6
  dFeedback: number
  dTone: number
  dLowcut: number
  dReturn: number
  dToVerb: number
  rSize: number
  rDecay: number
  rBright: number
  rPre: number
  rReturn: number
  pump: number
  pumpRelease: number
  synths: number
  master: number
  threshold: number
  ratio: number
}

export interface SkillSynthConfig {
  backend: Readonly<SynthBackendConfig>
  cloud: Readonly<SynthCloudConfig>
  frontend: Readonly<SynthFrontendConfig>
  ai: Readonly<SynthAiConfig>
  quality: Readonly<SynthQualityConfig>
  product: Readonly<SynthProductConfig>
  music: Readonly<SynthMusicConfig>
  drums: Readonly<SynthDrumsConfig>
  space: Readonly<SynthSpaceConfig>
}

export const SKILL_SYNTH_CONFIG: Readonly<SkillSynthConfig> = Object.freeze<SkillSynthConfig>({
  backend: Object.freeze<SynthBackendConfig>({
    wave: 'sine',
    unison: 2,
    detune: 10,
    drive: 0.08,
    reese: 1,
    subWave: 'triangle',
    sub: 0.99,
    cutoff: 2020,
    cutEnd: 239,
    sweep: 0.716,
    res: 13.2,
    wobble: 0.26,
    wobbleRate: 0.1,
    attack: 0.008,
    length: 4,
    release: 0.268,
    glide: 0.08,
    level: 1,
    pan: 0,
    octave: -1,
    delay: 0,
    verb: 0.24,
  }),
  cloud: Object.freeze<SynthCloudConfig>({
    stabWave: 'sawtooth',
    unison: 2,
    stabDetune: 10,
    stabCut: 5200,
    stabCutEnd: 650,
    stabSweep: 0.5,
    stabRes: 2.5,
    stabAttack: 0.004,
    stabDecay: 0.95,
    stabLevel: 1,
    stabDelay: 0.4,
    stabVerb: 0.45,
    padWave: 'sawtri',
    padOctave: 1,
    padDetune: 6,
    padCut: 1000,
    padRes: 0.5,
    padAttack: 0.7,
    padHold: 4,
    padRelease: 0.6,
    padLevel: 1,
    padDelay: 0.15,
    padVerb: 0.6,
    level: 1,
    pan: 0,
    octave: 0,
  }),
  frontend: Object.freeze<SynthFrontendConfig>({
    steps: 6,
    rate: 1,
    pattern: 'up',
    fade: 0.07142857142857142,
    wave: 'square',
    cutoff: 4600,
    cutEnd: 480,
    sweep: 0.13,
    res: 9,
    attack: 0.002,
    decay: 0.2,
    level: 1,
    pan: 0,
    octave: 0,
    delay: 0.55,
    verb: 0.35,
  }),
  ai: Object.freeze<SynthAiConfig>({
    wave: 'square',
    unison: 2,
    detune: 8,
    subWave: 'sine',
    sub: 0.3,
    subOct: -1,
    cutoff: 900,
    peak: 969,
    sustainCut: 2470,
    fAttack: 0.00514,
    fDecay: 1.06,
    res: 3.7,
    attack: 0.012,
    decay: 0.15,
    sustain: 0.6666666666666666,
    length: 2.5,
    release: 0.12,
    vibRate: 5.4,
    vibDepth: 57,
    vibDelay: 1.22,
    glide: 0.21,
    glideWindow: 1.5,
    level: 1,
    pan: 0,
    octave: 0,
    delay: 0.45,
    verb: 0.4,
  }),
  quality: Object.freeze<SynthQualityConfig>({
    wave: 'sine',
    wave2: 'square',
    mix: 0.12,
    tone: 2600,
    drop: 1.5,
    dropTime: 0.025,
    attack: 0.002,
    decay: 0.11,
    echoAt: 2,
    echoNote: 12,
    echoVel: 1,
    level: 1,
    pan: 0,
    octave: 0,
    delay: 0.75,
    verb: 0.3,
  }),
  product: Object.freeze<SynthProductConfig>({
    carrier: 'sine',
    ratio: 3.5,
    index: 2.2,
    indexEnd: 0.04,
    bright: 1.4,
    attack: 0.004,
    decay: 2.1,
    secondAt: 2,
    second: -2,
    secondVel: 0.6,
    level: 1,
    pan: 0,
    octave: 0,
    delay: 0.35,
    verb: 0.4,
  }),
  music: Object.freeze<SynthMusicConfig>({
    wave: 'triangle',
    vowel: 'cycle',
    formant: 1,
    q: 1,
    breath: 0.94,
    scoop: 0.745,
    scoopTime: 0.144,
    attack: 0.025,
    hold: 0.7,
    release: 0.327,
    level: 1,
    pan: 0,
    octave: 0,
    delay: 0.35,
    verb: 0.6,
  }),
  drums: Object.freeze<SynthDrumsConfig>({
    kick: 1,
    kickPitch: 150,
    kickLow: 46,
    kickSweep: 0.1,
    kickDecay: 0.42,
    kickClick: 1,
    snare: 1,
    snareTone: 2200,
    snareSnap: 700,
    snareDecay: 0.2,
    snareBody: 210,
    snareBodyLvl: 1,
    ghost: 0.2,
    hats: 1,
    hatTone: 7800,
    hatDecay: 0.045,
    openDecay: 0.3,
    shaker: 1,
    crashType: 'meinl18',
    crash: 1,
    crashLen: 3.5,
    crashTone: 0.66,
    crashPitch: 1.16,
    rideType: 'k',
    ride: 1,
    rideLen: 1.7,
    rideTone: 1,
    ridePitch: 1,
    riserType: 'perc',
    riser: 1,
    impactType: 'bassdrop',
    impact: 1,
    impactPitch: 1.4,
    bus: 0.9,
    verb: 0.08,
  }),
  space: Object.freeze<SynthSpaceConfig>({
    dTime: 3,
    dFeedback: 0.45,
    dTone: 3400,
    dLowcut: 260,
    dReturn: 0.6,
    dToVerb: 0.3,
    rSize: 3.4,
    rDecay: 2.6,
    rBright: 0.35,
    rPre: 0,
    rReturn: 0.55,
    pump: 0.4,
    pumpRelease: 0.09,
    synths: 1,
    master: 0.7,
    threshold: -16,
    ratio: 4,
  }),
})
