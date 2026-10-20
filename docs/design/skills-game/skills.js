/*
 * Skills section rethink, round 1: the skills, AI first.
 *
 * Sources: the resume (Rezmancer content/resume.yaml → src/data/resume.ts skills), the
 * 2026-10-07 fact sheet §9 "Tech stack" and the 2026-10-16 achievements handoff's
 * "Skills and keyword inventory". Technology and practice names only; vendor SaaS the
 * employer uses is named generically (SSO / OIDC, feature flags, error monitoring) per the
 * public-repo rule (no vendor named except Customer.io, and that one isn't a skill).
 * `note` = a few words shown in the AI panel; `power` = the brick breaker's power-up.
 */
window.SKILLS = {
  headline: 'AI first. Full stack.',
  lede: 'What I build with, agents and LLM features first, then the web, mobile and cloud stack under them.',
  groups: [
    {
      id: 'ai',
      name: 'AI',
      featured: true,
      caption: 'Agents, tools and LLM features in production',
      skills: [
        { name: 'Claude Code', note: 'skills, subagents, worktrees, test-driven loops', power: 'multi' },
        { name: 'MCP servers', note: 'tool surfaces with scoped keys', power: 'wide' },
        { name: 'Anthropic SDK', note: 'streaming, tool use, token telemetry' },
        { name: 'OpenAI Agents SDK', note: 'tool-using agents, hosted web search' },
        { name: 'Vercel AI SDK', note: 'agents and chat in Next.js' },
        { name: 'Tool use', note: 'agent tool registries with permission gating' },
        { name: 'Structured outputs', note: 'Zod schemas, whitelisted fields' },
        { name: 'Prompt caching', note: 'cheaper repeated prefixes', power: 'double' },
        { name: 'Extended thinking', note: 'in a natural-language audience builder', power: 'slow' },
        { name: 'SSE streaming', note: 'live tokens to the UI' },
        { name: 'Human-in-the-loop', note: 'a person confirms every write', power: 'net' },
        { name: 'Agent evals', note: 'against a baseline' },
        { name: 'Prompt-injection defense', note: 'model output never becomes markup' },
        { name: 'PHI guardrails', note: 'no student identifiers reach a model' },
        { name: 'LLM-as-judge', note: 'autonomy gated by pattern' },
        { name: 'Autonomous coding agents', note: 'reviewing and shipping their PRs' },
      ],
    },
    {
      id: 'frontend',
      name: 'Frontend & mobile',
      skills: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'React Native', 'Expo', 'Vite', 'Tailwind', 'React Query', 'Redux', 'Three.js / R3F', 'WebGL', 'HTML', 'CSS', 'Accessibility'],
    },
    {
      id: 'backend',
      name: 'Backend & data',
      skills: ['Node.js', 'Fastify', 'Express', 'tRPC', 'REST', 'Event-driven (SNS/SQS)', 'BullMQ', 'Postgres', 'MySQL', 'MongoDB', 'Redis', 'Drizzle', 'ETL pipelines', 'Colyseus'],
    },
    {
      id: 'cloud',
      name: 'Cloud & DevOps',
      skills: ['AWS', 'ECS', 'SES', 'S3 / CloudFront', 'Lambda@Edge', 'EventBridge', 'Terraform', 'GitHub Actions', 'Docker', 'Turborepo', 'Vercel', 'Feature flags'],
    },
    {
      id: 'quality',
      name: 'Quality & security',
      skills: ['Vitest', 'Jest', 'Playwright', 'Testing Library', 'TDD', 'HIPAA', 'PHI / PII governance', 'SSO / OIDC', 'RBAC', 'Audit logging'],
    },
    {
      id: 'product',
      name: 'Product',
      skills: ['Product management', 'Stakeholder discovery', 'UX & product design', 'Roadmapping', 'Legal & compliance review', 'Release comms', 'Code review', 'Mentorship'],
    },
    {
      id: 'music',
      name: 'Music & more',
      skills: ['Guitar', 'Composition', 'Recording & production', 'Sound design', 'Game audio', 'Spanish'],
    },
  ],
}

/* Power-ups the brick breaker's AI bricks drop (the AI skill, doing its job) */
window.POWERS = {
  multi: { label: 'Subagents', hint: 'three balls', color: 'hsl(190 100% 70%)' },
  wide: { label: 'More tools', hint: 'wider paddle', color: 'hsl(130 90% 60%)' },
  double: { label: 'Cache hits', hint: '2× points', color: 'hsl(45 100% 65%)' },
  slow: { label: 'Think longer', hint: 'slow motion', color: 'hsl(260 100% 80%)' },
  net: { label: 'A person confirms', hint: 'a net saves one miss', color: 'hsl(290 100% 78%)' },
}

/* Every group as { id, name, featured, skills: [{ name, note?, power? }] } */
window.SKILL_GROUPS = window.SKILLS.groups.map((g) => ({
  ...g,
  skills: g.skills.map((s) => (typeof s === 'string' ? { name: s } : s)),
}))
window.SKILL_COUNT = window.SKILL_GROUPS.reduce((n, g) => n + g.skills.length, 0)
