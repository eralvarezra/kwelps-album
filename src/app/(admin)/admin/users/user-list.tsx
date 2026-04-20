'use client'

import { useState, useMemo } from 'react'
import { adminAddBalance, adminDeductBalance, adminGiveCards, adminGetAllPhotos, adminBulkUpdateBalance } from '@/lib/actions/wallet'
import { confirmUserEmail } from '@/lib/actions/admin-users'

type User = {
  id: string
  email: string
  createdAt: string
  emailConfirmed: boolean
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

type AdminPhoto = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  collectionId: string
  collectionName: string
  collectionActive: boolean
  cardNumber: number
}

type CollectionProgress = {
  id: string
  name: string
  active: boolean
  totalPhotos: number
  uniquePhotosCollected: number
  remaining: number
  percentage: number
  totalByRarity: {
    COMMON: number
    RARE: number
    EPIC: number
    LEGENDARY: number
  }
  uniqueByRarity: {
    COMMON: number
    RARE: number
    EPIC: number
    LEGENDARY: number
  }
  missingByRarity: {
    COMMON: number
    RARE: number
    EPIC: number
    LEGENDARY: number
  }
}

const rarityConfig = {
  COMMON: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Común' },
  RARE: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Raro' },
  EPIC: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Épico' },
  LEGENDARY: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Legendario' },
}

const ITEMS_PER_PAGE = 10

export function UserList({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [viewingCollection, setViewingCollection] = useState<User | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionProgress, setCollectionProgress] = useState<CollectionProgress[]>([])
  const [collectionPhotos, setCollectionPhotos] = useState<UserPhoto[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [loadingCollection, setLoadingCollection] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [operation, setOperation] = useState<'add' | 'deduct'>('add')

  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1)
  const [emailFilter, setEmailFilter] = useState('')

  // Give cards state
  const [givingCards, setGivingCards] = useState<User | null>(null)
  const [allPhotos, setAllPhotos] = useState<AdminPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>('')
  const [selectedGiveCollectionId, setSelectedGiveCollectionId] = useState<string>('')
  const [cardQuantity, setCardQuantity] = useState('1')
  const [loadingCards, setLoadingCards] = useState(false)
  const [cardsError, setCardsError] = useState('')

  // Confirm email state
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  // Filter users by email
  const filteredUsers = useMemo(() => {
    if (!emailFilter.trim()) return users
    return users.filter(user =>
      user.email.toLowerCase().includes(emailFilter.toLowerCase().trim())
    )
  }, [users, emailFilter])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: string) => {
    setEmailFilter(value)
    setCurrentPage(1)
  }

  function toggleSelect(userId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  async function handleBulkBalance(operation: 'add' | 'deduct') {
    const amt = parseFloat(bulkAmount)
    if (!amt || amt <= 0) return
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const result = await adminBulkUpdateBalance(Array.from(selectedIds), amt, operation)
      setBulkResult(result)
      if (result.failed === 0) {
        setSelectedIds(new Set())
        setBulkAmount('')
      }
    } catch {
      setBulkResult({ success: 0, failed: selectedIds.size, errors: ['Error inesperado'] })
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleOpenGiveCards(user: User) {
    setGivingCards(user)
    setAllPhotos([])
    setSelectedPhotoId('')
    setSelectedGiveCollectionId('')
    setCardQuantity('1')
    setCardsError('')
    try {
      const photos = await adminGetAllPhotos()
      setAllPhotos(photos)
    } catch (err) {
      console.error('Error fetching photos:', err)
      setCardsError('Error al cargar las cartas')
    }
  }

  const filteredGivePhotos = useMemo(() => {
    if (!selectedGiveCollectionId) return allPhotos
    return allPhotos.filter(p => p.collectionId === selectedGiveCollectionId)
  }, [allPhotos, selectedGiveCollectionId])

  async function handleGiveCards() {
    if (!givingCards || !selectedPhotoId || !cardQuantity) return

    const qty = parseInt(cardQuantity)
    if (isNaN(qty) || qty <= 0) {
      setCardsError('Cantidad inválida')
      return
    }

    setLoadingCards(true)
    setCardsError('')

    try {
      const result = await adminGiveCards(givingCards.id, selectedPhotoId, qty)
      if (result.success) {
        setGivingCards(null)
        window.location.reload()
      } else {
        setCardsError(result.error || 'Error al dar cartas')
      }
    } catch (err) {
      setCardsError('Error al dar cartas')
    } finally {
      setLoadingCards(false)
    }
  }

  async function handleConfirmEmail(userId: string) {
    setConfirmingEmail(userId)
    try {
      const result = await confirmUserEmail(userId)
      if (result.success) {
        window.location.reload()
      } else {
        alert(result.error || 'Error al confirmar email')
      }
    } catch (err) {
      console.error('Error confirming email:', err)
      alert('Error al confirmar el email')
    } finally {
      setConfirmingEmail(null)
    }
  }

  async function handleViewCollection(user: User) {
    setViewingCollection(user)
    setLoadingCollection(true)
    setSelectedCollectionId('')
    try {
      const res = await fetch(`/api/admin/users/${user.id}/collection`)
      const data = await res.json()
      setCollections(data.collections || [])
      setCollectionPhotos(data.photos || [])
      setCollectionProgress(data.collectionProgress || [])
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
      {/* Filter and Stats Bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Buscar por email..."
            value={emailFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <div className="text-sm text-gray-400">
          {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
          {emailFilter && ' (filtrado)'}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {paginatedUsers.map((user) => (
          <div
            key={user.id}
            className={`glass rounded-xl p-4 ${selectedIds.has(user.id) ? 'ring-1 ring-purple-500/50' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <input
                type="checkbox"
                checked={selectedIds.has(user.id)}
                onChange={() => toggleSelect(user.id)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer"
              />
            </div>
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{user.email}</p>
                  {!user.emailConfirmed && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      Sin confirmar
                    </span>
                  )}
                </div>
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
            <div className="flex gap-2 flex-wrap">
              {!user.emailConfirmed && (
                <button
                  onClick={() => handleConfirmEmail(user.id)}
                  disabled={confirmingEmail === user.id}
                  className="flex-1 py-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {confirmingEmail === user.id ? 'Confirmando...' : 'Confirmar Email'}
                </button>
              )}
              <button
                onClick={() => handleViewCollection(user)}
                className="flex-1 py-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                Colección
              </button>
              <button
                onClick={() => handleOpenGiveCards(user)}
                className="flex-1 py-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors"
              >
                Cartas
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
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Estado
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
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-white/5 ${selectedIds.has(user.id) ? 'bg-purple-500/10' : ''}`}
                >
                  <td className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-white">{user.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    {user.emailConfirmed ? (
                      <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Confirmado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        Sin confirmar
                      </span>
                    )}
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
                      {!user.emailConfirmed && (
                        <button
                          onClick={() => handleConfirmEmail(user.id)}
                          disabled={confirmingEmail === user.id}
                          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium disabled:opacity-50"
                        >
                          {confirmingEmail === user.id ? 'Confirmando...' : 'Confirmar'}
                        </button>
                      )}
                      <button
                        onClick={() => handleViewCollection(user)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Colección
                      </button>
                      <button
                        onClick={() => handleOpenGiveCards(user)}
                        className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
                      >
                        Cartas
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[#0f172a]/95 backdrop-blur border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
          <span className="text-sm text-gray-300 font-medium whitespace-nowrap">
            {selectedIds.size} usuario{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <input
            type="number"
            value={bulkAmount}
            onChange={e => { setBulkAmount(e.target.value); setBulkResult(null) }}
            step="0.01"
            min="0.01"
            placeholder="Monto ($)"
            className="w-36 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkBalance('add')}
              disabled={bulkLoading || !bulkAmount}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? 'Procesando...' : 'Dar balance'}
            </button>
            <button
              onClick={() => handleBulkBalance('deduct')}
              disabled={bulkLoading || !bulkAmount}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? 'Procesando...' : 'Quitar balance'}
            </button>
            <button
              onClick={() => { setSelectedIds(new Set()); setBulkAmount(''); setBulkResult(null) }}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              ✕
            </button>
          </div>
          {bulkResult && (
            <span className={`text-sm ${bulkResult.failed > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {bulkResult.success} ok{bulkResult.failed > 0 ? `, ${bulkResult.failed} fallidos` : ''}
            </span>
          )}
        </div>
      )}

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

                {/* Collection Progress */}
                {collectionProgress.length > 0 && (
                  <div className="mb-4 lg:mb-6">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Progreso por Colección</h3>
                    <div className="space-y-2">
                      {collectionProgress.map((cp) => (
                        <div
                          key={cp.id}
                          className={`rounded-xl p-3 lg:p-4 border ${cp.active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{cp.name}</span>
                              {cp.active && (
                                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Activa</span>
                              )}
                            </div>
                            <span className={`text-lg font-bold ${cp.percentage === 100 ? 'text-emerald-400' : cp.percentage >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {cp.percentage}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full transition-all ${cp.percentage === 100 ? 'bg-emerald-500' : cp.percentage >= 50 ? 'bg-yellow-500' : 'bg-gray-500'}`}
                              style={{ width: `${cp.percentage}%` }}
                            />
                          </div>

                          {/* Stats by Rarity */}
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="text-center">
                              <span className="text-gray-500">Común</span>
                              <p className="text-white font-medium">{cp.uniqueByRarity.COMMON}/{cp.totalByRarity.COMMON}</p>
                              {cp.missingByRarity.COMMON > 0 && (
                                <p className="text-gray-600">-{cp.missingByRarity.COMMON}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <span className="text-blue-400">Raro</span>
                              <p className="text-white font-medium">{cp.uniqueByRarity.RARE}/{cp.totalByRarity.RARE}</p>
                              {cp.missingByRarity.RARE > 0 && (
                                <p className="text-gray-600">-{cp.missingByRarity.RARE}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <span className="text-purple-400">Épico</span>
                              <p className="text-white font-medium">{cp.uniqueByRarity.EPIC}/{cp.totalByRarity.EPIC}</p>
                              {cp.missingByRarity.EPIC > 0 && (
                                <p className="text-gray-600">-{cp.missingByRarity.EPIC}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <span className="text-yellow-400">Leg.</span>
                              <p className="text-white font-medium">{cp.uniqueByRarity.LEGENDARY}/{cp.totalByRarity.LEGENDARY}</p>
                              {cp.missingByRarity.LEGENDARY > 0 && (
                                <p className="text-gray-600">-{cp.missingByRarity.LEGENDARY}</p>
                              )}
                            </div>
                          </div>

                          {/* Remaining */}
                          {cp.remaining > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Faltan <span className="text-yellow-400 font-medium">{cp.remaining}</span> cartas para completar
                            </p>
                          )}
                          {cp.remaining === 0 && (
                            <p className="text-xs text-emerald-400 mt-2 font-medium">
                              ✓ Colección completada
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Give Cards Modal */}
      {givingCards && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-5 lg:p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg lg:text-xl font-bold text-white mb-2">Dar Cartas</h2>
            <p className="text-gray-400 text-sm mb-4">
              Usuario: <span className="text-white font-medium">{givingCards.email}</span>
            </p>

            {cardsError && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm">{cardsError}</div>
            )}

            {/* Collection Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Colección:
              </label>
              <select
                value={selectedGiveCollectionId}
                onChange={(e) => {
                  setSelectedGiveCollectionId(e.target.value)
                  setSelectedPhotoId('')
                }}
                className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                <option value="" className="bg-[#1e293b]">Todas las colecciones</option>
                {Array.from(new Set(allPhotos.map(p => p.collectionId))).map(collectionId => {
                  const photo = allPhotos.find(p => p.collectionId === collectionId)
                  return (
                    <option key={collectionId} value={collectionId} className="bg-[#1e293b]">
                      {photo?.collectionName} {photo?.collectionActive ? '(Activa)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Photo Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Carta:
              </label>
              <select
                value={selectedPhotoId}
                onChange={(e) => setSelectedPhotoId(e.target.value)}
                className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                <option value="" className="bg-[#1e293b]">Seleccionar carta</option>
                {filteredGivePhotos.map(photo => (
                  <option key={photo.id} value={photo.id} className="bg-[#1e293b]">
                    #{photo.cardNumber} - {rarityConfig[photo.rarity].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad:
              </label>
              <input
                type="number"
                value={cardQuantity}
                onChange={(e) => setCardQuantity(e.target.value)}
                min="1"
                className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                placeholder="1"
              />
            </div>

            {/* Photo Preview */}
            {selectedPhotoId && (
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  {allPhotos.find(p => p.id === selectedPhotoId) && (() => {
                    const photo = allPhotos.find(p => p.id === selectedPhotoId)!
                    return (
                      <>
                        <img
                          src={photo.thumbnailUrl || photo.url}
                          alt=""
                          className="w-32 h-32 object-cover rounded-lg border-2 border-white/20"
                        />
                        <span className="absolute top-1 left-1 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                          #{photo.cardNumber}
                        </span>
                        <span className={`absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 ${rarityConfig[photo.rarity].bg} ${rarityConfig[photo.rarity].text}`}>
                          {rarityConfig[photo.rarity].label}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGiveCards}
                disabled={loadingCards || !selectedPhotoId}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loadingCards ? 'Dando...' : 'Dar Cartas'}
              </button>
              <button
                onClick={() => {
                  setGivingCards(null)
                  setSelectedPhotoId('')
                  setSelectedGiveCollectionId('')
                  setCardQuantity('1')
                  setCardsError('')
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
