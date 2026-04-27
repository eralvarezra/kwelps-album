'use client'

import { useState } from 'react'
import { claimWelcomeBonus } from '@/lib/actions/wallet'

export function WelcomeBonusModal({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  if (!visible) return null

  async function handleClaim() {
    setLoading(true)
    setError('')
    const result = await claimWelcomeBonus()
    if (result.success) {
      setVisible(false)
    } else {
      setError(result.error || 'Error al reclamar el bono')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,11,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--paper)', borderRadius: 2, maxWidth: 340, width: '100%', padding: '28px 22px', textAlign: 'center', border: '0.5px solid rgba(26,20,24,0.15)' }}>

        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)', marginBottom: 8 }}>
          Bienvenida
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginBottom: 16 }}>
          ¡Bienvenido a<br />Kwelps!
        </div>
        <p style={{ fontSize: 11, color: 'rgba(26,20,24,0.65)', lineHeight: 1.6, marginBottom: 22 }}>
          Como regalo de bienvenida recibirás{' '}
          <strong style={{ color: 'var(--ink)', fontSize: 13 }}>$2.00 USD</strong>{' '}
          en tu wallet para probar tu suerte en la tienda.
        </p>

        {error && (
          <div style={{ background: 'rgba(138,47,59,0.08)', border: '0.5px solid rgba(138,47,59,0.2)', color: 'var(--wine)', padding: '10px 12px', borderRadius: 2, marginBottom: 14, fontSize: 10 }}>
            {error}
          </div>
        )}

        {error ? (
          <button
            onClick={() => setVisible(false)}
            style={{ width: '100%', padding: '12px', background: 'var(--paper-warm)', color: 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Cerrar
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)', transition: 'opacity 0.15s' }}
          >
            {loading ? 'Reclamando...' : '¡Reclamar $2.00!'}
          </button>
        )}
      </div>
    </div>
  )
}
