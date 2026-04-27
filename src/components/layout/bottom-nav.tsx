'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Inicio',     href: '/dashboard' },
  { label: 'Colección',  href: '/collections' },
  { label: 'Tienda',     href: '/store' },
  { label: 'Wallet',     href: '/wallet' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      background: 'rgba(250,247,242,0.96)',
      borderTop: '0.5px solid rgba(26,20,24,0.12)',
      padding: '10px 16px 26px',
      display: 'flex',
      justifyContent: 'space-around',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 50,
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
          || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          || (tab.href === '/collections' && pathname.startsWith('/album'))
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: active ? 'var(--ink)' : 'rgba(26,20,24,0.45)',
              borderBottom: active ? '1.5px solid var(--ink)' : '1.5px solid transparent',
              paddingBottom: '4px',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
