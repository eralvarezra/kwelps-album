'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setNeedsVerification(false)

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (loginError) {
        console.error('Login error:', loginError)

        // Manejar error de email no verificado
        if (loginError.message.includes('Email not confirmed') ||
            loginError.message.includes('email_not_confirmed')) {
          setNeedsVerification(true)
          setLoading(false)
          return
        }

        // Otros errores
        if (loginError.message.includes('Invalid login credentials')) {
          setError('Correo o contraseña incorrectos')
        } else if (loginError.message.includes('rate limit') || loginError.message.includes('Rate limit')) {
          setError('Has excedido el límite de intentos. Por favor espera unos minutos e intenta de nuevo.')
        } else {
          setError(loginError.message)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        console.log('Login successful for:', data.user.email)
        setSuccess(true)
        setLoading(false)

        // Wait a moment then redirect
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }

    } catch (err) {
      console.error('Exception:', err)
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError('Error al reenviar el correo. Intenta de nuevo.')
      } else {
        setNeedsVerification(false)
        setError(null)
        alert('Correo de verificación reenviado. Revisa tu bandeja de entrada.')
      }
    } catch {
      setError('Error al reenviar el correo')
    } finally {
      setResending(false)
    }
  }

  // Mostrar mensaje de verificación pendiente
  if (needsVerification) {
    return (
      <div className="space-y-4">
        <div className="px-4 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
          <p className="font-medium mb-2">Tu correo aún no está verificado</p>
          <p className="text-yellow-300/80">
            Revisa tu bandeja de entrada (y spam) para el correo de confirmación.
          </p>
        </div>
        <button
          onClick={handleResendVerification}
          disabled={resending}
          className="w-full py-3 px-4 rounded-xl bg-white/10 text-white font-medium border border-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          {resending ? 'Enviando...' : 'Reenviar correo de verificación'}
        </button>
        <button
          onClick={() => setNeedsVerification(false)}
          className="w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          Volver al login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
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
          autoComplete="email"
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
          autoComplete="current-password"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-sm">
          ¡Inicio de sesión exitoso! Redirigiendo...
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}