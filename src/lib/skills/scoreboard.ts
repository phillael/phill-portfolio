/**
 * The Skill blaster's scoreboard: at game over, the all-time top 10 in a modal <dialog> in the middle of the screen,
 * the run already a row in it, ready for a name. A port of look B ("Centre stage") of the mockup
 * (docs/design/skills-game/scoreboard/board.js + board.css); the contract is docs/plans/2026-10-21-skills-scoreboard-plan.md
 * (§1–2, the copy exact). Its styles are the `.sb` block of blaster.css; its API is scoreboard-api.ts.
 *
 *   createScoreboard({ onClose }) → { open(run), close(silent?), isOpen() }
 *
 * - The dialog is made on the first open and appended to <body>, outside the shroom wrappers (a filter on an ancestor
 *   breaks fixed positioning), and it leaves <body> when it closes (nothing is left behind if the game is made again).
 *   showModal() gives the top layer, `inert` everywhere else, the focus trap and Esc.
 * - It carries the section's tokens itself (it's outside #skills) and its own live region (showModal() makes the
 *   section's inert, and inert content isn't announced).
 * - Esc: the dialog's keydown stops it reaching shroom mode's and the game's listeners (they listen further out, in the
 *   bubble phase); the wizard chat's capture-phase listener leaves an Esc from inside a modal <dialog> alone. The
 *   native `cancel` closes it (animated). ✕ and a click on the backdrop close it too (a press that started on the
 *   backdrop; on touch, not the tap that only puts a field's keyboard away); `onClose` follows, unless silent.
 * - User text (names, cities) only ever goes in through textContent. Tests: skills-scoreboard.test.ts.
 */

import { COUNTRY_CODES } from '@/data/countries'
import { CITY_MAX, NAME_MAX, TEXT_OK, cleanText } from '@/lib/scoreboard/text'
import type { Board, BoardEntry, RunTicket } from '@/lib/scoreboard/types'
import { fetchBoard, loadProfile, playerId, saveProfile, saveScore } from './scoreboard-api'

export interface BoardRun {
  score: number
  wave: number
  resumes: number
  /** the run beat this device's best */
  best: boolean
  /** played from the keyboard */
  kb: boolean
  /** the run's ticket, asked for at its first shot (null: the scoreboard was out) */
  ticket: Promise<RunTicket | null>
}
export interface Scoreboard {
  open(run: BoardRun): void
  /** silent: no onClose (a new game, stop, dispose) */
  close(silent?: boolean): void
  isOpen(): boolean
}

const fmt = (n: number) => n.toLocaleString('en-US')
const EASE = 'cubic-bezier(.2, .7, .2, 1)'
const BEST_KEY = 'skill-blaster-best'
const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
const OUT = 'Couldn’t save: the scoreboard is out. Try again in a bit.'

/* the countries, named by the browser */
let regions: Intl.DisplayNames | null = null
const countryName = (c: string) => {
  try { return (regions ??= new Intl.DisplayNames(['en'], { type: 'region' })).of(c) ?? c } catch { return c }
}
let countries: [string, string][] | null = null
const countryList = () => (countries ??= COUNTRY_CODES.map((c): [string, string] => [c, countryName(c)]).sort((x, y) => x[1].localeCompare(y[1])))
/** "Lisbon, PT", "Lisbon", "Portugal" or nothing */
const placeOf = (e: { city: string; country: string }) => (e.city ? (e.country ? `${e.city}, ${e.country}` : e.city) : e.country ? countryName(e.country) : '')

/** an element with a class and text (textContent only), and its children */
function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string, ...kids: Node[]): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text !== undefined) n.textContent = text
  n.append(...kids)
  return n
}
const anim = (n: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => (typeof n.animate === 'function' ? n.animate(kf, o) : null)
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

let made = 0 // ids stay unique if the game is made again

export function createScoreboard({ onClose }: { onClose: () => void }): Scoreboard {
  const id = `sb-${++made}`
  let dialog: HTMLDialogElement | null = null
  let state: 'closed' | 'open' | 'closing' = 'closed'
  let gen = 0 // bumps on every open and close: answers for an older one are dropped
  let run: BoardRun | null = null
  let ticket: RunTicket | null = null
  let savedNow = false
  let rm = false
  let lastFocus: Element | null = null
  let liveT = 0
  const q = <T extends Element>(s: string) => dialog!.querySelector<T>(s)!

  function make() {
    const d = h('dialog', 'sb')
    d.setAttribute('aria-labelledby', `${id}-h`)
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.stopPropagation() }) // the native cancel still runs
    d.addEventListener('cancel', (e) => { e.preventDefault(); close() }) // closed our way (animated)
    d.addEventListener('close', () => { if (state !== 'closed' && !d.open) finish(false) }) // closed by the browser anyway
    // the backdrop (no padding, one wrapper fills it: a click whose target is the dialog). Only a press that started
    // there: a drag out of the panel also clicks the dialog. On touch, a tap there while a field has the keyboard up
    // only puts it away (the run isn't saved yet)
    let fromBackdrop = false
    d.addEventListener('pointerdown', (e) => {
      const typing = window.matchMedia?.('(pointer: coarse)').matches && !!document.activeElement?.matches?.('.sb-form input, .sb-form select')
      fromBackdrop = e.target === d && !typing
    })
    d.addEventListener('click', (e) => { if (e.target === d && fromBackdrop) close(); fromBackdrop = false })
    return d
  }

  function shell(r: BoardRun) {
    const x = h('button', 'sb-x')
    x.type = 'button'
    x.setAttribute('aria-label', 'Close the scoreboard')
    x.innerHTML = X_ICON
    x.addEventListener('click', () => close())
    const head = h('h2', 'sb-h', 'Top 10 · all time')
    head.id = `${id}-h`
    head.tabIndex = -1
    const list = h('ol', 'sb-list')
    list.setAttribute('role', 'list')
    list.setAttribute('aria-labelledby', head.id)
    const more = h('a', '', 'Want more? Number Slayers ↗')
    more.href = 'https://numberslayers.com'
    more.target = '_blank'
    more.rel = 'noopener'
    const live = h('p', 'sb-live')
    live.setAttribute('aria-live', 'polite')
    return h('div', 'sb-in', undefined,
      h('div', 'sb-top', undefined, h('span', 'sb-over', 'Game over'), x),
      h('div', 'sb-you', undefined, h('b', 'sb-score', fmt(r.score)), h('span', 'sb-rank')),
      head,
      list,
      h('p', 'sb-foot', undefined, h('span', '', 'Close this, then shoot any skill to play again'), more),
      live,
    )
  }

  function say(text: string) {
    const live = q<HTMLElement>('.sb-live')
    live.textContent = ''
    clearTimeout(liveT)
    liveT = window.setTimeout(() => { live.textContent = text }, 30)
  }

  function open(r: BoardRun) {
    close(true)
    dialog ??= make()
    if (!dialog.isConnected) document.body.append(dialog)
    run = r
    ticket = null
    savedNow = false
    rm = reduced()
    dialog.classList.toggle('sb-rm', rm)
    lastFocus = document.activeElement
    dialog.replaceChildren(shell(r))
    loading()
    dialog.showModal()
    state = 'open'
    enter()
    q<HTMLElement>('.sb-h').focus({ preventScroll: true }) // its heading: on a phone no keyboard pops up unasked
    load(++gen)
  }

  function close(silent = false) {
    if (state === 'closed' || !dialog) return
    if (silent || rm || typeof dialog.animate !== 'function') return finish(silent)
    if (state === 'closing') return
    state = 'closing'
    const g = ++gen
    dialog.classList.add('sb-closing')
    const a = dialog.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], { duration: 180, easing: EASE, fill: 'forwards' })
    a.onfinish = () => { if (g === gen && state === 'closing') finish(false) }
  }

  function finish(silent: boolean) {
    const d = dialog!
    state = 'closed'
    gen++
    clearTimeout(liveT)
    d.classList.remove('sb-closing')
    d.getAnimations?.().forEach((a) => a.cancel())
    if (d.open) d.close()
    const back = lastFocus instanceof HTMLElement && lastFocus.isConnected ? lastFocus : document.getElementById('skills-h')
    back?.focus({ preventScroll: true })
    d.remove()
    if (!silent) onClose()
  }

  /* the entrance: the panel rises in, its parts stagger after it; reduced motion, a fade (the backdrop's is CSS) */
  function enter() {
    const d = dialog!
    if (rm) { anim(d, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); return }
    anim(d, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE })
    d.querySelectorAll('.sb-top, .sb-you, .sb-h, .sb-list, .sb-foot').forEach((n, i) =>
      anim(n, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120 + i * 40, easing: EASE, fill: 'backwards' }))
  }

  function loading() {
    const list = q<HTMLOListElement>('.sb-list')
    dialog!.classList.add('sb-loading')
    list.setAttribute('aria-busy', 'true')
    list.replaceChildren(...Array.from({ length: 10 }, (_, i) => {
      const w = h('i', 'gw')
      w.style.setProperty('--w', `${(i * 37) % 30}%`)
      const li = h('li', 'sb-row sb-ghost', undefined, h('i', 'gn'), w, h('i', 'gp'))
      li.setAttribute('aria-hidden', 'true')
      return li
    }))
  }

  async function load(g: number) {
    const r = run!
    try {
      const [b, t] = await Promise.all([fetchBoard(playerId(), r.score), r.ticket.catch(() => null)])
      if (g !== gen) return
      ticket = t
      render(b)
    } catch {
      if (g === gen) offline()
    }
  }

  function settle() {
    dialog!.classList.remove('sb-loading')
    q<HTMLElement>('.sb-list').removeAttribute('aria-busy')
  }

  function offline() {
    settle()
    q<HTMLElement>('.sb-rank').replaceChildren()
    let kept = 0
    try { kept = Number(localStorage.getItem(BEST_KEY)) || 0 } catch { /* private mode */ }
    const retry = h('button', 'sb-retry', 'Try again')
    retry.type = 'button'
    retry.addEventListener('click', () => {
      loading()
      q<HTMLElement>('.sb-h').focus({ preventScroll: true })
      load(++gen)
    })
    q<HTMLElement>('.sb-list').replaceChildren(h('li', 'sb-off', undefined,
      h('p', '', 'The scoreboard didn’t load.'),
      h('p', 'sub', `Your best, ${fmt(Math.max(run!.score, kept))}, is saved on this device.`),
      retry,
    ))
    say('The scoreboard didn’t load.')
  }

  /* a row: rank, name (+ "You") and place, score */
  function row(e: { name: string; city: string; country: string; score: number }, n: string, me: boolean) {
    const who = h('span', 'sb-who', undefined, h('span', 'sb-name', e.name))
    if (me) who.append(h('span', 'sb-tag', 'You'))
    who.append(h('span', 'sb-from', placeOf(e)))
    const li = h('li', `sb-row${me ? ' sb-me' : ''}`, undefined, h('span', 'sb-n', n), who, h('span', 'sb-pts', fmt(e.score)))
    if (me) li.tabIndex = -1
    return li
  }
  const gap = () => { const li = h('li', 'sb-gap', '· · ·'); li.setAttribute('aria-hidden', 'true'); return li }

  /* your run, ready for a name: the name in your row, city and country under it */
  function formRow(n: string, t: RunTicket) {
    const p = loadProfile()
    const city = p ? p.city : t.geo.city, country = p ? p.country : t.geo.country
    const field = (cls: string, label: string, control: HTMLElement) => h('label', `sb-f ${cls}`, undefined, h('span', 'sr', label), control)
    const name = h('input')
    Object.assign(name, { name: 'name', maxLength: NAME_MAX, placeholder: 'Your name', autocomplete: 'nickname', spellcheck: false, value: p?.name ?? '' })
    name.setAttribute('enterkeyhint', 'done')
    const cityIn = h('input')
    Object.assign(cityIn, { name: 'city', maxLength: CITY_MAX, placeholder: 'City', autocomplete: 'address-level2', value: city })
    const select = h('select')
    select.name = 'country'
    select.append(new Option('Country', ''), ...countryList().map(([c, label]) => new Option(label, c, false, c === country)))
    const err = h('p', 'sb-err')
    err.id = `${id}-err`
    err.setAttribute('role', 'alert')
    name.setAttribute('aria-describedby', err.id)
    cityIn.setAttribute('aria-describedby', err.id)
    const save = h('button', 'sb-save', 'Save')
    save.type = 'submit'
    const form = h('form', 'sb-form', undefined,
      h('span', 'sb-n', n),
      field('sb-fname', 'Your name', name),
      h('span', 'sb-pts', fmt(run!.score)),
      h('span', 'sb-place', undefined, field('sb-fcity', 'City (optional)', cityIn), field('sb-fcountry', 'Country', select)),
      save,
      err,
    )
    form.noValidate = true
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(form) })
    return h('li', 'sb-row sb-me sb-edit', undefined, form)
  }
  /* your run when it can't be saved (no ticket): its rank and score, and why */
  function noTicketRow(n: string) {
    return h('li', 'sb-row sb-me sb-edit sb-noticket', undefined,
      h('span', 'sb-n', n),
      h('span', 'sb-who', undefined, h('span', 'sb-tag', 'You')),
      h('span', 'sb-pts', fmt(run!.score)),
      h('p', 'sb-note', 'Can’t be saved: the scoreboard was out when this run started.'),
    )
  }

  /** the shared ranking: 1 + the number strictly higher */
  const ranks = (scores: number[]) => scores.map((s) => 1 + scores.filter((x) => x > s).length)

  function render(b: Board) {
    settle()
    const r = run!, mine = b.mine
    const canSave = !savedNow && (!mine || r.score > mine.score)
    const rankEl = q<HTMLElement>('.sb-rank')
    const items: HTMLElement[] = []
    let msg: string

    if (canSave) {
      const total = b.total + (mine ? 0 : 1)
      const at = b.at ?? 1 + b.top.filter((e) => e.score > r.score).length
      // the merged list: the server's top 10, minus the player's entry (this run replaces it), plus this run after its ties
      const others = b.top.filter((e) => !e.me)
      const pos = others.findIndex((e) => e.score < r.score), cut = pos < 0 ? others.length : pos
      const merged: (BoardEntry | null)[] = [...others.slice(0, cut), null, ...others.slice(cut)] // null: this run
      const nums = ranks(merged.map((e) => (e ? e.score : r.score)))
      const mineRow = (n: string) => (ticket ? formRow(n, ticket) : noTicketRow(n))
      if (cut < 10) merged.slice(0, 10).forEach((e, i) => items.push(e ? row(e, String(nums[i]), false) : mineRow(String(nums[i]))))
      else { others.slice(0, 10).forEach((e, i) => items.push(row(e, String(nums[i]), false))); items.push(gap(), mineRow(fmt(at))) } // under the gap: the server's rank
      rankEl.replaceChildren(...(at === 1
        ? [h('span', 'gold', 'A new #1'), ` of ${fmt(total)}`]
        : [`#${fmt(at)} of ${fmt(total)}`, ...(r.best ? [' · ', h('span', 'good', 'new best')] : [])]))
      const head = `Game over. ${fmt(r.score)} points: number ${fmt(at)} of ${fmt(total)} on the scoreboard.`
      msg = ticket ? `${head} Add your name to keep it.` : `${head} Can’t be saved: the scoreboard was out when this run started.`
    } else {
      const nums = ranks(b.top.map((e) => e.score))
      b.top.forEach((e, i) => items.push(row(e, String(nums[i]), !!e.me)))
      if (mine && !b.top.some((e) => e.me)) items.push(gap(), row(mine, fmt(mine.rank), true))
      const myRank = mine ? fmt(mine.rank) : '', at = fmt(b.at ?? 1)
      if (savedNow) {
        rankEl.replaceChildren(h('span', 'good', 'Saved'), ` · you’re #${myRank} of ${fmt(b.total)}`)
        msg = `Saved. You’re number ${myRank} of ${fmt(b.total)}.`
      } else {
        const total = fmt(b.total + 1) // `at` ranks this run beside your best: one more entry, as a pending run's total
        rankEl.replaceChildren(`#${at} of ${total} · your best, ${fmt(mine?.score ?? 0)}, is #${myRank}`)
        msg = `Game over. ${fmt(r.score)} points: number ${at} of ${total}. Your best is number ${myRank}.`
      }
    }

    const list = q<HTMLOListElement>('.sb-list')
    list.replaceChildren(...items)
    list.querySelectorAll<HTMLElement>('.sb-row').forEach((li) => { // #1 gold, #2–3 brighter: by rank, so ties share it
      const n = li.querySelector('.sb-n')?.textContent
      if (n === '1' || n === '2' || n === '3') li.dataset.top = n
    })
    list.style.setProperty('--nw', String(Math.max(2, ...[...list.querySelectorAll('.sb-n')].map((n) => n.textContent!.length))))
    if (!rm) items.forEach((li, i) => anim(li, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: i * 18, fill: 'backwards' }))
    const form = list.querySelector('form')
    if (form && (r.kb || window.matchMedia?.('(pointer: fine)').matches)) (form.elements.namedItem('name') as HTMLInputElement).focus({ preventScroll: true })
    else if (savedNow) list.querySelector<HTMLElement>('.sb-me')?.focus({ preventScroll: true })
    if (!dialog!.contains(document.activeElement)) q<HTMLElement>('.sb-h').focus({ preventScroll: true })
    list.querySelector<HTMLElement>('.sb-me')?.scrollIntoView?.({ block: 'nearest' })
    say(msg)
  }

  async function submit(form: HTMLFormElement) {
    const el = (n: string) => form.elements.namedItem(n) as HTMLInputElement
    const nameIn = el('name'), cityIn = el('city'), err = form.querySelector<HTMLElement>('.sb-err')!, save = form.querySelector<HTMLButtonElement>('.sb-save')!
    const name = cleanText(nameIn.value), city = cleanText(cityIn.value), country = el('country').value
    const fail = (field: HTMLInputElement, msg: string) => { err.textContent = msg; field.setAttribute('aria-invalid', 'true'); field.focus() }
    nameIn.removeAttribute('aria-invalid')
    cityIn.removeAttribute('aria-invalid')
    if (!name) return fail(nameIn, 'Add a name first')
    if (!TEXT_OK.test(name)) return fail(nameIn, 'Letters, numbers, spaces and . _ \' - only')
    if (city && !TEXT_OK.test(city)) return fail(cityIn, 'A city in letters, please')
    err.textContent = ''
    save.disabled = true
    save.textContent = 'Saving…'
    const r = run!, g = gen
    const res = await saveScore({ runId: ticket!.runId, playerId: playerId(), score: r.score, wave: r.wave, resumes: r.resumes, name, city, country })
    if (g !== gen) return
    if (res.ok) {
      saveProfile({ name, city, country })
      savedNow = true
      return render(res.board)
    }
    if (res.error === 'not_best' && res.board) return render(res.board) // another tab saved a better run
    save.textContent = 'Save'
    if (res.error === 'run' || res.error === 'score') { err.textContent = 'This run can’t go on the board.'; return } // Save stays disabled
    save.disabled = false
    if (res.error === 'name') return fail(nameIn, 'Pick another name')
    if (res.error === 'city') return fail(cityIn, 'Pick another city')
    err.textContent = OUT
  }

  return { open, close, isOpen: () => state !== 'closed' }
}
