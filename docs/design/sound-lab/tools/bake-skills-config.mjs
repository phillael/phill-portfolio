// Bakes the Skill blaster's sound into the site: loads docs/design/skills-game/round6/synth.js (the Sound lab's engine,
// whose SCHEMA defaults are the sound as it ships) in Node with a stub `window`, and writes its defaults() to
// src/lib/skills/synthConfig.ts as a typed, frozen SKILL_SYNTH_CONFIG. A pick setting is typed as its options.
//
//   node docs/design/sound-lab/tools/bake-skills-config.mjs
//
// A new patch from the lab goes into synth.js's defaults first, then run this. The parity test
// (src/__tests__/skills-synth.test.ts) fails while the two disagree. Running it twice writes the same file.
import fs from 'node:fs'
import vm from 'node:vm'

const root = new URL('../../../../', import.meta.url).pathname
const src = root + 'docs/design/skills-game/round6/synth.js'
const out = root + 'src/lib/skills/synthConfig.ts'

const window = {}
vm.runInNewContext(fs.readFileSync(src, 'utf8'), { window, document: undefined, localStorage: undefined })
const { SCHEMA, defaults } = window.SKILL_SYNTH
const P = defaults()

const name = (id) => id[0].toUpperCase() + id.slice(1)
const lit = (v) => (typeof v === 'string' ? `'${v}'` : String(v))
const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`)

const types = SCHEMA.map((pn) => {
  const lines = pn.sections.flatMap((s) => s.params.map((p) => `  ${key(p.k)}: ${p.opts ? p.opts.map(([o]) => lit(o)).join(' | ') : 'number'}`))
  return `/** ${pn.label} (${pn.group}) */\nexport interface Synth${name(pn.id)}Config {\n${lines.join('\n')}\n}`
})
const config = `export interface SkillSynthConfig {\n${SCHEMA.map((pn) => `  ${key(pn.id)}: Readonly<Synth${name(pn.id)}Config>`).join('\n')}\n}`
const values = SCHEMA.map((pn) => {
  const body = Object.entries(P[pn.id]).map(([k, v]) => `    ${key(k)}: ${lit(v)},`).join('\n')
  return `  ${key(pn.id)}: Object.freeze<Synth${name(pn.id)}Config>({\n${body}\n  }),`
})

const file = `/*
 * GENERATED: do not edit. The Skill blaster's sound, every setting of src/lib/skills/synth.ts, as Phill tuned it in the
 * Sound lab: the defaults of docs/design/skills-game/round6/synth.js, written here by
 * docs/design/sound-lab/tools/bake-skills-config.mjs. To change the sound, change synth.js's SCHEMA defaults (the lab's
 * source) and run \`node docs/design/sound-lab/tools/bake-skills-config.mjs\`; src/__tests__/skills-synth.test.ts fails
 * while the two disagree.
 */

${types.join('\n\n')}

${config}

export const SKILL_SYNTH_CONFIG: Readonly<SkillSynthConfig> = Object.freeze<SkillSynthConfig>({
${values.join('\n')}
})
`
fs.mkdirSync(new URL('.', 'file://' + out).pathname, { recursive: true })
fs.writeFileSync(out, file)
console.log(`wrote ${out.slice(root.length)}: ${SCHEMA.length} parts, ${Object.values(P).reduce((n, p) => n + Object.keys(p).length, 0)} settings`)
