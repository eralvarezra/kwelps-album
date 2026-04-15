'use client'

import { useState, useEffect } from 'react'

type CarouselImage = {
  id: string
  url: string
  thumbnailUrl: string | null
}

export function LoginBackground({ images }: { images: CarouselImage[] }) {
  const [visibleImages, setVisibleImages] = useState<CarouselImage[]>([])

  // Use provided images or fallback
  const displayImages = images.length > 0 ? images : []

  useEffect(() => {
    if (displayImages.length === 0) return

    // Initial set of images (up to 3)
    const initialSet = displayImages.slice(0, Math.min(3, displayImages.length))
    setVisibleImages(initialSet)

    if (displayImages.length <= 1) return

    // Rotate images every 4 seconds
    const interval = setInterval(() => {
      setVisibleImages((prev) => {
        // Get current indices
        const currentIds = new Set(prev.map(img => img.id))

        // Pick a random image to replace
        const replaceIndex = Math.floor(Math.random() * prev.length)

        // Find available images not currently shown
        const availableImages = displayImages.filter(img => !currentIds.has(img.id))

        if (availableImages.length === 0) return prev

        // Pick a random new image
        const newImage = availableImages[Math.floor(Math.random() * availableImages.length)]

        const newSet = [...prev]
        newSet[replaceIndex] = newImage
        return newSet
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [displayImages])

  if (displayImages.length === 0) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-purple-900/20 to-[#0F172A]" />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Grid of images - 1 row, 3 columns */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-1 gap-1">
        {visibleImages.slice(0, 3).map((image, index) => (
          <div
            key={`${image.id}-${index}`}
            className="relative overflow-hidden"
          >
            <div
              className="absolute inset-0 blur-sm transition-all duration-1000 hover:blur-none"
              style={{
                backgroundImage: `url(${image.thumbnailUrl || image.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>
        ))}
      </div>

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-purple-900/40 z-[1]" />

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,black_100%)] z-[3] opacity-40" />
    </div>
  )
}