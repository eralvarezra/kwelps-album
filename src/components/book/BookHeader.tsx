'use client'

type BookHeaderProps = {
  collectionName: string
  collectionPrize?: string
  collected: number
  total: number
  byRarity: {
    COMMON: number
    RARE: number
    EPIC: number
    LEGENDARY: number
  }
  currentPage: number
  totalPages: number
  onSoundToggle?: () => void
  isMuted?: boolean
}

export function BookHeader({
  collectionName,
  collectionPrize,
  collected,
  total,
  byRarity,
  onSoundToggle,
  isMuted,
}: BookHeaderProps) {
  const percentage = total > 0 ? Math.round((collected / total) * 100) : 0

  return (
    <header className="glass-dark">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Collection info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">{collectionName}</h1>
            {collectionPrize && (
              <p className="text-xs text-yellow-400 mt-0.5">Premio: {collectionPrize}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-400">
                {collected}<span className="text-gray-600">/{total}</span>
              </span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-sm font-semibold text-purple-400">{percentage}%</span>
            </div>
          </div>
        </div>

        {/* Center: Progress bar */}
        <div className="hidden sm:block flex-1 max-w-xs mx-6">
          <div className="progress-bar h-2">
            <div
              className="progress-fill h-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Right: Rarity counts */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            {/* Legendary */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
              <span className="text-xs text-gray-400 font-medium">{byRarity.LEGENDARY}</span>
            </div>
            {/* Epic */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />
              <span className="text-xs text-gray-400 font-medium">{byRarity.EPIC}</span>
            </div>
            {/* Rare */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              <span className="text-xs text-gray-400 font-medium">{byRarity.RARE}</span>
            </div>
            {/* Common */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-xs text-gray-400 font-medium">{byRarity.COMMON}</span>
            </div>
          </div>

          {/* Sound toggle */}
          {onSoundToggle && (
            <button
              onClick={onSoundToggle}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}