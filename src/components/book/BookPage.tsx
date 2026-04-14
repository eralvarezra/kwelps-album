'use client'

import { PhotoCard } from './PhotoCard'
import type { AlbumPhoto } from '@/lib/actions/album'

type BookPageProps = {
  photos: AlbumPhoto[]
  startIndex: number
  onPhotoClick?: (photo: AlbumPhoto) => void
}

export function BookPage({ photos, startIndex, onPhotoClick }: BookPageProps) {
  return (
    <div className="w-full h-full book-page rounded-2xl">
      <div
        className="grid gap-2 sm:gap-4 p-2 sm:p-4 w-full h-full"
        style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}
      >
        {photos.map((photo, index) => (
          <div key={photo.id} className="w-full h-full flex items-center justify-center overflow-hidden">
            <PhotoCard
              photo={photo}
              number={startIndex + index}
              size="standard"
              onClick={() => onPhotoClick?.(photo)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}