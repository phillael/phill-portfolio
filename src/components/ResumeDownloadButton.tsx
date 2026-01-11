'use client'

import { motion } from 'framer-motion'

interface ResumeDownloadButtonProps {
  variant?: 'desktop' | 'mobile' | 'section'
  className?: string
}

/**
 * ResumeDownloadButton - Download button for resume PDF
 *
 * Features:
 * - Three variants: desktop (nav), mobile (mobile menu), section (experience section)
 * - Neon glow hover effect matching SocialLinks pattern
 * - Minimum 44x44px touch target
 * - Proper download attribute for PDF download behavior
 * - Accessible with focus-visible ring styling
 * - Framer Motion hover and tap animations
 */
const ResumeDownloadButton = ({
  variant = 'desktop',
  className = '',
}: ResumeDownloadButtonProps) => {
  const isDesktop = variant === 'desktop'
  const isMobile = variant === 'mobile'
  const isSection = variant === 'section'

  // Base classes for all variants
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-body text-sm font-medium
    rounded-md
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
    min-h-[44px]
    no-underline
  `

  // Variant-specific classes
  const variantClasses = {
    desktop: `
      px-4 py-2
      border border-primary/50
      text-primary
      hover:border-primary hover:bg-primary/10
    `,
    mobile: `
      w-full px-6 py-3
      border border-primary/50
      text-primary
      hover:border-primary hover:bg-primary/10
    `,
    section: `
      px-6 py-3
      bg-primary/10 border border-primary/30
      text-primary
      hover:bg-primary/20 hover:border-primary/50
    `,
  }

  // Text content based on variant
  const buttonText = isDesktop ? 'Resume' : 'Download Resume'

  return (
    <div className={`${isSection ? 'flex flex-col items-start gap-2' : ''} ${className}`}>
      {isSection && (
        <span className="text-sm text-foreground/70 font-body">
          View my full resume
        </span>
      )}
      <motion.a
        href="/Phillip_Aelony_Resume_2025.pdf"
        download
        aria-label="Download Phill's resume as PDF"
        className={`${baseClasses} ${variantClasses[variant]}`}
        whileHover={{
          scale: 1.05,
          filter: 'drop-shadow(0 0 8px hsl(190 100% 75%))',
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Download Icon SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{buttonText}</span>
      </motion.a>
    </div>
  )
}

export default ResumeDownloadButton
