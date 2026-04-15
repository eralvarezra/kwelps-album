// kwelps-album/src/components/book/hooks/usePageFlip.ts
'use client'

import { useCallback, useState } from 'react'

export type PageFlipState = {
  currentPage: number
  canFlipNext: boolean
  canFlipPrev: boolean
  isReady: boolean
}

export function usePageFlip(
  containerRef: React.RefObject<HTMLDivElement | null>,
  totalPages: number,
  onFlip?: () => void
) {
  const [state, setState] = useState<PageFlipState>({
    currentPage: 0,
    canFlipNext: totalPages > 1,
    canFlipPrev: false,
    isReady: true, // Always ready since we're using CSS transforms
  })

  const flipNext = useCallback(() => {
    setState(prev => {
      if (prev.currentPage < totalPages - 1) {
        onFlip?.()
        return {
          ...prev,
          currentPage: prev.currentPage + 1,
          canFlipNext: prev.currentPage + 1 < totalPages - 1,
          canFlipPrev: true,
        }
      }
      return prev
    })
  }, [totalPages, onFlip])

  const flipPrev = useCallback(() => {
    setState(prev => {
      if (prev.currentPage > 0) {
        onFlip?.()
        return {
          ...prev,
          currentPage: prev.currentPage - 1,
          canFlipNext: true,
          canFlipPrev: prev.currentPage - 1 > 0,
        }
      }
      return prev
    })
  }, [onFlip])

  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setState(prev => ({
        ...prev,
        currentPage: pageNumber,
        canFlipNext: pageNumber < totalPages - 1,
        canFlipPrev: pageNumber > 0,
      }))
    }
  }, [totalPages])

  return {
    ...state,
    totalPages,
    flipNext,
    flipPrev,
    goToPage,
  }
}