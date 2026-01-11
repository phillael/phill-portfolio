import { Audiowide, Nunito } from 'next/font/google'
import '@/app/globals.css'
import Nav from '@/components/Nav'

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
    <html lang="en" className={`${audiowide.variable} ${nunito.variable}`}>
      <body className="font-body text-foreground custom-scrollbar">
        <Nav />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
