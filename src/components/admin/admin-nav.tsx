'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  Images,
  Users,
  ArrowLeft,
  BarChart3,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/admin/collections', label: 'Collections', icon: FolderOpen },
  { href: '/admin/photos', label: 'Photos', icon: Images },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AdminNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold">K</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin</h1>
              <p className="text-xs text-gray-500">Kwelps Album</p>
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <nav
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 min-h-screen glass-dark border-r border-white/5 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo - Hidden on mobile (shown in header) */}
        <div className="hidden lg:flex p-4 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold">K</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin</h1>
              <p className="text-xs text-gray-500">Kwelps Album</p>
            </div>
          </Link>
        </div>

        {/* Mobile Header Spacer */}
        <div className="lg:hidden h-16 border-b border-white/5" />

        {/* Navigation */}
        <ul className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Back to App */}
        <div className="p-3 border-t border-white/5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Back to App</span>
          </Link>
        </div>
      </nav>
    </>
  )
}