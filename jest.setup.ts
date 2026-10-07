import '@testing-library/jest-dom'

// jsdom doesn't implement window.scrollTo; WizardChat's body-scroll-lock
// cleanup calls it on unmount, which would spam every suite with
// "Not implemented" errors.
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn()
}

// jsdom has no matchMedia or IntersectionObserver. Default to "no match" and
// "never intersecting"; tests that care can override per-suite.
if (typeof window !== 'undefined') {
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList

  window.IntersectionObserver ??= class {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
}
