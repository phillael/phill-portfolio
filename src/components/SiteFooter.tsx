import AnimatedSection from '@/components/AnimatedSection'

/**
 * SiteFooter - Page-end contentinfo landmark (copyright line).
 * Spacing continues ContactSection's layout so the page looks unchanged.
 */
const SiteFooter = () => (
  <footer className="pb-20 md:pb-32 px-4 md:px-6">
    <div className="max-w-4xl mx-auto text-center">
      <AnimatedSection variant="fade-in" delay={0.4}>
        <div className="mt-16 md:mt-24 pt-8 border-t border-[hsl(var(--primary)/0.2)]">
          <p className="text-sm text-[hsl(var(--foreground)/0.5)]">
            {new Date().getFullYear()} Phill Aelony. Built React, Typescript, and Next.js.
          </p>
        </div>
      </AnimatedSection>
    </div>
  </footer>
)

export default SiteFooter
