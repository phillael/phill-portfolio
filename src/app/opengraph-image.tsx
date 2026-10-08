import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Rendered once at build time from existing brand assets (hero art, Audiowide,
// the neon tokens in globals.css), so the card can't drift from the site.
export const alt = 'Phill Aelony - Software Engineer in cyberpunk Tokyo with llamas'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// globals.css tokens (saturation above 100% clamps, as in the browser)
const BACKGROUND = 'hsl(220, 20%, 3%)'
const BACKGROUND_END = 'hsl(180, 45%, 10%)'
const PRIMARY = 'hsl(190, 100%, 75%)'
const SECONDARY = 'hsl(280, 100%, 85%)'
const ACCENT = 'hsl(130, 100%, 50%)'

const audiowide = readFile(
  join(process.cwd(), 'node_modules/@fontsource/audiowide/files/audiowide-latin-400-normal.woff'),
)
const heroArt = readFile(join(process.cwd(), 'public/images/hero-image-phill-llamas.png'), 'base64')

const TAGLINE = [
  { text: 'Legendary Code Sorcerer', color: ACCENT },
  { text: 'Vanquisher of Bugs', color: SECONDARY },
  { text: 'Builder of Dreams', color: PRIMARY },
]

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${BACKGROUND} 40%, ${BACKGROUND_END})`,
          fontFamily: 'Audiowide',
        }}
      >
        <img
          src={`data:image/png;base64,${await heroArt}`}
          width={630}
          height={630}
          alt=""
          style={{ flexShrink: 0 }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 56,
            paddingRight: 48,
          }}
        >
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              color: PRIMARY,
              textShadow: `0 0 12px ${PRIMARY}, 0 0 28px hsl(190, 100%, 50%)`,
              marginBottom: 36,
            }}
          >
            Phill Aelony
          </div>
          {TAGLINE.map(({ text, color }) => (
            <div
              key={text}
              style={{
                fontSize: 31,
                lineHeight: 1.5,
                color,
                textShadow: `0 0 10px ${color}`,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Audiowide', data: await audiowide, style: 'normal', weight: 400 }] },
  )
}
