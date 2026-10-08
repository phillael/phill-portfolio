import { readFileSync } from 'fs'
import path from 'path'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import manifest from '@/app/manifest'
import { metadata, viewport } from '@/app/layout'
import { SITE_URL, BACKGROUND_COLOR } from '@/lib/site'

// The site background token from globals.css, as hex
function backgroundTokenHex(): string {
  const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const [, h, s, l] = css.match(/--background:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/)!.map(Number)
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

describe('SEO metadata files', () => {
  it('uses the site background token as the theme color', () => {
    expect(BACKGROUND_COLOR).toBe(backgroundTokenHex())
  })

  it('robots allows everything but /api/ and points at the sitemap', () => {
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/api/' },
      sitemap: `${SITE_URL}/sitemap.xml`,
    })
  })

  it('sitemap lists the single home URL', () => {
    const entries = sitemap()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ url: SITE_URL, changeFrequency: 'monthly' })
    expect(entries[0].lastModified).toBeInstanceOf(Date)
  })

  it('manifest names the site, uses the dark theme and existing icons', () => {
    const m = manifest()
    expect(m).toMatchObject({
      name: 'Phill Aelony | Phil Codes',
      short_name: 'Phil Codes',
      start_url: '/',
      display: 'standalone',
      theme_color: BACKGROUND_COLOR,
      background_color: BACKGROUND_COLOR,
    })
    expect(m.icons?.map((i) => i.src)).toEqual([
      '/android-chrome-192x192.png',
      '/android-chrome-512x512.png',
    ])
  })

  it('layout sets canonical and theme-color without touching title/description', () => {
    expect(metadata.alternates?.canonical).toBe('/')
    expect(viewport.themeColor).toBe(BACKGROUND_COLOR)
    expect(metadata.title).toBe('Phill Aelony | Legendary Code Sorcerer')
    expect(metadata.description).toBe(
      'Phill Aelony - Full Stack Developer, Musician, and Builder of Dreams. A cyberpunk developer portfolio showcasing skills, projects, and experience.',
    )
  })
})
