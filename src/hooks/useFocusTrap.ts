'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface FocusTrapOptions {
  /** Element to focus on activation. Default: first focusable in the container. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Restore the element that had focus at activation when the trap turns off. Default true. */
  returnFocus?: boolean
}

// Active traps, innermost (most recently activated) last. Only the top one
// handles Tab, so a dialog opened over another dialog owns the keyboard.
const trapStack: symbol[] = []

const getFocusable = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))

/**
 * Keeps Tab / Shift+Tab cycling inside `containerRef` while `active`.
 * Escape is deliberately not handled here: each dialog owns its Escape
 * behavior because of the Escape layering (offer bubble → chat → ShroomMode).
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {}
): void {
  const { initialFocusRef, returnFocus = true } = options

  useEffect(() => {
    if (!active) return

    const id = Symbol('focus-trap')
    trapStack.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null

    const container = containerRef.current
    const initial = initialFocusRef?.current ?? (container ? getFocusable(container)[0] : undefined)
    initial?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || trapStack[trapStack.length - 1] !== id) return
      const root = containerRef.current
      if (!root) return

      // Re-query every time: chat messages and loading states change the set.
      const focusable = getFocusable(root)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement
      const inside = current instanceof Node && root.contains(current)

      if (event.shiftKey && (current === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = trapStack.indexOf(id)
      if (index !== -1) trapStack.splice(index, 1)
      if (returnFocus && previouslyFocused !== document.body) {
        previouslyFocused?.focus?.({ preventScroll: true })
      }
    }
  }, [active, containerRef, initialFocusRef, returnFocus])
}
