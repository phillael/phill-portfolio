/*
 * The Skill blaster's sound engine (round 6). Every sound is synthesized live with Web Audio:
 * oscillators, filtered noise, envelopes, one FM bell, a ping-pong delay and a reverb whose room
 * is generated noise. No samples, nothing to download.
 *
 * Shared by the game (blaster-synth.js) and the Sound lab (docs/design/sound-lab/), so what you tune in the
 * lab is what the game plays.
 *
 *   SKILL_SYNTH.create(ac, diff?) → an engine on that AudioContext (the site player's, in the game)
 *     .I / .D            the instruments and the drum kit
 *     .hit(group, k, t, v) a skill's sound: k = { gi, frac } (its place in its group); returns the
 *                        chord when a Cloud skill changes the harmony
 *     .beat(level, bar, pos, t, { drop, fill })  one 16th of the drums at BEATS[level]
 *     .laser(t)          the shot
 *     .chordAt(t) · .setChord(ch, t) · .resetHarmony() · .mono (bass, lead, pad)
 *     .P                 the live patch (every setting below); .setPatch(diff) changes it, live
 *     .mbus · .glitch · .sfx · .master · .meter · .dbus   the buses the game drives
 *   SKILL_SYNTH.SCHEMA   every setting: label, range, default. The lab draws its controls from it
 *   SKILL_SYNTH.load() / save(diff)   the tuned patch in localStorage, as changes from the defaults
 */
window.SKILL_SYNTH = (() => {
  const BPM = 172, BEAT = 60 / BPM, SIX = BEAT / 4, BAR = 4 * BEAT
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const acc = (a) => (a === '♭' ? -1 : a === '♯' ? 1 : 0)
  const midi = (n) => { const [, l, a, o] = /^([A-G])(♭|♯)?(-?\d)$/.exec(n); return 12 * (+o + 1) + PC[l] + acc(a) }
  const hz = (m) => 440 * 2 ** ((m - 69) / 12)
  const R = Math.round
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  // one chord per Cloud skill, all from D minor and none with a leading tone (no cadences, nothing jazzy)
  const CHORDS = [
    ['Dm9', 'D3 A3 C4 E4 F4'], ['B♭maj9', 'B♭2 F3 A3 C4 D4'], ['Gm9', 'G2 F3 A3 B♭3 D4'], ['Am11', 'A2 G3 C4 D4 E4'],
    ['Fmaj9', 'F2 E3 G3 A3 C4'], ['Cadd9', 'C3 G3 D4 E4'], ['Dm11', 'D3 G3 C4 F4 A4'], ['B♭add9', 'B♭2 F3 C4 D4'],
    ['Gm11', 'G2 F3 B♭3 C4 D4'], ['Am7', 'A2 E3 G3 C4'], ['Fadd9', 'F2 C3 G3 A3'], ['Dm(add9)', 'D3 A3 E4 F4'],
  ].map(([name, v]) => { const notes = v.split(' ').map(midi); return { name, notes, root: notes[0], pcs: [...new Set(notes.map((m) => m % 12))] } })
  const inChord = (ch, lo, hi) => { const out = []; for (let m = lo; m <= hi; m++) if (ch.pcs.includes(m % 12)) out.push(m); return out }
  const at01 = (list, f) => R(clamp(f, 0, 1) * (list.length - 1))

  /* every group is a part of the band; c = its colour (the ring, its light in the readout, its heading) */
  const PARTS = {
    backend: { label: 'Bass', c: '150 90% 62%' },
    cloud: { label: 'Chords', c: '260 100% 82%' },
    frontend: { label: 'Arp', c: '190 100% 74%' },
    ai: { label: 'Lead', c: '290 100% 80%' },
    quality: { label: 'Bleeps', c: '210 100% 78%' },
    product: { label: 'Bells', c: '45 100% 68%' },
    music: { label: 'Vox', c: '320 100% 82%' },
  }
  const ON_8TH = { cloud: true, backend: true, music: true } // these land on the next 8th, the rest on the next 16th

  /* the beat, wave by wave (16 steps a bar; numbers are velocities) */
  const H8 = [0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0]
  const H16 = [0.4, 0.15, 0.55, 0.2, 0.4, 0.15, 0.55, 0.2, 0.4, 0.15, 0.55, 0.2, 0.4, 0.15, 0.55, 0.25]
  const SH = [0.6, 0.25, 0.4, 0.25, 0.6, 0.25, 0.4, 0.3, 0.6, 0.25, 0.4, 0.25, 0.6, 0.25, 0.4, 0.35]
  const BEATS = [
    { name: 'kick and hats', k: [0, 10], h: H8 }, // wave 1 (half-time)
    { name: 'the snare comes in', k: [0, 10], s: [8], g: [6, 15], h: H8, sh: SH }, // wave 2 (half-time)
    { name: 'the drop', k: [0, 10], s: [4, 12], g: [7, 9, 15], h: H8, sh: SH, o: [14] }, // wave 3: full-time two-step
    { name: 'busier', k: [0, 10], k2: [0, 6, 10], s: [4, 12], g: [2, 7, 9, 14, 15], h: H16, ride: true, o: [14], fills: 4 }, // wave 4
    { name: 'the break', k: [0, 2, 10, 11], s: [4, 12], g: [7, 9, 14], h: H16, ride: true, sh: SH, o: [6, 14], fills: 2 }, // wave 5+
  ]

  /* the recorded drums (CC0, from Freesound; docs/design/sound-lab/audio/CREDITS.md): the ride, the crash, the
     drop's boom and its riser. A set can have a soft and a hard layer (the hit's velocity picks one) with a few takes
     each that alternate, so no two hits are alike. A riser's file ends where it arrives (on the drop). Within a kind
     every set is matched in loudness over `norm` (seconds from the start; a negative start counts from the end) */
  const SETS = {
    ride: { norm: [0, 0.4], sets: {
      meinl: { label: 'Meinl Byzance dry', soft: ['ride-meinl-1', 'ride-meinl-2'], hard: ['ride-meinl-3', 'ride-meinl-4'] },
      ping: { label: 'Zildjian ping', soft: ['ride-ping-soft'], hard: ['ride-ping'] },
      k: { label: 'K Zildjian', hard: ['ride-k'] },
      savannah: { label: 'Savannah', hard: ['ride-savannah'] },
      soft22: { label: '22″ soft', hard: ['ride-22-soft'] },
      crisp: { label: 'Crisp', hard: ['ride-crisp'] },
      meinlBell: { label: 'Meinl bell', hard: ['ride-meinl-bell'] },
      pingBell: { label: 'Zildjian bell', hard: ['ride-ping-bell'] },
      kBell: { label: 'K bell', hard: ['ride-k-bell'] },
      savBell: { label: 'Savannah bell', hard: ['ride-savannah-bell'] },
    } },
    crash: { norm: [0, 0.5], sets: {
      meinl18: { label: 'Meinl Byzance 18″ thin', soft: ['crash-meinl18-1', 'crash-meinl18-2'], hard: ['crash-meinl18-3', 'crash-meinl18-4'] },
      meinl16: { label: 'Meinl Byzance 16″ dry', soft: ['crash-meinl16-1'], hard: ['crash-meinl16-2', 'crash-meinl16-3'] },
      b8: { label: 'Sabian B8 18″', hard: ['crash-b8'] },
      savannah: { label: 'Savannah', hard: ['crash-savannah'] },
      big: { label: 'Big and long', hard: ['crash-big'] },
    } },
    impact: { norm: [0, 1], sets: {
      subdrop: { label: 'Sub drop', hard: ['boom-subdrop'] },
      bassdrop: { label: 'Bass drop', hard: ['boom-bassdrop'] },
      cinematic: { label: 'Cinematic', hard: ['boom-jm'] },
      synthdrop: { label: 'Synth drop', hard: ['boom-synthdrop'] },
      deep: { label: 'Deep sub', hard: ['boom-ramon'] },
    } },
    riser: { norm: [-1, 0], sets: {
      short: { label: 'Short build', hard: ['riser-short'] },
      noise: { label: 'Noise build', hard: ['riser-4bar'] },
      synthNoise: { label: 'Synth and noise', hard: ['riser-synth'] },
      perc: { label: 'Percussive', hard: ['riser-perc'] },
      uplifter: { label: 'Uplifter', hard: ['riser-uplifter'] },
    } },
  }
  const CRASH_G = 0.3, BOOM_G = 0.48, RISER_G = 0.12 // each kind's level, its sets matched: measured to sit where round 6's synth ones did
  const optsOf = (kind, own, label) => [...Object.entries(SETS[kind].sets).map(([k, v]) => [k, v.label]), [own, label]] // the recordings, then the synth
  // the recordings sit in the Sound lab's folder, found from where this script was loaded
  const SAMPLES = typeof document !== 'undefined' && document.currentScript ? new URL('../../sound-lab/audio/', document.currentScript.src).href : ''

  /* ---------- every setting: the lab draws its controls from this; the defaults are the sound as it ships ---------- */
  // unit: how the value reads (hz, s, x, c = cents, st = semitones, q, pct, beats, bars, oct, pan, db, n, ratio, raw);
  // hz is always a log slider, `log` makes any other one log too
  const WAVES = [['sine', 'Sine'], ['triangle', 'Tri'], ['sawtooth', 'Saw'], ['square', 'Square']]
  const num = (k, label, def, min, max, step, unit, more) => ({ k, label, def, min, max, step, unit, ...more })
  const pick = (k, label, def, opts) => ({ k, label, def, opts })
  const mix = (d, r, oct = 0) => ({ title: 'Mix', params: [
    num('level', 'Level', 1, 0, 2, 0.01, 'x'),
    num('pan', 'Pan', 0, -1, 1, 0.01, 'pan'),
    num('octave', 'Octave', oct, -2, 2, 1, 'oct'),
    num('delay', 'Delay send', d, 0, 1, 0.01, 'pct'),
    num('verb', 'Reverb send', r, 0, 1, 0.01, 'pct'),
  ] })
  // 2026-10-20: Phill's first patch from the Sound lab is the default for Bass, Lead and Vox. What round 6 had:
  //   Bass  wave saw, drive 0, sub wave sine, sub 1, cutoff 1300 → 420 over 250 ms, resonance 3, no wobble (rate 2 Hz),
  //         2 beats, release 100 ms, no glide, octave 0, reverb 4%
  //   Lead  wave saw, sub wave square, filter 900 → 4200 in 30 ms → 1700 by 400 ms, resonance 5, 1.5 beats,
  //         vibrato 5.6 Hz, 16¢ after 450 ms, glide 60 ms
  //   Vox   wave saw, no breath, scoop from 0.93 over 70 ms, hold 320 ms, release 90 ms
  // and his second: the ride is the recorded K Zildjian, cut to 1.7 s (round 6's synthesized ride is "808 (round 6)")
  // and his third: the Meinl 18″ crash darker (0.66) and higher (1.16), the Percussive riser, the Bass drop boom pitched up (1.4)
  //   (round 6 had synthesized ones: "Synth (round 6)" in each)
  const SCHEMA = [
    { id: 'backend', label: 'Bass', group: 'Backend & data', c: PARTS.backend.c, about: 'Deep and round: two detuned sines an octave up, a little drive, a resonant filter that closes slowly and drifts, over a triangle sub. One note at a time from the chord’s root, gliding into the next.', sections: [
      { title: 'Oscillators', params: [
        pick('wave', 'Wave', 'sine', WAVES),
        num('unison', 'Voices', 2, 1, 6, 1, 'n'),
        num('detune', 'Detune', 10, 0, 60, 1, 'c'),
        num('drive', 'Drive', 0.08, 0, 1, 0.01, 'pct'),
        num('reese', 'Upper level', 1, 0, 2, 0.01, 'x'),
        pick('subWave', 'Sub wave', 'triangle', WAVES),
        num('sub', 'Sub level', 0.99, 0, 2, 0.01, 'x'),
      ] },
      { title: 'Filter', params: [
        num('cutoff', 'Cutoff', 2020, 80, 12000, 0, 'hz'),
        num('cutEnd', 'Closes to', 239, 40, 8000, 0, 'hz'),
        num('sweep', 'Sweep', 0.716, 0.01, 2, 0, 's', { log: true }),
        num('res', 'Resonance', 13.2, 0.1, 20, 0.1, 'q'),
        num('wobble', 'Wobble', 0.26, 0, 1, 0.01, 'pct'),
        num('wobbleRate', 'Wobble rate', 0.1, 0.02, 12, 0, 'hzl', { log: true }),
      ] },
      { title: 'Envelope', params: [
        num('attack', 'Attack', 0.008, 0.001, 0.5, 0, 's', { log: true }),
        num('length', 'Length', 4, 0.25, 8, 0.25, 'beats'),
        num('release', 'Release', 0.268, 0.01, 1.5, 0, 's', { log: true }),
        num('glide', 'Glide', 0.08, 0, 0.3, 0.005, 's'),
      ] },
      mix(0, 0.24, -1),
    ] },
    { id: 'cloud', label: 'Chords', group: 'Cloud & DevOps', c: PARTS.cloud.c, about: 'Each Cloud skill is a chord. A saw stab whose filter closes fast, and a soft pad that holds until the next chord.', sections: [
      { title: 'Stab', params: [
        pick('stabWave', 'Wave', 'sawtooth', WAVES),
        num('unison', 'Voices per note', 2, 1, 4, 1, 'n'),
        num('stabDetune', 'Detune', 10, 0, 60, 1, 'c'),
        num('stabCut', 'Cutoff', 5200, 200, 16000, 0, 'hz'),
        num('stabCutEnd', 'Closes to', 650, 60, 8000, 0, 'hz'),
        num('stabSweep', 'Sweep', 0.5, 0.02, 3, 0, 's', { log: true }),
        num('stabRes', 'Resonance', 2.5, 0.1, 20, 0.1, 'q'),
        num('stabAttack', 'Attack', 0.004, 0.001, 1, 0, 's', { log: true }),
        num('stabDecay', 'Decay', 0.95, 0.05, 4, 0, 's', { log: true }),
        num('stabLevel', 'Level', 1, 0, 2, 0.01, 'x'),
        num('stabDelay', 'Delay send', 0.4, 0, 1, 0.01, 'pct'),
        num('stabVerb', 'Reverb send', 0.45, 0, 1, 0.01, 'pct'),
      ] },
      { title: 'Pad', params: [
        pick('padWave', 'Wave', 'sawtri', [['sawtri', 'Saw + Tri'], ...WAVES]),
        num('padOctave', 'Octave', 1, -1, 2, 1, 'oct'),
        num('padDetune', 'Detune', 6, 0, 40, 1, 'c'),
        num('padCut', 'Cutoff', 1000, 100, 10000, 0, 'hz'),
        num('padRes', 'Resonance', 0.5, 0.1, 12, 0.1, 'q'),
        num('padAttack', 'Swell', 0.7, 0.01, 4, 0, 's', { log: true }),
        num('padHold', 'Holds for', 4, 1, 8, 1, 'bars'),
        num('padRelease', 'Release', 0.6, 0.05, 4, 0, 's', { log: true }),
        num('padLevel', 'Level', 1, 0, 3, 0.01, 'x'),
        num('padDelay', 'Delay send', 0.15, 0, 1, 0.01, 'pct'),
        num('padVerb', 'Reverb send', 0.6, 0, 1, 0.01, 'pct'),
      ] },
      { title: 'Mix', params: [
        num('level', 'Level', 1, 0, 2, 0.01, 'x'),
        num('pan', 'Pan', 0, -1, 1, 0.01, 'pan'),
        num('octave', 'Octave', 0, -1, 1, 1, 'oct'),
      ] },
    ] },
    { id: 'frontend', label: 'Arp', group: 'Frontend & mobile', c: PARTS.frontend.c, about: 'A fast run up the chord: resonant square plucks, very wet. Where it starts depends on the skill.', sections: [
      { title: 'Notes', params: [
        num('steps', 'Notes', 6, 2, 12, 1, 'n'),
        pick('rate', 'Rate', 1, [[1, '16ths'], [2, '8ths'], [3, 'Dotted 8ths']]),
        pick('pattern', 'Pattern', 'up', [['up', 'Up'], ['down', 'Down'], ['updown', 'Up-down'], ['skip', 'Skip']]),
        num('fade', 'Fade per note', 1 / 14, 0, 0.2, 0.005, 'pct'),
      ] },
      { title: 'Tone', params: [
        pick('wave', 'Wave', 'square', WAVES),
        num('cutoff', 'Cutoff', 4600, 200, 16000, 0, 'hz'),
        num('cutEnd', 'Closes to', 480, 60, 8000, 0, 'hz'),
        num('sweep', 'Sweep', 0.13, 0.01, 1, 0, 's', { log: true }),
        num('res', 'Resonance', 9, 0.1, 25, 0.1, 'q'),
        num('attack', 'Attack', 0.002, 0.001, 0.2, 0, 's', { log: true }),
        num('decay', 'Decay', 0.2, 0.03, 1.5, 0, 's', { log: true }),
      ] },
      mix(0.55, 0.35),
    ] },
    { id: 'ai', label: 'Lead', group: 'AI', c: PARTS.ai.c, about: 'Detuned squares over a sine an octave down. The filter swells open over a second, a wide vibrato arrives on long notes, and close notes glide.', sections: [
      { title: 'Oscillators', params: [
        pick('wave', 'Wave', 'square', WAVES),
        num('unison', 'Voices', 2, 1, 7, 1, 'n'),
        num('detune', 'Detune', 8, 0, 60, 1, 'c'),
        pick('subWave', 'Sub wave', 'sine', WAVES),
        num('sub', 'Sub level', 0.3, 0, 1, 0.01, 'pct'),
        num('subOct', 'Sub octave', -1, -2, 1, 1, 'oct'),
      ] },
      { title: 'Filter', params: [
        num('cutoff', 'Starts at', 900, 100, 8000, 0, 'hz'),
        num('peak', 'Opens to', 969, 200, 16000, 0, 'hz'),
        num('sustainCut', 'Settles at', 2470, 100, 12000, 0, 'hz'),
        num('fAttack', 'Opens in', 0.00514, 0.002, 0.5, 0, 's', { log: true }),
        num('fDecay', 'Settles in', 1.06, 0.05, 2, 0, 's', { log: true }),
        num('res', 'Resonance', 3.7, 0.1, 20, 0.1, 'q'),
      ] },
      { title: 'Envelope', params: [
        num('attack', 'Attack', 0.012, 0.001, 0.5, 0, 's', { log: true }),
        num('decay', 'Decay', 0.15, 0.01, 1, 0, 's', { log: true }),
        num('sustain', 'Sustain', 2 / 3, 0, 1, 0.01, 'pct'),
        num('length', 'Length', 2.5, 0.25, 4, 0.25, 'beats'),
        num('release', 'Release', 0.12, 0.01, 2, 0, 's', { log: true }),
      ] },
      { title: 'Motion', params: [
        num('vibRate', 'Vibrato rate', 5.4, 0.5, 12, 0.1, 'hzl'),
        num('vibDepth', 'Vibrato depth', 57, 0, 80, 1, 'c'),
        num('vibDelay', 'Vibrato after', 1.22, 0, 2.5, 0.01, 's'),
        num('glide', 'Glide', 0.21, 0, 0.5, 0.005, 's'),
        num('glideWindow', 'Glide if within', 1.5, 0, 4, 0.25, 'beats'),
      ] },
      mix(0.45, 0.4),
    ] },
    { id: 'quality', label: 'Bleeps', group: 'Quality & security', c: PARTS.quality.c, about: 'Two sci-fi bleeps an octave apart: a chirping sine with a little filtered square for edge, mostly echo.', sections: [
      { title: 'Tone', params: [
        pick('wave', 'Wave', 'sine', WAVES),
        pick('wave2', 'Edge wave', 'square', WAVES),
        num('mix', 'Edge', 0.12, 0, 1, 0.01, 'pct'),
        num('tone', 'Edge filter', 2600, 300, 12000, 0, 'hz'),
        num('drop', 'Chirp', 1.5, 1, 4, 0.05, 'ratio'),
        num('dropTime', 'Chirp time', 0.025, 0.002, 0.3, 0, 's', { log: true }),
        num('attack', 'Attack', 0.002, 0.001, 0.1, 0, 's', { log: true }),
        num('decay', 'Decay', 0.11, 0.02, 1, 0, 's', { log: true }),
      ] },
      { title: 'Second bleep', params: [
        num('echoAt', 'After', 2, 0, 8, 1, 'six'),
        num('echoNote', 'Interval', 12, -12, 24, 1, 'st'),
        num('echoVel', 'Level', 1, 0, 1.5, 0.01, 'x'),
      ] },
      mix(0.75, 0.3),
    ] },
    { id: 'product', label: 'Bells', group: 'Product', c: PARTS.product.c, about: 'An FM bell (one sine bending another, brightest at the strike), then a softer second bell lower in the chord.', sections: [
      { title: 'FM', params: [
        pick('carrier', 'Wave', 'sine', WAVES),
        num('ratio', 'Ratio', 3.5, 0.5, 8, 0.25, 'ratio'),
        num('index', 'Brightness', 2.2, 0, 8, 0.05, 'raw'),
        num('indexEnd', 'Fades to', 0.04, 0.01, 2, 0, 'raw', { log: true }),
        num('bright', 'Fades over', 1.4, 0.05, 4, 0, 's', { log: true }),
        num('attack', 'Attack', 0.004, 0.001, 0.3, 0, 's', { log: true }),
        num('decay', 'Decay', 2.1, 0.1, 6, 0, 's', { log: true }),
      ] },
      { title: 'Second bell', params: [
        num('secondAt', 'After', 2, 0, 8, 1, 'six'),
        num('second', 'Chord steps', -2, -4, 4, 1, 'n'),
        num('secondVel', 'Level', 0.6, 0, 1.5, 0.01, 'x'),
      ] },
      mix(0.35, 0.4),
    ] },
    { id: 'music', label: 'Vox', group: 'Music & more', c: PARTS.music.c, about: 'A breathy vocal chop: a triangle and breath through three vowel filters (formants), scooping up five semitones into a long note.', sections: [
      { title: 'Voice', params: [
        pick('wave', 'Wave', 'triangle', WAVES),
        pick('vowel', 'Vowel', 'cycle', [['cycle', 'Per skill'], ['ah', 'Ah'], ['oh', 'Oh'], ['eh', 'Eh'], ['oo', 'Oo']]),
        num('formant', 'Formant shift', 1, 0.6, 1.6, 0.01, 'ratio'),
        num('q', 'Formant focus', 1, 0.3, 3, 0.01, 'x'),
        num('breath', 'Breath', 0.94, 0, 1.5, 0.01, 'pct'),
      ] },
      { title: 'Envelope', params: [
        num('scoop', 'Scoop from', 0.745, 0.5, 1, 0.005, 'ratioSt'),
        num('scoopTime', 'Scoop time', 0.144, 0.005, 0.5, 0, 's', { log: true }),
        num('attack', 'Attack', 0.025, 0.001, 0.3, 0, 's', { log: true }),
        num('hold', 'Hold', 0.7, 0.05, 1.5, 0.01, 's'),
        num('release', 'Release', 0.327, 0.01, 1, 0, 's', { log: true }),
      ] },
      mix(0.35, 0.6),
    ] },
    { id: 'drums', label: 'Drums', group: 'The beat', c: '190 100% 75%', about: 'The beat that plays by itself, all synthesized: kick, snare and ghost notes, hats, shaker, crash, the drop’s riser and boom, and recorded ones (all CC0): the ride, the crash, the drop’s boom and the riser into it, each with a few to pick from. The ride comes in at wave 4; the riser, the crash and the boom are the drop into wave 3.', sections: [
      { title: 'Kick', params: [
        num('kick', 'Level', 1, 0, 2, 0.01, 'x'),
        num('kickPitch', 'Start pitch', 150, 60, 400, 1, 'hzl'),
        num('kickLow', 'End pitch', 46, 25, 120, 1, 'hzl'),
        num('kickSweep', 'Pitch drop', 0.1, 0.01, 0.5, 0, 's', { log: true }),
        num('kickDecay', 'Decay', 0.42, 0.05, 1.5, 0, 's', { log: true }),
        num('kickClick', 'Click', 1, 0, 3, 0.01, 'x'),
      ] },
      { title: 'Snare', params: [
        num('snare', 'Level', 1, 0, 2, 0.01, 'x'),
        num('snareTone', 'Noise tone', 2200, 300, 9000, 0, 'hz'),
        num('snareSnap', 'Low cut', 700, 100, 5000, 0, 'hz'),
        num('snareDecay', 'Decay', 0.2, 0.03, 1, 0, 's', { log: true }),
        num('snareBody', 'Body pitch', 210, 80, 400, 1, 'hzl'),
        num('snareBodyLvl', 'Body', 1, 0, 2, 0.01, 'x'),
        num('ghost', 'Ghost notes', 0.2, 0, 1, 0.01, 'pct'),
      ] },
      { title: 'Hats and cymbals', params: [
        num('hats', 'Hats', 1, 0, 2, 0.01, 'x'),
        num('hatTone', 'Hat tone', 7800, 2000, 16000, 0, 'hz'),
        num('hatDecay', 'Hat decay', 0.045, 0.01, 0.3, 0, 's', { log: true }),
        num('openDecay', 'Open hat decay', 0.3, 0.05, 1.5, 0, 's', { log: true }),
        num('shaker', 'Shaker', 1, 0, 2, 0.01, 'x'),
      ] },
      { title: 'Crash', params: [
        pick('crashType', 'Sound', 'meinl18', optsOf('crash', 'synth', 'Synth (round 6)')),
        num('crash', 'Level', 1, 0, 2, 0.01, 'x'),
        num('crashLen', 'Length', 3.5, 0.3, 3.5, 0.05, 's'),
        num('crashTone', 'Brightness', 0.66, 0.5, 1.6, 0.01, 'x'),
        num('crashPitch', 'Pitch', 1.16, 0.8, 1.5, 0.005, 'x'),
      ] },
      { title: 'Ride', params: [
        pick('rideType', 'Sound', 'k', optsOf('ride', 'metal', '808 (round 6)')),
        num('ride', 'Level', 1, 0, 2, 0.01, 'x'),
        num('rideLen', 'Length', 1.7, 0.3, 3, 0.05, 's'),
        num('rideTone', 'Brightness', 1, 0.6, 1.6, 0.01, 'x'),
        num('ridePitch', 'Pitch', 1, 0.8, 1.25, 0.005, 'x'),
      ] },
      { title: 'Riser', params: [
        pick('riserType', 'Sound', 'perc', optsOf('riser', 'synth', 'Synth (round 6)')),
        num('riser', 'Level', 1, 0, 2, 0.01, 'x'),
      ] },
      { title: 'Boom', params: [
        pick('impactType', 'Sound', 'bassdrop', optsOf('impact', 'synth', 'Synth (round 6)')),
        num('impact', 'Level', 1, 0, 2, 0.01, 'x'),
        num('impactPitch', 'Pitch', 1.4, 0.7, 2, 0.005, 'x'),
      ] },
      { title: 'The bus', params: [
        num('bus', 'Drums level', 0.9, 0, 1.5, 0.01, 'x'),
        num('verb', 'Reverb send', 0.08, 0, 0.6, 0.01, 'pct'),
      ] },
    ] },
    { id: 'laser', label: 'Laser', group: 'The shot', c: '186 100% 82%', about: 'Every shot fires it: detuned saws diving in pitch through a biting filter, a little drive, a thump under them and a crackle on top. Mostly dry, so it cuts through the beat. Zap (round 6) is the old blip, to compare.', sections: [
      { title: 'Zap', params: [
        pick('kind', 'Sound', 'blaster', [['blaster', 'Blaster'], ['round6', 'Zap (round 6)']]),
        pick('wave', 'Wave', 'sawtooth', WAVES),
        num('unison', 'Voices', 2, 1, 4, 1, 'n'),
        num('detune', 'Detune', 14, 0, 60, 1, 'c'),
        num('from', 'Starts at', 1600, 200, 6000, 0, 'hz'),
        num('to', 'Dives to', 120, 30, 1500, 0, 'hz'),
        num('sweep', 'Dive time', 0.14, 0.02, 0.6, 0, 's', { log: true }),
        num('bright', 'Filter', 5200, 300, 16000, 0, 'hz'),
        num('res', 'Bite', 7, 0.1, 20, 0.1, 'q'),
        num('decay', 'Length', 0.22, 0.04, 1, 0, 's', { log: true }),
        num('drive', 'Drive', 0.35, 0, 1, 0.01, 'pct'),
      ] },
      { title: 'Punch', params: [
        num('thump', 'Thump', 0.8, 0, 2, 0.01, 'x'),
        num('thumpPitch', 'Thump pitch', 140, 40, 400, 1, 'hzl'),
        num('crackle', 'Crackle', 0.6, 0, 2, 0.01, 'x'),
        num('crackleTone', 'Crackle tone', 4200, 500, 14000, 0, 'hz'),
      ] },
      { title: 'Mix', params: [
        num('level', 'Level', 1, 0, 2, 0.01, 'x'),
        num('delay', 'Echo', 0.12, 0, 1, 0.01, 'pct'),
        num('verb', 'Reverb send', 0.12, 0, 1, 0.01, 'pct'),
      ] },
    ] },
    { id: 'space', label: 'Space', group: 'Delay, reverb, mix', c: '130 90% 60%', about: 'Where every synth goes: a ping-pong delay, a long reverb, the pump that ducks the synths on every kick, and the master.', sections: [
      { title: 'Delay', params: [
        pick('dTime', 'Time', 3, [[1, '16th'], [2, '8th'], [3, 'Dotted 8th'], [4, 'Quarter'], [6, 'Dotted ¼']]),
        num('dFeedback', 'Feedback', 0.45, 0, 0.92, 0.01, 'pct'),
        num('dTone', 'Repeats darken to', 3400, 400, 14000, 0, 'hz'),
        num('dLowcut', 'Low cut', 260, 20, 2000, 0, 'hz'),
        num('dReturn', 'Level', 0.6, 0, 1.5, 0.01, 'x'),
        num('dToVerb', 'Into the reverb', 0.3, 0, 1, 0.01, 'pct'),
      ] },
      { title: 'Reverb', params: [
        num('rSize', 'Length', 3.4, 0.4, 8, 0.1, 's'),
        num('rDecay', 'Decay curve', 2.6, 0.5, 6, 0.1, 'raw'),
        num('rBright', 'Brightness', 0.35, 0.05, 0.95, 0.01, 'pct'),
        num('rPre', 'Pre-delay', 0, 0, 0.12, 0.001, 's'),
        num('rReturn', 'Level', 0.55, 0, 1.5, 0.01, 'x'),
      ] },
      { title: 'Pump', params: [
        num('pump', 'Depth', 0.4, 0, 0.9, 0.01, 'pct'),
        num('pumpRelease', 'Recovery', 0.09, 0.01, 0.5, 0, 's', { log: true }),
      ] },
      { title: 'Master', params: [
        num('synths', 'Synths', 1, 0, 2, 0.01, 'x'),
        num('master', 'Master', 0.7, 0, 1, 0.01, 'x'),
        num('threshold', 'Glue threshold', -16, -40, 0, 0.5, 'db'),
        num('ratio', 'Glue ratio', 4, 1, 20, 0.1, 'ratio'),
      ] },
    ] },
  ]
  const SPEC = {} // id → key → param
  SCHEMA.forEach((pn) => { SPEC[pn.id] = {}; pn.sections.forEach((s) => s.params.forEach((p) => { SPEC[pn.id][p.k] = p })) })
  function defaults() { const P = {}; for (const id in SPEC) { P[id] = {}; for (const k in SPEC[id]) P[id][k] = SPEC[id][k].def } return P }
  /* only known settings, numbers clamped to their range, choices from their list */
  function clean(diff) {
    const out = {}
    for (const id in diff || {}) {
      if (!SPEC[id]) continue
      for (const k in diff[id]) {
        const p = SPEC[id][k], v = diff[id][k]
        if (!p) continue
        let ok
        if (p.opts) ok = p.opts.some(([o]) => o === v) ? v : undefined
        else if (typeof v === 'number' && isFinite(v)) ok = snap(p, clamp(v, p.min, p.max))
        if (ok !== undefined) (out[id] = out[id] || {})[k] = ok
      }
    }
    return out
  }
  /* a linear setting lands on its step (whole voices, octaves, notes); a log one keeps 3 significant digits */
  const snap = (p, v) => (p.step && !(p.unit === 'hz' || p.log) ? +(p.min + Math.round((v - p.min) / p.step) * p.step).toFixed(6) : +v.toPrecision(6))
  function diffOf(P) {
    const out = {}
    for (const id in SPEC) for (const k in SPEC[id]) {
      const d = SPEC[id][k].def, v = P[id][k]
      if (typeof d === 'number' ? Math.abs(v - d) > 1e-9 : v !== d) (out[id] = out[id] || {})[k] = v
    }
    return out
  }
  const KEY = 'skill-synth-patch'
  function load() { try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')) } catch { return {} } }
  function save(diff) { try { if (Object.keys(diff).length) localStorage.setItem(KEY, JSON.stringify(diff)); else localStorage.removeItem(KEY) } catch { /* private mode */ } }

  const VOWELS = {
    ah: [[800, 7, 1], [1150, 8, 0.55], [2900, 10, 0.3]],
    oh: [[450, 7, 1], [800, 8, 0.5], [2830, 10, 0.18]],
    eh: [[400, 7, 1], [1700, 9, 0.45], [2600, 10, 0.3]],
    oo: [[325, 7, 1], [700, 8, 0.35], [2530, 10, 0.12]],
  }

  /* ---------- an engine on one AudioContext ---------- */
  function create(ac, diff) {
    const P = defaults()
    const put = (d) => { const c = clean(d); for (const id in SPEC) Object.assign(P[id], defaults()[id], c[id] || {}) }
    put(diff)
    const S = P.space

    /* the graph: synths → dry, plus sends to a ping-pong delay and a reverb; all three → syn, which pumps
       on the kick. drums → dbus. syn and dbus → the glitch filter → the track's fader (mbus) → master.
       Game sounds (sfx) skip all of it */
    let active = 0, made = 0, muted = false
    const master = ac.createGain()
    master.gain.value = S.master
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = S.threshold; comp.knee.value = 10; comp.ratio.value = S.ratio; comp.attack.value = 0.003; comp.release.value = 0.2
    master.connect(comp).connect(ac.destination)
    const meter = ac.createAnalyser()
    meter.fftSize = 2048
    comp.connect(meter)
    const mbus = ac.createGain()
    mbus.gain.value = 0
    const glitch = ac.createBiquadFilter()
    glitch.type = 'lowpass'; glitch.frequency.value = 18000; glitch.Q.value = 0.7
    glitch.connect(mbus).connect(master)
    const syn = ac.createGain()
    syn.gain.value = S.synths
    syn.connect(glitch)
    const dry = ac.createGain()
    dry.connect(syn)
    // the delay: a dotted 8th (by default) that ping-pongs left and right, a little darker on every repeat
    const dlyIn = ac.createGain()
    const dhp = ac.createBiquadFilter(); dhp.type = 'highpass'; dhp.frequency.value = S.dLowcut
    const dl = ac.createDelay(1), dr = ac.createDelay(1) // up to a dotted quarter (0.52 s)
    dl.delayTime.value = dr.delayTime.value = S.dTime * SIX
    const fb = ac.createGain(); fb.gain.value = S.dFeedback
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = S.dTone
    const merge = ac.createChannelMerger(2)
    const dret = ac.createGain(); dret.gain.value = S.dReturn
    dlyIn.connect(dhp).connect(dl)
    dl.connect(merge, 0, 0); dr.connect(merge, 0, 1)
    dl.connect(dr)
    dr.connect(dlp).connect(fb).connect(dl)
    merge.connect(dret).connect(syn)
    // the room: long and soft; the echoes go into it too
    const verbIn = ac.createGain()
    const pre = ac.createDelay(0.5); pre.delayTime.value = S.rPre
    const verb = ac.createConvolver()
    const rooms = new Map()
    const roomKey = () => `${S.rSize}|${S.rDecay}|${S.rBright}`
    function room() {
      const key = roomKey()
      if (!rooms.has(key)) { if (rooms.size > 3) rooms.delete(rooms.keys().next().value); rooms.set(key, impulse(S.rSize, S.rDecay, S.rBright)) }
      return rooms.get(key)
    }
    verb.buffer = room()
    let roomNow = roomKey()
    const vret = ac.createGain(); vret.gain.value = S.rReturn
    let preOn = S.rPre > 0 // the pre-delay is only in the path while it's set (a 0 s delay isn't quite a wire)
    if (preOn) verbIn.connect(pre).connect(verb); else verbIn.connect(verb)
    pre.connect(verb)
    verb.connect(vret).connect(syn)
    const d2v = ac.createGain(); d2v.gain.value = S.dToVerb
    merge.connect(d2v).connect(verbIn)
    const dbus = ac.createGain()
    dbus.gain.value = P.drums.bus
    dbus.connect(glitch)
    const dsend = ac.createGain(); dsend.gain.value = P.drums.verb
    dbus.connect(dsend).connect(verbIn)
    const sfx = ac.createGain()
    sfx.gain.value = 0.8
    sfx.connect(master)
    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const nd = noise.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    function impulse(seconds, decay, bright) { // the room: noise, darker and quieter as it goes
      const sr = ac.sampleRate, len = Math.floor(sr * seconds)
      const buf = ac.createBuffer(2, len, sr)
      const fall = (bright * 6) / 7 // at the default brightness: 0.35 → 0.05 over the tail
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c)
        let lp = 0
        for (let i = 0; i < len; i++) {
          const t = i / len
          lp += (bright - fall * t) * ((Math.random() * 2 - 1) - lp)
          d[i] = lp * (1 - t) ** decay
        }
      }
      return buf
    }
    /* a setting changed: the buses follow (smoothly); the room is rebuilt only when its shape changed */
    function applySpace() {
      const t = ac.currentTime, to = (p, v) => p.setTargetAtTime(v, t, 0.03)
      to(master.gain, muted ? 0 : S.master)
      to(comp.threshold, S.threshold); to(comp.ratio, S.ratio)
      to(dl.delayTime, S.dTime * SIX); to(dr.delayTime, S.dTime * SIX)
      to(fb.gain, S.dFeedback); to(dlp.frequency, S.dTone); to(dhp.frequency, S.dLowcut); to(dret.gain, S.dReturn); to(d2v.gain, S.dToVerb)
      to(pre.delayTime, S.rPre); to(vret.gain, S.rReturn)
      if ((S.rPre > 0) !== preOn) { preOn = S.rPre > 0; if (preOn) { verbIn.disconnect(verb); verbIn.connect(pre) } else { verbIn.disconnect(pre); verbIn.connect(verb) } }
      to(syn.gain, S.synths)
      to(dbus.gain, P.drums.bus); to(dsend.gain, P.drums.verb)
      if (roomKey() !== roomNow) { roomNow = roomKey(); verb.buffer = room() }
      wantSamples()
    }

    /* one sound's nodes (d, r = how much goes to the delay and the reverb), all disconnected when its
       last source ends: no leak per note */
    function voice(to = dry, d = 0, r = 0, level = 1, pan = 0) {
      const out = ac.createGain()
      out.gain.value = level
      const nodes = [out]
      if (pan) { const pn = ac.createStereoPanner(); pn.pan.value = pan; out.connect(pn).connect(to); nodes.push(pn) } else out.connect(to)
      if (d) { const s = ac.createGain(); s.gain.value = d; out.connect(s).connect(dlyIn); nodes.push(s) }
      if (r) { const s = ac.createGain(); s.gain.value = r; out.connect(s).connect(verbIn); nodes.push(s) }
      let left = 0
      active++; made++
      return {
        out,
        node(n) { nodes.push(n); return n },
        src(n) {
          nodes.push(n); left++
          n.onended = () => { if (--left === 0) { nodes.forEach((x) => x.disconnect()); active-- } }
          return n
        },
      }
    }
    const pv = (p) => voice(dry, p.delay, p.verb, p.level, p.pan) // a part's voice, with its mix settings
    const osc = (v, type, f) => { const o = v.src(ac.createOscillator()); o.type = type; o.frequency.value = f; return o }
    const gain = (v, g = 0) => { const n = v.node(ac.createGain()); n.gain.value = g; return n }
    const filter = (v, type, f, q = 0.7) => { const n = v.node(ac.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = q; return n }
    function env(p, t, a, peak, d) {
      p.setValueAtTime(0.0001, t)
      p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a)
      p.exponentialRampToValueAtTime(0.0001, t + Math.max(d, a + 0.005))
    }
    const play = (srcs, t, end) => srcs.forEach((s) => { s.start(t); s.stop(end) })
    function noiseSrc(v, t, dur) { const n = v.src(ac.createBufferSource()); n.buffer = noise; n.loop = true; n.start(t, Math.random() * 0.5); n.stop(t + dur); return n }
    /* detuned copies of one oscillator, spread evenly across ±cents; any number of copies is as loud as two */
    function unison(v, type, f, n, cents, to) {
      const mixG = gain(v, Math.sqrt(2 / n)), list = []
      for (let i = 0; i < n; i++) { const o = osc(v, type, f); o.detune.value = n === 1 ? 0 : -cents + (2 * cents * i) / (n - 1); o.connect(mixG); list.push(o) }
      mixG.connect(to)
      return list
    }
    function shaper(v, amt) { // soft clipping, for the bass's drive
      const ws = v.node(ac.createWaveShaper()), k = amt * 40, c = new Float32Array(1024)
      for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) / (1 + amt * 0.6) }
      ws.curve = c; ws.oversample = '2x'
      return ws
    }
    /* the bass, the lead and the chord's tail are monophonic: a new note lets the last one go */
    function release(m, t) {
      if (!m) return
      for (const g of m.g) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.03) }
      if (t + 0.3 < m.end) { m.srcs.forEach((s) => { try { s.stop(t + 0.3) } catch { /* already done */ } }); m.end = t + 0.3 }
    }

    /* the synths: all wet. The bell is round 3's FM bell; the rest are new in round 6 */
    const I = {
      bell(f, t, vel) {
        const p = P.product, v = pv(p)
        const car = osc(v, p.carrier, f), mod = osc(v, 'sine', f * p.ratio)
        const idx = gain(v); idx.gain.setValueAtTime(Math.max(0.01, f * p.index), t); idx.gain.exponentialRampToValueAtTime(f * p.indexEnd, t + p.bright)
        mod.connect(idx).connect(car.frequency)
        const amp = gain(v); env(amp.gain, t, p.attack, 0.13 * vel, p.decay)
        car.connect(amp).connect(v.out)
        play([car, mod], t, t + p.decay + 0.05)
      },
      lead(f, t, vel, len, from) { // detuned oscillators and a sub, a filter envelope, vibrato, a glide from the last note
        const p = P.ai, v = pv(p)
        const lp = filter(v, 'lowpass', p.cutoff, p.res)
        const saws = unison(v, p.wave, f, p.unison, p.detune, lp)
        const so = 2 ** p.subOct, sq = osc(v, p.subWave, f * so)
        if (from && p.glide > 0) for (const [o, m] of [...saws.map((o) => [o, 1]), [sq, so]]) { o.frequency.setValueAtTime(from * m, t); o.frequency.exponentialRampToValueAtTime(f * m, t + p.glide) }
        const lfo = osc(v, 'sine', p.vibRate), depth = gain(v)
        depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(p.vibDepth, t + Math.max(0.005, p.vibDelay)) // cents, after the note settles
        lfo.connect(depth); saws.forEach((o) => depth.connect(o.detune))
        lp.frequency.setValueAtTime(p.cutoff, t); lp.frequency.exponentialRampToValueAtTime(p.peak, t + p.fAttack); lp.frequency.exponentialRampToValueAtTime(p.sustainCut, t + Math.max(p.fDecay, p.fAttack + 0.01))
        const sg = gain(v, p.sub)
        const amp = gain(v)
        amp.gain.setValueAtTime(0.0001, t)
        amp.gain.linearRampToValueAtTime(0.12 * vel, t + p.attack)
        amp.gain.setTargetAtTime(0.12 * vel * p.sustain, t + Math.max(0.05, p.attack + 0.005), p.decay)
        amp.gain.setTargetAtTime(0.0001, t + len, p.release)
        sq.connect(sg).connect(lp)
        lp.connect(amp).connect(v.out)
        const end = t + len + Math.max(0.9, 7.5 * p.release)
        const srcs = [...saws, sq, lfo]
        play(srcs, t, end)
        return { g: [amp], srcs, end, f, t }
      },
      bass(f, t, vel, len, from) { // detuned oscillators an octave up (optionally driven) through a filter, over a sub
        const p = P.backend, v = pv(p)
        const lp = filter(v, 'lowpass', p.cutoff, p.res)
        const pre = p.drive > 0 ? shaper(v, p.drive) : null
        if (pre) pre.connect(lp)
        const saws = unison(v, p.wave, f * 2, p.unison, p.detune, pre || lp), sub = osc(v, p.subWave, f)
        if (from && p.glide > 0) for (const [o, m] of [...saws.map((o) => [o, 2]), [sub, 1]]) { o.frequency.setValueAtTime(from * m, t); o.frequency.exponentialRampToValueAtTime(f * m, t + p.glide) }
        lp.frequency.setValueAtTime(p.cutoff, t); lp.frequency.exponentialRampToValueAtTime(p.cutEnd, t + p.sweep)
        const srcs = [...saws, sub]
        if (p.wobble > 0) { const w = osc(v, 'sine', p.wobbleRate), wg = gain(v, p.wobble * 2400); w.connect(wg).connect(lp.detune); srcs.push(w) }
        const mg = gain(v), sg = gain(v)
        for (const [g, peak] of [[mg, 0.05 * vel * p.reese], [sg, 0.07 * vel * p.sub]]) {
          g.gain.setValueAtTime(0.0001, t)
          g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + p.attack)
          g.gain.setValueAtTime(Math.max(0.0002, peak), t + Math.max(len, p.attack + 0.005))
          g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, p.attack + 0.005) + p.release)
        }
        lp.connect(mg).connect(v.out)
        sub.connect(sg).connect(v.out)
        const end = t + Math.max(len, p.attack + 0.005) + p.release + 0.05
        play(srcs, t, end)
        return { g: [mg, sg], srcs, end, f, t }
      },
      stab(notes, t, vel) { // the chord, as a stab: detuned saws per note through a filter that closes
        const p = P.cloud, v = voice(dry, p.stabDelay, p.stabVerb, p.level * p.stabLevel, p.pan)
        const lp = filter(v, 'lowpass', p.stabCut, p.stabRes)
        lp.frequency.setValueAtTime(p.stabCut, t); lp.frequency.exponentialRampToValueAtTime(p.stabCutEnd, t + p.stabSweep)
        const amp = gain(v); env(amp.gain, t, p.stabAttack, 0.06 * vel, p.stabDecay)
        const srcs = []
        for (const m of notes) srcs.push(...unison(v, p.stabWave, hz(m), p.unison, p.stabDetune, lp))
        lp.connect(amp).connect(v.out)
        play(srcs, t, t + Math.max(p.stabDecay, p.stabAttack + 0.005) + 0.05)
      },
      pad(notes, t, vel) { // ...and its soft tail, held until the next chord (or four bars)
        const p = P.cloud, v = voice(dry, p.padDelay, p.padVerb, p.level * p.padLevel, p.pan)
        const lp = filter(v, 'lowpass', p.padCut, p.padRes)
        const amp = gain(v)
        amp.gain.setValueAtTime(0.0001, t)
        amp.gain.linearRampToValueAtTime(0.03 * vel, t + p.padAttack)
        amp.gain.setTargetAtTime(0.0001, t + p.padHold * BAR, p.padRelease)
        const both = p.padWave === 'sawtri'
        const srcs = notes.map((m, i) => { const o = osc(v, both ? (i % 2 ? 'triangle' : 'sawtooth') : p.padWave, hz(m)); o.detune.value = i % 2 ? p.padDetune : -p.padDetune; o.connect(lp); return o })
        lp.connect(amp).connect(v.out)
        const end = t + p.padHold * BAR + Math.max(2.5, 4 * p.padRelease)
        play(srcs, t, end)
        return { g: [amp], srcs, end }
      },
      arp(notes, t, vel) { // a run up the chord: a resonant pluck per note, very wet
        const p = P.frontend
        notes.forEach((m, i) => {
          const tt = t + i * p.rate * SIX, v = pv(p)
          const o = osc(v, p.wave, hz(m))
          const lp = filter(v, 'lowpass', p.cutoff, p.res)
          lp.frequency.setValueAtTime(p.cutoff, tt); lp.frequency.exponentialRampToValueAtTime(p.cutEnd, tt + p.sweep)
          const g = gain(v); env(g.gain, tt, p.attack, Math.max(0.002, 0.042 * (1 - i * p.fade)) * vel, p.decay)
          o.connect(lp).connect(g).connect(v.out)
          play([o], tt, tt + Math.max(p.decay, p.attack + 0.005) + 0.02)
        })
      },
      bleep(f, t, vel) { // two sci-fi bleeps an octave apart, mostly echo
        const p = P.quality
        const notes = [[f, 0, vel]]
        if (p.echoAt > 0) notes.push([f * 2 ** (p.echoNote / 12), p.echoAt * SIX, vel * p.echoVel])
        notes.forEach(([fr, d, vv]) => {
          const tt = t + d, v = pv(p)
          const o = osc(v, p.wave, fr), o2 = osc(v, p.wave2, fr)
          o.frequency.setValueAtTime(fr * p.drop, tt); o.frequency.exponentialRampToValueAtTime(fr, tt + p.dropTime)
          const g = gain(v); env(g.gain, tt, p.attack, 0.22 * vv, p.decay)
          const lp = filter(v, 'lowpass', p.tone), g2 = gain(v, p.mix)
          o.connect(g); o2.connect(lp).connect(g2).connect(g)
          g.connect(v.out)
          play([o, o2], tt, tt + Math.max(p.decay, p.attack + 0.005) + 0.02)
        })
      },
      vox(f, t, vel, vowel) { // a vocal chop: an oscillator (and breath) through three formant filters, with a scoop up
        const p = P.music, v = pv(p)
        const s = osc(v, p.wave, f)
        s.frequency.setValueAtTime(f * p.scoop, t); s.frequency.exponentialRampToValueAtTime(f, t + p.scoopTime)
        const amp = gain(v)
        amp.gain.setValueAtTime(0.0001, t)
        amp.gain.linearRampToValueAtTime(0.55 * vel, t + p.attack)
        amp.gain.setTargetAtTime(0.0001, t + Math.max(p.hold, p.attack + 0.005), p.release)
        const end = t + Math.max(0.8, p.hold + 5 * p.release)
        const n = p.breath > 0 ? noiseSrc(v, t, end - t) : null
        const ng = n ? gain(v, p.breath * 0.35) : null
        if (n) n.connect(ng)
        for (const [fr, q, g] of VOWELS[vowel]) {
          const bp = filter(v, 'bandpass', fr * p.formant, q * p.q), bg = gain(v, g)
          s.connect(bp); if (ng) ng.connect(bp)
          bp.connect(bg).connect(amp)
        }
        amp.connect(v.out)
        play([s], t, end)
      },
    }

    /* the drum kit, synthesized: no samples */
    const K = P.drums
    /* the recordings: fetched and decoded the first time a set is needed (a moment after the engine starts, or when
       you pick another), then kept. A hit before its set is in waits for it; a set that can't load leaves the synth */
    const files = new Map(), loaded = new Map() // file → Promise<AudioBuffer> · 'kind:set' → { soft, hard, gain } (null while loading)
    const waiters = {}, takes = {}
    const TYPE = { ride: 'rideType', crash: 'crashType', impact: 'impactType', riser: 'riserType' }
    const file = (name) => {
      if (!files.has(name)) files.set(name, fetch(SAMPLES + name + '.mp3').then((r) => { if (!r.ok) throw new Error(name); return r.arrayBuffer() }).then((b) => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))))
      return files.get(name)
    }
    function load(kind, id) {
      const set = SETS[kind].sets[id], key = kind + ':' + id
      if (!set || loaded.has(key) || !SAMPLES) return
      loaded.set(key, null)
      const wake = () => { const w = waiters[kind]; waiters[kind] = null; if (w && id === K[TYPE[kind]]) w() }
      Promise.all([...(set.soft || []), ...set.hard].map(file)).then((bufs) => {
        const soft = bufs.slice(0, (set.soft || []).length), hard = bufs.slice(soft.length), b = hard[0], [a, z] = SETS[kind].norm, sr = b.sampleRate
        const from = a < 0 ? Math.max(0, b.length + a * sr) : a * sr, to = z <= 0 ? b.length : Math.min(b.length, z * sr)
        let e = 0, n = 0
        for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = Math.floor(from); i < to; i++) { e += d[i] * d[i]; n++ } }
        loaded.set(key, { soft: soft.length ? soft : hard, hard, gain: e ? 0.2 / Math.sqrt(e / n) : 1 })
        wake()
      }).catch(() => { loaded.delete(key); wake() }) // offline or blocked: the synth plays it
    }
    const wantSamples = () => { for (const kind in SETS) load(kind, K[TYPE[kind]]) }
    setTimeout(wantSamples, 400) // not on the first shot's frame: nothing recorded plays before the drop
    /* the set this kind should play now: null → play the synth; false → still loading (`again` runs once it's in) */
    function recorded(kind, again) {
      const key = kind + ':' + K[TYPE[kind]]
      if (!SETS[kind].sets[K[TYPE[kind]]] || !loaded.has(key)) return null
      const set = loaded.get(key)
      if (!set) { waiters[kind] = again; return false }
      return set
    }
    /* a recorded hit: soft or hard by velocity, takes alternating, a little pitch drift, darker when softer */
    function hit(set, kind, t, v, { len, tone, pitch, level }) {
      const list = v >= 0.8 ? set.hard : set.soft, buf = list[(takes[kind] = (takes[kind] || 0) + 1) % list.length]
      const vo = voice(dbus), s = vo.src(ac.createBufferSource())
      s.buffer = buf
      s.playbackRate.value = pitch * (1 + (Math.random() - 0.5) * 0.008)
      const lp = filter(vo, 'lowpass', Math.min(20000, 4000 + 15000 * v), 0.5)
      const shelf = filter(vo, 'highshelf', 6000), g = gain(vo, level * v * set.gain)
      shelf.gain.value = 40 * Math.log10(tone) // brightness: ±8 dB above 6 kHz
      const l = Math.min(len, buf.duration / s.playbackRate.value)
      g.gain.setValueAtTime(g.gain.value, t + l * 0.6)
      g.gain.linearRampToValueAtTime(0.0001, t + l)
      s.connect(lp).connect(shelf).connect(g).connect(vo.out)
      s.start(t)
      s.stop(t + l + 0.02)
    }
    const D = {
      kick(t, v = 1) {
        const vo = voice(dbus)
        const o = osc(vo, 'sine', K.kickPitch)
        o.frequency.setValueAtTime(K.kickPitch, t); o.frequency.exponentialRampToValueAtTime(K.kickLow, t + K.kickSweep)
        const g = gain(vo); env(g.gain, t, 0.002, 0.95 * v * K.kick, K.kickDecay)
        const c = osc(vo, 'triangle', 2400)
        const cg = gain(vo); env(cg.gain, t, 0.0005, 0.1 * v * K.kick * K.kickClick, 0.014)
        o.connect(g).connect(vo.out); c.connect(cg).connect(vo.out)
        play([o, c], t, t + K.kickDecay + 0.03)
        pump(t)
      },
      snare(t, v = 1) {
        const vo = voice(dbus)
        const n = noiseSrc(vo, t, K.snareDecay + 0.04)
        const bp = filter(vo, 'bandpass', K.snareTone, 0.7), hp = filter(vo, 'highpass', K.snareSnap)
        const g = gain(vo); env(g.gain, t, 0.001, 0.5 * v * K.snare, K.snareDecay)
        n.connect(bp).connect(hp).connect(g).connect(vo.out)
        const b = osc(vo, 'triangle', K.snareBody)
        b.frequency.setValueAtTime(K.snareBody, t); b.frequency.exponentialRampToValueAtTime(Math.max(30, K.snareBody - 60), t + 0.08)
        const bg = gain(vo); env(bg.gain, t, 0.001, 0.3 * v * K.snare * K.snareBodyLvl, 0.11)
        b.connect(bg).connect(vo.out)
        play([b], t, t + 0.13)
      },
      hat(t, v = 1, open = false) {
        const vo = voice(dbus), dec = open ? K.openDecay : K.hatDecay
        const n = noiseSrc(vo, t, dec + (open ? 0.04 : 0.015))
        const hp = filter(vo, 'highpass', K.hatTone)
        const g = gain(vo); env(g.gain, t, 0.0005, 0.2 * v * K.hats, dec)
        n.connect(hp).connect(g).connect(vo.out)
      },
      shaker(t, v = 1) {
        const vo = voice(dbus)
        const n = noiseSrc(vo, t, 0.08)
        const bp = filter(vo, 'bandpass', 5600, 1.4)
        const g = gain(vo); env(g.gain, t, 0.008, 0.09 * v * K.shaker, 0.065)
        n.connect(bp).connect(g).connect(vo.out)
      },
      ride(t, v = 1) {
        const set = recorded('ride', () => D.ride(Math.max(t, ac.currentTime + 0.005), v))
        if (set !== null) { if (set) hit(set, 'ride', t, v, { len: K.rideLen, tone: K.rideTone, pitch: K.ridePitch, level: 0.055 * K.ride }); return }
        const vo = voice(dbus)
        const hp = filter(vo, 'bandpass', 8600, 0.6)
        const g = gain(vo); env(g.gain, t, 0.001, 0.045 * v * K.ride, 0.5)
        const srcs = [372, 541, 813, 1231].map((f) => { const o = osc(vo, 'square', f); o.connect(hp); return o })
        hp.connect(g).connect(vo.out)
        play(srcs, t, t + 0.52)
      },
      crash(t, v = 1) {
        const set = recorded('crash', () => D.crash(Math.max(t, ac.currentTime + 0.005), v))
        if (set !== null) { if (set) hit(set, 'crash', t, v, { len: K.crashLen, tone: K.crashTone, pitch: K.crashPitch, level: CRASH_G * K.crash }); return }
        const vo = voice(dbus)
        const n = noiseSrc(vo, t, 2)
        const hp = filter(vo, 'highpass', 3800)
        const g = gain(vo); env(g.gain, t, 0.001, 0.3 * v * K.crash, 1.9)
        n.connect(hp).connect(g).connect(vo.out)
      },
      impact(t) { // the drop: a sub boom under the crash
        const set = recorded('impact', () => D.impact(Math.max(t, ac.currentTime + 0.005)))
        if (set !== null) { if (set) hit(set, 'impact', t, 1, { len: 3.5, tone: 1, pitch: K.impactPitch, level: BOOM_G * K.impact }); return }
        const vo = voice(dbus)
        const o = osc(vo, 'sine', 72)
        o.frequency.setValueAtTime(72, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.9)
        const g = gain(vo); env(g.gain, t, 0.004, 0.6 * K.impact, 1.1)
        o.connect(g).connect(vo.out)
        play([o], t, t + 1.15)
      },
      riser(t0, t1) { // noise opening up and a tone sweeping up, into the drop
        const set = recorded('riser', () => { const late = Math.max(0, ac.currentTime + 0.005 - t0); D.riser(t0 + late, t1 + late) })
        if (set !== null) { // a recording: it arrives on the drop (its end on t1), starting as late as it needs to
          if (!set) return
          const buf = set.hard[0], span = t1 - t0, skip = Math.max(0, buf.duration - span), at = t1 - (buf.duration - skip)
          const vo = voice(dbus), s = vo.src(ac.createBufferSource()), G = RISER_G * K.riser * set.gain, g = gain(vo, G)
          s.buffer = buf
          if (skip > 0) { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(G, at + 0.3) } // cut into a longer one: fade it in
          s.connect(g).connect(vo.out)
          s.start(at, skip)
          s.stop(t1 + 0.03)
          return
        }
        const vo = voice(dbus), L = Math.max(0.001, K.riser)
        const n = noiseSrc(vo, t0, t1 - t0 + 0.05)
        const bp = filter(vo, 'bandpass', 400, 3)
        bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(7000, t1)
        const g = gain(vo)
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22 * L, t1 - 0.02); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.02)
        n.connect(bp).connect(g).connect(vo.out)
        const o = osc(vo, 'sawtooth', 110)
        o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1)
        const lp = filter(vo, 'lowpass', 1200)
        const og = gain(vo)
        og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.05 * L, t1 - 0.02); og.gain.linearRampToValueAtTime(0.0001, t1 + 0.02)
        o.connect(lp).connect(og).connect(vo.out)
        play([o], t0, t1 + 0.05)
      },
    }
    /* the pump: the synths (and their echoes) duck a little on every kick */
    function pump(t) {
      syn.gain.setTargetAtTime(S.synths * (1 - S.pump), t, 0.004)
      syn.gain.setTargetAtTime(S.synths, t + 0.05, S.pumpRelease)
    }
    /* the shot (a game sound: straight to the master, past the track's fader; its echo and room go with the track) */
    function laser(t, v = 1) {
      const p = P.laser
      if (p.kind === 'round6') { // round 6's blip
        const vo = voice(sfx), o = osc(vo, 'triangle', 2600); o.frequency.exponentialRampToValueAtTime(320, t + 0.08)
        const g = gain(vo); env(g.gain, t, 0.002, 0.03 * v, 0.09)
        o.connect(g).connect(vo.out)
        play([o], t, t + 0.1)
        return
      }
      const vo = voice(sfx, p.delay, p.verb, p.level)
      const lp = filter(vo, 'lowpass', p.bright, p.res)
      lp.frequency.setValueAtTime(p.bright, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, p.to * 3), t + p.sweep)
      const zs = unison(vo, p.wave, p.from, p.unison, p.detune, lp)
      zs.forEach((o) => { o.frequency.setValueAtTime(p.from, t); o.frequency.exponentialRampToValueAtTime(p.to, t + p.sweep) })
      const g = gain(vo); env(g.gain, t, 0.001, 0.09 * v, p.decay)
      if (p.drive > 0) lp.connect(shaper(vo, p.drive)).connect(g); else lp.connect(g)
      g.connect(vo.out)
      const srcs = [...zs]
      if (p.thump > 0) {
        const th = osc(vo, 'sine', p.thumpPitch); th.frequency.setValueAtTime(p.thumpPitch, t); th.frequency.exponentialRampToValueAtTime(40, t + 0.08)
        const tg = gain(vo); env(tg.gain, t, 0.001, 0.28 * p.thump * v, 0.1)
        th.connect(tg).connect(vo.out)
        srcs.push(th)
      }
      play(srcs, t, t + Math.max(p.decay, 0.1) + 0.03)
      if (p.crackle > 0) {
        const n = noiseSrc(vo, t, 0.05), hp = filter(vo, 'highpass', p.crackleTone)
        const ng = gain(vo); env(ng.gain, t, 0.0005, 0.12 * p.crackle * v, 0.035)
        n.connect(hp).connect(ng).connect(vo.out)
      }
    }
    /* one 16th of the beat */
    function beat(level, bar, pos, t, { drop = false, fill = false } = {}) {
      const B = BEATS[level], odd = bar % 2 === 1
      if (drop && pos === 0) { D.crash(t, 1); D.impact(t) }
      if ((fill || (B.fills && bar % B.fills === B.fills - 1)) && pos >= 12) { // a snare roll over the last beat
        D.snare(t, 0.3 + (pos - 12) * 0.2)
        if (pos === 12) D.kick(t, 0.8)
        return
      }
      if (B.k.includes(pos) || (odd && B.k2 && B.k2.includes(pos))) D.kick(t)
      if (B.s && B.s.includes(pos)) D.snare(t)
      if (B.g && B.g.includes(pos)) D.snare(t, K.ghost)
      if (B.h[pos]) D.hat(t, B.h[pos])
      if (B.o && odd && B.o.includes(pos)) D.hat(t, 0.5, true)
      if (B.ride && pos % 2 === 0) D.ride(t, pos % 4 === 2 ? 1 : 0.6)
      if (B.sh && B.sh[pos]) D.shaker(t, B.sh[pos])
    }

    /* the harmony is whatever chord you hit last (Dm9 until then) */
    let chordLog = []
    const chordAt = (t) => { let c = CHORDS[0]; for (const e of chordLog) if (e.t <= t + 1e-4) c = e.ch; return c }
    function setChord(ch, t) { chordLog = [...chordLog.filter((e) => e.t < t - 1e-4).slice(-6), { t, ch }] }
    const mono = {} // bass · lead · pad: the voice now sounding

    /* what a hit plays: the skill's place in its group picks the note, and every note is moved into the chord */
    const HIT = {
      cloud(k, t, v) { // a new chord: the harmony changes here
        const p = P.cloud, ch = CHORDS[k.gi % CHORDS.length], o = 12 * p.octave
        setChord(ch, t)
        I.stab(ch.notes.map((m) => m + o), t, v)
        release(mono.pad, t)
        mono.pad = I.pad(ch.notes.map((m) => m + o + 12 * p.padOctave), t, v)
        return ch
      },
      backend(k, t, v) {
        const p = P.backend, ch = chordAt(t)
        let r = ch.root
        while (r > 45) r -= 12
        r += 12 * p.octave
        const list = inChord(ch, r, r + 12), f = hz(list[at01(list, k.frac * 0.5)])
        const from = mono.bass && t - mono.bass.t < p.length * BEAT + 0.05 ? mono.bass.f : 0
        release(mono.bass, t)
        mono.bass = I.bass(f, t, v, p.length * BEAT - 0.04, from)
      },
      ai(k, t, v) {
        const p = P.ai, o = 12 * p.octave, list = inChord(chordAt(t), 67 + o, 86 + o), f = hz(list[at01(list, k.frac)])
        const from = mono.lead && t - mono.lead.t < p.glideWindow * BEAT ? mono.lead.f : 0 // close notes glide
        release(mono.lead, t)
        mono.lead = I.lead(f, t, v, p.length * BEAT, from)
      },
      frontend(k, t, v) {
        const p = P.frontend, o = 12 * p.octave, list = inChord(chordAt(t), 62 + o, 88 + o), b = at01(list, k.frac * 0.6), n = p.steps, h = Math.ceil(n / 2)
        const step = { up: (i) => i, down: (i) => n - 1 - i, updown: (i) => (i <= h ? i : 2 * h - i), skip: (i) => 2 * i }[p.pattern]
        I.arp([...Array(n).keys()].map((i) => list[clamp(b + step(i), 0, list.length - 1)]), t, v)
      },
      quality(k, t, v) { const o = 12 * P.quality.octave, list = inChord(chordAt(t), 79 + o, 96 + o); I.bleep(hz(list[at01(list, k.frac)]), t, v) },
      product(k, t, v) {
        const p = P.product, o = 12 * p.octave, list = inChord(chordAt(t), 74 + o, 91 + o), b = at01(list, k.frac)
        I.bell(hz(list[b]), t, v)
        if (p.secondAt > 0) I.bell(hz(list[clamp(b + p.second, 0, list.length - 1)]), t + p.secondAt * SIX, p.secondVel * v)
      },
      music(k, t, v) {
        const p = P.music, o = 12 * p.octave, list = inChord(chordAt(t), 57 + o, 72 + o)
        I.vox(hz(list[at01(list, k.frac)]), t, v, p.vowel === 'cycle' ? ['ah', 'oh', 'eh', 'oo'][k.gi % 4] : p.vowel)
      },
    }

    return {
      ac, P, master, comp, meter, mbus, glitch, syn, dbus, sfx, noise,
      I, D, beat, pump, laser, voice, osc, gain, filter, env, play, noiseSrc, release, mono,
      chordAt, setChord, resetHarmony() { chordLog = [] },
      hit: (group, k, t, v = 1) => HIT[group](k, t, v),
      releaseAll(t) { for (const k of Object.keys(mono)) { release(mono[k], t); delete mono[k] } },
      setPatch(d) { put(d); applySpace() },
      diff: () => diffOf(P),
      setMuted(on) { muted = on; master.gain.setTargetAtTime(on ? 0 : S.master, ac.currentTime, 0.05) },
      get active() { return active },
      get made() { return made },
      rideReady: () => !SETS.ride.sets[K.rideType] || !!loaded.get('ride:' + K.rideType),
      samplesReady: () => Object.keys(SETS).every((kind) => !SETS[kind].sets[K[TYPE[kind]]] || !!loaded.get(kind + ':' + K[TYPE[kind]])),
    }
  }

  return { BPM, BEAT, SIX, BAR, CHORDS, PARTS, ON_8TH, BEATS, SCHEMA, SPEC, hz, inChord, at01, midi, defaults, clean, diffOf, load, save, KEY, create }
})()
