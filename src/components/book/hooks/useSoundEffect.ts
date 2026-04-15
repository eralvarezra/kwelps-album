// kwelps-album/src/components/book/hooks/useSoundEffect.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useSoundEffect(soundPath: string) {
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isLoadedRef = useRef(false)

  useEffect(() => {
    // Only create audio on client side
    if (typeof window === 'undefined') return

    // Check if sound file exists before creating Audio
    const audio = new Audio()
    audio.preload = 'none' // Don't load until needed

    audio.addEventListener('canplaythrough', () => {
      isLoadedRef.current = true
    }, { once: true })

    audio.addEventListener('error', () => {
      // Sound file doesn't exist, gracefully degrade
      isLoadedRef.current = false
    }, { once: true })

    audio.src = soundPath
    audio.volume = 0.3 // 30% volume
    audioRef.current = audio

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = '' // Clear source to stop loading
        audioRef.current = null
        isLoadedRef.current = false
      }
    }
  }, [soundPath])

  const play = useCallback(() => {
    if (muted || !audioRef.current || !isLoadedRef.current) return

    try {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Autoplay policy may block, ignore silently
      })
    } catch {
      // Sound playback failed, continue silently
    }
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev)
  }, [])

  return {
    play,
    muted,
    setMuted,
    toggleMute,
  }
}