import type { MetadataRoute } from 'next'
import { BACKGROUND_COLOR } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Phill Aelony | Phil Codes',
    short_name: 'Phil Codes',
    start_url: '/',
    display: 'standalone',
    theme_color: BACKGROUND_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
