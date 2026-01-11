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
]

interface NavLinksProps {
  onLinkClick?: () => void
  className?: string
  isMobile?: boolean
}

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
      className={`flex ${isMobile ? 'flex-col items-center gap-8' : 'flex-row items-center gap-6'} ${className}`}
      role="list"
    >
      {navItems.map((item) => (
        <li key={item.href}>
          <motion.a
            href={item.href}
            onClick={(e) => handleClick(e, item.href)}
            className={`
              font-body text-foreground no-underline
              transition-all duration-200
              hover:text-primary
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${isMobile
                ? 'text-2xl py-4 px-8 min-h-[44px] min-w-[44px] flex items-center justify-center'
                : 'text-lg py-2 px-4'
              }
            `}
            whileHover={{
              textShadow: '0 0 8px hsl(var(--primary))',
            }}
            whileTap={{ scale: 0.98 }}
          >
            {item.label}
          </motion.a>
        </li>
      ))}
    </ul>
  )
}

export default NavLinks
