/**
 * afterLoadIdle (src/lib/after-load-idle.ts): a task for once the page has loaded and the browser is idle (warming a
 * chunk the visitor will likely need), skipped with Save-Data on, cancellable.
 */

import { afterLoadIdle } from '@/lib/after-load-idle'

/** the idle API, optional: Safari has none */
type W = { requestIdleCallback?: Window['requestIdleCallback']; cancelIdleCallback?: Window['cancelIdleCallback'] }
const w = window as unknown as W
const realRIC = w.requestIdleCallback
const realCIC = w.cancelIdleCallback

let idleCbs: (() => void)[] = []
let readyState: DocumentReadyState = 'complete'
let saveData: boolean | undefined

beforeAll(() => {
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState })
  Object.defineProperty(navigator, 'connection', { configurable: true, get: () => (saveData === undefined ? undefined : { saveData }) })
})
beforeEach(() => {
  jest.useFakeTimers()
  idleCbs = []
  readyState = 'complete'
  saveData = undefined
  w.requestIdleCallback = jest.fn((cb: IdleRequestCallback) => idleCbs.push(() => cb({} as IdleDeadline)) as number)
  w.cancelIdleCallback = jest.fn((id: number) => {
    idleCbs[id - 1] = () => {}
  })
})
afterEach(() => {
  jest.useRealTimers()
  w.requestIdleCallback = realRIC
  w.cancelIdleCallback = realCIC
})

const flushIdle = () => idleCbs.splice(0).forEach((f) => f())

describe('afterLoadIdle', () => {
  it('waits for the load event, then for an idle moment (2 s at most)', () => {
    readyState = 'loading'
    const task = jest.fn()
    afterLoadIdle(task)
    expect(w.requestIdleCallback).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    expect(w.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })
    expect(task).not.toHaveBeenCalled()
    flushIdle()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('goes straight to the idle wait when the page has already loaded', () => {
    const task = jest.fn()
    afterLoadIdle(task)
    flushIdle()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('falls back to a short timer after load where there is no requestIdleCallback (Safari)', () => {
    w.requestIdleCallback = undefined
    const task = jest.fn()
    afterLoadIdle(task)
    jest.advanceTimersByTime(499)
    expect(task).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('does nothing with Save-Data on', () => {
    saveData = true
    const task = jest.fn()
    afterLoadIdle(task)
    flushIdle()
    jest.runAllTimers()
    expect(w.requestIdleCallback).not.toHaveBeenCalled()
    expect(task).not.toHaveBeenCalled()
  })

  it('cancels: before the load event, and while waiting for idle', () => {
    readyState = 'loading'
    const early = jest.fn()
    afterLoadIdle(early)()
    window.dispatchEvent(new Event('load'))
    flushIdle()
    expect(early).not.toHaveBeenCalled()

    readyState = 'complete'
    const late = jest.fn()
    const cancel = afterLoadIdle(late)
    cancel()
    expect(w.cancelIdleCallback).toHaveBeenCalled()
    flushIdle()
    expect(late).not.toHaveBeenCalled()
  })
})
