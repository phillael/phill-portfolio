/**
 * Phill's career as the home page tells it: the Experience section renders it, the Shroom
 * Wizard's system prompt carries it (plus `notes`, which the page never shows) and the
 * JSON-LD takes its job title from it.
 *
 * Titles, companies and dates come from resume.ts (never retyped here); the blurbs, lines,
 * tiles, intro and notes are this file's own, from Phill's resume and his two work handoffs
 * (the 2026-10-07 fact sheet and the 2026-10-16 achievements handoff, both outside this repo).
 * The plan's Binding §2 and §4 (docs/plans/2026-10-16-experience-refresh-plan.md) hold the
 * exact copy. Every number here appears in resume.ts or in FACTS with its source; the test
 * in src/__tests__/career-data.test.ts holds that. The repo and the site are public: no
 * school, customer or people names, no vendor named except Customer.io.
 * `**double asterisks**` mark bold runs (render with `richText` from resume.ts).
 */

import { resume } from './resume'

export interface CareerTile {
  id: string
  name: string
  metric: string
  /** the metric as a screen reader should say it ("about 5 weeks", not "tilde 5 w k s") */
  srMetric?: string
  metricLabel: string
  title: string
  detail: string
  stack: string[]
}

/** Newest first; `start` is the part of `dates` before " – " */
export interface CareerRole {
  title: string
  start: string
  dates: string
}

export interface CareerJob {
  id: string
  company: string
  blurb: string
  dates: string
  current: boolean
  /** from resume.ts (TimelyCare: experience[0].roles; earlier jobs: resume.earlier) */
  roles: CareerRole[]
  /** the current job only: what the role is, under the titles (no metric) */
  summary?: string
  /** the current job only: a quiet line of throughput under the summary */
  stat?: string
  /** TimelyCare only */
  tiles: CareerTile[]
  /** an earlier job's one-liner; TimelyCare: the "Before that" line under the tiles */
  line?: string
  stack: string[]
}

export interface Career {
  /** resume.headline */
  headline: string
  intro: string
  /** TimelyCare, Sessions, Designit for Microsoft, phillcodes.com */
  jobs: CareerJob[]
  music: { title: string; company: string; dates: string; line: string; education: string }
  /** the Wizard's extra facts; never rendered on the page */
  notes: string[]
}

/**
 * Numbers allowed in this file beyond resume.ts, each with where it comes from.
 * AH §n = the achievements handoff's section n; "§4 note n" = the plan's Binding §4 list,
 * the public-safe extract of both handoffs.
 */
export const FACTS: { value: string; src: string }[] = [
  { value: '~5 wks', src: 'AH §1: 54 merged PRs, Sept 11 – Oct 15, prototype to production · plan §2 tile 1' },
  { value: '54 merged PRs', src: 'AH §1 · §4 note 3' },
  { value: '~68K community resources', src: 'AH §2–3 · §4 note 7 · plan §2 tile 3' },
  { value: '12 open-data sources', src: 'AH §2–3 · §4 note 7' },
  { value: '~$200K-a-year vendor contract', src: 'AH §2–3 · §4 note 7' },
  { value: 'about 10× faster search', src: '§4 note 7' },
  { value: 'about 90% input-cost cut from prompt caching', src: '§4 note 5' },
  { value: '70K+ records', src: '§4 note 8' },
  { value: '2,374 duplicates', src: '§4 note 8' },
  { value: '5 bugs', src: '§4 note 8' },
  { value: '496 unit tests', src: '§4 note 8' },
  { value: '256% of plan', src: '§4 note 10' },
  { value: 'about 93% of plan', src: '§4 note 10' },
  { value: 'about 6 minutes', src: '§4 note 10' },
  { value: '48% web signup completion', src: '§4 note 10' },
  { value: '88% mobile signup completion', src: '§4 note 10' },
  { value: '200+ concurrent queries', src: '§4 note 12' },
  { value: '6,700+ tickets a year', src: 'AH §10 · §4 note 13' },
  { value: '40%+ of referral volume', src: 'AH §10 · §4 note 13' },
  { value: 'about 1.1 full-time roles', src: 'AH §10 · §4 note 13' },
  { value: '251 merged PRs', src: '§4 note 14' },
  { value: '392 reviews', src: '§4 note 14' },
  { value: '46 merged PRs a month', src: '§4 note 14' },
  { value: '11,889 jobs', src: '§4 note 14' },
]

const roleOf = (r: { title: string; dates: string }): CareerRole => ({
  title: r.title,
  start: r.dates.split(' – ')[0],
  dates: r.dates,
})

const timelycare = resume.experience[0]

/** An earlier job (resume.earlier), found by company */
const earlier = (company: string) => {
  const entry = resume.earlier.find((e) => e.company === company)
  if (!entry) throw new Error(`resume.earlier has no ${company}`)
  return { company: entry.company, dates: entry.dates, roles: [roleOf(entry)] }
}

export const career: Career = {
  headline: resume.headline,
  intro:
    'Eight years shipping production software across web, mobile and cloud. Today I own platforms end to end, as engineer, designer and product manager, and build AI into them.',
  jobs: [
    {
      id: 'timelycare',
      company: timelycare.company,
      blurb: 'Virtual health for colleges and universities',
      dates: timelycare.dates,
      current: true,
      roles: timelycare.roles.map(roleOf),
      // Phill, 2026-10-16: product management is a big part of the job
      summary:
        "I'm the product manager on what I build, not just the engineer: I scope each platform with Finance, Care Operations and Marketing, design it, work it through legal and HIPAA review, learn what our clinicians and therapists need, ship it, and tell the company what changed.",
      // Phill, 2026-10-16: the strongest number not on a tile (§4 note 14), as a quiet line
      stat: 'Past year: 251 PRs merged and 392 reviewed, up to 46 a month.',
      tiles: [
        {
          id: 'nurture',
          name: 'Marketing platform',
          metric: '~5 wks',
          srMetric: 'about 5 weeks',
          metricLabel: 'prototype to production',
          title: 'Built our in-house replacement for Customer.io and took it to production in about five weeks.',
          detail:
            'Segments, broadcasts and an event-driven automation engine for a ~1.4M-student audience, plus a Claude-powered assistant and an **MCP server** so marketers and AI agents work in plain English, with a person confirming every write.',
          stack: ['Next.js', 'Fastify', 'Postgres', 'AWS', 'Terraform', 'Claude', 'MCP'],
        },
        {
          id: 'payouts',
          name: 'Provider payments',
          metric: '~750',
          srMetric: 'about 750',
          metricLabel: 'clinicians paid through it',
          title: 'Built our provider payment platform from scratch and cut payout errors to near zero.',
          detail:
            'It audits every payout in ~3 minutes instead of 44, reconciles every dollar across 50K+ visits a month, and closed a six-figure-a-year gap in the legacy payment logic.',
          stack: ['React', 'TypeScript', 'Node.js', 'MySQL', 'AWS', 'Terraform'],
        },
        {
          id: 'finder',
          name: 'AI resource platform',
          metric: '~68K',
          srMetric: 'about 68 thousand',
          metricLabel: 'community resources',
          title: 'Built the AI tools care coordinators use to find students the right help.',
          detail:
            'An AI Resource Finder that moved the care team off ChatGPT and into our product, on a directory of ~68K resources from 12 open-data sources, built to replace a ~$200K-a-year vendor contract.',
          stack: ['OpenAI Agents SDK', 'Fastify', 'MySQL', 'React', 'React Native'],
        },
        {
          id: 'care',
          name: 'Care operations',
          metric: '6,700+',
          srMetric: '6,700 plus',
          metricLabel: 'tickets a year removed',
          title: 'Redesigned referral routing and took 6,700+ tickets a year off the care team.',
          detail:
            "Reminder-style referrals now go straight to the student's task list instead of the care queue: 40%+ of referral volume and about 1.1 full-time roles of capacity, shipped across four web apps behind a flag.",
          stack: ['Node.js', 'TypeScript', 'React', 'Feature flags'],
        },
      ],
      line: 'Before that: an event-driven reporting dashboard that helped sales close large clients, and test suites that **cut post-release bugs 50%**.',
      stack: ['TypeScript', 'React', 'Node.js', 'AWS', 'Terraform', 'Anthropic SDK', 'OpenAI Agents SDK', 'MCP'],
    },
    {
      id: 'sessions',
      ...earlier('Sessions'),
      blurb: 'Music platform connecting artists and fans',
      current: false,
      tiles: [],
      line: 'Built features and a React / React Native component library for a platform connecting 130K musicians with 1.7M fans.',
      stack: ['React', 'React Native', 'TypeScript'],
    },
    {
      id: 'designit',
      ...earlier('Designit for Microsoft'),
      blurb: 'Azure product pages',
      current: false,
      tiles: [],
      line: 'Built accessible Azure product pages through 50% year-over-year growth, and raised team velocity 25%.',
      stack: ['C#', 'ASP.NET MVC', 'JavaScript', 'HTML', 'CSS', 'Accessibility'],
    },
    {
      id: 'freelance',
      ...earlier('phillcodes.com'),
      blurb: 'Freelance',
      current: false,
      tiles: [],
      line: 'Built client web apps end to end in React, TypeScript and Next.js.',
      stack: ['React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'AWS'],
    },
  ],
  music: {
    title: resume.music.title,
    company: resume.music.company,
    dates: resume.music.dates,
    line: 'Adaptive score for the award-winning game **ECO** (314K units sold), a **#1 iTunes jazz album** with The Funky Knuckles, and 15+ years teaching.',
    education: resume.education.map((e) => `${e.degree}, ${e.school}`).join(' · '),
  },
  notes: [
    'In 2026 Phill moved from the core platform to owning new platforms end to end, working directly with Finance, Care Operations, Marketing and Compliance, and shipping to production himself.',
    'Titles at TimelyCare: Software Engineer (Feb 2023), promoted to Senior Software Engineer II (Apr 2025), then to Generative AI Engineer (Apr 2026).',
    "Nurture, TimelyCare's in-house lifecycle-marketing platform: he took it from prototype to production in about five weeks (54 merged PRs) as the replacement for Customer.io: SSO, a dedicated AWS account in Terraform, SES delivery tracking, a segment builder, broadcasts, and an event-driven automation engine with a shadow mode for side-by-side comparison. It is live in production.",
    "Ask Nurture and the Nurture MCP server: a Claude-powered assistant on every page and an MCP tool surface, so marketers and AI agents build segments, emails, automations and reports in plain English. Writes never run inside the model's turn: they become action cards a person confirms; API keys are scoped and can't send, approve or delete; tool results carry counts, never recipients.",
    'A natural-language audience builder on Claude (tool use, extended thinking) where prompt caching cut repeated-prefix input cost about 90%.',
    "He turned the care team's ChatGPT custom GPT into an in-product AI Resource Finder (OpenAI Agents SDK, hosted web search, structured output, SSE streaming): school-first results from each school's own resources, one-click add to the directory, attach to a case or share with the student, a no-student-identifiers rule, and cards that render only whitelisted fields so model output never becomes markup.",
    'A new TypeScript/Fastify microservice holds ~68K community resources from 12 open-data sources (OpenStreetMap, the National Transit Database, CareerOneStop, IRS records, IMLS libraries, HUD and more) with Census geocoding, on the web app, the React Native app, and the admin and campus portals. It is built to replace a ~$200K-a-year vendor contract. Replacing unindexed LIKE scans with MySQL FULLTEXT search made its search about 10× faster.',
    "A data-hygiene engine processed 70K+ records and auto-resolved 2,374 duplicates on its first run, and an LLM duplicate adjudicator's autonomy is gated by pattern: dismissals can be automatic, merges always go to a person. Real-data runs caught 5 bugs that 496 unit tests missed.",
    'A payment-integrity app Finance uses for ~750 contract clinicians and 50K+ visits a month: automated audits (44 minutes down to ~3), an approval gate before publishing, payment rules as effective-dated data, and detection of visit scenarios no rule covers. It surfaced and closed a six-figure-a-year gap in the legacy payment logic, and Finance has run every monthly cycle in it since mid-2026.',
    "He launched lifecycle email in about four weeks with a consent-gated member sync, cut the email vendor's billable profiles from 256% to about 93% of plan (919K profiles removed in about 6 minutes with 0 failures), ran an abandoned-signup pilot that registered 7.1% of emailed students vs ~3% for a comparison group, and found web signup completing at 48% vs 88% in the mobile app.",
    'Campus access governance: self-serve PHI permission editing gated by legal attestation and clinical countersignature, an account audit trail, and self-service IP allowlists with lockout guardrails; HIPAA Safe Harbor auto-redaction of faculty and staff health data across the campus portal and its exports; admin emulation and a campus Demo Mode.',
    "He root-caused a weeks-long provider session-drop bug to the deployment pipeline and was thanked publicly by the company's Chief Product and Technology Officer; fixed a visit outage caused by one export fanning out into 200+ concurrent queries; and restored PDF exports for every campus client.",
    "He redesigned referral routing so reminder-style referrals go to the student's task list: 6,700+ fewer care tickets a year (40%+ of referral volume, about 1.1 full-time roles).",
    "He works AI-natively: design docs, then Claude Code with custom skills and subagents, isolated worktrees and test-driven loops. In the past year: 251 merged PRs and 392 reviews, up to 46 merged PRs a month. As on-call reviewer for the company's autonomous coding agent he caught two high-severity errors and shipped its push-notification migration (11,889 jobs, 0 failures).",
    'Earlier at TimelyCare: an event-driven reporting dashboard that helped sales close several large clients, and test suites (Vitest, Playwright, Detox) that cut post-release bugs 50%.',
    'In his current role he is the engineer, designer and product manager in one: he coordinates with stakeholders, designs and builds the products, works with the legal and compliance teams so everything meets legal standards and HIPAA, talks with the medical providers and therapists who use what he builds about their needs, and communicates app changes to the rest of the company.',
  ],
}
