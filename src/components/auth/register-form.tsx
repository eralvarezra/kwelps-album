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

export function RegisterForm() {
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                   = useState<string | null>(null)
  const [loading, setLoading]               = useState(false)
  const [emailSent, setEmailSent]           = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (signUpError) {
        if (signUpError.message.includes('already registered')) setError('Este correo ya está registrado. Intenta iniciar sesión.')
        else if (signUpError.message.toLowerCase().includes('rate limit')) setError('Demasiados intentos. Espera unos minutos.')
        else if (signUpError.message.toLowerCase().includes('email')) setError('No se pudo enviar el correo de confirmación. Intenta de nuevo en unos minutos.')
        else setError(signUpError.message)
        setLoading(false); return
      }
      if (data.user && !data.session) { setEmailSent(true); setLoading(false); return }
      if (data.user && data.session) {
        await fetch('/api/user/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.user.id, email: data.user.email }),
        })
        router.push('/dashboard'); router.refresh()
      }
    } catch { setError('Error al crear la cuenta') }
    finally { setLoading(false) }
  }

  if (emailSent) {
    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em' }}>
          Revisa tu correo
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,20,24,0.65)', lineHeight: 1.6 }}>
          Enviamos un enlace de confirmación a <span style={{ fontWeight: 700 }}>{email}</span>. El enlace expira en 24 horas. Revisa también el spam.
        </div>
        <button
          onClick={() => setEmailSent(false)}
          style={{ padding: '10px', background: 'transparent', color: 'var(--wine)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          ¿No recibiste el correo? Intenta de nuevo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Correo electrónico</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@ejemplo.com" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Confirmar contraseña</label>
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
      </div>

      {error && (
        <div style={{ padding: '8px 10px', background: 'rgba(138,47,59,0.08)', border: '0.5px solid rgba(138,47,59,0.3)', borderRadius: 2, fontSize: 10, color: 'var(--wine)', lineHeight: 1.4 }}>
          {error}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        style={{ padding: '13px', background: loading ? 'rgba(26,20,24,0.15)' : 'var(--rose)', color: loading ? 'rgba(26,20,24,0.4)' : 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
      >
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}
