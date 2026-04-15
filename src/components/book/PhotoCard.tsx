'use client'

import type { AlbumPhoto } from '@/lib/actions/album'

type PhotoCardProps = {
  photo: AlbumPhoto
  number: number
  size: 'large' | 'standard'
  onClick?: () => void
}

const rarityConfig = {
  COMMON: {
    border: 'border-gray-500/30',
    glow: 'card-glow-common',
    bg: 'from-gray-800/50 to-gray-900/50',
    text: 'text-gray-400',
    label: 'COMÚN',
  },
  RARE: {
    border: 'border-blue-500/50',
    glow: 'card-glow-rare',
    bg: 'from-blue-900/30 to-blue-950/50',
    text: 'text-blue-400',
    label: 'RARO',
  },
  EPIC: {
    border: 'border-purple-500/50',
    glow: 'card-glow-epic',
    bg: 'from-purple-900/30 to-purple-950/50',
    text: 'text-purple-400',
    label: 'ÉPICO',
  },
  LEGENDARY: {
    border: 'border-yellow-500/60',
    glow: 'card-glow-legendary',
    bg: 'from-yellow-900/20 to-amber-950/40',
    text: 'text-yellow-400',
    label: 'LENDARIO',
  },
}

export function PhotoCard({ photo, number, size, onClick }: PhotoCardProps) {
  const { rarity, quantity, thumbnailUrl, url } = photo
  const config = rarityConfig[rarity]
  const isUncollected = quantity === 0
  const isLegendary = rarity === 'LEGENDARY'

  return (
    <button
      onClick={onClick}
      disabled={isUncollected}
      className={`
        relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden
        border-2 ${config.border}
        ${!isUncollected ? config.glow : ''}
        ${!isUncollected ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-not-allowed'}
        ${isLegendary && !isUncollected ? 'legendary-shine' : ''}
        bg-gradient-to-br ${isUncollected ? 'from-gray-800/30 to-gray-900/50' : config.bg}
        group
      `}
    >
      {isUncollected ? (
        // Uncollected card
        <div className="w-full h-full flex flex-col items-center justify-center uncollected-card rounded-xl sm:rounded-2xl">
          <span className="text-3xl sm:text-5xl font-bold text-gray-600/50">?</span>
          <span className="badge text-gray-600/70 mt-1 text-xs sm:text-sm">#{number}</span>
        </div>
      ) : (
        <>
          {/* Collected card - use full quality image */}
          <img
            src={url}
            alt={`Card ${number}`}
            className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
            loading="lazy"
          />

          {/* Card overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Number badge */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-black/70 backdrop-blur-sm text-white text-xs sm:text-sm font-bold w-6 h-6 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-lg">
            {number}
          </div>

          {/* Quantity badge */}
          {quantity > 1 && (
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-lg">
              ×{quantity}
            </div>
          )}

          {/* Rarity indicator */}
          <div className={`absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 ${config.text}`}>
            <div className="flex items-center justify-between">
              <span className="badge opacity-80 text-xs sm:text-sm">{config.label}</span>
              {quantity > 0 && (
                <span className="text-xs sm:text-sm opacity-60">en posesión</span>
              )}
            </div>
          </div>
        </>
      )}
    </button>
  )
}