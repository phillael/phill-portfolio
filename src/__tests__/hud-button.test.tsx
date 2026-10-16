/**
 * HudButton: the Experience section's glass HUD buttons (Open the 3D resume, Download the
 * PDF, Listen). A link when it has an href, a button otherwise; its effects are decoration.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import HudButton from '@/components/experience/HudButton'

describe('HudButton', () => {
  it('is a link when it has an href, named by its label', () => {
    render(
      <HudButton variant="primary" icon="cube" href="/resume">
        Open the 3D resume
      </HudButton>,
    )
    const link = screen.getByRole('link', { name: 'Open the 3D resume' })
    expect(link).toHaveAttribute('href', '/resume')
    expect(link).not.toHaveAttribute('download')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('downloads when asked', () => {
    render(
      <HudButton variant="secondary" icon="download" href="/Phill_Aelony_Resume.pdf" download>
        Download the PDF
      </HudButton>,
    )
    expect(screen.getByRole('link', { name: 'Download the PDF' })).toHaveAttribute('download')
  })

  it('is a button without an href, and its aria-label names it', async () => {
    const onClick = jest.fn()
    render(
      <HudButton variant="music" icon="headphones" ariaLabel="Listen: open the music player" onClick={onClick}>
        Listen
      </HudButton>,
    )
    const button = screen.getByRole('button', { name: 'Listen: open the music player' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveTextContent('Listen')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('works from the keyboard', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    render(
      <HudButton variant="music" icon="headphones" onClick={onClick}>
        Listen
      </HudButton>,
    )
    await user.tab()
    expect(screen.getByRole('button', { name: 'Listen' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('passes hover and focus handlers through to the link', async () => {
    const user = userEvent.setup()
    const onPointerEnter = jest.fn()
    const onFocus = jest.fn()
    const onClick = jest.fn((e: React.MouseEvent) => e.preventDefault())
    render(
      <HudButton variant="primary" icon="cube" href="/resume" onPointerEnter={onPointerEnter} onFocus={onFocus} onClick={onClick}>
        Open the 3D resume
      </HudButton>,
    )
    const link = screen.getByRole('link', { name: 'Open the 3D resume' })
    await user.hover(link)
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onPointerEnter).toHaveBeenCalled()
    expect(onFocus).toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('hides its decoration from assistive tech', async () => {
    const { container } = render(
      <>
        <HudButton variant="primary" icon="cube" href="/resume">
          Open the 3D resume
        </HudButton>
        <HudButton variant="secondary" icon="download" href="/x.pdf" download>
          Download the PDF
        </HudButton>
        <HudButton variant="music" icon="headphones" ariaLabel="Listen: open the music player">
          Listen
        </HudButton>
      </>,
    )
    // every svg and effect layer sits inside an aria-hidden wrapper
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(container.querySelectorAll('a > :not([aria-hidden="true"])')).toHaveLength(2) // the labels
    expect(container.querySelectorAll('button > :not([aria-hidden="true"])')).toHaveLength(1)
    expect(await axe(container)).toHaveNoViolations()
  })
})
