import { useRef, useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface HarnessProps {
  active: boolean
  useInitialRef?: boolean
  returnFocus?: boolean
}

const Harness = ({ active, useInitialRef = false, returnFocus }: HarnessProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialRef = useRef<HTMLButtonElement>(null)
  const [extra, setExtra] = useState(false)

  useFocusTrap(containerRef, active, {
    initialFocusRef: useInitialRef ? initialRef : undefined,
    returnFocus,
  })

  return (
    <>
      <button>outside</button>
      <div ref={containerRef}>
        <button>first</button>
        <button ref={initialRef}>middle</button>
        <button disabled>disabled</button>
        <button onClick={() => setExtra(true)}>last</button>
        {extra && <button>added</button>}
      </div>
    </>
  )
}

const btn = (name: string) => screen.getByRole('button', { name })

describe('useFocusTrap', () => {
  it('focuses the first focusable element on activation', () => {
    render(<Harness active />)
    expect(btn('first')).toHaveFocus()
  })

  it('focuses initialFocusRef on activation when given', () => {
    render(<Harness active useInitialRef />)
    expect(btn('middle')).toHaveFocus()
  })

  it('wraps Tab from the last element to the first', async () => {
    const user = userEvent.setup()
    render(<Harness active />)
    btn('last').focus()
    await user.tab()
    expect(btn('first')).toHaveFocus()
  })

  it('wraps Shift+Tab from the first element to the last', async () => {
    const user = userEvent.setup()
    render(<Harness active />)
    btn('first').focus()
    await user.tab({ shift: true })
    expect(btn('last')).toHaveFocus()
  })

  it('pulls focus back inside when Tab is pressed from outside', async () => {
    const user = userEvent.setup()
    render(<Harness active />)
    btn('outside').focus()
    await user.tab()
    expect(btn('first')).toHaveFocus()
  })

  it('picks up elements added after activation', async () => {
    const user = userEvent.setup()
    render(<Harness active />)
    fireEvent.click(btn('last'))
    btn('added').focus()
    await user.tab()
    expect(btn('first')).toHaveFocus()
  })

  it('restores focus to the previously focused element on deactivation', () => {
    const { rerender } = render(<Harness active={false} />)
    btn('outside').focus()
    rerender(<Harness active />)
    expect(btn('first')).toHaveFocus()
    rerender(<Harness active={false} />)
    expect(btn('outside')).toHaveFocus()
  })

  it('does not restore focus when returnFocus is false', () => {
    const { rerender } = render(<Harness active={false} returnFocus={false} />)
    btn('outside').focus()
    rerender(<Harness active returnFocus={false} />)
    rerender(<Harness active={false} returnFocus={false} />)
    expect(btn('outside')).not.toHaveFocus()
  })

  it('does nothing when inactive', async () => {
    const user = userEvent.setup()
    render(<Harness active={false} />)
    expect(document.body).toHaveFocus()
    btn('last').focus()
    await user.tab()
    expect(btn('last')).not.toHaveFocus()
    expect(btn('first')).not.toHaveFocus()
  })

  it('lets only the most recently activated trap handle Tab', async () => {
    const user = userEvent.setup()
    const Nested = () => {
      const outerRef = useRef<HTMLDivElement>(null)
      const innerRef = useRef<HTMLDivElement>(null)
      useFocusTrap(outerRef, true)
      useFocusTrap(innerRef, true)
      return (
        <>
          <div ref={outerRef}>
            <button>outer</button>
          </div>
          <div ref={innerRef}>
            <button>inner-a</button>
            <button>inner-b</button>
          </div>
        </>
      )
    }
    render(<Nested />)
    expect(btn('inner-a')).toHaveFocus()
    await user.tab()
    expect(btn('inner-b')).toHaveFocus()
    await user.tab()
    expect(btn('inner-a')).toHaveFocus()
  })
})
