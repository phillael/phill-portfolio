import { Audiowide, Nunito, Press_Start_2P } from 'next/font/google'
import '@/app/globals.css'
import Nav from '@/components/Nav'
import { MusicPlayer } from '@/components/music'
import ScreenShakeWrapper from '@/components/ScreenShakeWrapper'
import ShroomMode from '@/components/ShroomMode'
import { ShroomModeProvider } from '@/context/ShroomModeContext'

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
})

const nunito = Nunito({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-nunito',
})

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

export const metadata = {
  metadataBase: new URL('https://www.phillcodes.com'),
  title: 'Phill Aelony | Legendary Code Sorcerer',
  description:
    'Phill Aelony - Full Stack Developer, Musician, and Builder of Dreams. A cyberpunk developer portfolio showcasing skills, projects, and experience.',
  keywords: [
    'Phill Aelony',
    'Full Stack Developer',
    'React',
    'Next.js',
    'TypeScript',
    'Portfolio',
    'Software Engineer',
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
    description: 'Full Stack Developer, Musician, and Builder of Dreams. Vanquisher of Bugs.',
    url: 'https://www.phillcodes.com',
    siteName: 'Phill Aelony Portfolio',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 1200,
        alt: 'Phill Aelony - Software Engineer in cyberpunk Tokyo with llamas',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phill Aelony | Legendary Code Sorcerer',
    description: 'Full Stack Developer, Musician, and Builder of Dreams. Vanquisher of Bugs.',
    images: ['/images/og-image.jpg'],
  },
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className={`${audiowide.variable} ${nunito.variable} ${pressStart2P.variable}`}>
      <body className="font-body text-foreground custom-scrollbar">
        <ShroomModeProvider>
          {/* Main content wrapper - shroom filter applies here, not body */}
          <div id="shroom-target">
            <Nav />
            <ScreenShakeWrapper>
              {children}
            </ScreenShakeWrapper>
          </div>
          {/* These stay outside the filter */}
          <MusicPlayer />
          <ShroomMode />
        </ShroomModeProvider>
      </body>
    </html>
  )
}

export default RootLayout
