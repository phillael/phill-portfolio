/*
 * The Jelly resume's sounds, for the Sound lab: a port of src/lib/jelly/sfx.ts (2026-10-20) with every
 * number it uses turned into a setting. The defaults started as sfx.ts's numbers (exactly what the site plays);
 * Phill's tuning from 2026-10-20 is now the default for the cues listed above SCHEMA, with what sfx.ts has. In the build these settings become a config the real sfx.ts reads
 * (like CAST_CONFIG and PLAY_CONFIG), and a patch copied from the lab drops straight in.
 *
 * Every cue but the drone can also play a recorded 8-bit option instead (CC0: Junkala's 512 and Kenney's packs).
 *
 *   JELLY_SFX.create(ac, diff?) → { cue(name, arg?, t?), hole(amt), setPatch(diff), meter, P, active }
 *   JELLY_SFX.SCHEMA · defaults() · clean() · diffOf() · load() / save(diff) (localStorage 'jelly-sfx-patch')
 */
window.JELLY_SFX = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const WAVES = [['sine', 'Sine'], ['triangle', 'Tri'], ['sawtooth', 'Saw'], ['square', 'Square']]
  const FILTERS = [['lowpass', 'Low-pass'], ['bandpass', 'Band-pass'], ['highpass', 'High-pass']]
  const num = (k, label, def, min, max, step, unit, more) => ({ k, label, def, min, max, step, unit, ...more })
  const pick = (k, label, def, opts) => ({ k, label, def, opts })
  const hzp = (k, label, def, min = 20, max = 8000) => num(k, label, def, min, max, 0, 'hz')
  const sec = (k, label, def, min, max) => num(k, label, def, min, max, 0, 's', { log: true })
  const lvl = (k, label, def, max = 1) => num(k, label, def, 0, max, 0.005, 'gain')
  /* the shapes sfx.ts builds everything from: a tone that sweeps from one pitch to another, and a crunch
     (a burst of noise through a filter that closes) */
  const toneCrunch = (o) => [
    pick('wave', 'Wave', o.wave, WAVES), hzp('from', 'From', o.from), hzp('to', 'To', o.to),
    sec('len', 'Length', o.len, 0.02, 1.5), lvl('level', 'Level', o.level),
    pick('nType', 'Noise filter', o.nType, FILTERS), hzp('nTone', 'Noise tone', o.nTone, 60, 12000),
    sec('nLen', 'Noise length', o.nLen, 0.01, 2), lvl('noise', 'Noise level', o.noise),
  ]
  const twoNotes = (o) => [
    pick('wave', 'Wave', o.wave, WAVES), hzp('note1', 'First note', o.note1, 100, 6000), hzp('note2', 'Second note', o.note2, 100, 6000),
    sec('gap', 'Gap', o.gap, 0.01, 0.5), sec('len1', 'First length', o.len1, 0.02, 1.5), sec('len2', 'Second length', o.len2, 0.02, 1.5), lvl('level', 'Level', o.level, 0.5),
  ]
  const ladder = (o) => [
    pick('wave', 'Wave', o.wave, WAVES), hzp('root', 'Starts at', o.root, 60, 3000), num('count', 'Notes', o.count, 2, 16, 1, 'n'),
    num('interval', 'Step', o.interval, -12, 12, 0.1, 'st'), num('bend', 'Bend per note', o.bend, -12, 12, 0.1, 'st'),
    sec('step', 'Note every', o.step, 0.01, 0.4), sec('len', 'Note length', o.len, 0.02, 1), lvl('level', 'Level', o.level, 0.5),
  ]
  const SHAPES = [['major', 'Major'], ['minor', 'Minor'], ['sus', 'Sus'], ['add9', 'Add 9'], ['fifths', 'Fifths']]
  const SHAPE = { major: [0, 4, 7, 12], minor: [0, 3, 7, 12], sus: [0, 5, 7, 12], add9: [0, 4, 7, 14], fifths: [0, 7, 12, 19] }
  // the notes sfx.ts plays, as typed there (so "Major" at the default pitch is exactly the shipped sound)
  const SHIPPED = { shrimp: [659.25, 830.61, 987.77, 1318.5], finish: [523.25, 659.25, 783.99, 1046.5], mushroom: [392, 523.25, 659.25, 783.99, 1046.5] }
  const ratios = (cue, shape) => (shape === 'major' || !shape ? SHIPPED[cue].map((f) => f / SHIPPED[cue][0]) : SHAPE[shape].map((st) => 2 ** (st / 12)))

  // 2026-10-20: Phill's patch is the default for these; sfx.ts (the live site) still has:
  //   whoosh 2 s · jump square 310 → 760 Hz over 100 ms · land from 150 Hz, noise tone 700 Hz
  //   smash square 240 → 70 Hz over 120 ms, band-pass noise 2200 Hz for 130 ms at 0.5
  //   coin gap 75 ms, second note 340 ms · mushroom from 392 Hz, every 50 ms, 70 ms notes at 0.045
  //   finish triangle from 523.25 Hz, major, every 85 ms, shimmer 0.9 s at 0.06
  //   UFO clang square 880 → 420 Hz over 250 ms, ring 1760 → 1240 Hz over 300 ms at 0.06, noise 5 kHz for 80 ms · beam sine
  /* recorded 8-bit options for every cue but the drone (CC0: Juhani Junkala's 512 retro sounds and Kenney's packs;
     audio/jelly/CREDITS.md). Each keeps its synth (the default) and gets five: audio/jelly/<cue>-<n>.mp3. A recording
     is matched to how loud the tuned synth one is: REF is that synth's RMS over its first WINDOW seconds */
  const RECS = {
    whoosh: ['Portal 2', 'Portal 6', 'Portal 1', 'Portal 4', 'Power on'],
    gulp: ['Low down', 'Phaser down 1', 'Phaser down 3', 'Damage blip', 'Error blip'],
    boom: ['Long boom 2', 'Medium boom 4', 'Long boom 3', 'Low boom', 'Crunch boom'],
    jump: ['Jump 4', 'Jump 2', 'Jump 7', 'Phase jump 1', 'Phase jump 3'],
    land: ['Landing 19', 'Landing 17', 'Impact 1', 'Landing 12', 'Landing 16'],
    smash: ['Hard pop 2', 'Soft pop 1', 'Hard pop 9', 'Hard pop 6', 'Soft pop 7'],
    coin: ['Double 4', 'Double 2', 'Double 6', 'Single 2', 'Single 1'],
    shrimp: ['Power-up 5', 'Coin cluster', 'Kenney power-up', 'Power-up 15', 'Power-up 10'],
    mushroom: ['Power-up 1', 'Power-up 16', 'Power-up 14', 'Power-up 9', 'Kenney power-up'],
    finish: ['NES fanfare', 'Victory', 'NES fanfare 2', 'NES jingle', 'Fanfare 1'],
    ufoHit: ['Impact 10', 'Impact 11', 'Hard pop 4', 'Metal hit', 'Metal hit 2'],
    beam: ['Laser 11', 'Laser 5', 'Force field', 'Big laser', 'Portal 5'],
    powerUp: ['Power-up 18', 'Power-up 2', 'Power-up 12', 'Power-up 4', 'Kenney power-up'],
    powerDown: ['NES down', 'Shutdown', 'NES steps down', 'Negative 2', 'Falling 1'],
    alert: ['High 2', 'High 4', 'Blip 2', 'Two-tone', 'Three-tone'],
    stomp: ['Impact 13', 'Impact 5', 'Soft pop 2', 'Hit 3', 'Soft thud'],
    kicked: ['Damage 1', 'Damage 3', 'Hit 5', 'Error 2', 'Error 12'],
    tink: ['High 1', 'High 6', 'Coin single 3', 'Bell', 'Light metal'],
    giantStep: ['Soft pop 5', 'Impact 14', 'Heavy punch', 'Heavy thud', 'Heavy wood'],
  }
  const WINDOW = { whoosh: 2, gulp: 0.2, boom: 1, jump: 0.25, land: 0.15, smash: 0.3, coin: 0.4, shrimp: 0.3, mushroom: 0.8, finish: 1.2, ufoHit: 0.6, beam: 0.9, powerUp: 0.6, powerDown: 0.8, alert: 0.2, stomp: 0.15, kicked: 0.3, tink: 0.35, giantStep: 0.2 }
  // (the synth's RMS, then corrected by measurement: short, peaky recordings lose a few dB to the compressor)
  const REF = { whoosh: 0.0597, gulp: 0.0183, boom: 0.0934, jump: 0.0077, land: 0.0352, smash: 0.0927, coin: 0.0333, shrimp: 0.0257, mushroom: 0.0568, finish: 0.0681, ufoHit: 0.0325, beam: 0.0077, powerUp: 0.0137, powerDown: 0.0094, alert: 0.0091, stomp: 0.0156, kicked: 0.0081, tink: 0.0162, giantStep: 0.0163 }
  const AUDIO = typeof document !== 'undefined' && document.currentScript ? new URL('audio/jelly/', document.currentScript.src).href : ''
  // Phill's picks (2026-10-20); the rest play their tuned synth
  const PICKED = { mushroom: 'r2', finish: 'r2', ufoHit: 'r2', beam: 'r5', powerUp: 'r4', powerDown: 'r2', alert: 'r4', stomp: 'r4', kicked: 'r5', giantStep: 'r5' }
  const rec = (cue) => [ // a cue's first settings: which sound, and the recording's level and pitch
    pick('src', 'Sound', PICKED[cue] || 'synth', [['synth', 'Synth (tuned)'], ...RECS[cue].map((l, i) => ['r' + (i + 1), l])]),
    num('sLevel', 'Recording level', 1, 0, 3, 0.01, 'x'),
    num('sPitch', 'Recording pitch', 1, 0.5, 2, 0.005, 'x'),
  ]

  const SCHEMA = [
    { id: 'hole', label: 'Black hole', group: 'The resume opening', c: '275 100% 78%', about: 'The resume’s entrance: a whoosh as it lands, the black hole’s growling drone (it drops in pitch as it grows), its gulps, and the boom.', pads: [['Whoosh', 'whoosh'], ['Grow the hole', 'grow'], ['Gulp', 'gulp'], ['Boom', 'boom']], sections: [
      { title: 'Whoosh', cue: 'whoosh', params: [...rec('whoosh'), 
        sec('wLen', 'Length', 2.09, 0.4, 4), num('wCurve', 'Swell curve', 2.2, 0.5, 6, 0.1, 'raw'),
        num('wBright', 'Brightness', 0.5, 0.05, 0.95, 0.01, 'pct'), lvl('wLevel', 'Level', 0.35),
      ] },
      { title: 'Drone', cue: 'grow', params: [
        pick('dWave', 'Wave', 'sawtooth', WAVES), hzp('dBase', 'Pitch', 55, 20, 220), num('dDetune', 'Detune', 8, 0, 60, 1, 'c'),
        lvl('dSub', 'Sub (octave down)', 1, 2), num('dRes', 'Resonance', 6, 0.1, 20, 0.1, 'q'),
        hzp('dCut', 'Filter, small', 110, 30, 2000), hzp('dOpen', 'Filter opens by', 2400, 100, 10000),
        num('dDrop', 'Pitch drop, full size', 7, 0, 24, 0.5, 'st'), lvl('dLevel', 'Level', 0.32),
      ] },
      { title: 'Gulp', cue: 'gulp', params: [...rec('gulp'), 
        pick('gWave', 'Wave', 'sine', WAVES), hzp('gFrom', 'From', 700, 100, 4000), hzp('gSpread', 'Random up to', 500, 1, 3000),
        hzp('gTo', 'To', 70, 20, 1000), sec('gSweep', 'Sweep', 0.16, 0.02, 1), sec('gDecay', 'Decay', 0.18, 0.02, 1), lvl('gLevel', 'Level', 0.16),
      ] },
      { title: 'Boom', cue: 'boom', params: [...rec('boom'), 
        hzp('bFrom', 'From', 90, 20, 400), hzp('bTo', 'To', 32, 15, 200), sec('bSweep', 'Sweep', 0.5, 0.05, 2), sec('bDecay', 'Decay', 0.9, 0.1, 3),
        lvl('bLevel', 'Level', 0.7, 1.5), hzp('bNTone', 'Rumble tone', 600, 60, 6000), sec('bNDecay', 'Rumble decay', 0.18, 0.02, 1), lvl('bNoise', 'Rumble level', 0.5, 1.5),
      ] },
    ] },
    { id: 'moves', label: 'Moves', group: 'Play mode', c: '190 100% 75%', about: 'Play mode’s body sounds: a rising blip for the jump, a thud that gets louder the faster he lands, and the crunchy pop when a line smashes.', pads: [['Jump', 'jump'], ['Land, soft', 'land', 4], ['Land, hard', 'land', 9], ['Smash', 'smash']], sections: [
      { title: 'Jump', cue: 'jump', params: [...rec('jump'), pick('wave', 'Wave', 'sine', WAVES), hzp('from', 'From', 192, 60, 4000), hzp('to', 'To', 3820, 60, 8000), sec('len', 'Length', 0.258, 0.02, 1), lvl('level', 'Level', 0.06, 0.4)] },
      { title: 'Land', cue: 'land', params: [...rec('land'), ...toneCrunch({ wave: 'sine', from: 142, to: 55, len: 0.14, level: 0.28, nType: 'lowpass', nTone: 2990, nLen: 0.06, noise: 0.12 })] },
      { title: 'Smash', cue: 'smash', params: [...rec('smash'), ...toneCrunch({ wave: 'sawtooth', from: 583, to: 20, len: 0.678, level: 0.12, nType: 'highpass', nTone: 127, nLen: 1, noise: 0.34 })] },
    ] },
    { id: 'pickups', label: 'Pickups', group: 'Play mode', c: '45 100% 68%', about: 'The good things: an Impact coin, the shrimp, the mushroom popping out of a UFO, and the finish line.', pads: [['Coin', 'coin'], ['Shrimp', 'shrimp'], ['Mushroom', 'mushroom'], ['Finish', 'finish']], sections: [
      { title: 'Coin', cue: 'coin', params: [...rec('coin'), ...twoNotes({ wave: 'triangle', note1: 988, note2: 1319, gap: 0.0805, len1: 0.22, len2: 0.714, level: 0.13 })] },
      { title: 'Shrimp', cue: 'shrimp', params: [...rec('shrimp'), 
        pick('wave', 'Wave', 'sine', WAVES), hzp('root', 'Starts at', 659.25, 100, 3000), pick('shape', 'Chord', 'major', SHAPES),
        num('bend', 'Bend', 1.06, 0.8, 1.5, 0.01, 'ratio'), sec('step', 'Note every', 0.045, 0.01, 0.3), sec('len', 'Note length', 0.11, 0.02, 0.8), lvl('level', 'Level', 0.11, 0.5),
      ] },
      { title: 'Mushroom', cue: 'mushroom', params: [...rec('mushroom'), 
        pick('wave', 'Wave', 'square', WAVES), hzp('root', 'Starts at', 149, 60, 2000),
        sec('step', 'Note every', 0.09, 0.01, 0.3), sec('len', 'Note length', 0.8, 0.02, 2), lvl('level', 'Level', 0.105, 0.3),
      ] },
      { title: 'Finish', cue: 'finish', params: [...rec('finish'), 
        pick('wave', 'Wave', 'square', WAVES), hzp('root', 'Starts at', 535, 100, 2000), pick('shape', 'Chord', 'fifths', SHAPES),
        sec('step', 'Note every', 0.0858, 0.02, 0.4), sec('len', 'Note length', 0.18, 0.03, 1), sec('lastLen', 'Last note', 0.7, 0.05, 3), lvl('level', 'Level', 0.12, 0.5),
        sec('shLen', 'Shimmer length', 1, 0.05, 3), lvl('shimmer', 'Shimmer level', 0.26, 0.6),
      ] },
    ] },
    { id: 'ufo', label: 'UFO', group: 'Play mode', c: '130 90% 62%', about: 'Hitting a UFO: a metallic clang that warbles, then its beam opens with a rising sweep.', pads: [['Hit (and its beam)', 'ufo'], ['Clang', 'ufoHit'], ['Beam', 'beam']], sections: [
      { title: 'Clang', cue: 'ufoHit', params: [...rec('ufoHit'), 
        pick('wave1', 'Wave', 'sine', WAVES), hzp('from1', 'From', 909, 100, 6000), hzp('to1', 'To', 73.5, 30, 6000), sec('len1', 'Length', 1.07, 0.02, 2.5), lvl('level1', 'Level', 0.07, 0.4),
        pick('wave2', 'Ring wave', 'triangle', WAVES), hzp('from2', 'Ring from', 2080, 100, 8000), hzp('to2', 'Ring to', 2010, 60, 8000), sec('len2', 'Ring length', 0.528, 0.02, 1.5), lvl('level2', 'Ring level', 0.055, 0.4),
        hzp('nTone', 'Noise tone', 14000, 500, 18000), sec('nLen', 'Noise length', 0.593, 0.01, 1.2), lvl('noise', 'Noise level', 0.18),
      ] },
      { title: 'Beam', cue: 'beam', params: [...rec('beam'), 
        pick('wave', 'Wave', 'sawtooth', WAVES), hzp('from', 'From', 220, 40, 2000), hzp('to', 'To', 880, 60, 6000), sec('len', 'Length', 0.9, 0.1, 3), lvl('level', 'Level', 0.05, 0.3),
        num('harm', 'Second voice', 1.5, 1, 3, 0.01, 'ratio'), sec('offset', 'Second voice after', 0.04, 0.001, 0.4), lvl('level2', 'Second voice level', 0.03, 0.3),
        sec('after', 'Beam after the hit', 0.3, 0.01, 1.5),
      ] },
    ] },
    { id: 'trip', label: 'The trip', group: 'Play mode', c: '320 100% 80%', about: 'The mushroom’s trip: a fast warbling rise when it starts, the same falling when it wears off.', pads: [['Trip starts', 'powerUp'], ['Trip ends', 'powerDown']], sections: [
      { title: 'Starts', cue: 'powerUp', params: [...rec('powerUp'), ...ladder({ wave: 'triangle', root: 262, count: 8, interval: 2, bend: 3, step: 0.055, len: 0.09, level: 0.08 })] },
      { title: 'Wears off', cue: 'powerDown', params: [...rec('powerDown'), ...ladder({ wave: 'triangle', root: 784, count: 6, interval: -2.4, bend: -3.6, step: 0.07, len: 0.1, level: 0.07 })] },
    ] },
    { id: 'lasagna', label: 'Lasagna', group: 'Play mode', c: '355 100% 70%', about: 'The enemy: its “!”, a stomp from above, the kick it gives you, the TINK off the giant, and the giant’s steps.', pads: [['Alert !', 'alert'], ['Stomp', 'stomp'], ['Kicked', 'kicked'], ['TINK', 'tink'], ['Giant step', 'giantStep', 1], ['Far step', 'giantStep', 0.35]], sections: [
      { title: 'Alert', cue: 'alert', params: [...rec('alert'), ...twoNotes({ wave: 'square', note1: 1175, note2: 1568, gap: 0.08, len1: 0.06, len2: 0.08, level: 0.05 })] },
      { title: 'Stomp', cue: 'stomp', params: [...rec('stomp'), ...toneCrunch({ wave: 'square', from: 320, to: 90, len: 0.12, level: 0.1, nType: 'lowpass', nTone: 900, nLen: 0.1, noise: 0.3 })] },
      { title: 'Kicked', cue: 'kicked', params: [...rec('kicked'), ...toneCrunch({ wave: 'sawtooth', from: 420, to: 110, len: 0.28, level: 0.08, nType: 'bandpass', nTone: 1200, nLen: 0.08, noise: 0.25 })] },
      { title: 'TINK', cue: 'tink', params: [...rec('tink'), 
        pick('wave', 'Wave', 'triangle', WAVES), hzp('note', 'Note', 2637, 300, 8000), num('droop', 'Droop', 2600 / 2637, 0.8, 1.05, 0.001, 'ratio'),
        sec('len', 'Length', 0.35, 0.02, 2), lvl('level', 'Level', 0.09, 0.4),
        num('over', 'Overtone', 3951 / 2637, 1, 4, 0.001, 'ratio'), num('droop2', 'Overtone droop', 3900 / 3951, 0.8, 1.05, 0.001, 'ratio'), sec('len2', 'Overtone length', 0.22, 0.02, 2), lvl('level2', 'Overtone level', 0.05, 0.4),
      ] },
      { title: 'Giant step', cue: 'giantStep', params: [...rec('giantStep'), ...toneCrunch({ wave: 'sine', from: 70, to: 38, len: 0.18, level: 0.12, nType: 'lowpass', nTone: 300, nLen: 0.08, noise: 0.06 })] },
    ] },
    { id: 'space', label: 'Space', group: 'Reverb and master', c: '190 100% 80%', about: 'Every Jelly sound goes through one short room (a quarter of it, by default) and a gentle compressor.', pads: [['Coin', 'coin'], ['Smash', 'smash'], ['Finish', 'finish'], ['Boom', 'boom']], sections: [
      { title: 'Room', params: [lvl('wet', 'Reverb', 0.25, 1), num('rLen', 'Length', 2.2, 0.3, 6, 0.1, 's'), num('rDecay', 'Decay', 3, 0.5, 12, 0.1, 'raw'), num('rBright', 'Brightness', 0.4, 0.05, 0.95, 0.01, 'pct')] },
      { title: 'Master', params: [num('master', 'Master', 1, 0, 2, 0.01, 'x'), num('threshold', 'Glue threshold', -14, -40, 0, 0.5, 'db'), num('ratio', 'Glue ratio', 4, 1, 20, 0.1, 'ratio')] },
    ] },
  ]
  const SPEC = {}
  SCHEMA.forEach((pn) => { SPEC[pn.id] = {}; pn.sections.forEach((s) => s.params.forEach((p) => { SPEC[pn.id][(s.cue ? s.cue + '.' : '') + p.k] = p })) })
  // a cue's settings are keyed "cue.setting" (so Land and Smash can both have a "from")
  SCHEMA.forEach((pn) => pn.sections.forEach((s) => { if (s.cue) s.params = s.params.map((p) => ({ ...p, k: s.cue + '.' + p.k })) }))
  function defaults() { const P = {}; for (const id in SPEC) { P[id] = {}; for (const k in SPEC[id]) P[id][k] = SPEC[id][k].def } return P }
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
  const KEY = 'jelly-sfx-patch'
  function load() { try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')) } catch { return {} } }
  function save(diff) { try { if (Object.keys(diff).length) localStorage.setItem(KEY, JSON.stringify(diff)); else localStorage.removeItem(KEY) } catch { /* private mode */ } }

  function create(ac, diff) {
    const P = defaults()
    const put = (d) => { const c = clean(d); for (const id in SPEC) Object.assign(P[id], defaults()[id], c[id] || {}) }
    put(diff)
    // a cue's settings, as { setting: value }
    const C = (id, cue) => { const o = {}; for (const k in P[id]) if (k.startsWith(cue + '.')) o[k.slice(cue.length + 1)] = P[id][k]; return o }
    const SP = P.space
    let active = 0
    const render = (len, fn, ch = 1) => {
      const b = ac.createBuffer(ch, Math.floor(ac.sampleRate * len), ac.sampleRate)
      for (let c = 0; c < ch; c++) fn(b.getChannelData(c), ac.sampleRate, c)
      return b
    }
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = SP.threshold
    comp.ratio.value = SP.ratio
    const out = ac.createGain()
    out.gain.value = SP.master
    out.connect(comp)
    comp.connect(ac.destination)
    const meter = ac.createAnalyser()
    meter.fftSize = 2048
    comp.connect(meter)
    const mix = ac.createGain()
    mix.connect(out)
    const verb = ac.createConvolver()
    const wet = ac.createGain()
    wet.gain.value = SP.wet
    mix.connect(wet)
    wet.connect(verb)
    verb.connect(out)
    // the same buffers, in the same order, as sfx.ts: the whoosh first, then the room and the noise
    const W = () => C('hole', 'whoosh')
    const swell = (w) => render(w.wLen, (d) => {
      let lp = 0, hp = 0, pv = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length, n = Math.random() * 2 - 1
        lp += (0.05 + w.wBright * t * t) * (n - lp)
        hp = 0.95 * (hp + lp - pv)
        pv = lp
        d[i] = hp * t ** w.wCurve * 1.6
      }
    })
    let swellBuf = swell(W()), swellKey = JSON.stringify([W().wLen, W().wCurve, W().wBright])
    const room = () => render(SP.rLen, (d, sr) => {
      let lp = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / sr
        lp += SP.rBright * (Math.random() * 2 - 1 - lp)
        d[i] = lp * Math.exp(-t * SP.rDecay)
      }
    }, 2)
    verb.buffer = room()
    let roomKey = JSON.stringify([SP.rLen, SP.rDecay, SP.rBright])
    const noiseBuf = render(1, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 })

    const track = (src) => { active++; src.onended = () => { active--; src.disconnect() } }
    function tone(type, f0, f1, len, g, t = ac.currentTime) {
      const o = ac.createOscillator(), a = ac.createGain()
      o.type = type
      o.frequency.setValueAtTime(f0, t)
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len)
      a.gain.setValueAtTime(0.0001, t)
      a.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t + 0.008)
      a.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, 0.01))
      o.connect(a)
      a.connect(mix)
      o.start(t)
      o.stop(t + len + 0.05)
      track(o)
    }
    function crunch(type, f, len, g, t = ac.currentTime) {
      const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), a = ac.createGain()
      s.buffer = noiseBuf
      bp.type = type
      bp.frequency.setValueAtTime(f, t)
      bp.frequency.exponentialRampToValueAtTime(f * 0.3, t + len)
      a.gain.setValueAtTime(Math.max(0.0002, g), t)
      a.gain.exponentialRampToValueAtTime(0.0001, t + len)
      s.connect(bp)
      bp.connect(a)
      a.connect(mix)
      s.start(t, Math.random() * 0.5)
      s.stop(t + len + 0.05)
      track(s)
    }
    const tc = (c, k, t) => { tone(c.wave, c.from, c.to, c.len, c.level * k, t); crunch(c.nType, c.nTone, c.nLen, c.noise * k, t) }
    const two = (c, t) => { tone(c.wave, c.note1, c.note1, c.len1, c.level, t); tone(c.wave, c.note2, c.note2, c.len2, c.level, t + c.gap) }
    const ladder = (c, t) => { for (let i = 0; i < c.count; i++) tone(c.wave, c.root * 2 ** ((i * c.interval) / 12), c.root * 2 ** ((i * c.interval + c.bend) / 12), c.len, c.level, t + i * c.step) }

    const CUES = {
      whoosh(_, t) { // the entrance: timed to peak as it lands
        const w = W(), s = ac.createBufferSource(), g = ac.createGain()
        s.buffer = swellBuf
        g.gain.value = w.wLevel
        s.connect(g)
        g.connect(mix)
        s.start(t)
        track(s)
      },
      gulp(_, t) {
        const c = C('hole', 'gulp'), o = ac.createOscillator(), g = ac.createGain()
        o.type = c.gWave
        o.frequency.setValueAtTime(c.gFrom + Math.random() * c.gSpread, t)
        o.frequency.exponentialRampToValueAtTime(c.gTo, t + c.gSweep)
        g.gain.setValueAtTime(c.gLevel, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + c.gDecay)
        o.connect(g)
        g.connect(mix)
        o.start(t)
        o.stop(t + c.gDecay + 0.02)
        track(o)
      },
      boom(_, t) {
        const c = C('hole', 'boom'), o = ac.createOscillator(), g = ac.createGain()
        o.frequency.setValueAtTime(c.bFrom, t)
        o.frequency.exponentialRampToValueAtTime(c.bTo, t + c.bSweep)
        g.gain.setValueAtTime(c.bLevel, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + c.bDecay)
        o.connect(g)
        g.connect(mix)
        o.start(t)
        o.stop(t + c.bDecay + 0.1)
        track(o)
        const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain()
        s.buffer = noiseBuf
        bp.type = 'lowpass'
        bp.frequency.value = c.bNTone
        ng.gain.setValueAtTime(c.bNoise, t)
        ng.gain.setTargetAtTime(0, t, c.bNDecay)
        s.connect(bp)
        bp.connect(ng)
        ng.connect(mix)
        s.start(t)
        s.stop(t + Math.max(1, 5 * c.bNDecay))
        track(s)
      },
      jump(_, t) { const c = C('moves', 'jump'); tone(c.wave, c.from, c.to, c.len, c.level, t) },
      land(speed = 9, t) { const k = Math.min(1, (speed - 1.5) / 7); if (k > 0) tc(C('moves', 'land'), k, t) },
      smash(_, t) { const c = C('moves', 'smash'); crunch(c.nType, c.nTone, c.nLen, c.noise, t); tone(c.wave, c.from, c.to, c.len, c.level, t) },
      coin(_, t) { two(C('pickups', 'coin'), t) },
      finish(_, t) {
        const c = C('pickups', 'finish'), s = ratios('finish', c.shape), top = c.root * s[s.length - 1]
        s.forEach((r, i) => { const f = c.root * r; tone(c.wave, f, f, i === s.length - 1 ? c.lastLen : c.len, c.level, t + i * c.step) })
        tone('sine', top, top, c.shLen, c.shimmer, t + (s.length - 1) * c.step)
      },
      shrimp(_, t) { const c = C('pickups', 'shrimp'); ratios('shrimp', c.shape).forEach((r, i) => { const f = c.root * r; tone(c.wave, f, f * c.bend, c.len, c.level, t + i * c.step) }) },
      mushroom(_, t) { const c = C('pickups', 'mushroom'); ratios('mushroom').forEach((r, i) => { const f = c.root * r; tone(c.wave, f, f, c.len, c.level, t + i * c.step) }) },
      ufoHit(_, t) {
        const c = C('ufo', 'ufoHit')
        tone(c.wave1, c.from1, c.to1, c.len1, c.level1, t)
        tone(c.wave2, c.from2, c.to2, c.len2, c.level2, t)
        crunch('highpass', c.nTone, c.nLen, c.noise, t)
      },
      beam(_, t) { const c = C('ufo', 'beam'); tone(c.wave, c.from, c.to, c.len, c.level, t); tone(c.wave, c.from * c.harm, c.to * c.harm, c.len, c.level2, t + c.offset) },
      ufo(_, t) { CUES.ufoHit(0, t); CUES.beam(0, t + C('ufo', 'beam').after) }, // the event plays both: the beam opens after the hit
      powerUp(_, t) { ladder(C('trip', 'powerUp'), t) },
      powerDown(_, t) { ladder(C('trip', 'powerDown'), t) },
      alert(_, t) { two(C('lasagna', 'alert'), t) },
      stomp(_, t) { tc(C('lasagna', 'stomp'), 1, t) },
      kicked(_, t) { tc(C('lasagna', 'kicked'), 1, t) },
      tink(_, t) { const c = C('lasagna', 'tink'); tone(c.wave, c.note, c.note * c.droop, c.len, c.level, t); tone('sine', c.note * c.over, c.note * c.over * c.droop2, c.len2, c.level2, t) },
      giantStep(near = 1, t) { const k = clamp(near, 0, 1); if (k >= 0.05) tc(C('lasagna', 'giantStep'), k, t) },
    }

    /* a cue with a recording picked plays that instead of its synth (fetched and decoded the first time, then kept;
       land and the giant's steps still scale it by how hard / how near) */
    const PANEL = {}
    SCHEMA.forEach((pn) => pn.sections.forEach((sec) => { if (sec.cue) PANEL[sec.cue] = pn.id }))
    const recs = new Map() // file → Promise<{ buf, gain }>
    function recFile(cue, id) {
      const name = `${cue}-${id.slice(1)}`
      if (!recs.has(name)) {
        recs.set(name, fetch(AUDIO + name + '.mp3').then((r) => { if (!r.ok) throw new Error(name); return r.arrayBuffer() })
          .then((b) => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
          .then((buf) => {
            const d = buf.getChannelData(0), n = Math.floor(WINDOW[cue] * buf.sampleRate)
            let e = 0
            for (let i = 0; i < Math.min(n, d.length); i++) e += d[i] * d[i]
            return { buf, gain: e ? REF[cue] / Math.sqrt(e / n) : 1 }
          }))
        recs.get(name).catch(() => recs.delete(name))
      }
      return recs.get(name)
    }
    const picked = (cue) => { const p = P[PANEL[cue]], id = p && p[cue + '.src']; return id && id !== 'synth' && AUDIO ? id : null }
    function playRec(cue, t, k) {
      const id = picked(cue), p = P[PANEL[cue]]
      if (!id) return false
      recFile(cue, id).then(({ buf, gain }) => {
        const s = ac.createBufferSource(), g = ac.createGain()
        s.buffer = buf
        s.playbackRate.value = p[cue + '.sPitch']
        g.gain.value = gain * p[cue + '.sLevel'] * k
        s.connect(g)
        g.connect(mix)
        s.start(Math.max(t, ac.currentTime))
        track(s)
      }).catch(() => { /* it couldn't load: silence, as the lab says */ })
      return true
    }
    for (const cue of Object.keys(RECS)) {
      const synth = CUES[cue]
      CUES[cue] = (arg, t) => {
        const k = cue === 'land' ? Math.min(1, ((arg ?? 9) - 1.5) / 7) : cue === 'giantStep' ? ((arg ?? 1) < 0.05 ? 0 : clamp(arg ?? 1, 0, 1)) : 1
        if (k <= 0) return
        if (!playRec(cue, t, k)) synth(arg, t)
      }
    }
    const warm = () => { for (const cue of Object.keys(RECS)) { const id = picked(cue); if (id) recFile(cue, id).catch(() => {}) } }
    warm()

    /* the black hole's drone, held while it grows (amt 0…1; the resume calls this every frame) */
    let drone = null
    function hole(amt) {
      const c = C('hole', 'grow'), now = ac.currentTime
      if (!drone && amt > 0.01) {
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.Q.value = c.dRes
        lp.frequency.value = 120
        const g = ac.createGain()
        g.gain.value = 0
        lp.connect(g)
        g.connect(mix)
        const os = [-c.dDetune, c.dDetune].map((d) => { const o = ac.createOscillator(); o.type = c.dWave; o.frequency.value = c.dBase; o.detune.value = d; o.connect(lp); o.start(); track(o); return o })
        const sub = ac.createOscillator(), sg = ac.createGain()
        sub.frequency.value = c.dBase / 2
        sg.gain.value = c.dSub
        sub.connect(sg).connect(g)
        sub.start()
        track(sub)
        os.push(sub)
        drone = { lp, g, os }
      }
      if (!drone) return
      drone.g.gain.setTargetAtTime(amt * c.dLevel, now, 0.08)
      drone.lp.frequency.setTargetAtTime(c.dCut + amt * amt * c.dOpen, now, 0.08)
      drone.os.forEach((o, i) => o.frequency.setTargetAtTime((i === 2 ? c.dBase / 2 : c.dBase) * 2 ** ((-amt * c.dDrop) / 12), now, 0.1))
      if (amt <= 0.01) {
        const d = drone
        drone = null
        d.g.gain.setTargetAtTime(0, now, 0.05)
        d.os.forEach((o) => o.stop(now + 0.4))
      }
    }

    function apply() {
      const t = ac.currentTime, to = (p, v) => p.setTargetAtTime(v, t, 0.03)
      to(out.gain, SP.master); to(wet.gain, SP.wet); to(comp.threshold, SP.threshold); to(comp.ratio, SP.ratio)
      const rk = JSON.stringify([SP.rLen, SP.rDecay, SP.rBright])
      if (rk !== roomKey) { roomKey = rk; verb.buffer = room() }
      const w = W(), wk = JSON.stringify([w.wLen, w.wCurve, w.wBright])
      if (wk !== swellKey) { swellKey = wk; swellBuf = swell(w) }
      warm()
    }
    return {
      ac, P, meter, out,
      cue(name, arg, t = ac.currentTime) { if (name === 'grow') return; CUES[name](arg, t) },
      hole,
      setPatch(d) { put(d); apply() },
      diff: () => diffOf(P),
      get active() { return active },
    }
  }
  return { SCHEMA, SPEC, defaults, clean, diffOf, load, save, KEY, create }
})()
