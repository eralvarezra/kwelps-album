'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  email: string
}

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ email: user.email ?? '' })
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="glass-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-white">Kwelps</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-white hover:text-purple-400 transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/album"
              className="text-sm text-white hover:text-purple-400 transition-colors"
            >
              Álbum
            </Link>
            <Link
              href="/store"
              className="text-sm text-white hover:text-purple-400 transition-colors"
            >
              Tienda
            </Link>
            <Link
              href="/wallet"
              className="text-sm text-white hover:text-purple-400 transition-colors"
            >
              Wallet
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Buy Pack Button */}
            <Link
              href="/store"
              className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>Comprar Pack</span>
            </Link>

            {/* User Menu - Desktop */}
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white max-w-[120px] truncate">
                    {user.email}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-white hover:bg-white/5 transition-colors"
                  aria-label="Logout"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white hover:bg-white/5 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 py-3">
            <div className="flex flex-col gap-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-colors"
              >
                Inicio
              </Link>
              <Link
                href="/album"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-colors"
              >
                Álbum
              </Link>
              <Link
                href="/store"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-colors"
              >
                Tienda
              </Link>
              <Link
                href="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-colors"
              >
                Wallet
              </Link>

              {/* Mobile Buy Pack */}
              <Link
                href="/store"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 mx-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span>Comprar Pack</span>
              </Link>

              {/* Mobile User Info */}
              {user && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-white truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-left text-white hover:bg-white/5 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}