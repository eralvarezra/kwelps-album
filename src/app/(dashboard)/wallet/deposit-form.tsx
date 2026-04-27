'use client'

import { useState, useEffect } from 'react'
import { createDepositOrder } from '@/lib/actions/paypal'
import { DEPOSIT_AMOUNTS } from '@/lib/paypal/config'

const telegramSteps = [
  'Indica el monto a recargar',
  'Realiza el pago',
  'Envía el comprobante',
  'Balance actualizado',
]

export function DepositForm({ currentBalance }: { currentBalance: number }) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ newBalance: number } | null>(null)

  const amount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    const reason = params.get('reason')

    if (paymentStatus === 'success') {
      setSuccess({ newBalance: currentBalance })
      window.history.replaceState({}, '', '/wallet')
    } else if (paymentStatus === 'error') {
      setError(`Hubo un error al procesar el pago.${reason ? ` (${reason})` : ''} Por favor intenta de nuevo.`)
      window.history.replaceState({}, '', '/wallet')
    } else if (paymentStatus === 'cancelled') {
      setError('El pago fue cancelado.')
      window.history.replaceState({}, '', '/wallet')
    }
  }, [currentBalance])

  async function handleDeposit() {
    if (amount <= 0) {
      setError('Selecciona o ingresa un monto válido')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const orderResult = await createDepositOrder(amount)
      if (!orderResult.success || !orderResult.approvalUrl) {
        throw new Error(orderResult.error ?? 'Failed to create order')
      }
      window.location.href = orderResult.approvalUrl
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.15)', borderRadius: 2, marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginBottom: 8 }}>
          ¡Listo!
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,20,24,0.65)', marginBottom: 16, lineHeight: 1.5 }}>
          Tu depósito fue procesado correctamente.
        </div>
        <button
          onClick={() => { setSuccess(null); setSelectedAmount(null); setCustomAmount('') }}
          style={{ padding: '10px 20px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: 'pointer' }}
        >
          Hacer otro depósito
        </button>
      </div>
    )
  }

  return (
    <>
      {/* PayPal section */}
      <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.15)', borderRadius: 2, marginBottom: 14 }}>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)', marginBottom: 3 }}>
          Recargar con
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginBottom: 12 }}>
          PayPal
        </div>

        {error && (
          <div style={{ padding: '8px 10px', background: 'rgba(138,47,59,0.08)', border: '0.5px solid rgba(138,47,59,0.3)', borderRadius: 2, fontSize: 10, color: 'var(--wine)', marginBottom: 10, lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Quick amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${DEPOSIT_AMOUNTS.length}, 1fr)`, gap: 5, marginBottom: 10 }}>
          {DEPOSIT_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
              style={{
                padding: '9px 4px', textAlign: 'center',
                border: `0.5px solid ${selectedAmount === amt ? 'var(--ink)' : 'rgba(26,20,24,0.2)'}`,
                background: selectedAmount === amt ? 'var(--ink)' : 'transparent',
                color: selectedAmount === amt ? 'var(--paper)' : 'var(--ink)',
                borderRadius: 2,
                fontFamily: 'var(--font-display)', fontSize: 14, fontStyle: 'italic', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              ${amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ padding: '10px 12px', border: '0.5px solid rgba(26,20,24,0.2)', borderRadius: 2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'rgba(26,20,24,0.4)' }}>$</div>
          <input
            type="number"
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
            min="1"
            max="1000"
            step="0.01"
            placeholder="Monto personalizado"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {amount > 0 && (
          <div style={{ padding: '8px 10px', background: 'var(--paper-warm)', borderRadius: 2, marginBottom: 10, fontSize: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(26,20,24,0.6)' }}>A depositar</span>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 14 }}>${amount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: 'rgba(26,20,24,0.5)' }}>
              <span>Balance después</span>
              <span style={{ color: 'var(--ink)', fontWeight: 600 }}>${(currentBalance + amount).toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={loading || amount <= 0}
          style={{
            width: '100%', padding: 12, textAlign: 'center',
            background: loading || amount <= 0 ? 'rgba(26,20,24,0.15)' : 'var(--rose)',
            color: loading || amount <= 0 ? 'rgba(26,20,24,0.4)' : 'var(--ink)',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase',
            borderRadius: 2, border: 'none', cursor: loading || amount <= 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <svg style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando...
            </>
          ) : 'Pagar con PayPal'}
        </button>

        <div style={{ fontSize: 8, color: 'rgba(26,20,24,0.4)', textAlign: 'center', marginTop: 8, letterSpacing: '0.05em' }}>
          Serás redirigido a PayPal para completar el pago
        </div>
      </div>

      {/* Telegram section */}
      <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.15)', borderRadius: 2, marginBottom: 18 }}>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)' }}>
          Método alternativo
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 2, marginBottom: 10 }}>
          Por Telegram
        </div>

        <div style={{ padding: '10px 12px', background: 'var(--blush)', borderRadius: 2, fontSize: 10, lineHeight: 1.5, color: '#2a1519', marginBottom: 10 }}>
          Contáctanos y envía el comprobante (Sinpe Móvil, transferencia, etc.)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {telegramSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 16, height: 16, flexShrink: 0,
                background: i === telegramSteps.length - 1 ? 'var(--ink)' : 'transparent',
                color: i === telegramSteps.length - 1 ? 'var(--paper)' : 'var(--ink)',
                border: `0.5px solid ${i === telegramSteps.length - 1 ? 'var(--ink)' : 'rgba(26,20,24,0.3)'}`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
              }}>
                {i === telegramSteps.length - 1 ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, flex: 1 }}>{step}</div>
            </div>
          ))}
        </div>

        <a
          href="https://t.me/kwelps"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', padding: 10, textAlign: 'center',
            border: '0.5px solid var(--ink)', color: 'var(--ink)',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase',
            borderRadius: 2, textDecoration: 'none',
          }}
        >
          Contactar por Telegram
        </a>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
