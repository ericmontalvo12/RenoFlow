import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TurnManager — Property Turn Tracker',
  description: 'Track apartment remodel stages, contractor assignments, and delivery coordination.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
