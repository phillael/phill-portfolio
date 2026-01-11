'use client'

import { motion } from 'framer-motion'

interface SkillChipProps {
  skill: string
}

/**
 * SkillChip - Interactive skill badge with hover effects
 *
 * Features:
 * - Badge pattern with text-accent bg-muted styling
 * - Hover effect: scale(1.05) transform
 * - Hover effect: enhanced text-shadow glow
 * - Smooth 150-200ms transition
 * - Click explosion animation deferred to Phase 3
 */
const SkillChip = ({ skill }: SkillChipProps) => {
  return (
    <motion.span
      className="
        inline-flex items-center
        px-3 py-1.5 md:px-4 md:py-2
        text-sm md:text-base
        font-medium
        text-accent bg-muted
        rounded-md
        cursor-default
        transition-all duration-150 ease-out
        hover:scale-105
        hover:shadow-[0_0_8px_hsl(var(--accent)/0.6),0_0_16px_hsl(var(--accent)/0.4)]
      "
      whileHover={{
        scale: 1.05,
        textShadow: '0 0 8px hsl(var(--accent)), 0 0 16px hsl(var(--accent) / 0.6)',
      }}
      transition={{ duration: 0.15 }}
    >
      {skill}
    </motion.span>
  )
}

export default SkillChip
