'use client'

import { useState } from 'react'
import { claimWelcomeBonus } from '@/lib/actions/wallet'

const rarityColor: Record<string, string> = {
  COMMON:    '#c0b5a8',
  RARE:      '#8a7a6a',
  EPIC:      '#e8a4a4',
  LEGENDARY: '#d4a356',
}

const rarityLabel: Record<string, string> = {
  COMMON:    'Común',
  RARE:      'Raro',
  EPIC:      'Épico',
  LEGENDARY: 'Legendario',
}

type BonusPhoto = { id: string; url: string; rarity: string; collectionName: string }

export function WelcomeBonusModal({ show }: { show: boolean }) {
  const [visible, setVisible]     = useState(show)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [photo, setPhoto]         = useState<BonusPhoto | null>(null)

  if (!visible) return null

  async function handleClaim() {
    setLoading(true)
    setError('')
    const result = await claimWelcomeBonus()
    if (result.success) {
      setPhoto(result.bonusPhoto ?? null)
    } else {
      setError(result.error || 'Error al reclamar el bono')
      setLoading(false)
    }
  }

  const color = photo ? rarityColor[photo.rarity] : undefined

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,11,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--paper)', borderRadius: 2, maxWidth: 340, width: '100%', padding: '28px 22px', textAlign: 'center', border: '0.5px solid rgba(26,20,24,0.15)' }}>

        {photo ? (
          /* ── Carta recibida ── */
          <>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.5)', marginBottom: 6 }}>
              Tu carta de bienvenida
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
              ¡Carta recibida!
            </div>
            <div style={{ fontSize: 9, color: 'rgba(26,20,24,0.5)', marginBottom: 18 }}>
              {photo.collectionName}
            </div>

            <div style={{ margin: '0 auto 18px', width: 130, height: 173, borderRadius: 2, overflow: 'hidden', border: `1.5px solid ${color}`, boxShadow: `0 4px 20px ${color}40`, position: 'relative' }}>
              <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px 8px 8px' }}>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: color }}>{rarityLabel[photo.rarity]}</div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--paper-warm)', borderRadius: 2, fontSize: 10, color: 'rgba(26,20,24,0.65)', lineHeight: 1.5, marginBottom: 18 }}>
              También recibiste <strong>$2.00</strong> en tu wallet para comprar más packs.
            </div>

            <button
              onClick={() => setVisible(false)}
              style={{ width: '100%', padding: '12px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Ver mi álbum
            </button>
          </>
        ) : (
          /* ── Pantalla inicial ── */
          <>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)', marginBottom: 8 }}>
              Bienvenida
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginBottom: 16 }}>
              ¡Bienvenido a<br />Kwelps!
            </div>
            <p style={{ fontSize: 11, color: 'rgba(26,20,24,0.65)', lineHeight: 1.6, marginBottom: 8 }}>
              Como regalo de bienvenida recibirás:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--paper-warm)', borderRadius: 2 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', color: 'var(--wine)', fontWeight: 500, minWidth: 36 }}>$2</div>
                <div style={{ fontSize: 10, color: 'rgba(26,20,24,0.7)', lineHeight: 1.4 }}>
                  <strong>Saldo en wallet</strong><br />para comprar packs
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--paper-warm)', borderRadius: 2 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', color: '#8a7a6a', fontWeight: 500, minWidth: 36 }}>★</div>
                <div style={{ fontSize: 10, color: 'rgba(26,20,24,0.7)', lineHeight: 1.4 }}>
                  <strong>1 carta gratis</strong><br />Común o Rara garantizada
                </div>
              </div>
            </div>

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
                {loading ? 'Reclamando...' : '¡Reclamar regalo!'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
