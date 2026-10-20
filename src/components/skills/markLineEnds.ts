/**
 * The dots between a group's words never end a line: the last word on each visual line gets `data-eol`
 * (its dot hides). Layout reads, so it runs on render and resize only, never inside a frame.
 */
export function markLineEnds(root: ParentNode) {
  root.querySelectorAll('[data-words]').forEach((ul) => {
    const items = [...ul.children] as HTMLElement[]
    items.forEach((li, i) => {
      const next = items[i + 1]
      li.toggleAttribute('data-eol', !!next && next.offsetTop > li.offsetTop + 4)
    })
  })
}
