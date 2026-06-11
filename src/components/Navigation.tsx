'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, QrCode, History, Printer, UserPlus } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  if (pathname === '/login') {
    return null
  }

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
    },
    {
      label: 'Scan',
      icon: QrCode,
      href: '/scan',
    },
    {
      label: 'Tambah',
      icon: UserPlus,
      href: '/tambah',
    },
    {
      label: 'QR Code',
      icon: Printer,
      href: '/qrcode',
    },
    {
      label: 'Riwayat',
      icon: History,
      href: '/riwayat',
    },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 'var(--max-width)',
      height: '76px',
      background: 'rgba(18, 24, 41, 0.85)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 10px 10px 10px', // padding bottom extra untuk home indicator handphone
      zIndex: 100,
      boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.4)'
    }}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.75rem',
              fontWeight: isActive ? '600' : '500',
              flex: 1,
              height: '100%',
              transition: 'color var(--transition-fast)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '32px',
              borderRadius: '16px',
              background: isActive ? 'var(--accent-glow)' : 'transparent',
              transition: 'background var(--transition-fast)',
              marginBottom: '2px'
            }}>
              <Icon size={20} style={{
                strokeWidth: isActive ? 2.5 : 2,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)'
              }} />
            </div>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
