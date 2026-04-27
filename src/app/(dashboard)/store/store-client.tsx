'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { purchasePack, purchaseSingle, getStoreInfo } from '@/lib/actions/store'
import type { PullResult, Rarity, StoreInfo, CollectionInfo } from '@/lib/store/types'
import { PACK_PRICE, SINGLE_PRICE } from '@/lib/store/types'
import Link from 'next/link'
import { LegendaryParticles } from '@/components/ui/legendary-particles'

type StoreData = StoreInfo

const rarityColors: Record<Rarity, string> = {
  COMMON: 'from-gray-400 to-gray-600 border-gray-500',
  RARE: 'from-blue-400 to-blue-600 border-blue-500',
  EPIC: 'from-purple-400 to-purple-600 border-purple-500',
  LEGENDARY: 'from-yellow-400 to-orange-500 border-yellow-500',
}

const rarityLabels: Record<Rarity, string> = {
  COMMON: 'Común',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Legendario',
}

export function StoreClient({ initialData }: { initialData: StoreData }) {
  const [data, setData] = useState(initialData)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    initialData.collections[0]?.id || null
  )
  const [loading, setLoading] = useState<'pack' | 'single' | null>(null)
  const [error, setError] = useState('')
  const [pullResults, setPullResults] = useState<PullResult[] | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())

  const searchParams = useSearchParams()
  const collectionParam = searchParams.get('collection')

  // Set collection from URL param on mount
  useEffect(() => {
    if (collectionParam) {
      const collectionExists = data.collections.find(c => c.id === collectionParam)
      if (collectionExists) {
        setSelectedCollectionId(collectionParam)
      }
    }
  }, [collectionParam, data.collections])

  const selectedCollection = data.collections.find(c => c.id === selectedCollectionId) || data.collections[0]

  async function handlePurchasePack() {
    setLoading('pack')
    setError('')
    setShowAnimation(true)
    setRevealedCards(new Set())

    try {
      const result = await purchasePack(selectedCollectionId || undefined)
      setPullResults(result.photos)

      // Refresh data
      const newData = await getStoreInfo()
      setData(newData)
    } catch (err) {
      setError((err as Error).message)
      setShowAnimation(false)
    } finally {
      setLoading(null)
    }
  }

  async function handlePurchaseSingle() {
    setLoading('single')
    setError('')
    setShowAnimation(true)
    setRevealedCards(new Set())

    try {
      const result = await purchaseSingle(selectedCollectionId || undefined)
      setPullResults([result])

      // Refresh data
      const newData = await getStoreInfo()
      setData(newData)
    } catch (err) {
      setError((err as Error).message)
      setShowAnimation(false)
    } finally {
      setLoading(null)
    }
  }

  function revealCard(index: number) {
    setRevealedCards(prev => new Set(prev).add(index))
  }

  function revealAllCards() {
    if (pullResults) {
      const allIndices = new Set(pullResults.map((_, i) => i))
      setRevealedCards(allIndices)
    }
  }

  function closeResults() {
    setPullResults(null)
    setShowAnimation(false)
    setRevealedCards(new Set())
  }

  if (data.collections.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-white">Tienda</h1>
        <p className="text-gray-400">No hay colecciones activas en este momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <h1 className="text-3xl font-bold text-white">Tienda</h1>
        <div className="glass rounded-xl p-4 sm:p-0 sm:bg-transparent sm:backdrop-filter-none border border-white/10 sm:border-0">
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="sm:text-right">
              <p className="text-xs sm:text-sm text-gray-400">Tu Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-400">${data.balance.toFixed(2)}</p>
            </div>
            <Link
              href="/wallet"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm whitespace-nowrap"
            >
              Recargar
            </Link>
          </div>
        </div>
      </div>

      {/* Collection Selector */}
      {data.collections.length > 1 && (
        <div className="glass rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-400 mb-3">Selecciona una colección:</p>
          <div className="flex flex-wrap gap-2">
            {data.collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => setSelectedCollectionId(collection.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCollectionId === collection.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
                }`}
              >
                {collection.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 text-red-400 p-4 rounded-lg border border-red-500/30">{error}</div>
      )}

      {/* Pity Counter */}
      {data.pity && (
        <div className="glass rounded-xl p-6 border border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-white">Contador de Pity</h2>
            <span className={`text-sm font-medium ${data.pity.isGuaranteed ? 'text-yellow-400' : 'text-purple-400'}`}>
              {data.pity.isGuaranteed ? '¡Legendario Garantizado!' : `${data.pity.remaining} pulls restantes`}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                data.pity.isGuaranteed ? 'bg-yellow-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min((data.pity.current / 40) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {data.pity.current}/40 pulls sin legendario
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Cada foto que abras suma al contador. A los 20 pulls sin legendario, el siguiente está garantizado.
          </p>
        </div>
      )}

      {/* Purchase Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pack */}
        <div className="glass rounded-xl overflow-hidden border border-white/10">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
            <h2 className="text-2xl font-bold">Pack de 4 Fotos</h2>
            <p className="text-3xl font-bold mt-2">${PACK_PRICE.toFixed(2)}</p>
          </div>
          <div className="p-6">
            <ul className="space-y-2 text-sm text-gray-300 mb-4">
              <li>✓ 4 fotos aleatorias</li>
              <li>✓ Garantizado 1 Raro o superior</li>
              <li>✓ Pity counter: +4</li>
            </ul>
            <button
              onClick={handlePurchasePack}
              disabled={loading !== null || data.balance < PACK_PRICE}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-bold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading === 'pack' ? 'Comprando...' : data.balance < PACK_PRICE ? 'Saldo insuficiente' : 'Comprar Pack'}
            </button>
          </div>
        </div>

        {/* Single */}
        <div className="glass rounded-xl overflow-hidden border border-white/10">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <h2 className="text-2xl font-bold">Foto Individual</h2>
            <p className="text-3xl font-bold mt-2">${SINGLE_PRICE.toFixed(2)}</p>
          </div>
          <div className="p-6">
            <ul className="space-y-2 text-sm text-gray-300 mb-4">
              <li>✓ 1 foto aleatoria</li>
              <li>✓ Probabilidades estándar</li>
              <li>✓ Pity counter: +1</li>
            </ul>
            <button
              onClick={handlePurchaseSingle}
              disabled={loading !== null || data.balance < SINGLE_PRICE}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading === 'single' ? 'Comprando...' : data.balance < SINGLE_PRICE ? 'Saldo insuficiente' : 'Comprar Foto'}
            </button>
          </div>
        </div>
      </div>

      {/* Collection Info */}
      <div className="glass rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold mb-4 text-white">Probabilidades</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as Rarity[]).map((rarity) => (
            <div key={rarity} className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="font-medium text-white">{rarityLabels[rarity]}</p>
              <p className="text-sm text-gray-400">
                {rarity === 'COMMON' ? '55%' : rarity === 'RARE' ? '35%' : rarity === 'EPIC' ? '8.5%' : '1.5%'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedCollection?.rarityCount[rarity] || 0} fotos
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Results Modal */}
      {pullResults && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 overflow-hidden">
          {/* Background particles for legendary */}
          {pullResults.some(p => p.rarity === 'LEGENDARY') && revealedCards.size > 0 && (
            <LegendaryParticles />
          )}

          <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto border border-white/10">
            <div className="p-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-white">
                ¡Toca para revelar!
              </h2>
              <p className="text-center text-gray-400 mb-6">
                {revealedCards.size === pullResults.length
                  ? `${pullResults.filter(p => p.isNew).length > 0 ? `${pullResults.filter(p => p.isNew).length} foto${pullResults.filter(p => p.isNew).length > 1 ? 's' : ''} nueva${pullResults.filter(p => p.isNew).length > 1 ? 's' : ''}` : 'Todas duplicadas'}`
                  : 'Haz clic en cada carta para revelarla'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {pullResults.map((photo, index) => {
                  const isRevealed = revealedCards.has(index)
                  const isSpecial = photo.rarity === 'EPIC' || photo.rarity === 'LEGENDARY'

                  return (
                    <div
                      key={`${photo.id}-${index}`}
                      onClick={() => !isRevealed && revealCard(index)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ${
                        isRevealed ? 'transform-gpu' : ''
                      }`}
                      style={{
                        perspective: '1000px',
                      }}
                    >
                      {/* Card container with flip effect */}
                      <div
                        className={`relative w-full h-full transition-transform duration-700 ${
                          isRevealed ? '' : ''
                        }`}
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* Back of card (hidden) */}
                        <div
                          className="absolute inset-0 rounded-xl overflow-hidden"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div
                            className={`w-full h-full flex items-center justify-center ${
                              isSpecial
                                ? photo.rarity === 'LEGENDARY'
                                  ? 'bg-gradient-to-br from-yellow-600 via-amber-500 to-yellow-600'
                                  : 'bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600'
                                : 'bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700'
                            }`}
                          >
                            {/* Special glow effect for epic/legendary */}
                            {isSpecial && (
                              <div className={`absolute inset-0 ${
                                photo.rarity === 'LEGENDARY'
                                  ? 'animate-pulse bg-yellow-400/30'
                                  : 'animate-pulse bg-purple-400/30'
                              }`} />
                            )}

                            {/* Card back pattern */}
                            <div className="relative z-10 flex flex-col items-center justify-center">
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                photo.rarity === 'LEGENDARY'
                                  ? 'bg-yellow-900/50 border-2 border-yellow-400/50'
                                  : photo.rarity === 'EPIC'
                                  ? 'bg-purple-900/50 border-2 border-purple-400/50'
                                  : 'bg-gray-800/50 border-2 border-gray-500/50'
                              }`}>
                                <span className="text-2xl">?</span>
                              </div>
                              {isSpecial && (
                                <div className={`mt-3 text-xs font-bold ${
                                  photo.rarity === 'LEGENDARY' ? 'text-yellow-200' : 'text-purple-200'
                                } animate-pulse`}>
                                  ✨ ESPECIAL ✨
                                </div>
                              )}
                            </div>

                            {/* Shine effect */}
                            {isSpecial && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine pointer-events-none" />
                            )}
                          </div>
                        </div>

                        {/* Front of card (revealed) */}
                        <div
                          className="absolute inset-0 rounded-xl overflow-hidden"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <div className={`w-full h-full relative ${
                            photo.rarity === 'LEGENDARY'
                              ? 'card-glow-legendary'
                              : photo.rarity === 'EPIC'
                              ? 'card-glow-epic'
                              : photo.rarity === 'RARE'
                              ? 'card-glow-rare'
                              : ''
                          }`}>
                            <img
                              src={photo.url}
                              alt="Photo"
                              className="w-full h-full object-cover"
                            />
                            {/* Shine effect for legendary */}
                            {photo.rarity === 'LEGENDARY' && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine pointer-events-none" />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                              <p className={`text-sm font-bold text-center ${
                                photo.rarity === 'LEGENDARY' ? 'text-yellow-400' :
                                photo.rarity === 'EPIC' ? 'text-purple-400' :
                                photo.rarity === 'RARE' ? 'text-blue-400' : 'text-gray-300'
                              }`}>
                                {rarityLabels[photo.rarity]}
                              </p>
                            </div>
                            {photo.isNew && (
                              <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                ¡NUEVO!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {revealedCards.size < pullResults.length && (
                  <button
                    onClick={revealAllCards}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors font-medium"
                  >
                    Revelar Todas
                  </button>
                )}
                <button
                  onClick={closeResults}
                  className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium border border-white/10"
                >
                  Cerrar
                </button>
                {revealedCards.size === pullResults.length && (
                  <Link
                    href="/album"
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors font-medium text-center"
                  >
                    Ver Álbum
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex gap-4 justify-center">
        <Link
          href="/album"
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          Mi Álbum
        </Link>
      </div>
    </div>
  )
}