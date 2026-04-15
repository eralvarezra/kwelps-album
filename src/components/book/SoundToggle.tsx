// kwelps-album/src/components/book/SoundToggle.tsx
'use client'

type SoundToggleProps = {
  isMuted: boolean
  onToggle: () => void
}

export function SoundToggle({ isMuted, onToggle }: SoundToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
      aria-label={isMuted ? 'Unmute page flip sound' : 'Mute page flip sound'}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  )
}