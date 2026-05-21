import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TaxiBase',
  description: 'White-label taxi dispatch platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
