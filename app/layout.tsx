import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coloring Book Grid Maker',
  description: 'Combine coloring pages into a printable grid PDF',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
