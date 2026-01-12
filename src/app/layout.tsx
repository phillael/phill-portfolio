import { Audiowide, Nunito, Press_Start_2P } from 'next/font/google'
import '@/app/globals.css'
import Nav from '@/components/Nav'
import { MusicPlayer } from '@/components/music'

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
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className={`${audiowide.variable} ${nunito.variable} ${pressStart2P.variable}`}>
      <body className="font-body text-foreground custom-scrollbar">
        <Nav />
        {children}
        <MusicPlayer />
      </body>
    </html>
  )
}

export default RootLayout
