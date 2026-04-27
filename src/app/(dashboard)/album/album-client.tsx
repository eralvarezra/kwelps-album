'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { fuseCards, exchangeLegendary, sellLegendary } from '@/lib/actions/album'
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

const rarityColor: Record<Exclude<Rarity, 'ALL'>, string> = {
  COMMON: '#c0b5a8',
  RARE: '#8a7a6a',
  EPIC: '#e8a4a4',
  LEGENDARY: '#d4a356',
}

const nextRarity: Record<Exclude<Rarity, 'ALL'>, Exclude<Rarity, 'ALL'> | null> = {
  COMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: null,
}

function CollectionChips({
  collections,
  selectedId,
  onSelect,
}: {
  collections: AlbumCollection[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (collections.length <= 1) return null
  return (
    <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
      {collections.map(c => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          style={{
            flexShrink: 0, padding: '7px 12px', borderRadius: 2,
            background: selectedId === c.id ? 'var(--ink)' : 'transparent',
            color: selectedId === c.id ? 'var(--paper)' : 'var(--ink)',
            border: selectedId === c.id ? 'none' : '0.5px solid rgba(26,20,24,0.2)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          }}
        >
          {c.name}
          {c.active && (
            <span style={{ marginLeft: 6, fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: selectedId === c.id ? 'var(--rose)' : 'var(--wine)', textTransform: 'uppercase' }}>
              ·ACTIVA
            </span>
          )}
        </button>
      ))}
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
    initialAlbum.find(c => c.active)?.id ?? initialAlbum[0]?.id ?? null
  )
  const [selectedRarity, setSelectedRarity]   = useState<Rarity>('ALL')
  const [selectedPhoto, setSelectedPhoto]     = useState<Photo | null>(null)
  const [selectedForFusion, setSelectedForFusion] = useState<Photo[]>([])
  const [fusing, setFusing]                   = useState(false)
  const [fusionResult, setFusionResult]       = useState<Photo | null>(null)
  const [activeTab, setActiveTab]             = useState<'book' | 'fusion' | 'legendary'>('book')

  const [selectedLegendaries, setSelectedLegendaries] = useState<Photo[]>([])
  const [exchangingLegendary, setExchangingLegendary] = useState(false)
  const [legendaryExchangeResult, setLegendaryExchangeResult] = useState<Photo | null>(null)
  const [sellingLegendary, setSellingLegendary] = useState(false)
  const [sellResult, setSellResult] = useState<{ photoId: string; newBalance: number } | null>(null)

  const { play: playFlipSound, muted, toggleMute } = useSoundEffect('/sounds/page-flip.mp3')

  const collection = initialAlbum.find(c => c.id === selectedCollection)

  const filteredPhotos = useMemo(() => {
    if (!collection) return []
    if (selectedRarity === 'ALL') return collection.photos
    return collection.photos.filter(p => p.rarity === selectedRarity)
  }, [collection, selectedRarity])

  const toggleFusionSelection = (photo: Photo) => {
    if (photo.quantity < 2) return
    if (selectedForFusion.length >= 4) return
    if (selectedForFusion.length > 0 && selectedForFusion[0].rarity !== photo.rarity) return
    const timesSelected = selectedForFusion.filter(p => p.id === photo.id).length
    if (timesSelected >= photo.quantity - 1) return
    setSelectedForFusion([...selectedForFusion, photo])
  }

  const removeFromFusionSelection = (index: number) =>
    setSelectedForFusion(selectedForFusion.filter((_, i) => i !== index))

  const canFuse = selectedForFusion.length === 4 &&
    selectedForFusion.every(p => p.rarity === selectedForFusion[0].rarity) &&
    nextRarity[selectedForFusion[0].rarity as Exclude<Rarity, 'ALL'>] !== null

  const handleFuse = async () => {
    if (!canFuse) return
    setFusing(true)
    try {
      const result = await fuseCards(selectedForFusion.map(p => p.id))
      if (result.success && result.newPhoto) {
        setFusionResult({ ...result.newPhoto, quantity: 1, obtainedAt: new Date() })
        setSelectedForFusion([])
      } else { alert(result.error || 'Error al fusionar') }
    } catch { alert('Error al fusionar las cartas') }
    finally { setFusing(false) }
  }

  const closeFusionResult = useCallback(() => {
    setFusionResult(null)
    window.location.reload()
  }, [])

  const totalLegendariesOwned = collection?.photos.filter(p => p.rarity === 'LEGENDARY').reduce((s, p) => s + p.quantity, 0) || 0
  const uniqueLegendariesOwned = collection?.photos.filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0).length || 0
  const totalLegendariesInCollection = collection?.photos.filter(p => p.rarity === 'LEGENDARY').length || 0
  const missingLegendaries = totalLegendariesInCollection - uniqueLegendariesOwned
  const canExchangeLegendary = totalLegendariesOwned >= 5 && missingLegendaries > 0
  const hasAllLegendaries = missingLegendaries === 0
  const duplicateLegendaries = collection?.photos.filter(p => p.rarity === 'LEGENDARY' && p.quantity > 1) || []
  const canSellLegendary = hasAllLegendaries && duplicateLegendaries.length > 0

  const handleSellLegendary = async (photoId: string) => {
    setSellingLegendary(true)
    try {
      const result = await sellLegendary(photoId)
      if (result.success) { setSellResult({ photoId, newBalance: result.newBalance || 0 }) }
      else { alert(result.error || 'Error al vender') }
    } catch { alert('Error al vender la carta') }
    finally { setSellingLegendary(false) }
  }

  const toggleLegendarySelection = (photo: Photo) => {
    if (photo.rarity !== 'LEGENDARY' || selectedLegendaries.length >= 5 || photo.quantity < 2) return
    const timesSelected = selectedLegendaries.filter(p => p.id === photo.id).length
    if (timesSelected >= photo.quantity - 1) return
    setSelectedLegendaries([...selectedLegendaries, photo])
  }

  const removeFromLegendarySelection = (index: number) =>
    setSelectedLegendaries(selectedLegendaries.filter((_, i) => i !== index))

  const handleLegendaryExchange = async () => {
    if (selectedLegendaries.length !== 5) return
    setExchangingLegendary(true)
    try {
      const result = await exchangeLegendary(selectedLegendaries.map(p => p.id))
      if (result.success && result.newPhoto) {
        setLegendaryExchangeResult({ ...result.newPhoto, quantity: 1, obtainedAt: new Date() })
        setSelectedLegendaries([])
      } else { alert(result.error || 'Error al intercambiar') }
    } catch { alert('Error al intercambiar las cartas') }
    finally { setExchangingLegendary(false) }
  }

  const closeLegendaryExchangeResult = useCallback(() => {
    setLegendaryExchangeResult(null)
    window.location.reload()
  }, [])

  const getTotalCardsByRarity = (rarity: Exclude<Rarity, 'ALL'>) =>
    collection?.photos.filter(p => p.rarity === rarity).reduce((s, p) => s + p.quantity, 0) || 0

  const handlePhotoClick = useCallback((photo: AlbumCollection['photos'][0]) => {
    if (photo.quantity > 0) setSelectedPhoto(photo)
  }, [])

  const handleNavigatePhoto = useCallback((photo: AlbumCollection['photos'][0]) => {
    setSelectedPhoto(photo)
  }, [])

  const handleFlip = useCallback(() => { playFlipSound() }, [playFlipSound])

  const byRarity = {
    LEGENDARY: collection?.photos.filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0).length || 0,
    EPIC:      collection?.photos.filter(p => p.rarity === 'EPIC'      && p.quantity > 0).length || 0,
    RARE:      collection?.photos.filter(p => p.rarity === 'RARE'      && p.quantity > 0).length || 0,
    COMMON:    collection?.photos.filter(p => p.rarity === 'COMMON'    && p.quantity > 0).length || 0,
  }

  if (initialAlbum.length === 0) {
    return (
      <div style={{ padding: '80px 16px 16px', color: 'var(--ink)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic', marginBottom: 12 }}>
          Sin Colecciones
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,20,24,0.55)' }}>Vuelve más tarde por nuevas colecciones.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>

      {/* BookHeader (existing component) */}
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

      {/* Tab bar */}
      <div style={{ borderBottom: '0.5px solid rgba(26,20,24,0.12)', display: 'flex' }}>
        {([
          { id: 'book',      label: 'Álbum' },
          { id: 'fusion',    label: 'Fusión' },
          { id: 'legendary', label: 'Legendario' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 4px',
              fontSize: 8, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
              color: activeTab === tab.id ? 'var(--ink)' : 'rgba(26,20,24,0.4)',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id
                ? `1.5px solid ${tab.id === 'legendary' ? 'var(--rarity-legendary)' : 'var(--ink)'}`
                : '1.5px solid transparent',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Collection selector */}
      {initialAlbum.length > 1 && (
        <CollectionChips
          collections={initialAlbum}
          selectedId={selectedCollection}
          onSelect={setSelectedCollection}
        />
      )}

      {/* Rarity filter chips */}
      {activeTab === 'book' && (
        <div style={{ padding: '8px 16px 6px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {RARITIES.map(rarity => {
            const count     = collection?.photos.filter(p => rarity === 'ALL' || p.rarity === rarity).length || 0
            const collected = collection?.photos.filter(p => (rarity === 'ALL' || p.rarity === rarity) && p.quantity > 0).length || 0
            const active    = selectedRarity === rarity
            const dot       = rarity !== 'ALL' ? rarityColor[rarity] : undefined

            return (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                style={{
                  flexShrink: 0, padding: '5px 10px', borderRadius: 100,
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--paper)' : 'var(--ink)',
                  border: active ? 'none' : '0.5px solid rgba(26,20,24,0.2)',
                  fontSize: 10, cursor: 'pointer', fontWeight: 500,
                  display: 'flex', gap: 5, alignItems: 'center',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                }}
              >
                {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
                {rarityLabels[rarity]}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.7 }}>{collected}/{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>

        {/* Book tab */}
        {activeTab === 'book' && collection && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100vw' }}>
              <BookSpread
                photos={filteredPhotos}
                photosPerPage={6}
                onPhotoClick={handlePhotoClick}
                onFlip={handleFlip}
              />
            </div>
          </div>
        )}

        {/* Fusion tab */}
        {activeTab === 'fusion' && collection && (
          <div style={{ padding: 16, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Info card */}
            <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', marginBottom: 6 }}>Fusionar Cartas</div>
              <div style={{ fontSize: 10, color: 'rgba(26,20,24,0.6)', lineHeight: 1.5, marginBottom: 4 }}>
                Combina 4 cartas de la misma rareza para obtener una de mayor rareza.
              </div>
              <div style={{ fontSize: 9, color: 'var(--wine)', lineHeight: 1.4, marginBottom: 14 }}>
                Solo puedes fusionar cartas del mismo catálogo.
              </div>

              {/* Rules */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                {(['COMMON', 'RARE', 'EPIC'] as const).map(r => {
                  const count = getTotalCardsByRarity(r)
                  const fusions = Math.floor(count / 4)
                  return (
                    <div key={r} style={{ padding: '8px 6px', border: `0.5px solid ${rarityColor[r]}`, borderTop: `2px solid ${rarityColor[r]}`, borderRadius: 2 }}>
                      <div style={{ fontSize: 8, color: 'rgba(26,20,24,0.55)', marginBottom: 2 }}>4× {rarityLabels[r]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>→ {nextRarity[r] ? rarityLabels[nextRarity[r]!] : '—'}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(26,20,24,0.5)', marginTop: 4 }}>
                        {count} cartas · {fusions} fusión{fusions !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Selection */}
              {selectedForFusion.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: 'rgba(26,20,24,0.6)' }}>Seleccionadas: {selectedForFusion.length}/4</span>
                    {canFuse && <span style={{ fontSize: 9, color: 'var(--wine)', fontWeight: 700 }}>¡Listo!</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selectedForFusion.map((photo, idx) => (
                      <button
                        key={`${photo.id}-${idx}`}
                        onClick={() => removeFromFusionSelection(idx)}
                        style={{ position: 'relative', width: 48, height: 48, borderRadius: 2, overflow: 'hidden', border: `1px solid ${rarityColor[photo.rarity]}`, cursor: 'pointer', background: 'none', padding: 0 }}
                      >
                        <img src={photo.thumbnailUrl || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: 'var(--wine)', color: 'var(--paper)', borderRadius: '50%', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedForFusion([])}
                  disabled={selectedForFusion.length === 0}
                  style={{ flex: 1, padding: '10px', border: '0.5px solid rgba(26,20,24,0.2)', borderRadius: 2, background: 'transparent', color: 'rgba(26,20,24,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: selectedForFusion.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Limpiar
                </button>
                <button
                  onClick={handleFuse}
                  disabled={!canFuse || fusing}
                  style={{ flex: 1, padding: '10px', background: !canFuse || fusing ? 'rgba(26,20,24,0.15)' : 'var(--ink)', color: !canFuse || fusing ? 'rgba(26,20,24,0.4)' : 'var(--paper)', borderRadius: 2, border: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: !canFuse || fusing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  {fusing ? 'Fusionando...' : 'Fusionar'}
                </button>
              </div>
            </div>

            {/* Cards grid */}
            <div style={{ padding: 12, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
              <div style={{ fontSize: 8, color: 'rgba(26,20,24,0.5)', marginBottom: 10, lineHeight: 1.4 }}>
                Toca las cartas para seleccionarlas. Necesitas al menos 2 copias de cada tipo.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {collection.photos
                  .filter(p => p.quantity > 0 && p.rarity !== 'LEGENDARY')
                  .map(photo => {
                    const timesSelected   = selectedForFusion.filter(p => p.id === photo.id).length
                    const canSelectRarity = selectedForFusion.length === 0 || selectedForFusion[0].rarity === photo.rarity
                    const canSelectMore   = timesSelected < photo.quantity - 1
                    const isDisabled      = photo.quantity < 2 || !canSelectRarity || !canSelectMore || selectedForFusion.length >= 4

                    return (
                      <button
                        key={photo.id}
                        onClick={() => toggleFusionSelection(photo)}
                        disabled={isDisabled}
                        style={{
                          position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', padding: 0, border: `1px solid ${timesSelected > 0 ? 'var(--wine)' : 'transparent'}`,
                          opacity: isDisabled ? 0.4 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer',
                          outline: timesSelected > 0 ? `2px solid var(--wine)` : 'none',
                        }}
                      >
                        <img src={photo.thumbnailUrl || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: 2, right: 2, background: photo.quantity >= 2 ? 'var(--wine)' : 'rgba(26,20,24,0.5)', color: 'var(--paper)', fontSize: 7, fontWeight: 700, padding: '1px 3px', borderRadius: 1 }}>
                          ×{photo.quantity}
                        </span>
                        {timesSelected > 0 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(138,47,59,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: 'var(--paper)', fontWeight: 700, fontSize: 14 }}>{timesSelected}</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Legendary tab */}
        {activeTab === 'legendary' && collection && (
          <div style={{ padding: 16, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Info card */}
            <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', marginBottom: 6 }}>Intercambio Legendario</div>
              <div style={{ fontSize: 10, color: 'rgba(26,20,24,0.6)', lineHeight: 1.5, marginBottom: 14 }}>
                Intercambia 5 cartas legendarias por una que no tengas de esta colección.
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                {[
                  { label: 'Tus Leg.', value: String(totalLegendariesOwned) },
                  { label: 'Únicas',   value: `${uniqueLegendariesOwned}/${totalLegendariesInCollection}` },
                  { label: 'Faltantes', value: String(missingLegendaries) },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '8px 6px', borderTop: `2px solid var(--rarity-legendary)`, border: `0.5px solid rgba(212,163,86,0.3)`, borderRadius: 2 }}>
                    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.5)', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', color: 'var(--rarity-legendary)', lineHeight: 1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Status messages */}
              {totalLegendariesOwned < 5 && !canSellLegendary && (
                <div style={{ padding: '8px 10px', background: 'rgba(212,163,86,0.08)', border: '0.5px solid rgba(212,163,86,0.3)', borderRadius: 2, fontSize: 9, color: 'var(--rarity-legendary)', marginBottom: 12, lineHeight: 1.4 }}>
                  Necesitas al menos 5 cartas legendarias para intercambiar.
                </div>
              )}
              {totalLegendariesOwned >= 5 && missingLegendaries === 0 && !canSellLegendary && (
                <div style={{ padding: '8px 10px', background: 'rgba(26,20,24,0.04)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2, fontSize: 9, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.4 }}>
                  ¡Felicidades! Ya tienes todas las legendarias de esta colección.
                </div>
              )}
              {canSellLegendary && (
                <div style={{ padding: '8px 10px', background: 'rgba(26,155,80,0.08)', border: '0.5px solid rgba(26,155,80,0.2)', borderRadius: 2, fontSize: 9, color: '#1a7a40', marginBottom: 12, lineHeight: 1.4 }}>
                  Tienes legendarias repetidas. Véndelas por $1 cada una.
                </div>
              )}

              {/* Selection */}
              {missingLegendaries > 0 && selectedLegendaries.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: 'rgba(26,20,24,0.6)' }}>Seleccionadas: {selectedLegendaries.length}/5</span>
                    {selectedLegendaries.length === 5 && <span style={{ fontSize: 9, color: 'var(--wine)', fontWeight: 700 }}>¡Listo!</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedLegendaries.map((photo, idx) => (
                      <button
                        key={`leg-${photo.id}-${idx}`}
                        onClick={() => removeFromLegendarySelection(idx)}
                        style={{ position: 'relative', width: 48, height: 48, borderRadius: 2, overflow: 'hidden', border: `1px solid var(--rarity-legendary)`, cursor: 'pointer', background: 'none', padding: 0 }}
                      >
                        <img src={photo.thumbnailUrl || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: 'var(--rarity-legendary)', color: 'var(--ink)', borderRadius: '50%', fontSize: 7, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {missingLegendaries > 0 ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedLegendaries([])}
                    disabled={selectedLegendaries.length === 0}
                    style={{ flex: 1, padding: '10px', border: '0.5px solid rgba(26,20,24,0.2)', borderRadius: 2, background: 'transparent', color: 'rgba(26,20,24,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: selectedLegendaries.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleLegendaryExchange}
                    disabled={selectedLegendaries.length !== 5 || exchangingLegendary}
                    style={{ flex: 1, padding: '10px', background: selectedLegendaries.length === 5 && !exchangingLegendary ? 'var(--rarity-legendary)' : 'rgba(212,163,86,0.2)', color: 'var(--ink)', borderRadius: 2, border: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: selectedLegendaries.length !== 5 || exchangingLegendary ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    {exchangingLegendary ? 'Intercambiando...' : 'Intercambiar'}
                  </button>
                </div>
              ) : canSellLegendary && (
                <div style={{ fontSize: 9, color: 'rgba(26,20,24,0.55)', textAlign: 'center' }}>
                  Selecciona una carta repetida para venderla
                </div>
              )}
            </div>

            {/* Cards grid */}
            <div style={{ padding: 12, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
              <div style={{ fontSize: 8, color: 'rgba(26,20,24,0.5)', marginBottom: 10 }}>
                {missingLegendaries > 0 ? 'Selecciona 5 cartas legendarias para intercambiar' : 'Haz clic en una carta repetida para venderla por $1'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {collection.photos
                  .filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0)
                  .map(photo => {
                    const isDuplicate = photo.quantity > 1

                    if (missingLegendaries > 0) {
                      const timesSelected = selectedLegendaries.filter(p => p.id === photo.id).length
                      const canSelectMore = timesSelected < photo.quantity - 1
                      const isDisabled    = !canSelectMore || selectedLegendaries.length >= 5

                      return (
                        <button
                          key={photo.id}
                          onClick={() => toggleLegendarySelection(photo)}
                          disabled={isDisabled}
                          style={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', padding: 0, border: `1px solid ${timesSelected > 0 ? 'var(--rarity-legendary)' : 'rgba(212,163,86,0.3)'}`, opacity: isDisabled ? 0.4 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                        >
                          <img src={photo.thumbnailUrl || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--rarity-legendary)', color: 'var(--ink)', fontSize: 7, fontWeight: 700, padding: '1px 3px', borderRadius: 1 }}>×{photo.quantity}</span>
                          {timesSelected > 0 && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(212,163,86,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 14 }}>{timesSelected}</span>
                            </div>
                          )}
                        </button>
                      )
                    }

                    return (
                      <button
                        key={photo.id}
                        onClick={() => isDuplicate && handleSellLegendary(photo.id)}
                        disabled={!isDuplicate || sellingLegendary}
                        style={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', padding: 0, border: `1px solid rgba(212,163,86,0.3)`, opacity: !isDuplicate ? 0.4 : 1, cursor: !isDuplicate || sellingLegendary ? 'not-allowed' : 'pointer' }}
                      >
                        <img src={photo.thumbnailUrl || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--rarity-legendary)', color: 'var(--ink)', fontSize: 7, fontWeight: 700, padding: '1px 3px', borderRadius: 1 }}>×{photo.quantity}</span>
                        {isDuplicate && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,155,80,0.85)', textAlign: 'center', padding: '2px 0' }}>
                            <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>+$1</span>
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

      {/* Fusion result modal */}
      {fusionResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,11,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--ink)', borderRadius: 2, maxWidth: 320, width: '100%', padding: '24px 20px', textAlign: 'center', border: '0.5px solid rgba(250,247,242,0.1)' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)', marginBottom: 8 }}>Fusión completada</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', color: 'var(--paper)', lineHeight: 1, marginBottom: 6 }}>¡Nueva carta!</div>
            {fusionResult.collectionName && (
              <div style={{ fontSize: 9, color: 'rgba(250,247,242,0.5)', marginBottom: 16 }}>del catálogo: {fusionResult.collectionName}</div>
            )}
            <div style={{ margin: '0 auto 20px', width: 120, height: 160, borderRadius: 2, overflow: 'hidden', border: `1px solid ${rarityColor[fusionResult.rarity]}` }}>
              <img src={fusionResult.thumbnailUrl || fusionResult.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={closeFusionResult} style={{ flex: 1, padding: '11px', background: 'transparent', border: '0.5px solid rgba(250,247,242,0.2)', color: 'rgba(250,247,242,0.7)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Ver Álbum</button>
              <button onClick={() => setFusionResult(null)} style={{ flex: 1, padding: '11px', background: 'var(--rose)', color: 'var(--ink)', border: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Nueva Fusión</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell result modal */}
      {sellResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,11,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--ink)', borderRadius: 2, maxWidth: 300, width: '100%', padding: '24px 20px', textAlign: 'center', border: '0.5px solid rgba(250,247,242,0.1)' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)', marginBottom: 8 }}>Venta completada</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', color: 'var(--paper)', lineHeight: 1, marginBottom: 16 }}>+$1.00</div>
            <div style={{ padding: '10px', border: '0.5px solid rgba(250,247,242,0.1)', borderRadius: 2, marginBottom: 16, fontSize: 10, color: 'rgba(250,247,242,0.6)' }}>
              Nuevo saldo: <span style={{ color: 'var(--paper)', fontWeight: 700 }}>${sellResult.newBalance.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.location.reload()} style={{ flex: 1, padding: '11px', background: 'transparent', border: '0.5px solid rgba(250,247,242,0.2)', color: 'rgba(250,247,242,0.7)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Ver Álbum</button>
              <button onClick={() => setSellResult(null)} style={{ flex: 1, padding: '11px', background: 'var(--rose)', color: 'var(--ink)', border: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Vender Otra</button>
            </div>
          </div>
        </div>
      )}

      {/* Legendary exchange result modal */}
      {legendaryExchangeResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,11,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'var(--ink)', borderRadius: 2, maxWidth: 320, width: '100%', padding: '24px 20px', textAlign: 'center', border: '0.5px solid rgba(212,163,86,0.3)' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rarity-legendary)', marginBottom: 8 }}>Intercambio completado</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', color: 'var(--paper)', lineHeight: 1, marginBottom: 6 }}>¡Legendaria!</div>
            {legendaryExchangeResult.collectionName && (
              <div style={{ fontSize: 9, color: 'rgba(250,247,242,0.5)', marginBottom: 16 }}>del catálogo: {legendaryExchangeResult.collectionName}</div>
            )}
            <div style={{ margin: '0 auto 20px', width: 120, height: 160, borderRadius: 2, overflow: 'hidden', border: `1px solid var(--rarity-legendary)`, boxShadow: '0 0 0 2px rgba(212,163,86,0.2)' }}>
              <img src={legendaryExchangeResult.thumbnailUrl || legendaryExchangeResult.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={closeLegendaryExchangeResult} style={{ flex: 1, padding: '11px', background: 'transparent', border: '0.5px solid rgba(250,247,242,0.2)', color: 'rgba(250,247,242,0.7)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Ver Álbum</button>
              <button onClick={() => setLegendaryExchangeResult(null)} style={{ flex: 1, padding: '11px', background: 'var(--rarity-legendary)', color: 'var(--ink)', border: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Nuevo Intercambio</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
