'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import NavLinks from '@/components/NavLinks'
import SocialLinks from '@/components/SocialLinks'
import HamburgerButton from '@/components/HamburgerButton'
import MobileMenu from '@/components/MobileMenu'
import ResumeDownloadButton from '@/components/ResumeDownloadButton'

const SCROLL_THRESHOLD = 50

const Nav = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const hamburgerButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial scroll position

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Callback ref to capture the button element inside the HamburgerButton component
  const setHamburgerRef = (node: HTMLDivElement | null) => {
    if (node) {
      const button = node.querySelector('button')
      hamburgerButtonRef.current = button
    }
  }

  return (
    <>
      <motion.header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-primary/30 neon-border-subtle'
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Name/Title */}
          <div className="flex-shrink-0">
            <a
              href="#hero"
              className="group flex flex-col no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md px-2 py-1"
              onClick={(e) => {
                e.preventDefault()
                const heroSection = document.getElementById('hero')
                if (heroSection) {
                  heroSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              <span className="font-heading text-lg md:text-xl text-primary neon-text-blue group-hover:text-accent transition-colors">
                Phill Aelony
              </span>
              <span className="font-body text-xs md:text-sm text-foreground/80 neon-text-green -mt-1">
                Software Engineer
              </span>
            </a>
          </div>

          {/* Desktop Navigation, Resume Download, and Social Links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLinks />
            <ResumeDownloadButton variant="desktop" />
            <SocialLinks />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden" ref={setHamburgerRef}>
            <HamburgerButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        hamburgerButtonRef={hamburgerButtonRef}
      />
    </>
  )
}

export default Nav
