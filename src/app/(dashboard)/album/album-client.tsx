'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { fuseCards, exchangeLegendary } from '@/lib/actions/album'
import type { AlbumCollection } from '@/lib/actions/album'
import { BookSpread } from '@/components/book/BookSpread'
import { PhotoModal } from '@/components/book/PhotoModal'
import { BookHeader } from '@/components/book/BookHeader'
import { useSoundEffect } from '@/components/book/hooks/useSoundEffect'

type AlbumStats = {
  totalPhotos: number
  uniquePhotos: number
  duplicates: number
  collectionName: string
  byRarity: {
    COMMON: { total: number; collected: number }
    RARE: { total: number; collected: number }
    EPIC: { total: number; collected: number }
    LEGENDARY: { total: number; collected: number }
  }
}

type Photo = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  quantity: number
  obtainedAt: Date
  collectionName?: string
}

type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ALL'

const RARITIES: Rarity[] = ['ALL', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON']

const rarityLabels: Record<Rarity, string> = {
  ALL: 'Todas',
  COMMON: 'Común',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Legendario',
}

const nextRarity: Record<Exclude<Rarity, 'ALL'>, Exclude<Rarity, 'ALL'> | null> = {
  COMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: null,
}

function CollectionDropdown({
  collections,
  selectedId,
  onSelect,
}: {
  collections: AlbumCollection[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCollection = collections.find((c) => c.id === selectedId)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span>{selectedCollection?.name}</span>
          {selectedCollection?.active && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Activa
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => {
                onSelect(col.id)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2.5 text-sm font-medium flex items-center justify-between transition-colors ${
                selectedId === col.id
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-white hover:bg-white/5'
              }`}
            >
              <span>{col.name}</span>
              {col.active && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Activa
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AlbumClient({
  initialAlbum,
  initialStats,
}: {
  initialAlbum: AlbumCollection[]
  initialStats: AlbumStats | null
}) {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    initialAlbum.find((c) => c.active)?.id || initialAlbum[0]?.id || null
  )
  const [selectedRarity, setSelectedRarity] = useState<Rarity>('ALL')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedForFusion, setSelectedForFusion] = useState<Photo[]>([])
  const [fusing, setFusing] = useState(false)
  const [fusionResult, setFusionResult] = useState<Photo | null>(null)
  const [activeTab, setActiveTab] = useState<'book' | 'fusion' | 'legendary'>('book')

  // Legendary exchange state
  const [selectedLegendaries, setSelectedLegendaries] = useState<Photo[]>([])
  const [exchangingLegendary, setExchangingLegendary] = useState(false)
  const [legendaryExchangeResult, setLegendaryExchangeResult] = useState<Photo | null>(null)

  const { play: playFlipSound, muted, toggleMute } = useSoundEffect('/sounds/page-flip.mp3')

  const collection = initialAlbum.find((c) => c.id === selectedCollection)

  const filteredPhotos = useMemo(() => {
    if (!collection) return []
    if (selectedRarity === 'ALL') return collection.photos
    return collection.photos.filter(p => p.rarity === selectedRarity)
  }, [collection, selectedRarity])

  const toggleFusionSelection = (photo: Photo) => {
    if (photo.quantity < 2) return // Necesita al menos 2 para poder fusionar (dejar 1)
    if (selectedForFusion.length >= 4) return
    if (selectedForFusion.length > 0 && selectedForFusion[0].rarity !== photo.rarity) return

    const timesSelected = selectedForFusion.filter((p) => p.id === photo.id).length
    // Solo puede seleccionar hasta (quantity - 1) para siempre dejar 1
    if (timesSelected >= photo.quantity - 1) return

    setSelectedForFusion([...selectedForFusion, photo])
  }

  const removeFromFusionSelection = (index: number) => {
    setSelectedForFusion(selectedForFusion.filter((_, i) => i !== index))
  }

  const canFuse = selectedForFusion.length === 4 &&
    selectedForFusion.every((p) => p.rarity === selectedForFusion[0].rarity) &&
    nextRarity[selectedForFusion[0].rarity as Exclude<Rarity, 'ALL'>] !== null

  const handleFuse = async () => {
    if (!canFuse) return

    setFusing(true)
    try {
      const result = await fuseCards(selectedForFusion.map((p) => p.id))
      if (result.success && result.newPhoto) {
        setFusionResult({
          ...result.newPhoto,
          quantity: 1,
          obtainedAt: new Date(),
        })
        setSelectedForFusion([])
        // No recargar la página, esperar a que el usuario confirme
      } else {
        alert(result.error || 'Error al fusionar')
      }
    } catch {
      alert('Error al fusionar las cartas')
    } finally {
      setFusing(false)
    }
  }

  const closeFusionResult = useCallback(() => {
    setFusionResult(null)
    // Actualizar los datos localmente sin recargar la página
    window.location.reload()
  }, [])

  // Legendary exchange functions
  const totalLegendariesOwned = collection?.photos
    .filter(p => p.rarity === 'LEGENDARY')
    .reduce((sum, p) => sum + p.quantity, 0) || 0

  const uniqueLegendariesOwned = collection?.photos
    .filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0).length || 0

  const totalLegendariesInCollection = collection?.photos
    .filter(p => p.rarity === 'LEGENDARY').length || 0

  const missingLegendaries = totalLegendariesInCollection - uniqueLegendariesOwned

  const canExchangeLegendary = totalLegendariesOwned >= 5 && missingLegendaries > 0

  const toggleLegendarySelection = (photo: Photo) => {
    if (photo.rarity !== 'LEGENDARY') return
    if (selectedLegendaries.length >= 5) return
    if (photo.quantity < 2) return // Necesita al menos 2 para poder dar 1 (dejar 1)

    const timesSelected = selectedLegendaries.filter((p) => p.id === photo.id).length
    // Solo puede seleccionar hasta (quantity - 1) para siempre dejar 1
    if (timesSelected >= photo.quantity - 1) return

    setSelectedLegendaries([...selectedLegendaries, photo])
  }

  const removeFromLegendarySelection = (index: number) => {
    setSelectedLegendaries(selectedLegendaries.filter((_, i) => i !== index))
  }

  const handleLegendaryExchange = async () => {
    if (selectedLegendaries.length !== 5) return

    setExchangingLegendary(true)
    try {
      const result = await exchangeLegendary(selectedLegendaries.map((p) => p.id))
      if (result.success && result.newPhoto) {
        setLegendaryExchangeResult({
          ...result.newPhoto,
          quantity: 1,
          obtainedAt: new Date(),
        })
        setSelectedLegendaries([])
      } else {
        alert(result.error || 'Error al intercambiar')
      }
    } catch {
      alert('Error al intercambiar las cartas')
    } finally {
      setExchangingLegendary(false)
    }
  }

  const closeLegendaryExchangeResult = useCallback(() => {
    setLegendaryExchangeResult(null)
    window.location.reload()
  }, [])

  const getTotalCardsByRarity = (rarity: Exclude<Rarity, 'ALL'>): number => {
    return collection?.photos
      .filter((p) => p.rarity === rarity)
      .reduce((sum, p) => sum + p.quantity, 0) || 0
  }

  const handlePhotoClick = useCallback((photo: AlbumCollection['photos'][0]) => {
    if (photo.quantity > 0) {
      setSelectedPhoto(photo)
    }
  }, [])

  const handleNavigatePhoto = useCallback((photo: AlbumCollection['photos'][0]) => {
    setSelectedPhoto(photo)
  }, [])

  const handleFlip = useCallback(() => {
    playFlipSound()
  }, [playFlipSound])

  const byRarity = {
    LEGENDARY: collection?.photos.filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0).length || 0,
    EPIC: collection?.photos.filter(p => p.rarity === 'EPIC' && p.quantity > 0).length || 0,
    RARE: collection?.photos.filter(p => p.rarity === 'RARE' && p.quantity > 0).length || 0,
    COMMON: collection?.photos.filter(p => p.rarity === 'COMMON' && p.quantity > 0).length || 0,
  }

  if (initialAlbum.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-900/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Sin Colecciones</h1>
          <p className="text-gray-500">Vuelve más tarde por nuevas colecciones.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col overflow-x-hidden max-w-[100vw]">
      {/* Top Bar */}
      <div className="glass-dark border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-white hidden sm:block">Kwelps</span>
          </Link>

          {/* Center Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/store"
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="hidden sm:inline">Comprar Pack</span>
            </Link>
          </div>

          {/* Right: Profile */}
          <Link href="/wallet" className="flex items-center gap-3 group">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="text-sm font-medium text-white">Wallet</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Header */}
      <BookHeader
        collectionName={collection?.name || 'Mi Álbum'}
        collectionPrize={collection?.prize}
        collected={collection?.collectedPhotos || 0}
        total={collection?.totalPhotos || 0}
        byRarity={byRarity}
        currentPage={1}
        totalPages={Math.ceil((collection?.photos.length || 0) / 6)}
        onSoundToggle={toggleMute}
        isMuted={muted}
      />

      {/* Tab Navigation */}
      <div className="glass border-b border-white/5">
        <div className="flex">
          <button
            onClick={() => setActiveTab('book')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all ${
              activeTab === 'book'
                ? 'text-purple-400 bg-purple-500/10 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Álbum
            </span>
          </button>
          <button
            onClick={() => setActiveTab('fusion')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all ${
              activeTab === 'fusion'
                ? 'text-purple-400 bg-purple-500/10 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Fusión
            </span>
          </button>
          <button
            onClick={() => setActiveTab('legendary')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all ${
              activeTab === 'legendary'
                ? 'text-yellow-400 bg-yellow-500/10 border-b-2 border-yellow-500'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Legendario
            </span>
          </button>
        </div>
      </div>

      {/* Collection Selector */}
      {initialAlbum.length > 1 && (
        <div className="px-4 py-3 bg-black/20 border-b border-white/5">
          <CollectionDropdown
            collections={initialAlbum}
            selectedId={selectedCollection}
            onSelect={setSelectedCollection}
          />
        </div>
      )}

      {/* Rarity Filters */}
      {activeTab === 'book' && (
        <div className="px-4 py-2 bg-black/10">
          <div className="flex flex-wrap gap-2 justify-center">
            {RARITIES.map((rarity) => {
              const count = collection?.photos.filter(p =>
                rarity === 'ALL' || p.rarity === rarity
              ).length || 0
              const collected = collection?.photos.filter(p =>
                (rarity === 'ALL' || p.rarity === rarity) && p.quantity > 0
              ).length || 0

              return (
                <button
                  key={rarity}
                  onClick={() => setSelectedRarity(rarity)}
                  className={`filter-chip px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    selectedRarity === rarity ? 'active' : ''
                  } ${
                    selectedRarity === rarity && rarity === 'LEGENDARY' ? '!bg-yellow-500/20 !border-yellow-500/50 !text-yellow-400' :
                    selectedRarity === rarity && rarity === 'EPIC' ? '!bg-purple-500/20 !border-purple-500/50 !text-purple-400' :
                    selectedRarity === rarity && rarity === 'RARE' ? '!bg-blue-500/20 !border-blue-500/50 !text-blue-400' : ''
                  }`}
                >
                  {rarityLabels[rarity]}
                  <span className="ml-1 opacity-60">({collected}/{count})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'book' && collection && (
          <div className="h-full flex items-center justify-center overflow-hidden">
            <div className="w-full flex items-center justify-center" style={{ maxWidth: '100vw' }}>
              <BookSpread
                photos={filteredPhotos}
                photosPerPage={6}
                onPhotoClick={handlePhotoClick}
                onFlip={handleFlip}
              />
            </div>
          </div>
        )}

        {activeTab === 'fusion' && collection && (
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            {/* Fusion Info */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-lg font-bold text-white mb-2">Fusionar Cartas</h3>
              <p className="text-gray-400 text-sm mb-2">
                Combina 4 cartas de la misma rareza para obtener una de mayor rareza
              </p>
              <p className="text-amber-400/80 text-xs mb-5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Solo puedes fusionar cartas del mismo catálogo. El resultado será de este mismo catálogo.
              </p>

              {/* Fusion Rules */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {(['COMMON', 'RARE', 'EPIC'] as const).map((rarity) => {
                  const count = getTotalCardsByRarity(rarity)
                  const fusions = Math.floor(count / 4)
                  return (
                    <div key={rarity} className={`rounded-xl p-3 ${
                      rarity === 'EPIC' ? 'bg-purple-500/10 border border-purple-500/20' :
                      rarity === 'RARE' ? 'bg-blue-500/10 border border-blue-500/20' :
                      'bg-gray-500/10 border border-gray-500/20'
                    }`}>
                      <p className="text-xs text-gray-400 mb-1">4 {rarityLabels[rarity]}</p>
                      <p className="text-sm text-white font-medium">
                        → {nextRarity[rarity] ? rarityLabels[nextRarity[rarity]!] : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {count} cartas ({fusions} fusión{fusions !== 1 ? 'es' : ''})
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Selection */}
              {selectedForFusion.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      Seleccionadas: {selectedForFusion.length}/4
                    </span>
                    {canFuse && (
                      <span className="text-xs text-emerald-400 font-medium">¡Listo para fusionar!</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedForFusion.map((photo, index) => (
                      <button
                        key={`${photo.id}-${index}`}
                        onClick={() => removeFromFusionSelection(index)}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 hover:opacity-80 transition-opacity ${
                          photo.rarity === 'EPIC' ? 'border-purple-500/50 card-glow-epic' :
                          photo.rarity === 'RARE' ? 'border-blue-500/50 card-glow-rare' :
                          'border-gray-500/50 card-glow-common'
                        }`}
                      >
                        <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedForFusion([])}
                  disabled={selectedForFusion.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Limpiar
                </button>
                <button
                  onClick={handleFuse}
                  disabled={!canFuse || fusing}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fusing ? 'Fusionando...' : 'Fusionar Cartas'}
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="glass rounded-2xl p-4">
              <p className="text-gray-500 text-xs mb-3">
                Toca las cartas para seleccionarlas (mínimo 2 de cada tipo para fusionar)
              </p>
              <p className="text-gray-600 text-xs mb-4 flex items-center gap-1">
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Las cartas bloqueadas tienen solo 1 copia — necesitas mínimo 2 para poder fusionar sin quedarte en 0
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {collection.photos
                  .filter(p => p.quantity > 0 && p.rarity !== 'LEGENDARY')
                  .map((photo) => {
                    const timesSelected = selectedForFusion.filter(p => p.id === photo.id).length
                    const canSelectRarity = selectedForFusion.length === 0 || selectedForFusion[0].rarity === photo.rarity
                    const canSelectMore = timesSelected < photo.quantity - 1 // Dejar siempre 1
                    const isDisabled = photo.quantity < 2 || !canSelectRarity || !canSelectMore || selectedForFusion.length >= 4

                    return (
                      <button
                        key={photo.id}
                        onClick={() => toggleFusionSelection(photo)}
                        disabled={isDisabled}
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                          timesSelected > 0 ? 'ring-2 ring-purple-500' : ''
                        } ${
                          photo.rarity === 'EPIC' ? 'card-glow-epic' :
                          photo.rarity === 'RARE' ? 'card-glow-rare' :
                          'card-glow-common'
                        } ${photo.quantity < 2 ? 'opacity-40 cursor-not-allowed' : ''}
                        ${isDisabled && photo.quantity >= 2 ? 'opacity-50 cursor-not-allowed' : ''}
                        ${!isDisabled && photo.quantity >= 2 ? 'hover:scale-105' : ''}`}
                      >
                        <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                        {/* Cantidad de cartas */}
                        <span className={`absolute top-0.5 right-0.5 text-white text-xs font-bold px-1 rounded ${
                          photo.quantity >= 2 ? 'bg-orange-500' : 'bg-gray-600'
                        }`}>
                          ×{photo.quantity}
                        </span>
                        {/* Indicador de selección */}
                        {timesSelected > 0 && (
                          <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                            <span className="text-white font-bold">{timesSelected}</span>
                          </div>
                        )}
                        {/* Indicador de que no se puede fusionar */}
                        {photo.quantity < 2 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          allPhotos={filteredPhotos.filter(p => p.quantity > 0)}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={handleNavigatePhoto}
        />
      )}

      {/* Fusion Result Modal */}
      {fusionResult && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="glass rounded-3xl max-w-sm w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Fusión Completada!</h2>
            <p className="text-gray-400 mb-2">Obtuviste una nueva carta</p>
            {fusionResult.collectionName && (
              <p className="text-xs text-amber-400/80 mb-4">
                del catálogo: {fusionResult.collectionName}
              </p>
            )}

            <div className={`relative mx-auto w-40 h-40 mb-6 rounded-2xl overflow-hidden border-2 ${
              fusionResult.rarity === 'LEGENDARY' ? 'border-yellow-500/50 card-glow-legendary' :
              fusionResult.rarity === 'EPIC' ? 'border-purple-500/50 card-glow-epic' :
              'border-blue-500/50 card-glow-rare'
            }`}>
              <img src={fusionResult.thumbnailUrl || fusionResult.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <span className={`text-sm font-bold ${
                  fusionResult.rarity === 'LEGENDARY' ? 'text-yellow-400' :
                  fusionResult.rarity === 'EPIC' ? 'text-purple-400' :
                  'text-blue-400'
                }`}>{rarityLabels[fusionResult.rarity]}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeFusionResult}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Ver Álbum
              </button>
              <button
                onClick={() => setFusionResult(null)}
                className="flex-1 btn-primary"
              >
                Nueva Fusión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legendary Exchange Tab */}
      {activeTab === 'legendary' && collection && (
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          {/* Exchange Info */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-lg font-bold text-white mb-2">Intercambio Legendario</h3>
            <p className="text-gray-400 text-sm mb-4">
              Intercambia 5 cartas legendarias por una carta legendaria que no tengas de esta colección
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Tus Legendarias</p>
                <p className="text-xl text-white font-bold">{totalLegendariesOwned}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Únicas</p>
                <p className="text-xl text-white font-bold">{uniqueLegendariesOwned}/{totalLegendariesInCollection}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Faltantes</p>
                <p className="text-xl text-white font-bold">{missingLegendaries}</p>
              </div>
            </div>

            {/* Warning if not enough */}
            {totalLegendariesOwned < 5 && (
              <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm mb-4">
                Necesitas al menos 5 cartas legendarias para intercambiar
              </div>
            )}

            {totalLegendariesOwned >= 5 && missingLegendaries === 0 && (
              <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm mb-4">
                ¡Felicidades! Ya tienes todas las legendarias de esta colección
              </div>
            )}

            {/* Selection */}
            {selectedLegendaries.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    Seleccionadas: {selectedLegendaries.length}/5
                  </span>
                  {selectedLegendaries.length === 5 && (
                    <span className="text-xs text-emerald-400 font-medium">¡Listo para intercambiar!</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedLegendaries.map((photo, index) => (
                    <button
                      key={`legendary-${photo.id}-${index}`}
                      onClick={() => removeFromLegendarySelection(index)}
                      className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-yellow-500/50 hover:opacity-80 transition-opacity card-glow-legendary"
                    >
                      <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedLegendaries([])}
                disabled={selectedLegendaries.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={handleLegendaryExchange}
                disabled={selectedLegendaries.length !== 5 || exchangingLegendary || missingLegendaries === 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {exchangingLegendary ? 'Intercambiando...' : 'Intercambiar'}
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="glass rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-3">
              Selecciona 5 cartas legendarias para intercambiar
            </p>
            {totalLegendariesOwned >= 5 && missingLegendaries > 0 && selectedLegendaries.length < 5 && (
              <p className="text-yellow-400/80 text-xs mb-4">
                ⚡ Recibirás una carta legendaria que aún no tienes de esta colección
              </p>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {collection.photos
                .filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0)
                .map((photo) => {
                  const timesSelected = selectedLegendaries.filter(p => p.id === photo.id).length
                  const canSelectMore = timesSelected < photo.quantity
                  const isDisabled = !canSelectMore || selectedLegendaries.length >= 5

                  return (
                    <button
                      key={photo.id}
                      onClick={() => toggleLegendarySelection(photo)}
                      disabled={isDisabled}
                      className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                        timesSelected > 0 ? 'ring-2 ring-yellow-500' : ''
                      } card-glow-legendary ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-0.5 right-0.5 text-white text-xs font-bold px-1 rounded bg-yellow-500">
                        ×{photo.quantity}
                      </span>
                      {timesSelected > 0 && (
                        <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center">
                          <span className="text-white font-bold">{timesSelected}</span>
                        </div>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Legendary Exchange Result Modal */}
      {legendaryExchangeResult && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="glass rounded-3xl max-w-sm w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Intercambio Completado!</h2>
            <p className="text-gray-400 mb-2">Obtuviste una nueva carta legendaria</p>
            {legendaryExchangeResult.collectionName && (
              <p className="text-xs text-amber-400/80 mb-4">
                del catálogo: {legendaryExchangeResult.collectionName}
              </p>
            )}

            <div className="relative mx-auto w-40 h-40 mb-6 rounded-2xl overflow-hidden border-2 border-yellow-500/50 card-glow-legendary">
              <img src={legendaryExchangeResult.thumbnailUrl || legendaryExchangeResult.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <span className="text-sm font-bold text-yellow-400">Legendario</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeLegendaryExchangeResult}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Ver Álbum
              </button>
              <button
                onClick={() => setLegendaryExchangeResult(null)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-medium"
              >
                Nuevo Intercambio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}