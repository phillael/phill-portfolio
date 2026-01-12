'use client'

import { motion } from 'framer-motion'

interface NavItem {
  label: string
  href: string
}

const navItems: NavItem[] = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]

interface NavLinksProps {
  onLinkClick?: () => void
  className?: string
  isMobile?: boolean
}

/**
 * NavLinks - Navigation link list with standardized hover effects
 *
 * Features:
 * - Smooth scroll behavior to section anchors
 * - Consistent hover effects: scale 1.05, neon text glow
 * - whileTap feedback: scale 0.95
 * - Transitions: 150ms with easeOut
 * - Accessible with focus-visible ring styling
 * - Mobile variant with larger touch targets
 */
const NavLinks = ({ onLinkClick, className = '', isMobile = false }: NavLinksProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace('#', '')
    const targetElement = document.getElementById(targetId)

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' })
    }

    onLinkClick?.()
  }

  return (
    <ul
      className={`flex ${isMobile ? 'flex-col items-center gap-4' : 'flex-row items-center gap-6'} ${className}`}
      role="list"
    >
      {navItems.map((item) => (
        <li key={item.href}>
          <motion.a
            href={item.href}
            onClick={(e) => handleClick(e, item.href)}
            className={`
              font-body text-foreground no-underline
              transition-all duration-150 ease-out
              hover:text-primary
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${isMobile
                ? 'text-xl py-2 px-6 min-h-[44px] min-w-[44px] flex items-center justify-center'
                : 'text-lg py-2 px-4'
              }
            `}
            whileHover={{
              scale: 1.05,
              textShadow: '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.5)',
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {item.label}
          </motion.a>
        </li>
      ))}
    </ul>
  )
}

export default NavLinks
