/**
 * Phill's resume as the site publishes it: the semantic /resume page renders it, and
 * the 3D Jelly Resume (drawn from public/resume/snapshot.json) shows the same words.
 *
 * Mirrors Rezmancer's content/resume.yaml with its AI Engineer variant applied (the
 * variant the snapshot is generated from: 8 TimelyCare bullets in that order). The
 * phone number and email are left out on purpose: the repo and the site are public.
 * `**double asterisks**` mark bold runs, as in Rezmancer.
 */

export interface ResumeContact {
  label: string
  href?: string
}

export interface ResumeJob {
  company: string
  blurb: string
  dates: string
  roles: { title: string; dates: string }[]
  bullets: { id: string; text: string }[]
}

export interface ResumeProject {
  name: string
  blurb: string
  link?: { href: string; label: string }
  stack: string
  text: string
}

export interface ResumeEntry {
  title: string
  company: string
  dates: string
  text: string | null
}

export interface Resume {
  name: string
  headline: string
  subheadline: string
  contact: ResumeContact[]
  summary: string
  skills: { label: string; items: string }[]
  experience: ResumeJob[]
  projects: ResumeProject[]
  earlier: ResumeEntry[]
  music: ResumeEntry
  education: { degree: string; school: string }[]
}

export const resume: Resume = {
  name: 'Phill Aelony',
  headline: 'Senior AI Engineer',
  subheadline: 'Full-stack · Agentic systems · TypeScript, React, Node, AWS',
  contact: [
    { label: 'Minneapolis, MN' },
    { label: 'linkedin.com/in/phill-aelony', href: 'https://www.linkedin.com/in/phill-aelony' },
    { label: 'github.com/phillael', href: 'https://github.com/phillael' },
  ],
  summary:
    'AI engineer and full-stack builder with 8 years shipping production software across web, mobile, and cloud. I own greenfield platforms end to end, from stakeholder discovery to production, and build LLM features into them: agents, MCP servers, streaming chat.',
  skills: [
    { label: 'AI', items: 'Anthropic SDK · OpenAI Agents SDK · Vercel AI SDK · MCP servers · Structured outputs · Claude Code' },
    { label: 'Frontend', items: 'TypeScript · React · Next.js · React Native/Expo · Vite · React Query · Tailwind · Three.js/R3F · Accessibility' },
    { label: 'Backend & data', items: 'Node.js · Fastify · Express · tRPC · Postgres/Aurora · MySQL · MongoDB · Redis · Drizzle · BullMQ · Colyseus' },
    { label: 'Cloud & DevOps', items: 'AWS (ECS, SES, SQS/SNS, S3/CloudFront, Lambda@Edge, RDS) · Terraform · GitHub Actions · Docker' },
  ],
  experience: [
    {
      company: 'TimelyCare',
      blurb: 'virtual health platform for colleges and universities',
      dates: 'Feb 2023 – Present',
      roles: [
        { title: 'Generative AI Engineer', dates: 'Apr 2026 – Present' },
        { title: 'Senior Software Engineer II', dates: 'Feb 2023 – Apr 2026' },
      ],
      bullets: [
        { id: 'nurture-rebuild', text: 'Took a dormant in-house marketing platform that had **never sent a message** to production in **~4 weeks (40 merged PRs)** to replace Customer.io for ~1.4M students, adding SSO, AWS Terraform, SES, segmentation, broadcasts, and automations.' },
        { id: 'nurture-agent', text: 'Made the platform **agent-operable**. Built an **MCP server** and an in-app assistant (Anthropic SDK, prompt caching) so marketers create segments, draft emails, and submit broadcasts in natural language, with scoped API keys and audit trails.' },
        { id: 'resource-finder', text: 'Shipped an **AI Resource Finder** for care coordinators (OpenAI Agents SDK, web search, structured outputs, SSE streaming), backed by a ~71K-resource directory I built to replace a six-figure vendor contract.' },
        { id: 'payments-platform', text: 'Designed, built, and launched a **provider payment platform** that Finance uses to audit and publish monthly payouts for **~750 clinicians and 50K+ visits/month**. In production since June 2026.' },
        { id: 'payments-audit', text: 'Cut the full-month payout audit from **~44 to ~3 minutes**, and moved payment rules out of SQL stored functions into effective-dated decision tables, resolving six code-vs-policy discrepancies with Finance and Care Ops.' },
        { id: 'payments-bugs', text: 'Found and fixed payout-correctness bugs, including a no-show overpayment regression (30 items/month → 0), a cron/ETL race that underpaid late-month visits, and a vocabulary mismatch that left **363 coaching sessions unpaid**.' },
        { id: 'growth-pilot', text: 'Ran an abandoned-signup email pilot across a 33-school university system with **7.1% registration vs ~3%** for a comparison group (**~2.7× lift**) and 0 spam complaints, and removed ~919K billable profiles from the vendor workspace.' },
        { id: 'earlier-timely', text: 'Earlier, built an event-driven reporting dashboard (SNS/SQS, SQL, Node, React) that helped sales close several large clients, and **cut post-release bugs 50%** with Vitest, Playwright, and Detox.' },
      ],
    },
  ],
  projects: [
    {
      name: 'Quadzilla',
      blurb: 'AI strength coach for iOS and web',
      stack: 'Expo · Next.js · tRPC · Neon Postgres · Vercel AI SDK · Claude',
      text: 'Coach agent holds your full training history and changes your program through typed tools with an auditable decision log. Voice logging, Apple Health sync, offline replay. Live on TestFlight.',
    },
    {
      name: 'Number Slayers',
      blurb: 'multiplayer 3D math game',
      link: { href: 'https://numberslayers.com', label: 'numberslayers.com' },
      stack: 'React Three Fiber · Colyseus · Next.js · Convex · Railway',
      text: 'Server-authoritative multiplayer with snapshot interpolation at 60fps, AI enemy bots, an adaptive Web Audio mixer, and an FBX→GLB asset pipeline that cut load size 88%.',
    },
  ],
  earlier: [
    { title: 'Software Engineer', company: 'Sessions', dates: 'Jul 2022 – Dec 2022', text: 'Features and a React/React Native component library for a platform connecting 130K musicians with 1.7M fans.' },
    { title: 'Front End Developer', company: 'Designit for Microsoft', dates: 'Mar 2021 – Jul 2022', text: 'Accessible Azure product pages (C#, ASP.NET MVC) during 50% YoY growth; raised team velocity 25%.' },
    { title: 'Freelance Developer', company: 'phillcodes.com', dates: 'Dec 2018 – Dec 2020', text: null },
  ],
  music: {
    title: 'Guitarist & Composer',
    company: 'The Funky Knuckles · Strange Loop Games',
    dates: '1998 – Present',
    text: 'Adaptive score for the award-winning game ECO (314K units sold) · **#1 iTunes jazz album** · 15+ years teaching',
  },
  education: [{ degree: 'B.A. Jazz Studies', school: 'University of North Texas' }],
}

/** Split `**bold**` markup into runs. */
export const richText = (s: string) =>
  s
    .split('**')
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((run) => run.text)
