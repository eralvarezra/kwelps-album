'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AlbumPhoto } from '@/lib/actions/album'
import { BookPage } from './BookPage'

// Animation timing constants
const FLIP_DURATION_MS = 600
const FLIP_MIDPOINT_MS = FLIP_DURATION_MS / 2

type BookSpreadProps = {
  photos: AlbumPhoto[]
  photosPerPage: number
  onPhotoClick?: (photo: AlbumPhoto) => void
  onFlip?: () => void
}

export function BookSpread({
  photos,
  photosPerPage = 6,
  onPhotoClick,
  onFlip,
}: BookSpreadProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)

  // Timeout refs for cleanup on unmount
  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current)
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
    }
  }, [])

  const pages: AlbumPhoto[][] = []
  for (let i = 0; i < photos.length; i += photosPerPage) {
    pages.push(photos.slice(i, i + photosPerPage))
  }

  const totalPages = Math.max(pages.length, 1)
  const startNumber = currentPage * photosPerPage + 1
  const currentPagePhotos = pages[currentPage] || []
  const nextPagePhotos = pages[currentPage + 1] || []
  const prevPagePhotos = pages[currentPage - 1] || []

  const canFlipPrev = currentPage > 0
  const canFlipNext = currentPage < totalPages - 1

  const flipNext = useCallback(() => {
    if (canFlipNext && !isFlipping) {
      setFlipDirection('next')
      setIsFlipping(true)
      onFlip?.()

      flipTimeoutRef.current = setTimeout(() => {
        setCurrentPage(currentPage + 1)
      }, FLIP_MIDPOINT_MS)

      resetTimeoutRef.current = setTimeout(() => {
        setIsFlipping(false)
        setFlipDirection(null)
      }, FLIP_DURATION_MS)
    }
  }, [currentPage, canFlipNext, isFlipping, onFlip])

  const flipPrev = useCallback(() => {
    if (canFlipPrev && !isFlipping) {
      setFlipDirection('prev')
      setIsFlipping(true)
      onFlip?.()

      flipTimeoutRef.current = setTimeout(() => {
        setCurrentPage(currentPage - 1)
      }, FLIP_MIDPOINT_MS)

      resetTimeoutRef.current = setTimeout(() => {
        setIsFlipping(false)
        setFlipDirection(null)
      }, FLIP_DURATION_MS)
    }
  }, [currentPage, canFlipPrev, isFlipping, onFlip])

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Album container - responsive sizing with 3D perspective */}
      <div className="w-full h-auto flex items-center justify-center">
        <div
          className="album-container rounded-2xl overflow-hidden"
          style={{
            width: 'min(600px, 90vw)',
            height: 'min(750px, 70vh)',
            perspective: '1200px',
          }}
        >
          {/* Page container with 3D transform support */}
          <div
            className="relative w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Base layer - shows behind during flip */}
            {flipDirection === 'prev' && prevPagePhotos.length > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  zIndex: 5,
                }}
              >
                <BookPage
                  photos={prevPagePhotos}
                  startIndex={(currentPage - 1) * photosPerPage + 1}
                  onPhotoClick={onPhotoClick}
                />
              </div>
            )}

            {flipDirection === 'next' && nextPagePhotos.length > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  zIndex: 5,
                }}
              >
                <BookPage
                  photos={nextPagePhotos}
                  startIndex={(currentPage + 1) * photosPerPage + 1}
                  onPhotoClick={onPhotoClick}
                />
              </div>
            )}

            {/* Flipping layer - animates on top */}
            {flipDirection === 'prev' && (
              <div
                className="absolute inset-0 page-flip-in-reverse"
                style={{
                  transformOrigin: 'left center',
                  backfaceVisibility: 'hidden',
                  zIndex: 20,
                }}
              >
                <BookPage
                  photos={currentPagePhotos}
                  startIndex={startNumber}
                  onPhotoClick={onPhotoClick}
                />
              </div>
            )}

            {flipDirection === 'next' && (
              <div
                className="absolute inset-0 page-flip-out"
                style={{
                  transformOrigin: 'left center',
                  backfaceVisibility: 'hidden',
                  zIndex: 20,
                }}
              >
                <BookPage
                  photos={currentPagePhotos}
                  startIndex={startNumber}
                  onPhotoClick={onPhotoClick}
                />
              </div>
            )}

            {/* Current page - main content (visible when not flipping) */}
            {!isFlipping && (
              <div
                className="w-full h-full"
                style={{
                  backfaceVisibility: 'hidden',
                  transformStyle: 'preserve-3d',
                }}
              >
                <BookPage
                  photos={currentPagePhotos}
                  startIndex={startNumber}
                  onPhotoClick={onPhotoClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={flipPrev}
        disabled={!canFlipPrev || isFlipping}
        className="nav-arrow absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-16 sm:w-12 sm:h-24 rounded-r-lg flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        onClick={flipNext}
        disabled={!canFlipNext || isFlipping}
        className="nav-arrow absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-16 sm:w-12 sm:h-24 rounded-l-lg flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Page indicator */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2">
        <span className="text-xs sm:text-sm text-white/40 font-medium">
          {currentPage + 1} / {totalPages}
        </span>
      </div>
    </div>
  )
}