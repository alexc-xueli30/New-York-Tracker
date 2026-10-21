import type { Metadata } from 'next'
import { Press_Start_2P, IBM_Plex_Mono, Inter, Bangers } from 'next/font/google'
import './globals.css'

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
})

const bangers = Bangers({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bangers',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-mono',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NYC Fix Tracker',
  description: 'Track the most critical NYC infrastructure issues being fixed — powered by 311 data.',
  openGraph: {
    title: 'NYC Fix Tracker',
    description: 'AI-curated NYC infrastructure sightings with live community voting.',
    siteName: 'NYC Fix Tracker',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart2P.variable} ${bangers.variable} ${ibmPlexMono.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
