/**
 * The semantic /resume page: the accessible, SEO and reduced-motion version
 * of the 3D resume. Server-rendered from src/data/resume.ts.
 */

import { readFileSync } from 'fs'
import path from 'path'
import { render, screen, within } from '@testing-library/react'
import { axe } from 'jest-axe'
import ResumePage, { metadata } from '@/app/resume/page'
import { resume, richText } from '@/data/resume'
import { socials } from '@/data/socials'
import { SITE_URL } from '@/lib/site'

// The 3D canvas over the page has its own test (jelly-resume-canvas.test.tsx); jsdom has no WebGL
jest.mock('@/components/jelly/JellyResumeDirect', () => ({ __esModule: true, default: () => null }))

// The public site never shows Phill's phone number or email (the repo is public)
const PHONE = /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+|mailto:|tel:/

describe('richText', () => {
  it('splits **bold** runs out of plain text', () => {
    expect(richText('a **b c** d **e**')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b c', bold: true },
      { text: ' d ', bold: false },
      { text: 'e', bold: true },
    ])
  })

  it('returns plain text as one run', () => {
    expect(richText('plain')).toEqual([{ text: 'plain', bold: false }])
  })
})

describe('resume data', () => {
  it('has no phone number or email, in the data or its source file', () => {
    expect(JSON.stringify(resume)).not.toMatch(PHONE)
    expect(JSON.stringify(resume)).not.toMatch(EMAIL)
    const source = readFileSync(path.join(process.cwd(), 'src/data/resume.ts'), 'utf8')
    expect(source).not.toMatch(PHONE)
    expect(source).not.toMatch(EMAIL)
  })

  it('matches the snapshot the 3D page is drawn from (Rezmancer AI Engineer variant)', () => {
    const snapshot = JSON.parse(
      readFileSync(path.join(process.cwd(), 'public/resume/snapshot.json'), 'utf8'),
    ) as { words: { t: string }[] }
    // compared without whitespace: the snapshot splits words at bold edges ("agent-operable" ".")
    const squash = (s: string) => s.replace(/\*\*|\s+/g, '')
    const snapshotText = squash(snapshot.words.map((w) => w.t).join(''))
    const texts = [
      resume.summary,
      ...resume.projects.map((p) => [p.name, p.blurb, p.link?.label].filter(Boolean).join(' · ')),
      ...resume.experience.flatMap((job) => job.bullets.map((b) => b.text)),
      ...resume.projects.map((p) => p.text),
      ...[...resume.earlier, resume.music].flatMap((e) => (e.text ? [e.text] : [])),
    ]
    for (const text of texts) expect(snapshotText).toContain(squash(text))
  })
})

describe('/resume page', () => {
  it('renders the resume as headings, lists and links', () => {
    render(<ResumePage />)

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('heading', { level: 1, name: 'Phill Aelony' })).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Skills', 'Experience', 'Selected projects', 'Earlier experience', 'Education'])
    expect(screen.getByRole('heading', { level: 3, name: 'TimelyCare' })).toBeInTheDocument()

    const experience = screen.getByRole('region', { name: 'Experience' })
    const highlights = within(experience).getByRole('list', { name: 'Highlights at TimelyCare' })
    expect(within(highlights).getAllByRole('listitem')).toHaveLength(resume.experience[0].bullets.length)
    // **bold** in the data renders as <strong>
    expect(within(experience).getByText('never sent a message').tagName).toBe('STRONG')
  })

  it('offers the PDF download and a way back home', () => {
    render(<ResumePage />)

    const pdf = screen.getByRole('link', { name: /download pdf/i })
    expect(pdf).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')
    expect(pdf).toHaveAttribute('download')
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  it('links LinkedIn and GitHub but shows no phone or email', () => {
    const { container } = render(<ResumePage />)

    expect(screen.getByRole('link', { name: 'linkedin.com/in/phill-aelony' })).toHaveAttribute(
      'href',
      socials.linkedin,
    )
    expect(screen.getByRole('link', { name: 'github.com/phillael' })).toHaveAttribute(
      'href',
      socials.github,
    )
    expect(container.innerHTML).not.toMatch(PHONE)
    expect(container.innerHTML).not.toMatch(EMAIL)
  })

  it('has no axe violations', async () => {
    const { container } = render(<ResumePage />)
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results).toHaveNoViolations()
  })

  it('has its own title, description, canonical URL and Open Graph', () => {
    expect(metadata.title).toBe('Phill Aelony | Resume')
    expect(metadata.description).toMatch(/Senior AI Engineer/)
    expect(metadata.alternates?.canonical).toBe('/resume')
    expect(metadata.openGraph).toMatchObject({
      url: `${SITE_URL}/resume`,
      title: 'Phill Aelony | Resume',
      // the page's openGraph replaces the layout's, so the share card must be named again
      images: [expect.objectContaining({ url: '/opengraph-image', width: 1200, height: 630 })],
    })
    expect(metadata.twitter).toMatchObject({ images: [expect.objectContaining({ url: '/twitter-image' })] })
  })
})
