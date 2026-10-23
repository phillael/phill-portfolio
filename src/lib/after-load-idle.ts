/**
 * Runs `task` once the page has loaded and the browser is idle (within 2 s of the load either way): for warming a
 * chunk the visitor will likely need, so its evaluation lands in idle time instead of in the middle of a scroll.
 * Skipped with Save-Data on. Safari has no requestIdleCallback: there, half a second after the load. Returns a cancel.
 */
export function afterLoadIdle(task: () => void): () => void {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  if (saveData) return () => {}
  let done = false
  let idleId: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = () => {
    if (done) return
    done = true
    task()
  }
  const whenIdle = () => {
    if (done) return
    if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(run, { timeout: 2000 })
    else timer = setTimeout(run, 500)
  }
  if (document.readyState === 'complete') whenIdle()
  else window.addEventListener('load', whenIdle, { once: true })
  return () => {
    done = true
    window.removeEventListener('load', whenIdle)
    if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
    if (timer !== undefined) clearTimeout(timer)
  }
}
