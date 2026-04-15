// kwelps-album/src/components/book/BookModal.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AlbumCollection, AlbumStats } from '@/lib/actions/album'
import { BookSpread } from './BookSpread'
import { BookHeader } from './BookHeader'
import { PhotoModal } from './PhotoModal'
import { useSoundEffect } from './hooks/useSoundEffect'

type BookModalProps = {
  collection: AlbumCollection
  stats: AlbumStats | null
  isOpen: boolean
  onClose: () => void
}

export function BookModal({
  collection,
  stats,
  isOpen,
  onClose,
}: BookModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<typeof collection.photos[0] | null>(null)

  // Sound effect for page flips
  const { play: playFlipSound, muted, toggleMute } = useSoundEffect('/sounds/page-flip.mp3')

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) {
          setSelectedPhoto(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhoto, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handlePhotoClick = useCallback((photo: typeof collection.photos[0]) => {
    if (photo.quantity > 0) {
      setSelectedPhoto(photo)
    }
  }, [])

  const handleNavigatePhoto = useCallback((photo: typeof collection.photos[0]) => {
    setSelectedPhoto(photo)
  }, [])

  const handleFlip = useCallback(() => {
    playFlipSound()
  }, [playFlipSound])

  if (!isOpen) return null

  // Get collected photos (quantity > 0)
  const collectedPhotos = collection.photos.filter(p => p.quantity > 0)

  // Calculate rarity stats for header
  const byRarity = {
    LEGENDARY: collection.photos.filter(p => p.rarity === 'LEGENDARY' && p.quantity > 0).length,
    EPIC: collection.photos.filter(p => p.rarity === 'EPIC' && p.quantity > 0).length,
    RARE: collection.photos.filter(p => p.rarity === 'RARE' && p.quantity > 0).length,
    COMMON: collection.photos.filter(p => p.rarity === 'COMMON' && p.quantity > 0).length,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />

      {/* Header */}
      <BookHeader
        collectionName={collection.name}
        collectionPrize={collection.prize}
        collected={collection.collectedPhotos}
        total={collection.totalPhotos}
        byRarity={byRarity}
        currentPage={1}
        totalPages={Math.ceil(collection.photos.length / 10)}
        onSoundToggle={toggleMute}
        isMuted={muted}
      />

      {/* Book container */}
      <div
        className="flex-1 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full max-w-4xl aspect-[2/1]"
          style={{
            maxWidth: '70vw',
            maxHeight: '80vh',
          }}
        >
          <BookSpread
            photos={collection.photos}
            photosPerPage={10}
            onPhotoClick={handlePhotoClick}
            onFlip={handleFlip}
          />
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-colors z-10"
        aria-label="Close book"
      >
        ×
      </button>

      {/* Photo modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          allPhotos={collectedPhotos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={handleNavigatePhoto}
        />
      )}
    </div>
  )
}