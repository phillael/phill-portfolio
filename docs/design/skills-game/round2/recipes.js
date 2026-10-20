/*
 * Skills rethink, round 2 · B · Skill alchemy: the combos. Two skills Phill used together,
 * and what came of it. `a`/`b` are skill names exactly as ../skills.js spells them.
 *
 * Every number appears verbatim in src/data/career.ts (a tile, FACTS, the music line or a
 * Wizard note) or src/data/resume.ts (a bullet or a project); `src` says where. A combo with
 * no number gets a word metric. Public repo: no school, customer or people names, no vendor
 * but Customer.io.
 */
window.RECIPES = [
  {
    a: 'Anthropic SDK', b: 'MCP servers',
    name: 'Marketing platform', metric: '~5 wks', srMetric: 'about 5 weeks', label: 'prototype to production',
    line: 'Our in-house replacement for Customer.io, with a Claude-powered assistant and an MCP server so marketers and AI agents work in plain English.',
    src: 'career.ts tile "nurture" (metric ~5 wks) · resume.ts nurture-agent',
  },
  {
    a: 'OpenAI Agents SDK', b: 'SSE streaming',
    name: 'AI Resource Finder', metric: '~68K', srMetric: 'about 68 thousand', label: 'community resources',
    line: 'Moved the care team off ChatGPT and into our product: an agent that streams school-first results from 12 open-data sources.',
    src: 'career.ts tile "finder" (~68K, 12 open-data sources) · FACTS "12 open-data sources"',
  },
  {
    a: 'Prompt caching', b: 'Extended thinking',
    name: 'Audience builder', metric: '~90%', srMetric: 'about 90%', label: 'input cost cut',
    line: 'A natural-language audience builder on Claude, where caching the repeated prefix cut its input cost about 90%.',
    src: 'FACTS "about 90% input-cost cut from prompt caching" · career.ts note (audience builder)',
  },
  {
    a: 'Tool use', b: 'Human-in-the-loop',
    name: 'Agent-operable', metric: 'Every write', label: 'confirmed by a person',
    line: "Writes never run inside the model's turn: they become action cards a person confirms, and API keys can't send, approve or delete.",
    src: 'career.ts note (Ask Nurture and the MCP server) · tile "nurture" detail',
  },
  {
    a: 'LLM-as-judge', b: 'ETL pipelines',
    name: 'Data hygiene', metric: '2,374', label: 'duplicates resolved on the first run',
    line: 'An LLM duplicate adjudicator over 70K+ records, gated by pattern: dismissals can be automatic, merges always go to a person.',
    src: 'FACTS "2,374 duplicates", "70K+ records" · career.ts note (data-hygiene engine)',
  },
  {
    a: 'Node.js', b: 'Feature flags',
    name: 'Care operations', metric: '6,700+', srMetric: '6,700 plus', label: 'tickets a year removed',
    line: "Reminder-style referrals go straight to the student's task list: 40%+ of referral volume, shipped across four web apps behind a flag.",
    src: 'career.ts tile "care" (6,700+, 40%+)',
  },
  {
    a: 'MySQL', b: 'Audit logging',
    name: 'Provider payments', metric: '~750', srMetric: 'about 750', label: 'clinicians paid through it',
    line: 'Built from scratch: it audits every payout in ~3 minutes instead of 44 and reconciles every dollar across 50K+ visits a month.',
    src: 'career.ts tile "payouts" (~750, ~3 minutes instead of 44, 50K+ visits)',
  },
  {
    a: 'Autonomous coding agents', b: 'Code review',
    name: 'Agent on-call', metric: '11,889', label: 'jobs migrated, 0 failures',
    line: "As on-call reviewer for the company's autonomous coding agent, he shipped its push-notification migration.",
    src: 'FACTS "11,889 jobs" · career.ts note (on-call reviewer, 0 failures)',
  },
  {
    a: 'Claude Code', b: 'TDD',
    name: 'AI-native workflow', metric: '251', label: 'PRs merged in the past year',
    line: 'Design docs, then Claude Code with custom skills and subagents, isolated worktrees and test-driven loops. Up to 46 a month.',
    src: 'career.ts stat (251 PRs, 46 a month) · FACTS "251 merged PRs", "46 merged PRs a month" · note (AI-natively)',
  },
  {
    a: 'Vitest', b: 'Playwright',
    name: 'Test suites', metric: '50%', label: 'fewer post-release bugs',
    line: 'Test suites that cut post-release bugs 50%, alongside an event-driven reporting dashboard that helped sales close large clients.',
    src: 'career.ts TimelyCare line · resume.ts earlier-timely',
  },
  {
    a: 'Colyseus', b: 'Three.js / R3F',
    name: 'Number Slayers', metric: '60fps', srMetric: '60 frames a second', label: 'server-authoritative multiplayer',
    line: 'A multiplayer 3D math game with snapshot interpolation, AI enemy bots and an adaptive Web Audio mixer.',
    src: 'resume.ts project "Number Slayers" (60fps)',
  },
  {
    a: 'React', b: 'React Native',
    name: 'Sessions', metric: '1.7M', srMetric: '1.7 million', label: 'fans on the platform',
    line: 'Features and a React / React Native component library for a platform connecting 130K musicians with 1.7M fans.',
    src: 'career.ts Sessions line · resume.ts earlier (Sessions)',
  },
  {
    a: 'Composition', b: 'Game audio',
    name: 'ECO', metric: '314K', srMetric: '314 thousand', label: 'units sold',
    line: 'The adaptive score for the award-winning game ECO.',
    src: 'career.ts music line (314K units sold) · resume.ts music',
  },
  {
    a: 'Guitar', b: 'Recording & production',
    name: 'The Funky Knuckles', metric: '#1', srMetric: 'number 1', label: 'iTunes jazz album',
    line: 'A #1 iTunes jazz album as the band’s guitarist, and 15+ years teaching.',
    src: 'career.ts music line (#1 iTunes jazz album, 15+ years teaching) · resume.ts music',
  },
]
