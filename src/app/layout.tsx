import type { Metadata, Viewport } from 'next'
import { Audiowide, Nunito, Press_Start_2P } from 'next/font/google'
import '@/app/globals.css'
import Nav from '@/components/Nav'
import { MusicPlayer } from '@/components/music'
import ScreenShakeWrapper from '@/components/ScreenShakeWrapper'
import ShroomMode from '@/components/ShroomMode'
import JellyResumeHost from '@/components/jelly/JellyResumeHost'
import MotionProvider from '@/components/MotionProvider'
import SkipLink from '@/components/SkipLink'
import { ShroomModeProvider } from '@/context/ShroomModeContext'
import { SITE_URL, BACKGROUND_COLOR } from '@/lib/site'

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
})

const nunito = Nunito({
  weight: ['300', '400', '500', '600', '700', '800'], // one variable file: extra weights cost no bytes
  subsets: ['latin'],
  variable: '--font-nunito',
})

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  themeColor: BACKGROUND_COLOR,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  title: 'Phill Aelony | Legendary Code Sorcerer',
  description:
    'Phill Aelony - Senior AI Engineer, Musician, and Builder of Dreams. A cyberpunk developer portfolio showcasing skills, projects, and experience.',
  keywords: [
    'Phill Aelony',
    'Senior AI Engineer',
    'Generative AI Engineer',
    'Full-stack',
    'React',
    'Next.js',
    'TypeScript',
    'Portfolio',
  ],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Phill Aelony | Legendary Code Sorcerer',
    description: 'Senior AI Engineer, Musician, and Builder of Dreams. Vanquisher of Bugs.',
    url: SITE_URL,
    siteName: 'Phill Aelony Portfolio',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phill Aelony | Legendary Code Sorcerer',
    description: 'Senior AI Engineer, Musician, and Builder of Dreams. Vanquisher of Bugs.',
  },
}

const RootLayout = ({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) => {
  return (
    <html lang="en" className={`${audiowide.variable} ${nunito.variable} ${pressStart2P.variable}`}>
      <body className="font-body text-foreground custom-scrollbar">
        <SkipLink />
        <MotionProvider>
          <ShroomModeProvider>
            {/* Main content wrapper - shroom filter applies here, not body */}
            {/* Hue cycle runs on the outer wrapper, the SVG warp on the inner one */}
            <div id="shroom-target">
              <div id="shroom-warp">
                <Nav />
                <ScreenShakeWrapper>
                  {children}
                </ScreenShakeWrapper>
              </div>
            </div>
            {/* These stay outside the filter */}
            {/* The 3D resume: over the page and the Nav, under the music player (DOM order at z-50) */}
            <JellyResumeHost />
            {modal}
            <MusicPlayer />
            {/* (a plain wrapper, no filter or transform: the 3D resume makes it inert while it's open) */}
            <div id="shroom-ui">
              <ShroomMode />
            </div>
          </ShroomModeProvider>
        </MotionProvider>
      </body>
    </html>
  )
}

export default RootLayout
