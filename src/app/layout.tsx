import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Jimpitan QR - Aplikasi Pencatatan Jimpitan RT',
  description: 'Aplikasi pencatatan jimpitan RT berbasis QR Code untuk petugas rukun tetangga.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>
        <div className="app-container">
          {children}
          <Navigation />
        </div>
      </body>
    </html>
  )
}
