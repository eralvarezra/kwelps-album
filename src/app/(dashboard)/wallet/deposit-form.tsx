'use client'

import { useState, useEffect } from 'react'
import { createDepositOrder } from '@/lib/actions/paypal'
import { DEPOSIT_AMOUNTS } from '@/lib/paypal/config'

export function DepositForm({ currentBalance }: { currentBalance: number }) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ amount: number; newBalance: number } | null>(null)

  const amount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0)

  // Check for payment result from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    const reason = params.get('reason')

    if (paymentStatus === 'success') {
      setSuccess({ amount: 0, newBalance: currentBalance })
      window.history.replaceState({}, '', '/wallet')
    } else if (paymentStatus === 'error') {
      setError(`Hubo un error al procesar el pago. ${reason ? `(${reason})` : ''} Por favor intenta de nuevo.`)
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
        throw new Error(orderResult.error || 'Failed to create order')
      }

      window.location.href = orderResult.approvalUrl
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-green-400 mb-2">Depósito Exitoso</h3>
          <p className="text-gray-300 mb-4">Tu depósito ha sido procesado correctamente</p>
          <p className="text-lg font-medium">
            Nuevo Balance: <span className="text-yellow-400">${success.newBalance.toFixed(2)}</span>
          </p>
          <button
            onClick={() => {
              setSuccess(null)
              setSelectedAmount(null)
              setCustomAmount('')
            }}
            className="mt-4 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10"
          >
            Hacer otro depósito
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Opción PayPal */}
      <div className="glass rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4 text-white">Recargar con PayPal</h3>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 border border-red-500/30">{error}</div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          {DEPOSIT_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setSelectedAmount(preset)
                setCustomAmount('')
              }}
              className={`p-3 rounded-lg font-bold transition-colors ${
                selectedAmount === preset
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">O ingresa un monto personalizado</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
              }}
              min="1"
              max="1000"
              step="0.01"
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {amount > 0 && (
          <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Monto a depositar</span>
              <span className="text-xl font-bold text-white">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-gray-400">
              <span>Balance actual</span>
              <span>${currentBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 text-sm font-medium">
              <span className="text-gray-300">Balance después</span>
              <span className="text-green-400">${(currentBalance + amount).toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={loading || amount <= 0}
          className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 py-3 rounded-lg font-bold hover:from-yellow-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando...
            </>
          ) : (
            'Pagar con PayPal'
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-3">
          Serás redirigido a PayPal para completar el pago
        </p>
      </div>

      {/* Separador */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10"></div>
        <span className="text-gray-400 text-sm">o</span>
        <div className="flex-1 h-px bg-white/10"></div>
      </div>

      {/* Opción Telegram */}
      <div className="glass rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4 text-white">Recargar por Telegram</h3>

        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-5 mb-5 border border-blue-500/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Contáctanos por Telegram y envía el comprobante de tu pago (Sinpe Móvil, transferencia, etc.)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">1</div>
            <p className="text-gray-300">Indícanos el monto a recargar</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">2</div>
            <p className="text-gray-300">Realiza el pago</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">3</div>
            <p className="text-gray-300">Envía el comprobante por Telegram</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm flex-shrink-0">✓</div>
            <p className="text-gray-300">Tu balance será actualizado</p>
          </div>
        </div>

        <a
          href="https://t.me/kwelps"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Contactar por Telegram
          <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  )
}