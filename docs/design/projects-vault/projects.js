// The Relic Vault's exhibits: src/data/projects.json's copy (Phill's), Pickleball 2079 drafted from its plan.
// `year` is the repo's first commit; `set` is the television the museum of 4789 believes is period-correct.
// `tv` picks the model in vault.js. media/<id>.mp4 + .jpg are PLACEHOLDER footage until Phill's 30 s videos.
export const PROJECTS = [
  {
    id: 'quadzilla', title: 'Quadzilla', year: 2026, tv: 'pocket', set: 'a pocket television, c. 1982',
    description: 'AI strength coach for iOS and web. A coach agent holds your whole training history and changes your program through typed tools, with an auditable decision log. Voice logging, Apple Health sync, offline replay. On TestFlight.',
    stack: ['Expo', 'Next.js', 'tRPC', 'Neon Postgres', 'Vercel AI SDK', 'Claude'],
  },
  {
    id: 'number-slayers', title: 'Number Slayers', year: 2025, tv: 'tube', set: 'a black tube set, c. 1994',
    description: 'Multiplayer 3D math game. Server-authoritative multiplayer with snapshot interpolation at 60fps, AI enemy bots, an adaptive Web Audio mixer, and an FBX→GLB pipeline that cut load size 88%. I wrote the soundtrack too.',
    stack: ['React Three Fiber', 'Colyseus', 'Next.js', 'Convex', 'Railway'],
    live: 'https://numberslayers.com', code: 'https://github.com/phillael/number-slayers',
  },
  {
    id: 'rezmancer', title: 'Rezmancer', year: 2026, tv: 'terminal', set: 'a beige office terminal, c. 1984',
    description: 'AI resume builder, in development. Resume as code, a pixel-exact PDF and a Claude builder that keeps a career bank of sourced facts: every number it writes must trace back to one. Tailors a resume per posting and flags any line nothing backs.',
    stack: ['Next.js 16', 'Neon Postgres', 'Better Auth', 'Vercel AI SDK', 'Claude'],
  },
  {
    id: 'jelly-resume', title: 'Jelly Resume', year: 2026, tv: 'sphere', set: 'a space helmet set, c. 1970',
    description: 'This site’s resume as a soft-body toy and a platformer: the hero photo dissolves into a copy of my resume you can knock apart, on one raw WebGL2 canvas, and Play mode turns it into a run from my name to the last line.',
    stack: ['TypeScript', 'WebGL2', 'Custom physics', 'Web Audio'],
    live: 'https://www.phillcodes.com/resume',
  },
  {
    id: 'pickleball-2079', title: 'Pickleball 2079', year: 2026, tv: 'portable', set: 'a portable colour set, c. 1986',
    description: 'Wacky arcade pickleball from the year 2079, in development. Two-on-two against the CPU on a deterministic 60 Hz sim that replays bit-exact, a cast of voxel critters and kitchen objects, and players who explode when the ball hits them.',
    stack: ['TypeScript', 'three.js', 'Vite', 'Deterministic sim'],
  },
  {
    id: 'pong', title: 'Pong Multiverse Alpaca Squadron', short: 'Pong', year: 2020, tv: 'console', set: 'a wood console set, c. 1974',
    description: 'This is one of the first things I built with JavaScript over 6 years ago. It took me months to get it working but I’m still proud of it!',
    stack: ['JavaScript', 'HTML Canvas', 'CSS', 'Game Development'],
    live: 'https://phillael.github.io/Pong-Multiverse-Alpaca-Squadron/', code: 'https://github.com/phillael/Pong-Multiverse-Alpaca-Squadron',
  },
]
