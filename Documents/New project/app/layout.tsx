import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { NavGuard } from '@/components/NavGuard'
import { PageTransition } from '@/components/PageTransition'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Reality UI',
  description: 'A mental operating system for clearer perception.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Reality UI',
  },
}

export const viewport: Viewport = {
  themeColor: '#050509',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <PageTransition>
          {children}
        </PageTransition>
        <NavGuard />
      </body>
    </html>
  )
}
