'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { CHIPS } from '@/lib/jelly/finder'
import { FOCUS, PANEL } from '@/components/jelly/hudStyles'

interface JellyFinderProps {
  query: string
  /** words lit up by the last search (null: nothing searched) */
  matches: number | null
  /** typing: update the box now, search after a short pause */
  onType: (q: string) => void
  /** run the search (chips run it at once) */
  onSearch: (q: string) => void
  inputRef: RefObject<HTMLInputElement | null>
  rootRef: RefObject<HTMLDivElement | null>
}

/**
 * The Finder: type a skill (or tap a chip) and the matching words lift off the page
 * and glow. `/` focuses it (the overlay's keys), Esc clears it.
 */
const JellyFinder = ({ query, matches, onType, onSearch, inputRef, rootRef }: JellyFinderProps) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const type = (q: string) => {
    onType(q)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(q), 180)
  }
  const run = (q: string) => {
    if (timer.current) clearTimeout(timer.current)
    onType(q)
    onSearch(q)
  }
  const q = query.trim().toLowerCase()

  return (
    <div
      ref={rootRef}
      role="search"
      data-jelly-finder
      className="absolute left-3 top-2.5 z-[2] flex max-w-[min(520px,calc(100%-24px))] flex-col gap-1.5 max-[820px]:left-2 max-[820px]:right-[60px] max-[820px]:top-2 max-[820px]:max-w-none"
    >
      <div className={`${PANEL} flex items-center gap-2 rounded-[10px] py-1 pl-2.5 pr-1.5 focus-within:border-[#80eaff]`}>
        <span aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          id="jelly-find"
          name="find"
          type="search"
          value={query}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              run('')
              e.currentTarget.blur()
            }
            e.stopPropagation() // typed letters aren't shortcuts
          }}
          placeholder="Find a skill… React, AWS, MCP  ( / )"
          aria-label="Find a skill in the resume"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-[#d7deea] outline-none placeholder:text-[#7c8798]"
        />
        <span aria-live="polite" className="whitespace-nowrap font-mono text-[11px] text-[#80eaff]">
          {q && matches !== null ? (matches ? `${matches} ${matches === 1 ? 'word' : 'words'}` : 'no match') : ''}
        </span>
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { run(''); inputRef.current?.focus() }}
            className={`min-h-[32px] min-w-[32px] rounded-md text-base text-[#7c8798] hover:text-[#d7deea] max-[820px]:min-h-[44px] max-[820px]:min-w-[44px] ${FOCUS}`}
          >
            ×
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 max-[820px]:flex-nowrap max-[820px]:overflow-x-auto max-[820px]:[scrollbar-width:none]">
        {CHIPS.map(([name]) => {
          const on = q === name.toLowerCase()
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => run(on ? '' : name)}
              className={`min-h-[30px] flex-none cursor-pointer rounded-full border px-[11px] py-1 text-xs backdrop-blur-[6px] max-[820px]:min-h-[44px] ${FOCUS} ${
                on
                  ? 'border-[#80eaff] bg-[#80eaff] text-[#041016] shadow-[0_0_14px_rgba(128,234,255,0.55)]'
                  : 'border-[#1e2431] bg-[rgba(8,10,16,0.72)] text-[#d7deea] hover:border-[#80eaff]'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default JellyFinder
