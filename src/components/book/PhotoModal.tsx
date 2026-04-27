'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import type { AlbumPhoto } from '@/lib/actions/album'

type PhotoModalProps = {
  photo: AlbumPhoto | null
  allPhotos: AlbumPhoto[]
  onClose: () => void
  onNavigate: (photo: AlbumPhoto) => void
}

const rarityConfig = {
  COMMON: {
    label: 'Común',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/50',
    text: 'text-gray-400',
    glow: 'card-glow-common',
  },
  RARE: {
    label: 'Raro',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    glow: 'card-glow-rare',
  },
  EPIC: {
    label: 'Épico',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    glow: 'card-glow-epic',
  },
  LEGENDARY: {
    label: 'Legendario',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    glow: 'card-glow-legendary',
  },
}

export function PhotoModal({ photo, allPhotos, onClose, onNavigate }: PhotoModalProps) {
  const currentIndex = photo ? allPhotos.findIndex(p => p.id === photo.id) : -1
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < allPhotos.length - 1

  const [showConfirm, setShowConfirm] = useState(false)
  const [isAnimating, setIsAnimating] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const lastTapRef = useRef(0)

  const handleDownload = useCallback(async () => {
    if (!photo) return

    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const ext = photo.url.split('.').pop()?.split('?')[0] || 'jpg'
      const filename = `kwelps-${photo.rarity.toLowerCase()}-${photo.id.slice(0, 8)}.${ext}`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setShowConfirm(false)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [photo])

  const goPrev = useCallback(() => {
    if (canGoPrev && photo) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      onNavigate(allPhotos[currentIndex - 1])
    }
  }, [canGoPrev, currentIndex, allPhotos, onNavigate, photo])

  const goNext = useCallback(() => {
    if (canGoNext && photo) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      onNavigate(allPhotos[currentIndex + 1])
    }
  }, [canGoNext, currentIndex, allPhotos, onNavigate, photo])

  // Double tap to zoom
  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (zoom === 1) {
        setZoom(2)
      } else {
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }
    }
    lastTapRef.current = now
  }, [zoom])

  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      e.preventDefault()
    }
  }, [zoom, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setPan({ x: newX, y: newY })
    }
  }, [isDragging, zoom, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch support
  const touchStartRef = useRef<{ distance: number; zoom: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      touchStartRef.current = { distance, zoom }
    } else if (e.touches.length === 1 && zoom > 1) {
      panStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }
      setIsDragging(true)
    }
  }, [zoom, pan])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const scale = distance / touchStartRef.current.distance
      const newZoom = Math.max(1, Math.min(4, touchStartRef.current.zoom * scale))
      setZoom(newZoom)
      if (newZoom === 1) setPan({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && isDragging && panStartRef.current && zoom > 1) {
      const newX = e.touches[0].clientX - panStartRef.current.x
      const newY = e.touches[0].clientY - panStartRef.current.y
      setPan({ x: newX, y: newY })
    }
  }, [isDragging, zoom])

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null
    panStartRef.current = null
    setIsDragging(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 0.25, 4))
    } else {
      setZoom(prev => {
        const newZoom = Math.max(prev - 0.25, 1)
        if (newZoom === 1) setPan({ x: 0, y: 0 })
        return newZoom
      })
    }
  }, [])

  useEffect(() => {
    setIsAnimating(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [photo])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoom > 1) {
          setZoom(1)
          setPan({ x: 0, y: 0 })
        } else {
          onClose()
        }
      }
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goPrev, goNext, zoom])

  if (!photo) return null

  const config = rarityConfig[photo.rarity]
  const isZoomed = zoom > 1

  // Yellow blur style for controls when zoomed
  const controlStyle = isZoomed ? {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
  } : {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  }

  const iconColor = isZoomed ? '#fbbf24' : 'white'

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 touch-manipulation select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDoubleTap()
        }
      }}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowConfirm(false); onClose(); }}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={controlStyle}
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Rarity badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${config.bg} ${config.border} border ${config.text}`}>
          {config.label}
        </span>
        {photo.quantity > 1 && (
          <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500/20 border border-orange-500/50 text-orange-400">
            ×{photo.quantity}
          </span>
        )}
      </div>

      {/* Download button - only for COMMON, RARE, EPIC */}
      {photo.rarity !== 'LEGENDARY' && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className="absolute top-4 right-16 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={controlStyle}
          aria-label="Download photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div
        className={`w-full h-full flex items-center justify-center overflow-hidden ${zoom > 1 ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous button */}
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={!canGoPrev}
          className={`absolute left-2 sm:left-4 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            canGoPrev ? '' : 'opacity-30 cursor-not-allowed'
          }`}
          style={controlStyle}
          aria-label="Previous photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Image with zoom and pan */}
        <div
          className={`relative rounded-2xl p-1 ${config.glow} transition-transform duration-200 ease-out`}
          style={{
            background: 'transparent',
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            opacity: isAnimating ? 0 : 1,
          }}
        >
          <img
            src={photo.url}
            alt="Card"
            className={`w-full h-auto max-h-[80vh] sm:max-h-[85vh] object-contain rounded-xl transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
            draggable={false}
          />
        </div>

        {/* Next button */}
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={!canGoNext}
          className={`absolute right-2 sm:right-4 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            canGoNext ? '' : 'opacity-30 cursor-not-allowed'
          }`}
          style={controlStyle}
          aria-label="Next photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Photo counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-sm font-medium" style={{ color: isZoomed ? '#fbbf24' : 'rgba(255,255,255,0.6)' }}>
        {currentIndex + 1} / {allPhotos.length}
      </div>

      {/* Download confirmation dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glass rounded-xl p-6 max-w-sm w-full mx-4 text-center">
            <h3 className="text-lg font-bold text-white mb-4">¿Descargar imagen?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition-colors"
              >
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}