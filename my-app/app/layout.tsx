import type { Metadata } from 'next'
import { Barlow_Condensed, DM_Mono } from 'next/font/google'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SleeveMap — Cover every road.',
  description: 'Connect your Strava and see every road you\'ve ever covered — stitched together on a single living map. Cover the roads like a sleeve covers arms.',
  openGraph: {
    title: 'SleeveMap',
    description: 'Cover every road.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${dmMono.variable}`}>
      <body style={{ background: 'var(--sleeve-dark)' }}>{children}</body>
    </html>
  )
}