'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Inicio',     href: '/dashboard' },
  { label: 'Colección',  href: '/collections' },
  { label: 'Tienda',     href: '/store' },
  { label: 'Wallet',     href: '/wallet' },
]

export function SideNav() {
  const pathname = usePathname()

  return (
    <nav className="dashboard-sidenav">
      <Link href="/dashboard" style={{ textDecoration: 'none', marginBottom: 48, display: 'block' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>
          Kwelps
        </div>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.4)', marginTop: 4 }}>
          Album
        </div>
      </Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {tabs.map(tab => {
          const active = pathname === tab.href
            || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
            || (tab.href === '/collections' && pathname.startsWith('/album'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: active ? 'var(--ink)' : 'rgba(26,20,24,0.45)',
                background: active ? 'rgba(26,20,24,0.05)' : 'transparent',
                borderLeft: active ? '2px solid var(--ink)' : '2px solid transparent',
                paddingLeft: 12,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: '0 2px 2px 0',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'color 0.15s, background 0.15s',
                display: 'block',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '0.5px solid rgba(26,20,24,0.08)' }}>
        <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.3)' }}>
          kwelps.app
        </div>
      </div>
    </nav>
  )
}
