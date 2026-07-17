import '@testing-library/jest-dom'

// jsdom doesn't implement window.scrollTo; WizardChat's body-scroll-lock
// cleanup calls it on unmount, which would spam every suite with
// "Not implemented" errors.
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn()
}
