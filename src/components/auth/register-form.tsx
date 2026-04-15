'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        // Manejar errores específicos
        if (signUpError.message.includes('already registered')) {
          setError('Este correo ya está registrado. Intenta iniciar sesión.')
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // Verificar si necesita confirmación de email
      if (data.user && !data.session) {
        // Usuario creado pero necesita confirmar email
        setEmailSent(true)
        setLoading(false)
        return
      }

      // Si hay sesión (confirmación deshabilitada), crear usuario en BD
      if (data.user && data.session) {
        await fetch('/api/user/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email: data.user.email,
          }),
        })
        router.push('/dashboard')
        router.refresh()
      }

    } catch (err) {
      setError('Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar mensaje de confirmación de email
  if (emailSent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Revisa tu correo</h3>
        <p className="text-gray-400">
          Hemos enviado un enlace de confirmación a <span className="text-purple-400">{email}</span>
        </p>
        <p className="text-sm text-gray-500">
          El enlace expirará en 24 horas. Revisa también tu carpeta de spam.
        </p>
        <button
          onClick={() => setEmailSent(false)}
          className="text-sm text-purple-400 hover:text-purple-300 underline"
        >
          ¿No recibiste el correo? Intenta de nuevo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
          placeholder="tu@ejemplo.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
          Confirmar Contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}