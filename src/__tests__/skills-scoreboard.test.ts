/**
 * The Skill blaster's scoreboard (src/lib/skills/scoreboard.ts): the dialog at game over, look B of the mockup.
 * jsdom has no <dialog> showModal/close, Web Animations or layout: they're stubbed here. The API is mocked.
 */
import { createScoreboard, type BoardRun } from '@/lib/skills/scoreboard'
import { fetchBoard, loadProfile, saveProfile, saveScore } from '@/lib/skills/scoreboard-api'
import type { Board, BoardEntry, RunTicket, SaveResult } from '@/lib/scoreboard/types'

jest.mock('@/lib/skills/scoreboard-api', () => ({
  fetchBoard: jest.fn(),
  saveScore: jest.fn(),
  playerId: jest.fn(() => 'p-me'),
  loadProfile: jest.fn(() => null),
  saveProfile: jest.fn(),
}))
const mFetch = fetchBoard as jest.Mock, mSave = saveScore as jest.Mock, mProfile = loadProfile as jest.Mock, mSaveProfile = saveProfile as jest.Mock

/* the stubs: a dialog that opens and closes, animations that record themselves and finish on demand, media queries */
let anims: { el: Element; kf: Keyframe[]; o: KeyframeAnimationOptions; a: { onfinish: null | (() => void); cancel: jest.Mock } }[] = []
let media = { reduce: false, fine: false }
const realMatchMedia = window.matchMedia
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  Element.prototype.animate = function (this: Element, kf: Keyframe[] | PropertyIndexedKeyframes | null, o?: number | KeyframeAnimationOptions) {
    const a = { onfinish: null, cancel: jest.fn() }
    anims.push({ el: this, kf: kf as Keyframe[], o: o as KeyframeAnimationOptions, a })
    return a as unknown as Animation
  }
  Element.prototype.getAnimations = function () { return [] }
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce') ? media.reduce : q.includes('fine') ? media.fine : q.includes('coarse') ? !media.fine : false, // touch unless fine
    media: q, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})
afterAll(() => { window.matchMedia = realMatchMedia })

const GEO: RunTicket = { runId: 'run-1', geo: { city: 'Lisbon', country: 'PT' } }
const entry = (name: string, score: number, rank: number, o: Partial<BoardEntry> = {}): BoardEntry => ({ rank, name, city: '', country: '', score, ...o })
/** a top 10 from 9,000 down by 500s */
const TEN = Array.from({ length: 10 }, (_, i) => entry(`p${i + 1}`, 9000 - i * 500, i + 1))
const board = (o: Partial<Board> = {}): Board => ({ top: TEN, total: 412, mine: null, at: 1, ...o })
const runOf = (o: Partial<BoardRun> = {}): BoardRun => ({ score: 6200, wave: 3, resumes: 0, best: false, kb: false, ticket: Promise.resolve(GEO), ...o })

let onClose: jest.Mock
let sb: ReturnType<typeof createScoreboard>
/** the board's dialog (kept after it closes, when it leaves <body>) */
let lastDlg: HTMLDialogElement | null = null
const dlg = () => (lastDlg = document.querySelector<HTMLDialogElement>('dialog.sb') ?? lastDlg)!
const $ = <T extends Element = HTMLElement>(s: string) => dlg().querySelector<T>(s)!
const rows = () => [...dlg().querySelectorAll<HTMLElement>('.sb-list > li')]
const nums = () => rows().map((li) => li.querySelector('.sb-n')?.textContent ?? li.textContent)
const rankLine = () => $('.sb-rank').textContent
const live = () => $('.sb-live').textContent
const input = (n: string) => $<HTMLInputElement>(`[name="${n}"]`)
const settle = () => jest.advanceTimersByTimeAsync(50)
async function show(b: Board | Error, r: Partial<BoardRun> = {}) {
  if (b instanceof Error) mFetch.mockRejectedValueOnce(b)
  else mFetch.mockResolvedValueOnce(b)
  sb.open(runOf(r))
  await settle()
}
async function submit(name: string, result?: SaveResult) {
  input('name').value = name
  if (result) mSave.mockResolvedValueOnce(result)
  $<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
  await settle()
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mProfile.mockReturnValue(null)
  anims = []
  media = { reduce: false, fine: false }
  localStorage.clear()
  document.body.innerHTML = '<h2 id="skills-h">Skills</h2><button id="shot">a skill</button><p data-sk-live aria-live="polite"></p>'
  onClose = jest.fn()
  lastDlg = null
  sb = createScoreboard({ onClose })
})
afterEach(() => {
  sb.close(true)
  jest.useRealTimers()
})

describe('opening', () => {
  it('is a modal dialog on <body>, labelled by its heading, which takes focus', () => {
    mFetch.mockReturnValue(new Promise(() => {}))
    sb.open(runOf({ score: 15000 }))
    const d = dlg()
    expect(d.parentElement).toBe(document.body)
    expect(d.open).toBe(true)
    expect(sb.isOpen()).toBe(true)
    const h = document.getElementById(d.getAttribute('aria-labelledby')!)!
    expect(h.textContent).toBe('Top 10 · all time')
    expect(document.activeElement).toBe(h)
    expect($('.sb-over').textContent).toBe('Game over')
    expect($('.sb-score').textContent).toBe('15,000')
    expect($('.sb-x').getAttribute('aria-label')).toBe('Close the scoreboard')
    expect($('.sb-foot span').textContent).toBe('Close this, then shoot any skill to play again')
    const a = $<HTMLAnchorElement>('.sb-foot a')
    expect([a.textContent, a.href, a.target, a.rel]).toEqual(['Want more? Number Slayers ↗', 'https://numberslayers.com/', '_blank', 'noopener'])
  })
  it('shows 10 ghost rows while the board loads', () => {
    mFetch.mockReturnValue(new Promise(() => {}))
    sb.open(runOf())
    expect(rows()).toHaveLength(10)
    expect(rows().every((li) => li.classList.contains('sb-ghost') && li.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect($('.sb-list').getAttribute('aria-busy')).toBe('true')
    expect(dlg().classList.contains('sb-loading')).toBe(true)
  })
  it('asks for the board for this player and score', async () => {
    await show(board({ at: 4 }))
    expect(mFetch).toHaveBeenCalledWith('p-me', 6200)
    expect($('.sb-list').hasAttribute('aria-busy')).toBe(false)
  })
  it('makes one dialog and reuses it; closed, it leaves <body>', async () => {
    await show(board({ at: 4 }))
    const first = dlg()
    sb.close(true)
    expect(first.isConnected).toBe(false)
    expect(document.querySelector('dialog')).toBeNull()
    await show(board({ at: 4 }))
    expect(document.querySelectorAll('dialog.sb')).toHaveLength(1)
    expect(dlg()).toBe(first)
  })
})

describe('a run to save (pending)', () => {
  it('sits in the top 10 at its rank, as a form, the rows after it moving down', async () => {
    await show(board({ at: 7 }))
    expect(rows()).toHaveLength(10)
    expect(nums()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(rows()[6].querySelector('form')).not.toBeNull()
    expect(rows()[6].classList.contains('sb-me')).toBe(true)
    expect(rows()[7].querySelector('.sb-name')!.textContent).toBe('p7') // 6,000 was 7th; it's 8th now
    expect(rows().some((li) => li.textContent!.includes('p10'))).toBe(false) // the old 10th drops off
    expect(rankLine()).toBe('#7 of 413')
    expect(live()).toBe('Game over. 6,200 points: number 7 of 413 on the scoreboard. Add your name to keep it.')
  })
  it('says a new best when it beats the device’s', async () => {
    await show(board({ at: 7 }), { best: true })
    expect(rankLine()).toBe('#7 of 413 · new best')
    expect($('.sb-rank .good').textContent).toBe('new best')
  })
  it('a new #1, in gold', async () => {
    await show(board({ at: 1 }), { score: 99999 })
    expect(nums()[0]).toBe('1')
    expect(rows()[0].querySelector('form')).not.toBeNull()
    expect(rankLine()).toBe('A new #1 of 413')
    expect($('.sb-rank .gold').textContent).toBe('A new #1')
  })
  it('under the “· · ·” when it’s outside the top 10, with the server’s rank', async () => {
    await show(board({ at: 212 }), { score: 500 })
    expect(rows()).toHaveLength(12)
    expect(rows()[10].textContent).toBe('· · ·')
    expect(rows()[10].getAttribute('aria-hidden')).toBe('true')
    expect(nums()[11]).toBe('212')
    expect(rows()[11].querySelector('form')).not.toBeNull()
    expect($('.sb-list').style.getPropertyValue('--nw')).toBe('3')
    expect(rankLine()).toBe('#212 of 413')
  })
  it('shares a rank with its ties, after them', async () => {
    const top = [entry('a', 9000, 1), entry('b', 8000, 2), entry('c', 8000, 2), entry('d', 7000, 4)]
    await show(board({ top, total: 4, at: 2 }), { score: 8000 })
    expect(nums()).toEqual(['1', '2', '2', '2', '5'])
    expect(rows()[3].querySelector('form')).not.toBeNull()
    expect(rows().map((li) => li.dataset.top)).toEqual(['1', '2', '2', '2', undefined]) // the top three's colours go by rank
    expect(rankLine()).toBe('#2 of 5')
  })
  it('replaces the player’s own entry (no +1 to the total)', async () => {
    const top = [entry('a', 9000, 1), entry('Me', 3000, 2, { me: true }), entry('b', 1000, 3)]
    await show(board({ top, total: 3, mine: top[1], at: 2 }), { score: 5000 })
    expect(rows().map((li) => li.querySelector('.sb-name')?.textContent ?? 'FORM')).toEqual(['a', 'FORM', 'b'])
    expect(nums()).toEqual(['1', '2', '3'])
    expect(rankLine()).toBe('#2 of 3')
  })
  it('prefills city and country from where the visitor is', async () => {
    await show(board({ at: 7 }))
    expect(input('name').value).toBe('')
    expect(input('city').value).toBe('Lisbon')
    expect($<HTMLSelectElement>('select').value).toBe('PT')
    expect($<HTMLSelectElement>('select').options[0].textContent).toBe('Country')
    expect([...$<HTMLSelectElement>('select').options].find((o) => o.value === 'PT')!.textContent).toBe('Portugal')
  })
  it('the profile saved last beats geolocation', async () => {
    mProfile.mockReturnValue({ name: 'Ana', city: '', country: 'US' })
    await show(board({ at: 7 }))
    expect([input('name').value, input('city').value, $<HTMLSelectElement>('select').value]).toEqual(['Ana', '', 'US'])
  })
  it('labels every field for screen readers, with the mockup’s placeholders', async () => {
    await show(board({ at: 7 }))
    const label = (n: Element) => n.closest('label')!.querySelector('.sr')!.textContent
    expect([label(input('name')), label(input('city')), label($('select'))]).toEqual(['Your name', 'City (optional)', 'Country'])
    expect([input('name').placeholder, input('city').placeholder]).toEqual(['Your name', 'City'])
    expect([input('name').maxLength, input('city').maxLength]).toEqual([16, 24])
    expect($('.sb-save').textContent).toBe('Save')
  })
})

describe('saving', () => {
  it('sends the run, says Saving…, then shows the row saved and focused', async () => {
    await show(board({ at: 7 }), { score: 6000, wave: 3, resumes: 2 })
    let done!: (r: SaveResult) => void
    mSave.mockReturnValueOnce(new Promise((r) => { done = r }))
    input('name').value = '  Ana  '
    $<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true }))
    expect(mSave).toHaveBeenCalledWith({ runId: 'run-1', playerId: 'p-me', score: 6000, wave: 3, resumes: 2, name: 'Ana', city: 'Lisbon', country: 'PT' })
    expect($('.sb-save').textContent).toBe('Saving…')
    expect($<HTMLButtonElement>('.sb-save').disabled).toBe(true)
    const top = [...TEN.slice(0, 6), entry('Ana', 6000, 7, { me: true, city: 'Lisbon', country: 'PT' }), ...TEN.slice(6, 9)]
    done({ ok: true, board: { top, total: 413, mine: top[6], at: 7 } })
    await settle()
    expect(dlg().querySelector('form')).toBeNull()
    expect(rankLine()).toBe('Saved · you’re #7 of 413')
    expect($('.sb-rank .good').textContent).toBe('Saved')
    const me = $('.sb-me')
    expect(me.querySelector('.sb-tag')!.textContent).toBe('You')
    expect(me.querySelector('.sb-from')!.textContent).toBe('Lisbon, PT')
    expect(document.activeElement).toBe(me)
    expect(mSaveProfile).toHaveBeenCalledWith({ name: 'Ana', city: 'Lisbon', country: 'PT' })
    expect(live()).toBe('Saved. You’re number 7 of 413.')
  })
  it('shows a saved row outside the top 10 under the gap', async () => {
    await show(board({ at: 212 }), { score: 500 })
    await submit('Ana', { ok: true, board: { top: TEN, total: 413, mine: entry('Ana', 500, 1212, { me: true }), at: 1212 } })
    expect(rows()[10].textContent).toBe('· · ·')
    expect(nums()[11]).toBe('1,212')
    expect(rankLine()).toBe('Saved · you’re #1,212 of 413')
  })
})

describe('the errors', () => {
  const err = () => $('.sb-err')
  it('checks the name and city first, and sends nothing', async () => {
    await show(board({ at: 7 }))
    expect(err().getAttribute('role')).toBe('alert')
    await submit('   ')
    expect(err().textContent).toBe('Add a name first')
    expect(input('name').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input('name'))
    await submit('<b>hi</b>')
    expect(err().textContent).toBe('Letters, numbers, spaces and . _ \' - only')
    input('city').value = 'Lis<bon'
    await submit('Ana')
    expect(err().textContent).toBe('A city in letters, please')
    expect(input('city').getAttribute('aria-invalid')).toBe('true')
    expect(input('name').hasAttribute('aria-invalid')).toBe(false)
    expect(document.activeElement).toBe(input('city'))
    expect(mSave).not.toHaveBeenCalled()
  })
  it('the server’s filter: pick another name or city', async () => {
    await show(board({ at: 7 }))
    await submit('Ana', { ok: false, error: 'name' })
    expect(err().textContent).toBe('Pick another name')
    expect(input('name').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input('name'))
    expect($<HTMLButtonElement>('.sb-save').disabled).toBe(false)
    expect($('.sb-save').textContent).toBe('Save')
    await submit('Ana', { ok: false, error: 'city' })
    expect(err().textContent).toBe('Pick another city')
    expect(input('city').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input('city'))
  })
  it.each(['run', 'score'] as const)('a run that can’t go on the board (%s): Save stays disabled', async (error) => {
    await show(board({ at: 7 }))
    await submit('Ana', { ok: false, error })
    expect(err().textContent).toBe('This run can’t go on the board.')
    expect($<HTMLButtonElement>('.sb-save').disabled).toBe(true)
    expect($('.sb-save').textContent).toBe('Save')
  })
  it.each(['unavailable', 'rate_limited', 'bad_request'] as const)('the scoreboard is out (%s): try again', async (error) => {
    await show(board({ at: 7 }))
    await submit('Ana', { ok: false, error })
    expect(err().textContent).toBe('Couldn’t save: the scoreboard is out. Try again in a bit.')
    expect($<HTMLButtonElement>('.sb-save').disabled).toBe(false)
  })
  it('another tab saved a better run: the board under that best', async () => {
    await show(board({ at: 7 }))
    const mine = entry('Ana', 8000, 3, { me: true })
    await submit('Ana', { ok: false, error: 'not_best', board: board({ top: [...TEN.slice(0, 2), mine, ...TEN.slice(3)], mine, at: 7 }) })
    expect(dlg().querySelector('form')).toBeNull()
    expect(rankLine()).toBe('#7 of 413 · your best, 8,000, is #3')
  })
})

describe('a run under your best', () => {
  it('shows the board and your best where it ranks, with no form', async () => {
    const mine = entry('Ana', 8000, 3, { me: true })
    await show(board({ top: [...TEN.slice(0, 2), mine, ...TEN.slice(3)], mine, at: 7 }), { score: 6000 })
    expect(dlg().querySelector('form')).toBeNull()
    expect(rows()[2].classList.contains('sb-me')).toBe(true)
    expect(rows()[2].querySelector('.sb-tag')!.textContent).toBe('You')
    expect(rankLine()).toBe('#7 of 413 · your best, 8,000, is #3') // the run counts as one more entry, beside your best
    expect(live()).toBe('Game over. 6,000 points: number 7 of 413. Your best is number 3.')
    expect(document.activeElement).toBe($('.sb-h'))
  })
  it('a run lowest on the board still reads within the total', async () => {
    const mine = entry('Ana', 4200, 1, { me: true })
    await show(board({ top: [mine], total: 1, mine, at: 2 }), { score: 1500 })
    expect(rankLine()).toBe('#2 of 2 · your best, 4,200, is #1')
  })
  it('your best under the gap when it’s outside the top 10', async () => {
    const mine = entry('Ana', 2000, 1234, { country: 'PT' })
    await show(board({ mine, at: 2000 }), { score: 1000 })
    expect(rows()[10].textContent).toBe('· · ·')
    expect(nums()[11]).toBe('1,234')
    expect(rows()[11].classList.contains('sb-me')).toBe(true)
    expect(rows()[11].querySelector('.sb-from')!.textContent).toBe('Portugal')
    expect(rankLine()).toBe('#2,000 of 413 · your best, 2,000, is #1,234')
  })
})

describe('offline', () => {
  it('says so, keeps the best on this device, and tries again', async () => {
    localStorage.setItem('skill-blaster-best', '20000')
    await show(new Error('offline'), { score: 15000 })
    expect(rankLine()).toBe('')
    expect($('.sb-off').textContent).toContain('The scoreboard didn’t load.')
    expect($('.sb-off .sub').textContent).toBe('Your best, 20,000, is saved on this device.')
    expect(live()).toBe('The scoreboard didn’t load.')
    mFetch.mockResolvedValueOnce(board({ at: 7 }))
    $<HTMLButtonElement>('.sb-retry').click()
    expect(rows().every((li) => li.classList.contains('sb-ghost'))).toBe(true)
    expect(document.activeElement).toBe($('.sb-h'))
    await settle()
    expect(dlg().querySelector('form')).not.toBeNull()
    expect(mFetch).toHaveBeenCalledTimes(2)
  })
  it('the best is this run when it’s higher', async () => {
    localStorage.setItem('skill-blaster-best', '12000')
    await show(new Error('offline'), { score: 15000 })
    expect($('.sb-off .sub').textContent).toBe('Your best, 15,000, is saved on this device.')
  })
})

describe('no run ticket (the scoreboard was out when the run started)', () => {
  it('shows the run’s rank and score with the reason, in place of the form', async () => {
    await show(board({ at: 7 }), { ticket: Promise.resolve(null) })
    expect(dlg().querySelector('form, input')).toBeNull()
    const me = rows()[6]
    expect(me.classList.contains('sb-me')).toBe(true)
    expect(me.querySelector('.sb-n')!.textContent).toBe('7')
    expect(me.querySelector('.sb-pts')!.textContent).toBe('6,200')
    expect(me.querySelector('.sb-note')!.textContent).toBe('Can’t be saved: the scoreboard was out when this run started.')
  })
})

describe('user text', () => {
  it('goes in as text, never markup', async () => {
    const top = [entry('<b>x</b>', 9000, 1, { city: '<img src=x onerror=alert(1)>', country: 'PT' })]
    await show(board({ top, total: 1, at: 2 }))
    expect($('.sb-name').textContent).toBe('<b>x</b>')
    expect($('.sb-from').textContent).toBe('<img src=x onerror=alert(1)>, PT')
    expect(dlg().querySelector('.sb-list b, .sb-list img')).toBeNull()
  })
})

describe('closing', () => {
  it('✕ closes (animated), then onClose, and focus comes back', async () => {
    const shot = document.getElementById('shot')!
    shot.focus()
    await show(board({ at: 7 }))
    $<HTMLButtonElement>('.sb-x').click()
    const out = anims.at(-1)!
    expect(out.el).toBe(dlg())
    expect(out.o.duration).toBe(180)
    expect(dlg().open).toBe(true)
    out.a.onfinish!()
    expect(dlg().open).toBe(false)
    expect(sb.isOpen()).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(shot)
  })
  it('Esc: the native cancel closes it, and the key never reaches a window or document listener', async () => {
    const onWin = jest.fn(), onDoc = jest.fn()
    window.addEventListener('keydown', onWin)
    document.addEventListener('keydown', onDoc)
    await show(board({ at: 7 }))
    input('name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onWin).not.toHaveBeenCalled()
    expect(onDoc).not.toHaveBeenCalled()
    const cancel = new Event('cancel', { cancelable: true })
    dlg().dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(true) // closed our way, animated
    anims.at(-1)!.a.onfinish!()
    expect(onClose).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', onWin)
    document.removeEventListener('keydown', onDoc)
  })
  it('other keys still reach the page', async () => {
    const onWin = jest.fn()
    window.addEventListener('keydown', onWin)
    await show(board({ at: 7 }))
    input('name').dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(onWin).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', onWin)
  })
  /** a press (pointerdown) on `from`, then the click the browser fires on the common ancestor `on` */
  const pressThenClick = (from: Element, on: Element) => {
    from.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    on.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
  const closing = () => anims.some((x) => x.o?.duration === 180)
  it('a click on the backdrop closes; a click inside doesn’t', async () => {
    await show(board({ at: 7 }))
    pressThenClick($('.sb-h'), $('.sb-h'))
    pressThenClick($('.sb-in'), $('.sb-in'))
    expect(closing()).toBe(false)
    pressThenClick(dlg(), dlg())
    anims.at(-1)!.a.onfinish!()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('a drag that starts in the panel and ends on the backdrop doesn’t close it (the click lands on the dialog)', async () => {
    await show(board({ at: 7 }))
    pressThenClick(input('name'), dlg())
    expect(closing()).toBe(false)
    expect(sb.isOpen()).toBe(true)
  })
  it('on touch, a backdrop tap while a field has the keyboard up only puts it away; the next one closes', async () => {
    await show(board({ at: 7 }))
    input('name').focus()
    pressThenClick(dlg(), dlg())
    expect(closing()).toBe(false)
    input('name').blur()
    pressThenClick(dlg(), dlg())
    expect(closing()).toBe(true)
  })
  it('with a fine pointer, a backdrop click closes even while the name has focus', async () => {
    media.fine = true
    await show(board({ at: 7 }))
    expect(document.activeElement).toBe(input('name'))
    pressThenClick(dlg(), dlg())
    expect(closing()).toBe(true)
  })
  it('the browser closing it anyway (a second Esc) still ends it', async () => {
    await show(board({ at: 7 }))
    dlg().close()
    expect(sb.isOpen()).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('silently (a new game, stop, dispose): no onClose, no animation, and a late answer is dropped', async () => {
    let answer!: (b: Board) => void
    mFetch.mockReturnValueOnce(new Promise((r) => { answer = r }))
    sb.open(runOf())
    const d = dlg()
    sb.close(true)
    expect(d.open).toBe(false)
    expect(d.isConnected).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
    answer(board({ at: 7 }))
    await settle()
    expect(dlg().querySelector('form')).toBeNull()
  })
})

describe('focus once the board loads', () => {
  it('keyboard play: the name', async () => {
    await show(board({ at: 7 }), { kb: true })
    expect(document.activeElement).toBe(input('name'))
  })
  it('a fine pointer: the name', async () => {
    media.fine = true
    await show(board({ at: 7 }))
    expect(document.activeElement).toBe(input('name'))
  })
  it('touch: the heading keeps it (no keyboard pops up unasked)', async () => {
    await show(board({ at: 7 }))
    expect(document.activeElement).toBe($('.sb-h'))
  })
})

describe('the live region', () => {
  it('is the dialog’s own, not the section’s (inert under a modal)', async () => {
    await show(board({ at: 7 }))
    const own = $('.sb-live')
    expect(own.getAttribute('aria-live')).toBe('polite')
    expect(dlg().contains(own)).toBe(true)
    expect(document.querySelector('[data-sk-live]')!.textContent).toBe('')
  })
})

describe('motion', () => {
  it('opens with the panel rising, its parts and rows staggered', async () => {
    await show(board({ at: 7 }))
    const panel = anims.find((x) => x.el === dlg())!
    expect(panel.o).toMatchObject({ duration: 320 })
    const parts = anims.filter((x) => x.o?.delay !== undefined && x.o.duration === 300)
    expect(parts.map((x) => x.o.delay)).toEqual([120, 160, 200, 240, 280])
    const fades = anims.filter((x) => x.o?.duration === 240)
    expect(fades).toHaveLength(10)
    expect(fades[3].o.delay).toBe(54)
  })
  it('reduced motion: a 200 ms fade, no stagger, an instant close', async () => {
    media.reduce = true
    await show(board({ at: 7 }))
    expect(anims).toHaveLength(1)
    expect(anims[0]).toMatchObject({ o: { duration: 200 } })
    expect(dlg().classList.contains('sb-rm')).toBe(true)
    $<HTMLButtonElement>('.sb-x').click()
    expect(dlg().open).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(anims).toHaveLength(1)
  })
})
