#!/usr/bin/env node
/**
 * The Relic Vault's videos: Phill's brag-video masters → the files the Projects section plays.
 *
 *   node scripts/encode-projects.mjs [--id <id>]
 *
 * For each project in src/data/projects.json it reads the master `video-masters/<id>.(mp4|mov|m4v|webm)` (gitignored,
 * never committed), or, when there's none, the mockup's `docs/design/projects-vault/media/<id>.mp4` as a PLACEHOLDER
 * (placeholders never ship: the PR waits for every master). It encodes into video-masters/encoded/ (gitignored too):
 *   <id>.webm   AV1 (SVT-AV1, crf 34, preset 6), Opus 96k when the master has sound
 *   <id>.mp4    H.264 High (crf 23, preset slow, ≤ 3 Mb/s, faststart), AAC 128k when it has sound
 *   <id>.jpg    the poster: the frame at POSTER_AT[id] (default 0: a brag master's frame 0 is its designed poster),
 *               960 px on the long side, ~80 KB
 * Video: the long side at 1280 (never upscaled), 30 fps. Then it uploads the three to Vercel Blob (the public store
 * phill-portfolio-media: the real clips never enter git history, and they get re-cut) as projects/<id>-<sha256, 12 hex>.<ext>.
 * A re-cut gets a new name, so a year's cache never serves a stale clip; a name already in the store isn't sent again.
 * The token is BLOB_READ_WRITE_TOKEN, from the environment or .env.local (`vercel env pull .env.local`). Old files stay
 * in the store (a live deploy may still point at them): prune them by hand once a deploy no longer does.
 * Then src/data/projects-media.json (GENERATED: never hand-edit; `--id` updates that one entry) with the Blob URLs.
 * It warns past 40 s, past 15 MB for a file (the vault loads one clip at a time, when its set powers on), on a master
 * under 720 px on its short side, and on an HDR master (ffmpeg here has no zscale to tone-map it: export it SDR).
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BlobNotFoundError, head, put } from '@vercel/blob'

/** The poster frame per id, in seconds, when it isn't the master's frame 0 */
const POSTER_AT = {}
const POSTER_AT_DEFAULT = 0

const LONG_SIDE = 1280
const POSTER_LONG_SIDE = 960
const POSTER_BYTES = 80 * 1024
const FPS = 30
const MAX_SECONDS = 40
const MAX_BYTES = 15 * 1024 * 1024
const MIN_SHORT_SIDE = 720
const MASTER_EXTS = ['mp4', 'mov', 'm4v', 'webm']
const WEBM_TYPE = 'video/webm; codecs=av01.0.05M.08'
const CONTENT_TYPE = { webm: 'video/webm', mp4: 'video/mp4', jpg: 'image/jpeg' }
const YEAR = 365 * 24 * 60 * 60

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

// strict: a bad argument must never fall through to a full run (every run re-uploads all the clips: new hashes)
const USAGE = 'usage: node scripts/encode-projects.mjs [--id <id>]'
const argv = process.argv.slice(2)
let onlyId
for (let k = 0; k < argv.length; k++) {
  const a = argv[k]
  if (a === '--id' || a.startsWith('--id=')) {
    if (onlyId !== undefined) die(`--id given twice\n${USAGE}`)
    onlyId = a === '--id' ? argv[++k] : a.slice('--id='.length)
    if (!onlyId || onlyId.startsWith('-')) die(`--id needs a project id\n${USAGE}`)
  } else die(`unknown argument ${a}\n${USAGE}`)
}
const projects = JSON.parse(fs.readFileSync(at('src/data/projects.json'), 'utf8'))
const ids = projects.map((p) => p.id)
if (onlyId !== undefined && !ids.includes(onlyId)) die(`--id ${onlyId}: not in src/data/projects.json (${ids.join(', ')})`)

if (!process.env.BLOB_READ_WRITE_TOKEN && fs.existsSync(at('.env.local'))) process.loadEnvFile(at('.env.local'))
const token = process.env.BLOB_READ_WRITE_TOKEN
if (!token) die('No BLOB_READ_WRITE_TOKEN: `vercel env pull .env.local` (the Blob store phill-portfolio-media)')

/** Upload an encode to Blob as projects/<id>-<sha256, 12 hex>.<ext>, unless the store already has it */
async function upload(id, file) {
  const body = fs.readFileSync(file)
  const ext = path.extname(file).slice(1)
  const pathname = `projects/${id}-${createHash('sha256').update(body).digest('hex').slice(0, 12)}.${ext}`
  try {
    return { url: (await head(pathname, { token })).url, sent: false }
  } catch (e) {
    if (!(e instanceof BlobNotFoundError)) throw e
  }
  const { url } = await put(pathname, body, { access: 'public', token, contentType: CONTENT_TYPE[ext], addRandomSuffix: false, cacheControlMaxAge: YEAR })
  return { url, sent: true }
}

const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
const ENCODED = at('video-masters/encoded')
fs.mkdirSync(ENCODED, { recursive: true })

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
  const out = (e) => path.join(ENCODED, `${id}.${e}`)

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

  const [webm, mp4, jpg] = await Promise.all(['webm', 'mp4', 'jpg'].map((e) => upload(id, out(e))))

  entries[id] = {
    w: enc.w,
    h: enc.h,
    duration: Math.round(enc.duration * 100) / 100,
    audio: enc.audio,
    placeholder,
    poster: jpg.url,
    sources: [
      { src: webm.url, type: WEBM_TYPE },
      { src: mp4.url, type: 'video/mp4' },
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
    uploaded: [webm, mp4, jpg].filter((u) => u.sent).length,
  })
}

fs.writeFileSync(MANIFEST, JSON.stringify(entries, null, 2) + '\n')

console.table(rows)
for (const w of warnings) console.warn(`WARNING ${w}`)
const left = Object.entries(entries).filter(([, e]) => e.placeholder).map(([id]) => id)
if (left.length) console.log(`Placeholders (need a master in video-masters/): ${left.join(', ')}`)
