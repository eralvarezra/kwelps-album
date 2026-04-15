// kwelps-album/src/components/book/PageControls.tsx
'use client'

type PageControlsProps = {
  canFlipPrev: boolean
  canFlipNext: boolean
  onFlipPrev: () => void
  onFlipNext: () => void
}

export function PageControls({
  canFlipPrev,
  canFlipNext,
  onFlipPrev,
  onFlipNext,
}: PageControlsProps) {
  return (
    <>
      {/* Previous page arrow */}
      <button
        onClick={onFlipPrev}
        disabled={!canFlipPrev}
        className={`
          absolute left-2 top-1/2 -translate-y-1/2
          w-12 h-24 rounded-r-lg
          flex items-center justify-center
          text-3xl font-bold
          transition-all duration-200
          ${canFlipPrev
            ? 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'
            : 'bg-transparent text-white/30 cursor-not-allowed'}
        `}
        aria-label="Previous page"
      >
        ‹
      </button>

      {/* Next page arrow */}
      <button
        onClick={onFlipNext}
        disabled={!canFlipNext}
        className={`
          absolute right-2 top-1/2 -translate-y-1/2
          w-12 h-24 rounded-l-lg
          flex items-center justify-center
          text-3xl font-bold
          transition-all duration-200
          ${canFlipNext
            ? 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'
            : 'bg-transparent text-white/30 cursor-not-allowed'}
        `}
        aria-label="Next page"
      >
        ›
      </button>
    </>
  )
}