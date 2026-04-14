'use client'

import { useEffect, useCallback, useState } from 'react'
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

  const handleDownload = useCallback(async () => {
    if (!photo) return

    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Extract extension from URL
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
      onNavigate(allPhotos[currentIndex - 1])
    }
  }, [canGoPrev, currentIndex, allPhotos, onNavigate, photo])

  const goNext = useCallback(() => {
    if (canGoNext && photo) {
      onNavigate(allPhotos[currentIndex + 1])
    }
  }, [canGoNext, currentIndex, allPhotos, onNavigate, photo])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goPrev, goNext])

  if (!photo) return null

  const config = rarityConfig[photo.rarity]

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={() => { setShowConfirm(false); onClose(); }}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
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
          className="absolute top-4 right-16 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Download photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}

      {/* Navigation and Image */}
      <div className="w-full h-full flex items-center justify-center px-16 sm:px-20" onClick={e => e.stopPropagation()}>
        {/* Previous button */}
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={!canGoPrev}
          className={`absolute left-2 sm:left-4 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            canGoPrev ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
          aria-label="Previous photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Image container */}
        <div className={`w-full h-full max-w-[95vw] sm:max-w-[85vw] flex items-center justify-center`}>
          <div className={`relative rounded-2xl p-1 ${config.glow}`} style={{ background: 'transparent' }}>
            <img
              src={photo.url}
              alt="Card"
              className="w-full h-auto max-h-[80vh] sm:max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={!canGoNext}
          className={`absolute right-2 sm:right-4 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            canGoNext ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
          aria-label="Next photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Photo counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-sm text-white/60 font-medium">
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
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
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