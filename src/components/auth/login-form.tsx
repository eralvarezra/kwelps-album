'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px',
  border: '0.5px solid rgba(26,20,24,0.2)', borderRadius: 2,
  background: 'transparent', outline: 'none',
  fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 8, fontWeight: 700,
  letterSpacing: '0.25em', textTransform: 'uppercase',
  color: 'rgba(26,20,24,0.6)', marginBottom: 5,
}

export function LoginForm() {
  const [email, setEmail]                       = useState('')
  const [password, setPassword]                 = useState('')
  const [error, setError]                       = useState<string | null>(null)
  const [loading, setLoading]                   = useState(false)
  const [success, setSuccess]                   = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending]               = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(false); setNeedsVerification(false)
    if (!email || !password) { setError('Por favor completa todos los campos'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      })
      if (loginError) {
        if (loginError.message.includes('Email not confirmed') || loginError.message.includes('email_not_confirmed')) {
          setNeedsVerification(true); setLoading(false); return
        }
        if (loginError.message.includes('Invalid login credentials')) setError('Correo o contraseña incorrectos')
        else if (loginError.message.toLowerCase().includes('rate limit')) setError('Demasiados intentos. Espera unos minutos.')
        else setError(loginError.message)
        setLoading(false); return
      }
      if (data.user) {
        setSuccess(true); setLoading(false)
        setTimeout(() => { window.location.href = '/dashboard' }, 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true); setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup', email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError('Error al reenviar el correo.')
      else { setNeedsVerification(false); alert('Correo de verificación reenviado. Revisa tu bandeja de entrada.') }
    } catch { setError('Error al reenviar el correo') }
    finally { setResending(false) }
  }

  if (needsVerification) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '10px 12px', background: 'rgba(138,47,59,0.08)', border: '0.5px solid rgba(138,47,59,0.3)', borderRadius: 2, fontSize: 10, color: 'var(--wine)', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Tu correo aún no está verificado</div>
          Revisa tu bandeja de entrada y la carpeta de spam.
        </div>
        <button
          onClick={handleResendVerification} disabled={resending}
          style={{ padding: '12px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.5 : 1, fontFamily: 'var(--font-body)' }}
        >
          {resending ? 'Enviando...' : 'Reenviar verificación'}
        </button>
        <button
          onClick={() => setNeedsVerification(false)}
          style={{ padding: '10px', background: 'transparent', color: 'rgba(26,20,24,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Volver al login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Correo electrónico</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="tu@ejemplo.com" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" style={inputStyle} />
      </div>

      {error && (
        <div style={{ padding: '8px 10px', background: 'rgba(138,47,59,0.08)', border: '0.5px solid rgba(138,47,59,0.3)', borderRadius: 2, fontSize: 10, color: 'var(--wine)', lineHeight: 1.4 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '8px 10px', background: 'rgba(26,20,24,0.06)', borderRadius: 2, fontSize: 10, color: 'var(--ink)', lineHeight: 1.4 }}>
          ¡Sesión iniciada! Redirigiendo...
        </div>
      )}

      <button
        type="submit" disabled={loading}
        style={{ padding: '13px', background: loading ? 'rgba(26,20,24,0.15)' : 'var(--rose)', color: loading ? 'rgba(26,20,24,0.4)' : 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
