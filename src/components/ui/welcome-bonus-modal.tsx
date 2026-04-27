'use client'

import { useState } from 'react'
import { claimWelcomeBonus } from '@/lib/actions/wallet'

export function WelcomeBonusModal({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-md text-center border border-yellow-500/30">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          ¡Bienvenido a Kwelps Album!
        </h1>
        <p className="text-gray-300 mb-2">
          Gracias por unirte a la plataforma de álbumes virtuales.
        </p>
        <p className="text-gray-300 mb-6">
          Como regalo de bienvenida te regalamos{' '}
          <span className="text-yellow-400 font-bold text-xl">$2.00 USD</span>{' '}
          para que pruebes tu suerte en la tienda. ¡Buena suerte!
        </p>
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        {error ? (
          <button
            onClick={() => setVisible(false)}
            className="w-full py-4 bg-gray-700 text-white font-bold rounded-xl text-lg hover:bg-gray-600 transition-colors shadow-lg"
          >
            Cerrar
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl text-lg hover:from-yellow-600 hover:to-amber-700 transition-colors disabled:opacity-50 shadow-lg shadow-yellow-500/20"
          >
            {loading ? 'Reclamando...' : '¡Reclamar mis $2!'}
          </button>
        )}
      </div>
    </div>
  )
}
