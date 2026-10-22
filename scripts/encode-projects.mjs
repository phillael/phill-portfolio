#!/usr/bin/env node
/**
 * The Relic Vault's videos: Phill's brag-video masters → the files the Projects section plays.
 *
 *   node scripts/encode-projects.mjs [--id <id>]
 *
 * For each project in src/data/projects.json it reads the master `video-masters/<id>.(mp4|mov|m4v|webm)` (gitignored,
 * never committed), or, when there's none, the mockup's `docs/design/projects-vault/media/<id>.mp4` as a PLACEHOLDER
 * (placeholders never ship: the PR waits for every master). It writes:
 *   public/projects/<id>.webm   AV1 (SVT-AV1, crf 34, preset 6), Opus 96k when the master has sound
 *   public/projects/<id>.mp4    H.264 High (crf 23, preset slow, ≤ 3 Mb/s, faststart), AAC 128k when it has sound
 *   public/projects/<id>.jpg    the poster: the frame at POSTER_AT[id] (default 1.5 s), 960 px on the long side, ~80 KB
 * Video: the long side at 1280 (never upscaled), 30 fps. Then src/data/projects-media.json (GENERATED: never hand-edit;
 * `--id` updates that one entry). It warns past 40 s, past 4 MB for a file, on a master under 720 px on its short side,
 * and on an HDR master (ffmpeg here has no zscale to tone-map it: export it SDR).
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The poster frame per id, in seconds (a good, busy frame of the clip) */
const POSTER_AT = {}
const POSTER_AT_DEFAULT = 1.5

const LONG_SIDE = 1280
const POSTER_LONG_SIDE = 960
const POSTER_BYTES = 80 * 1024
const FPS = 30
const MAX_SECONDS = 40
const MAX_BYTES = 4 * 1024 * 1024
const MIN_SHORT_SIDE = 720
const MASTER_EXTS = ['mp4', 'mov', 'm4v', 'webm']
const WEBM_TYPE = 'video/webm; codecs=av01.0.05M.08'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const at = (...p) => path.join(root, ...p)
const MANIFEST = at('src/data/projects-media.json')

function die(msg) {
  console.error(msg)
  process.exit(1)
}

const bin = (name) => {
  const brew = `/opt/homebrew/bin/${name}`
  return fs.existsSync(brew) ? brew : name
}
const FFMPEG = bin('ffmpeg')
const FFPROBE = bin('ffprobe')

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).toString()
const ffmpeg = (args) => run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args])

function probe(file) {
  const info = JSON.parse(run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]))
  const video = info.streams.find((s) => s.codec_type === 'video')
  if (!video) die(`${file}: no video stream`)
  // a phone recording stores portrait as landscape + a rotation, which ffmpeg applies on decode
  const rotation = Math.abs(Number(video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0)) % 180
  const [w, h] = rotation === 90 ? [video.height, video.width] : [video.width, video.height]
  return {
    w,
    h,
    duration: Number(info.format.duration ?? video.duration),
    audio: info.streams.some((s) => s.codec_type === 'audio'),
    hdr: ['arib-std-b67', 'smpte2084'].includes(video.color_transfer),
  }
}

/** Fit the long side to `long` (never upscaled), both sides even */
function fit(w, h, long) {
  const k = Math.min(1, long / Math.max(w, h))
  const even = (n) => Math.max(2, Math.round((n * k) / 2) * 2)
  return [even(w), even(h)]
}

const argv = process.argv.slice(2)
const onlyId = argv.includes('--id') ? argv[argv.indexOf('--id') + 1] : undefined
const projects = JSON.parse(fs.readFileSync(at('src/data/projects.json'), 'utf8'))
const ids = projects.map((p) => p.id)
if (onlyId !== undefined && !ids.includes(onlyId)) die(`--id ${onlyId}: not in src/data/projects.json (${ids.join(', ')})`)

const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
fs.mkdirSync(at('public/projects'), { recursive: true })

const rows = []
const warnings = []
const entries = {}

for (const id of ids) {
  if (onlyId !== undefined && id !== onlyId) {
    if (previous[id]) entries[id] = previous[id]
    continue
  }
  const ext = MASTER_EXTS.find((e) => fs.existsSync(at('video-masters', `${id}.${e}`)))
  const placeholder = ext === undefined
  const src = placeholder ? at('docs/design/projects-vault/media', `${id}.mp4`) : at('video-masters', `${id}.${ext}`)
  if (!fs.existsSync(src)) die(`${id}: no master in video-masters/ and no placeholder at ${path.relative(root, src)}`)

  const m = probe(src)
  if (!placeholder && Math.min(m.w, m.h) < MIN_SHORT_SIDE) warnings.push(`${id}: the master is ${m.w}×${m.h}, under ${MIN_SHORT_SIDE} px on its short side`)
  if (!placeholder && m.hdr) warnings.push(`${id}: the master is HDR (HLG/PQ); it will look flat in SDR: export it SDR`)

  const [w, h] = fit(m.w, m.h, LONG_SIDE)
  const vf = `fps=${FPS},scale=${w}:${h}:flags=lanczos,setsar=1`
  const out = (e) => at('public/projects', `${id}.${e}`)

  ffmpeg([
    '-i', src, '-map', '0:v:0', ...(m.audio ? ['-map', '0:a:0'] : []), '-vf', vf,
    '-c:v', 'libsvtav1', '-crf', '34', '-preset', '6', '-pix_fmt', 'yuv420p',
    ...(m.audio ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']),
    out('webm'),
  ])
  ffmpeg([
    '-i', src, '-map', '0:v:0', ...(m.audio ? ['-map', '0:a:0'] : []), '-vf', vf,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23', '-preset', 'slow', '-maxrate', '3M', '-bufsize', '6M',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ...(m.audio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
    out('mp4'),
  ])

  // the poster: the best JPEG quality that stays about 80 KB
  const posterAt = Math.min(POSTER_AT[id] ?? POSTER_AT_DEFAULT, Math.max(0, m.duration - 0.1))
  const [pw, ph] = fit(m.w, m.h, POSTER_LONG_SIDE)
  for (let q = 3; q <= 12; q++) {
    ffmpeg(['-ss', String(posterAt), '-i', src, '-frames:v', '1', '-vf', `scale=${pw}:${ph}:flags=lanczos`, '-q:v', String(q), out('jpg')])
    if (fs.statSync(out('jpg')).size <= POSTER_BYTES * 1.1) break
  }

  // the manifest tells what is served: probe the encode
  const enc = probe(out('mp4'))
  const sizes = Object.fromEntries(['webm', 'mp4', 'jpg'].map((e) => [e, fs.statSync(out(e)).size]))
  if (enc.duration > MAX_SECONDS) warnings.push(`${id}: ${enc.duration.toFixed(1)} s, past ${MAX_SECONDS} s`)
  for (const e of ['webm', 'mp4']) {
    if (sizes[e] > MAX_BYTES) warnings.push(`${id}.${e}: ${(sizes[e] / 1048576).toFixed(2)} MB, past ${MAX_BYTES / 1048576} MB`)
  }

  entries[id] = {
    w: enc.w,
    h: enc.h,
    duration: Math.round(enc.duration * 100) / 100,
    audio: enc.audio,
    placeholder,
    poster: `/projects/${id}.jpg`,
    sources: [
      { src: `/projects/${id}.webm`, type: WEBM_TYPE },
      { src: `/projects/${id}.mp4`, type: 'video/mp4' },
    ],
  }
  const kb = (n) => `${Math.round(n / 1024)} KB`
  rows.push({
    id,
    source: placeholder ? 'placeholder' : `master .${ext}`,
    size: `${enc.w}×${enc.h}`,
    duration: `${enc.duration.toFixed(2)} s`,
    audio: enc.audio ? 'yes' : 'no',
    webm: kb(sizes.webm),
    mp4: kb(sizes.mp4),
    poster: kb(sizes.jpg),
  })
}

fs.writeFileSync(MANIFEST, JSON.stringify(entries, null, 2) + '\n')

console.table(rows)
for (const w of warnings) console.warn(`WARNING ${w}`)
const left = Object.entries(entries).filter(([, e]) => e.placeholder).map(([id]) => id)
if (left.length) console.log(`Placeholders (need a master in video-masters/): ${left.join(', ')}`)
