'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { fuseCards, exchangeLegendary, sellLegendary } from '@/lib/actions/album'
import type { AlbumCollection } from '@/lib/actions/album'
import { PhotoModal } from '@/components/book/PhotoModal'

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

type AlbumPhoto = AlbumCollection['photos'][0]

function PageView({
  photos, pageIndex, chapter, startNum, onPhotoClick, rarityColor, rarityLabels,
}: {
  photos: AlbumPhoto[]
  pageIndex: number
  chapter: string
  startNum: number
  onPhotoClick: (p: AlbumPhoto) => void
  rarityColor: Record<string, string>
  rarityLabels: Record<string, string>
}) {
  const cells = [...photos]
  while (cells.length < 10) cells.push(null as unknown as AlbumPhoto)

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--paper)', padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', backfaceVisibility: 'hidden', color: 'var(--ink)' }}>
      {/* Editorial page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6, marginBottom: 8, borderBottom: '0.5px solid rgba(26,20,24,0.18)' }}>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{chapter}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(26,20,24,0.55)' }}>p.{String(pageIndex + 1).padStart(2, '0')}</div>
      </div>

      {/* 2×5 uniform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(5, 1fr)', gap: '6px 8px', flex: 1 }}>
        {cells.map((photo, i) => {
          const num = startNum + i
          if (!photo) {
            return (
              <div key={`empty-${i}`} style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--paper-warm)', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '0.5px solid rgba(26,20,24,0.08)' }}>
                <div style={{ position: 'absolute', inset: 6, border: '0.5px dashed rgba(26,20,24,0.18)' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', color: 'rgba(26,20,24,0.18)' }}>?</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(26,20,24,0.28)', letterSpacing: '0.1em', marginTop: 2 }}>N°{String(num).padStart(2, '0')}</div>
              </div>
            )
          }
          const isOwned = photo.quantity > 0
          const color = rarityColor[photo.rarity]
          const isLegendary = photo.rarity === 'LEGENDARY'
          const isEpic = photo.rarity === 'EPIC'
          const borderColor = isLegendary ? '#d4a356' : isEpic ? '#e8a4a4' : photo.rarity === 'RARE' ? '#8a7a6a' : 'rgba(26,20,24,0.15)'

          if (!isOwned) {
            return (
              <div key={photo.id} style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--paper-warm)', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '0.5px solid rgba(26,20,24,0.08)' }}>
                <div style={{ position: 'absolute', inset: 6, border: '0.5px dashed rgba(26,20,24,0.18)' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', color: 'rgba(26,20,24,0.18)' }}>?</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(26,20,24,0.28)', letterSpacing: '0.1em', marginTop: 2 }}>N°{String(num).padStart(2, '0')}</div>
              </div>
            )
          }

          return (
            <button
              key={photo.id}
              onClick={() => onPhotoClick(photo)}
              style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 2, overflow: 'hidden', border: `1px solid ${borderColor}`, padding: 0, cursor: 'pointer', boxShadow: isLegendary ? '0 0 0 2px #f5d9b5, 0 4px 8px rgba(212,163,86,0.2)' : isEpic ? '0 0 0 1px #f5d9d1' : '0 2px 4px rgba(0,0,0,0.06)' }}
            >
              <img src={photo.thumbnailUrl || photo.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {isLegendary && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 30%, rgba(255,220,180,0.25) 45%, rgba(244,215,106,0.12) 50%, transparent 65%)', mixBlendMode: 'overlay', pointerEvents: 'none' }} />}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.75))', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 4, left: 4, fontFamily: 'var(--font-mono)', fontSize: 7, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>N°{String(num).padStart(2, '0')}</div>
              {photo.quantity > 1 && <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--wine)', color: 'var(--paper)', fontSize: 6, fontWeight: 700, padding: '1px 3px', borderRadius: 1 }}>×{photo.quantity}</div>}
              <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4 }}>
                <div style={{ fontSize: 6, color: isLegendary ? '#f5d9b5' : isEpic ? '#f5d9d1' : 'rgba(255,255,255,0.7)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>{rarityLabels[photo.rarity]}</div>
              </div>
            </button>
          )
        })}
      </div>
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
  const [bookPage, setBookPage]               = useState(0)
  const [flipping, setFlipping]               = useState<'next' | 'prev' | null>(null)
  const flipTimerRef                          = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => () => { if (flipTimerRef.current) clearTimeout(flipTimerRef.current) }, [])

  const [selectedLegendaries, setSelectedLegendaries] = useState<Photo[]>([])
  const [exchangingLegendary, setExchangingLegendary] = useState(false)
  const [legendaryExchangeResult, setLegendaryExchangeResult] = useState<Photo | null>(null)
  const [sellingLegendary, setSellingLegendary] = useState(false)
  const [sellResult, setSellResult] = useState<{ photoId: string; newBalance: number } | null>(null)

  const collection = initialAlbum.find(c => c.id === selectedCollection)

  const filteredPhotos = useMemo(() => {
    setBookPage(0)
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

  const pct = collection && collection.totalPhotos > 0
    ? Math.round((collection.collectedPhotos / collection.totalPhotos) * 100)
    : 0

  const totalPages = Math.ceil(filteredPhotos.length / 10)

  const flipNext = () => {
    if (flipping || bookPage >= totalPages - 1) return
    setFlipping('next')
    flipTimerRef.current = setTimeout(() => { setBookPage(p => p + 1); setFlipping(null) }, 700)
  }

  const flipPrev = () => {
    if (flipping || bookPage <= 0) return
    setFlipping('prev')
    flipTimerRef.current = setTimeout(() => { setBookPage(p => p - 1); setFlipping(null) }, 700)
  }

  const pagePhotos      = (pg: number) => filteredPhotos.slice(pg * 10, pg * 10 + 10)
  const chapterLabels   = ['Capítulo I', 'Capítulo II', 'Capítulo III', 'Capítulo IV']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)', paddingTop: 54 }}>

      {/* Collection stats strip */}
      <div style={{ padding: '10px 16px 12px', borderBottom: '0.5px solid rgba(26,20,24,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}>
            {collection?.name || 'Mi Álbum'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(26,20,24,0.55)' }}>
            {collection?.collectedPhotos ?? 0}/{collection?.totalPhotos ?? 0}
          </div>
        </div>
        <div style={{ height: 2, background: 'rgba(26,20,24,0.08)', position: 'relative', overflow: 'hidden', borderRadius: 1, marginBottom: 8 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--ink)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(['LEGENDARY', 'EPIC', 'RARE', 'COMMON'] as const).map(r => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: rarityColor[r] }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(26,20,24,0.6)' }}>{byRarity[r]}</span>
            </div>
          ))}
          {collection?.prize && (
            <div style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--wine)', fontWeight: 700, letterSpacing: '0.1em' }}>
              Premio: {collection.prize}
            </div>
          )}
        </div>
      </div>

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Book tab — 3D flip animation, 10 photos per page */}
        {activeTab === 'book' && collection && (
          <div style={{ flex: 1, position: 'relative', padding: '0 20px 8px', perspective: '1400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

            {/* Book container */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '0.58', maxHeight: '100%', transformStyle: 'preserve-3d' }}>

              {/* Dark binding shadow behind */}
              <div style={{ position: 'absolute', inset: '-6px -4px -6px -4px', background: 'var(--ink)', borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)' }} />
              {/* Left spine */}
              <div style={{ position: 'absolute', left: -4, top: -6, bottom: -6, width: 8, background: 'linear-gradient(90deg, #0c090b 0%, var(--ink) 100%)', borderRadius: '2px 0 0 2px' }} />

              {/* Static page behind (destination) */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', boxShadow: 'inset 8px 0 12px rgba(0,0,0,0.08)' }}>
                <PageView
                  photos={pagePhotos(flipping === 'next' ? bookPage + 1 : flipping === 'prev' ? bookPage - 1 : bookPage)}
                  pageIndex={flipping === 'next' ? bookPage + 1 : flipping === 'prev' ? bookPage - 1 : bookPage}
                  chapter={chapterLabels[flipping === 'next' ? bookPage + 1 : flipping === 'prev' ? bookPage - 1 : bookPage] ?? 'Colección'}
                  startNum={(flipping === 'next' ? bookPage + 1 : flipping === 'prev' ? bookPage - 1 : bookPage) * 10 + 1}
                  onPhotoClick={handlePhotoClick}
                  rarityColor={rarityColor}
                  rarityLabels={rarityLabels}
                />
              </div>

              {/* Flipping page — next */}
              {flipping === 'next' && (
                <div style={{ position: 'absolute', inset: 0, transformOrigin: 'left center', transformStyle: 'preserve-3d', animation: 'flipNext 0.7s cubic-bezier(.45,.05,.55,.95) forwards', zIndex: 5 }}>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden', boxShadow: 'inset 8px 0 12px rgba(0,0,0,0.08)' }}>
                    <PageView photos={pagePhotos(bookPage)} pageIndex={bookPage} chapter={chapterLabels[bookPage] ?? 'Colección'} startNum={bookPage * 10 + 1} onPhotoClick={handlePhotoClick} rarityColor={rarityColor} rarityLabels={rarityLabels} />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', overflow: 'hidden', boxShadow: 'inset -8px 0 12px rgba(0,0,0,0.08)' }}>
                    <PageView photos={pagePhotos(bookPage + 1)} pageIndex={bookPage + 1} chapter={chapterLabels[bookPage + 1] ?? 'Colección'} startNum={(bookPage + 1) * 10 + 1} onPhotoClick={handlePhotoClick} rarityColor={rarityColor} rarityLabels={rarityLabels} />
                  </div>
                </div>
              )}

              {/* Flipping page — prev */}
              {flipping === 'prev' && (
                <div style={{ position: 'absolute', inset: 0, transformOrigin: 'left center', transformStyle: 'preserve-3d', transform: 'rotateY(-180deg)', animation: 'flipPrev 0.7s cubic-bezier(.45,.05,.55,.95) forwards', zIndex: 5 }}>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
                    <PageView photos={pagePhotos(bookPage - 1)} pageIndex={bookPage - 1} chapter={chapterLabels[bookPage - 1] ?? 'Colección'} startNum={(bookPage - 1) * 10 + 1} onPhotoClick={handlePhotoClick} rarityColor={rarityColor} rarityLabels={rarityLabels} />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', overflow: 'hidden' }}>
                    <PageView photos={pagePhotos(bookPage)} pageIndex={bookPage} chapter={chapterLabels[bookPage] ?? 'Colección'} startNum={bookPage * 10 + 1} onPhotoClick={handlePhotoClick} rarityColor={rarityColor} rarityLabels={rarityLabels} />
                  </div>
                </div>
              )}

              {/* Nav arrows */}
              <div onClick={flipPrev} style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 30, height: 50, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: bookPage === 0 ? 'not-allowed' : 'pointer', opacity: bookPage === 0 ? 0.25 : 1, zIndex: 10, userSelect: 'none' }}>‹</div>
              <div onClick={flipNext} style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', width: 30, height: 50, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: bookPage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: bookPage >= totalPages - 1 ? 0.25 : 1, zIndex: 10, userSelect: 'none' }}>›</div>
            </div>

            {/* Page dots */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', padding: '8px 0 4px' }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <div key={i} onClick={() => !flipping && setBookPage(i)} style={{ width: i === bookPage ? 14 : 4, height: 3, background: i === bookPage ? 'var(--ink)' : 'rgba(26,20,24,0.2)', transition: 'all 0.3s', cursor: 'pointer', borderRadius: 2 }} />
              ))}
            </div>

            <style>{`
              @keyframes flipNext {
                0%   { transform: rotateY(0deg); }
                50%  { box-shadow: -30px 0 50px rgba(0,0,0,0.3); }
                100% { transform: rotateY(-180deg); }
              }
              @keyframes flipPrev {
                0%   { transform: rotateY(-180deg); }
                50%  { box-shadow: 30px 0 50px rgba(0,0,0,0.3); }
                100% { transform: rotateY(0deg); }
              }
            `}</style>
          </div>
        )}


        {/* Fusion tab */}
        {activeTab === 'fusion' && collection && (
          <div style={{ padding: 16, paddingBottom: 100, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

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
          <div style={{ padding: 16, paddingBottom: 100, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

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
