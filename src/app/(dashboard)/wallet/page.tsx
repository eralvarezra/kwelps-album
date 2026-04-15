import { getWallet, getTransactionHistory } from '@/lib/actions/wallet'
import Link from 'next/link'
import { DepositForm } from './deposit-form'
import { RelativeTime } from '@/components/ui/relative-time'

// Force dynamic rendering to always get fresh data
export const dynamic = 'force-dynamic'

const typeLabels = {
  DEPOSIT: 'Depósito',
  PACK_PURCHASE: 'Compra de Pack',
  SINGLE_PURCHASE: 'Compra Individual',
}

const typeColors = {
  DEPOSIT: 'text-green-400',
  PACK_PURCHASE: 'text-red-400',
  SINGLE_PURCHASE: 'text-red-400',
}

export default async function WalletPage() {
  const wallet = await getWallet()
  const transactions = await getTransactionHistory(50)

  if (!wallet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No se encontró la wallet</p>
      </div>
    )
  }

  const balance = Number(wallet.balance)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Mi Wallet</h1>
        <Link
          href="/store"
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors font-medium"
        >
          Ir a la Tienda
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Balance and Deposit */}
        <div className="lg:col-span-1 space-y-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-sm opacity-80 mb-1">Balance Actual</p>
            <p className="text-4xl font-bold">${balance.toFixed(2)}</p>
            <p className="text-sm opacity-60 mt-2">Kwelps Coins</p>
          </div>

          {/* Deposit Form */}
          <DepositForm currentBalance={balance} />
        </div>

        {/* Right column - Stats and History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4 border border-white/10">
              <p className="text-sm text-gray-400">Total Depósitos</p>
              <p className="text-xl font-bold text-green-400">
                ${transactions
                  .filter((t) => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
                  .reduce((sum, t) => sum + Number(t.amount), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-white/10">
              <p className="text-sm text-gray-400">Total Gastado</p>
              <p className="text-xl font-bold text-red-400">
                ${transactions
                  .filter((t) => t.type !== 'DEPOSIT' && t.status === 'COMPLETED')
                  .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-white/10">
              <p className="text-sm text-gray-400">Transacciones</p>
              <p className="text-xl font-bold text-white">{transactions.length}</p>
            </div>
          </div>

          {/* Transaction History */}
          <div className="glass rounded-xl overflow-hidden border border-white/10">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Historial de Transacciones</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No hay transacciones aún
              </div>
            ) : (
              <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 flex justify-between items-center hover:bg-white/5">
                    <div>
                      <p className="font-medium text-white">{typeLabels[transaction.type]}</p>
                      <p className="text-sm text-gray-400">
                        <RelativeTime date={transaction.createdAt} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${typeColors[transaction.type]}`}>
                        {transaction.type === 'DEPOSIT' ? '+' : '-'}$
                        {Math.abs(Number(transaction.amount)).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          transaction.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {transaction.status === 'COMPLETED'
                          ? 'Completado'
                          : transaction.status === 'PENDING'
                          ? 'Pendiente'
                          : 'Fallido'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}