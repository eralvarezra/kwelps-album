'use client'

import { useState, useMemo } from 'react'
import { adminAddBalance, adminDeductBalance } from '@/lib/actions/wallet'

type User = {
  id: string
  email: string
  createdAt: string
  wallet: {
    balance: number
    adminBalance: number
  } | null
  _count: {
    transactions: number
  }
}

type UserPhoto = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  quantity: number
  collectionId: string
  collectionName: string
}

type Collection = {
  id: string
  name: string
  active: boolean
}

const rarityConfig = {
  COMMON: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Común' },
  RARE: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Raro' },
  EPIC: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Épico' },
  LEGENDARY: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Legendario' },
}

export function UserList({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [viewingCollection, setViewingCollection] = useState<User | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionPhotos, setCollectionPhotos] = useState<UserPhoto[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [loadingCollection, setLoadingCollection] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [operation, setOperation] = useState<'add' | 'deduct'>('add')

  async function handleViewCollection(user: User) {
    setViewingCollection(user)
    setLoadingCollection(true)
    setSelectedCollectionId('')
    try {
      const res = await fetch(`/api/admin/users/${user.id}/collection`)
      const data = await res.json()
      setCollections(data.collections || [])
      setCollectionPhotos(data.photos || [])
    } catch (err) {
      console.error('Error fetching collection:', err)
    } finally {
      setLoadingCollection(false)
    }
  }

  const filteredPhotos = useMemo(() => {
    if (!selectedCollectionId) return collectionPhotos
    return collectionPhotos.filter(p => p.collectionId === selectedCollectionId)
  }, [collectionPhotos, selectedCollectionId])

  const collectionStats = useMemo(() => {
    const photos = filteredPhotos
    return {
      COMMON: photos.filter(p => p.rarity === 'COMMON').reduce((sum, p) => sum + p.quantity, 0),
      RARE: photos.filter(p => p.rarity === 'RARE').reduce((sum, p) => sum + p.quantity, 0),
      EPIC: photos.filter(p => p.rarity === 'EPIC').reduce((sum, p) => sum + p.quantity, 0),
      LEGENDARY: photos.filter(p => p.rarity === 'LEGENDARY').reduce((sum, p) => sum + p.quantity, 0),
    }
  }, [filteredPhotos])

  async function handleBalance() {
    if (!selectedUser || !amount) return

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresa una cantidad válida')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (operation === 'add') {
        await adminAddBalance(selectedUser.id, numAmount)
      } else {
        await adminDeductBalance(selectedUser.id, numAmount)
      }
      setSelectedUser(null)
      setAmount('')
      window.location.reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (users.length === 0) {
    return (
      <div className="glass rounded-xl p-6 lg:p-8 text-center">
        <p className="text-gray-400">No hay usuarios aún</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {users.map((user) => (
          <div key={user.id} className="glass rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs text-gray-400 ml-2">
                {user._count.transactions} trans.
              </span>
            </div>
            <div className="flex gap-4 mb-3">
              <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-lg font-bold text-emerald-400">
                  ${user.wallet?.balance ? user.wallet.balance.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-400">Admin</p>
                <p className="text-lg font-bold text-yellow-400">
                  ${user.wallet?.adminBalance ? user.wallet.adminBalance.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleViewCollection(user)}
                className="flex-1 py-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                Colección
              </button>
              <button
                onClick={() => {
                  setSelectedUser(user)
                  setOperation('add')
                }}
                className="flex-1 py-2 text-sm text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                Balance
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Balance
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Balance Admin
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Transacciones
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Registro
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-white">{user.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-emerald-400">
                      ${user.wallet?.balance ? user.wallet.balance.toFixed(2) : '0.00'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-yellow-400">
                      ${user.wallet?.adminBalance ? user.wallet.adminBalance.toFixed(2) : '0.00'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-400">{user._count.transactions}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleViewCollection(user)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Colección
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setOperation('add')
                        }}
                        className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                      >
                        Balance
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-5 lg:p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg lg:text-xl font-bold text-white mb-4">Administrar Balance</h2>
            <p className="text-gray-400 mb-2 text-sm lg:text-base">
              Usuario: <span className="text-white font-medium">{selectedUser.email}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
              <p className="text-sm text-gray-500">
                Balance Total: <span className="text-emerald-400 font-medium">${selectedUser.wallet?.balance ? selectedUser.wallet.balance.toFixed(2) : '0.00'}</span>
              </p>
              <p className="text-sm text-gray-500">
                Balance Admin: <span className="text-yellow-400 font-medium">${selectedUser.wallet?.adminBalance ? selectedUser.wallet.adminBalance.toFixed(2) : '0.00'}</span>
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm">{error}</div>
            )}

            {/* Operation Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setOperation('add')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  operation === 'add'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Agregar
              </button>
              <button
                onClick={() => setOperation('deduct')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  operation === 'deduct'
                    ? 'bg-red-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Descontar
              </button>
            </div>

            {operation === 'deduct' && (
              <p className="text-xs text-yellow-400/80 mb-4">
                ⚠️ Solo puedes descontar del Balance Admin (dado por ti), no del balance comprado por PayPal.
              </p>
            )}

            <div className="mb-6">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad ($)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                placeholder="10.00"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBalance}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl text-white font-medium shadow-lg disabled:opacity-50 transition-all ${
                  operation === 'add'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-emerald-500/40'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-500/40'
                }`}
              >
                {loading
                  ? operation === 'add' ? 'Agregando...' : 'Descontando...'
                  : operation === 'add' ? 'Agregar Balance' : 'Descontar Balance'}
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setAmount('')
                  setError('')
                  setOperation('add')
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {viewingCollection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-5 lg:p-6 w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-white">Colección del Usuario</h2>
                <p className="text-gray-400 text-sm">{viewingCollection.email}</p>
              </div>
              <button
                onClick={() => {
                  setViewingCollection(null)
                  setCollectionPhotos([])
                }}
                className="text-gray-400 hover:text-white p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingCollection ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-gray-400">Cargando...</p>
              </div>
            ) : (
              <>
                {/* Collection Filter */}
                {collections.length > 1 && (
                  <div className="mb-4 lg:mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Filtrar por colección:
                    </label>
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full sm:w-auto bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="" className="bg-[#1e293b] text-white">Todas las colecciones</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id} className="bg-[#1e293b] text-white">
                          {collection.name} {collection.active ? '(Activa)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 mb-4 lg:mb-6">
                  {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const).map((rarity) => {
                    const config = rarityConfig[rarity]
                    return (
                      <div key={rarity} className={`rounded-xl p-2 lg:p-3 border ${config.bg} ${config.border}`}>
                        <p className={`text-xs lg:text-sm font-medium ${config.text}`}>{config.label}</p>
                        <p className="text-xl lg:text-2xl font-bold text-white">{collectionStats[rarity]}</p>
                      </div>
                    )
                  })}
                </div>

                {filteredPhotos.length === 0 ? (
                  <div className="text-center py-8 lg:py-12">
                    <p className="text-gray-400">
                      {collectionPhotos.length === 0
                        ? 'Este usuario no tiene fotos en su colección'
                        : 'No hay fotos en esta colección'}
                    </p>
                  </div>
                ) : (
                  /* Photos Grid */
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {filteredPhotos.map((photo) => {
                      const config = rarityConfig[photo.rarity]
                      return (
                        <div
                          key={photo.id}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 ${config.border}`}
                          title={`${photo.collectionName}`}
                        >
                          <img
                            src={photo.thumbnailUrl || photo.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {photo.quantity > 1 && (
                            <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                              ×{photo.quantity}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 text-center">
                            <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Collection Names */}
                {collections.length > 0 && !selectedCollectionId && (
                  <div className="mt-4 lg:mt-6 pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-2">Colecciones:</p>
                    <div className="flex flex-wrap gap-2">
                      {collections.map((collection) => {
                        const count = collectionPhotos.filter(p => p.collectionId === collection.id).length
                        return (
                          <span
                            key={collection.id}
                            className="px-3 py-1 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-300"
                          >
                            {collection.name} ({count})
                            {collection.active && <span className="ml-1 text-emerald-400">●</span>}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}