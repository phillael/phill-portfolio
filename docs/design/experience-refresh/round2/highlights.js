/*
 * Experience refresh, round 2: highlights only.
 *
 * Phill's direction (2026-10-16): a brief overview of the strongest points from each job,
 * Apple-clean with a light HUD touch. Sources are the resume (Rezmancer content/resume.yaml)
 * and the 2026-10-07 fact sheet; `src` tags show where each number comes from
 * (FS §n = fact sheet section, R:id = resume bullet, SITE = already on phillcodes.com).
 * `**bold**` marks bold runs, as in resume.ts.
 */
window.HIGHLIGHTS = {
  headline: 'Senior AI Engineer',
  intro: 'Eight years shipping production software across web, mobile and cloud. Today I own platforms end to end and build AI into them.',
  introSrc: 'R summary',

  /* At most four headline numbers, Feb–Oct 2026 */
  stats: [
    { value: '~4 wks', label: 'dormant platform to production', src: 'FS §4 · R:nurture-rebuild', countTo: 4, prefix: '~', suffix: ' wks' },
    { value: '44→3 min', label: 'monthly payout audit', src: 'FS §3 · R:payments-audit', countFrom: 44, countTo: 3, suffix: ' min' },
    { value: '2.7×', label: 'sign-up lift in an email pilot', src: 'FS §5 · R:growth-pilot', countTo: 2.7, decimals: 1, suffix: '×' },
    { value: '~750', label: 'clinicians paid through a platform I built', src: 'FS §3 · R:payments-platform', countTo: 750, prefix: '~' },
  ],

  jobs: [
    {
      id: 'timelycare',
      company: 'TimelyCare',
      blurb: 'Virtual health for colleges and universities',
      dates: 'Feb 2023 – Present',
      current: true,
      /* Newest first. Phill, 2026-10-16: SE Feb 2023 → SSE II Apr 2025 → Generative AI Engineer Apr 2026. */
      ladder: [
        { title: 'Generative AI Engineer', start: 'Apr 2026', dates: 'Apr 2026 – Present' },
        { title: 'Senior Software Engineer II', start: 'Apr 2025', dates: 'Apr 2025 – Apr 2026' },
        { title: 'Software Engineer', start: 'Feb 2023', dates: 'Feb 2023 – Apr 2025' },
      ],
      highlights: [
        {
          id: 'nurture', name: 'Marketing platform', metric: '~5 wks', metricLabel: 'prototype to production',
          title: 'Built our in-house replacement for Customer.io and took it to production in about five weeks.',
          detail: 'Segments, broadcasts and an event-driven automation engine for a ~1.4M-student audience, plus a Claude-powered assistant and an **MCP server** so marketers and AI agents work in plain English, with a person confirming every write.',
          stack: ['Next.js', 'Fastify', 'Postgres', 'AWS', 'Terraform', 'Claude', 'MCP'],
          tag: 'AI', src: 'AH §1 (54 PRs, Sept 11 – Oct 15) · FS §4',
        },
        {
          id: 'payouts', name: 'Provider payments', metric: '~750', metricLabel: 'clinicians paid through it',
          title: 'Built our provider payment platform from scratch and cut payout errors to near zero.',
          detail: 'It audits every payout in ~3 minutes instead of 44, reconciles every dollar across 50K+ visits a month, and closed a six-figure-a-year gap in the legacy payment logic.',
          stack: ['React', 'TypeScript', 'Node.js', 'MySQL', 'AWS', 'Terraform'],
          tag: 'Platform', src: 'AH §5 · FS §3 · Phill 2026-10-16 (near zero)',
        },
        {
          id: 'finder', name: 'AI resource platform', metric: '~68K', metricLabel: 'community resources',
          title: 'Built the AI tools care coordinators use to find students the right help.',
          detail: 'An AI Resource Finder that moved the care team off ChatGPT and into our product, on a directory of ~68K resources from 12 open-data sources, built to replace a ~$200K-a-year vendor contract.',
          stack: ['OpenAI Agents SDK', 'Fastify', 'MySQL', 'React', 'React Native'],
          tag: 'AI', src: 'AH §2–3',
        },
        {
          id: 'care', name: 'Care operations', metric: '6,700+', metricLabel: 'tickets a year removed',
          title: 'Redesigned referral routing and took 6,700+ tickets a year off the care team.',
          detail: 'Reminder-style referrals now go straight to the student’s task list instead of the care queue: 40%+ of referral volume and about 1.1 full-time roles of capacity, shipped across four web apps behind a flag.',
          stack: ['Node.js', 'TypeScript', 'React', 'Feature flags'],
          tag: 'Platform', src: 'AH §10',
        },
      ],
      earlier: {
        text: 'Before that: an event-driven reporting dashboard that helped sales close large clients, and test suites that **cut post-release bugs 50%**.',
        src: 'R:earlier-timely',
      },
      stack: ['TypeScript', 'React', 'Node.js', 'AWS', 'Terraform', 'Anthropic SDK', 'OpenAI Agents SDK', 'MCP'],
    },
    {
      id: 'sessions',
      company: 'Sessions',
      blurb: 'Music platform connecting artists and fans',
      dates: 'Jul 2022 – Dec 2022',
      ladder: [{ title: 'Software Engineer', dates: 'Jul 2022 – Dec 2022' }],
      highlights: [
        { id: 's1', title: 'Built features and a React / React Native component library for a platform connecting 130K musicians with 1.7M fans.', src: 'R earlier' },
      ],
      stack: ['React', 'React Native', 'TypeScript'],
    },
    {
      id: 'designit',
      company: 'Designit for Microsoft',
      blurb: 'Azure product pages',
      dates: 'Mar 2021 – Jul 2022',
      ladder: [{ title: 'Front End Developer', dates: 'Mar 2021 – Jul 2022' }],
      highlights: [
        { id: 'd1', title: 'Built accessible Azure product pages through 50% year-over-year growth, and raised team velocity 25%.', src: 'R earlier' },
      ],
      stack: ['C#', 'ASP.NET MVC', 'Accessibility'],
    },
    {
      id: 'freelance',
      company: 'phillcodes.com',
      blurb: 'Freelance',
      dates: 'Dec 2018 – Dec 2020',
      ladder: [{ title: 'Freelance Developer', dates: 'Dec 2018 – Dec 2020' }],
      highlights: [
        { id: 'f1', title: 'Built client web apps end to end in React, TypeScript and Next.js.', src: 'SITE' },
      ],
      stack: ['React', 'Next.js', 'AWS'],
    },
  ],

  music: {
    title: 'Guitarist & Composer',
    company: 'The Funky Knuckles · Strange Loop Games',
    dates: '1998 – Present',
    line: 'Adaptive score for the award-winning game **ECO** (314K units sold), a **#1 iTunes jazz album** with The Funky Knuckles, and 15+ years teaching.',
    src: 'R music',
    track: { title: 'Micro Clown', by: 'My song, recorded with The Funky Knuckles' },
    education: 'B.A. Jazz Studies, University of North Texas',
  },
}
