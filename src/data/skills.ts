/**
 * Phill's skills, AI first: the home page's Skills section (and the Skill blaster game it
 * hides) renders them, the Shroom Wizard's system prompt carries them (`wizard-prompt.ts`)
 * and the JSON-LD's `knowsAbout` lists the tech groups (`structured-data.ts`).
 *
 * The copy is the mockup's, exact (docs/design/skills-game/skills.js; plan
 * docs/plans/2026-10-20-skills-blaster-plan.md, Binding §3). Sources: the resume, the
 * 2026-10-07 fact sheet's tech stack and the 2026-10-16 achievements handoff's skills
 * inventory (both outside this repo). Technology and practice names only: vendor SaaS the
 * employer uses stays generic ("SSO / OIDC", "Feature flags"), per the public-repo rule.
 * src/__tests__/skills-data.test.ts holds the shape.
 */

export interface Skill {
  name: string
  /** AI skills only: a few words in the AI panel, read as part of the skill's button */
  note?: string
}

export type SkillGroupId = 'ai' | 'frontend' | 'backend' | 'cloud' | 'quality' | 'product' | 'music'

export interface SkillGroup {
  id: SkillGroupId
  name: string
  /** AI only: the glass panel with a note per skill */
  featured?: boolean
  caption?: string
  skills: Skill[]
}

export interface Skills {
  headline: string
  lede: string
  groups: SkillGroup[]
}

const named = (list: string[]): Skill[] => list.map((name) => ({ name }))

export const SKILLS: Skills = {
  headline: 'AI first. Full stack.',
  lede: 'What I build with, agents and LLM features first, then the web, mobile and cloud stack under them.',
  groups: [
    {
      id: 'ai',
      name: 'AI',
      featured: true,
      caption: 'Agents, tools and LLM features in production',
      skills: [
        { name: 'Claude Code', note: 'skills, subagents, worktrees, test-driven loops' },
        { name: 'MCP servers', note: 'tool surfaces with scoped keys' },
        { name: 'Anthropic SDK', note: 'streaming, tool use, token telemetry' },
        { name: 'OpenAI Agents SDK', note: 'tool-using agents, hosted web search' },
        { name: 'Vercel AI SDK', note: 'agents and chat in Next.js' },
        { name: 'Tool use', note: 'agent tool registries with permission gating' },
        { name: 'Structured outputs', note: 'Zod schemas, whitelisted fields' },
        { name: 'Prompt caching', note: 'cheaper repeated prefixes' },
        { name: 'Extended thinking', note: 'in a natural-language audience builder' },
        { name: 'SSE streaming', note: 'live tokens to the UI' },
        { name: 'Human-in-the-loop', note: 'a person confirms every write' },
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
      skills: named([
        'TypeScript', 'JavaScript', 'React', 'Next.js', 'React Native', 'Expo', 'Vite', 'Tailwind',
        'React Query', 'Redux', 'Three.js / R3F', 'WebGL', 'HTML', 'CSS', 'Accessibility',
      ]),
    },
    {
      id: 'backend',
      name: 'Backend & data',
      skills: named([
        'Node.js', 'Fastify', 'Express', 'tRPC', 'REST', 'Event-driven (SNS/SQS)', 'BullMQ',
        'Postgres', 'MySQL', 'MongoDB', 'Redis', 'Drizzle', 'ETL pipelines', 'Colyseus',
      ]),
    },
    {
      id: 'cloud',
      name: 'Cloud & DevOps',
      skills: named([
        'AWS', 'ECS', 'SES', 'S3 / CloudFront', 'Lambda@Edge', 'EventBridge', 'Terraform',
        'GitHub Actions', 'Docker', 'Turborepo', 'Vercel', 'Feature flags',
      ]),
    },
    {
      id: 'quality',
      name: 'Quality & security',
      skills: named([
        'Vitest', 'Jest', 'Playwright', 'Testing Library', 'TDD', 'HIPAA', 'PHI / PII governance',
        'SSO / OIDC', 'RBAC', 'Audit logging',
      ]),
    },
    {
      id: 'product',
      name: 'Product',
      skills: named([
        'Product management', 'Stakeholder discovery', 'UX & product design', 'Roadmapping',
        'Legal & compliance review', 'Release comms', 'Code review', 'Mentorship',
      ]),
    },
    {
      id: 'music',
      name: 'Music & more',
      skills: named(['Guitar', 'Composition', 'Recording & production', 'Sound design', 'Game audio', 'Spanish']),
    },
  ],
}

export const skillCount = SKILLS.groups.reduce((n, g) => n + g.skills.length, 0)

/** The groups the JSON-LD's `knowsAbout` lists (the tech, not product or music) */
export const TECH_GROUPS: SkillGroupId[] = ['ai', 'frontend', 'backend', 'cloud', 'quality']
