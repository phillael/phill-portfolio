/**
 * The Experience section (mockup E2, docs/design/experience-refresh/round2/e2-hud.html),
 * rendered from src/data/career.ts: the headline, the titles ladder, TimelyCare's four
 * tiles, the earlier stops, music with Listen, and the two HUD buttons.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import ExperienceSection from '@/components/ExperienceSection'
import { career } from '@/data/career'
import { RESUME_PDF } from '@/data/resume'
import { registerSiteMusic } from '@/lib/site-music'

const openResume = jest.fn()
const prefetchResume = jest.fn()
jest.mock('@/components/jelly/resumeTrigger', () => ({
  openResume: (...a: unknown[]) => openResume(...a),
  prefetchResume: () => prefetchResume(),
}))

beforeEach(() => {
  openResume.mockClear()
  prefetchResume.mockClear()
})

describe('ExperienceSection', () => {
  it('is the #experience region, headed "Experience", with the headline and lede', () => {
    render(<ExperienceSection />)
    const section = screen.getByRole('region', { name: 'Experience' })
    expect(section).toHaveAttribute('id', 'experience')
    expect(screen.getByRole('heading', { level: 2, name: 'Experience' })).toHaveAttribute('id', 'experience-heading')
    expect(within(section).getByText('Senior AI Engineer')).toHaveClass('neon-text-purple')
    expect(within(section).getByText(career.intro)).toBeInTheDocument()
  })

  it('shows TimelyCare first, now, with its three titles newest first', () => {
    render(<ExperienceSection />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'TimelyCare',
      'Sessions',
      'Designit for Microsoft',
      'phillcodes.com',
      'Guitarist & Composer',
    ])
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('Virtual health for colleges and universities')).toBeInTheDocument()

    const ladder = screen.getByRole('list', { name: 'Titles at TimelyCare, newest first' })
    expect(within(ladder).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Promoted · Apr 2026Generative AI Engineer (current title)',
      'Promoted · Apr 2025Senior Software Engineer II',
      'Joined · Feb 2023Software Engineer',
    ])
  })

  it('says under the titles that the job is product management too (Phill, 2026-10-16)', () => {
    render(<ExperienceSection />)
    const line = screen.getByText(/^I'm the product manager on what I build, not just the engineer:/)
    expect(line).toHaveTextContent(
      "I'm the product manager on what I build, not just the engineer: I scope each platform with Finance, Care Operations and Marketing, design it, work it through legal and HIPAA review, learn what our clinicians and therapists need, ship it, and tell the company what changed.",
    )
    const ladder = screen.getByRole('list', { name: 'Titles at TimelyCare, newest first' })
    const firstTile = screen.getByRole('button', { name: career.jobs[0].tiles[0].title })
    // after the titles, before the tiles
    expect(ladder.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(line.compareDocumentPosition(firstTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('adds a quiet line of AI-native throughput after it (Phill, 2026-10-16)', () => {
    render(<ExperienceSection />)
    const stat = screen.getByText('Past year: 251 PRs merged and 392 reviewed, up to 46 a month.')
    const line = screen.getByText(/^I'm the product manager on what I build/)
    expect(line.nextElementSibling).toBe(stat)
  })

  it('has the four tiles with their numbers', () => {
    render(<ExperienceSection />)
    for (const tile of career.jobs[0].tiles) {
      const button = screen.getByRole('button', { name: tile.title })
      expect(button).toHaveAccessibleDescription(new RegExp(`^${tile.metric.replace(/[.*+?^${}()|[\]\\~]/g, '\\$&')} ${tile.metricLabel}`))
    }
    expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(4)
    expect(screen.getByText('cut post-release bugs 50%').tagName).toBe('STRONG')
  })

  it('shows each earlier job with its title, dates and one line', () => {
    render(<ExperienceSection />)
    for (const job of career.jobs.slice(1)) {
      const stop = screen.getByRole('heading', { level: 3, name: job.company }).closest('li')!
      expect(within(stop).getByText(job.roles[0].title)).toBeInTheDocument()
      expect(within(stop).getByText(job.dates)).toBeInTheDocument()
      expect(within(stop).getByText(job.line!)).toBeInTheDocument()
      expect(stop).toHaveTextContent(job.stack.join('·'))
    }
    // the web basics on the two front-end jobs (Phill, 2026-10-16)
    for (const company of ['Designit for Microsoft', 'phillcodes.com']) {
      expect(career.jobs.find((j) => j.company === company)!.stack).toEqual(expect.arrayContaining(['JavaScript', 'HTML', 'CSS']))
    }
    const music = screen.getByRole('heading', { level: 3, name: 'Guitarist & Composer' }).closest('li')!
    expect(within(music).getByText(career.music.dates)).toBeInTheDocument()
    expect(within(music).getByText(career.music.education)).toBeInTheDocument()
    expect(within(music).getByText('#1 iTunes jazz album').tagName).toBe('STRONG')
  })

  it("Listen opens the site's music player", async () => {
    const open = jest.fn()
    registerSiteMusic({ getSource: () => null, isPlaying: () => false, toggle: () => {}, open })
    render(<ExperienceSection />)
    const listen = screen.getByRole('button', { name: 'Listen: open the music player' })
    expect(listen).toHaveTextContent('Listen')
    await userEvent.click(listen)
    expect(open).toHaveBeenCalledTimes(1)
    registerSiteMusic(null)
  })

  it('links the 3D resume (opened in place) and the PDF', async () => {
    const user = userEvent.setup()
    render(<ExperienceSection />)
    const open3d = screen.getByRole('link', { name: 'Open the 3D resume' })
    expect(open3d).toHaveAttribute('href', '/resume')
    const pdf = screen.getByRole('link', { name: 'Download the PDF' })
    expect(pdf).toHaveAttribute('href', RESUME_PDF)
    expect(pdf).toHaveAttribute('download')

    await user.hover(open3d)
    expect(prefetchResume).toHaveBeenCalled()
    await user.click(open3d)
    expect(openResume).toHaveBeenCalledWith({ origin: expect.objectContaining({ x: expect.any(Number) }), tint: 0, opener: open3d }, null)

    // from the keyboard: the dissolve starts from the photo's center
    open3d.focus()
    await user.keyboard('{Enter}')
    expect(openResume).toHaveBeenLastCalledWith({ origin: null, tint: 0, opener: open3d }, null)
  })

  it('leaves modified clicks to the browser (new tab, new window)', async () => {
    const user = userEvent.setup()
    render(<ExperienceSection />)
    const open3d = screen.getByRole('link', { name: 'Open the 3D resume' })
    open3d.addEventListener('click', (e) => e.preventDefault()) // jsdom can't navigate
    await user.keyboard('{Meta>}')
    await user.click(open3d)
    await user.keyboard('{/Meta}')
    expect(openResume).not.toHaveBeenCalled()
  })

  it('has no axe violations', async () => {
    const { container } = render(<ExperienceSection />)
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
