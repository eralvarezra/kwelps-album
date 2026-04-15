'use client'

import { useState, useEffect } from 'react'

export function CurrentDate() {
  const [date, setDate] = useState('')

  useEffect(() => {
    setDate(new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }))
  }, [])

  return <span suppressHydrationWarning>{date || '...'}</span>
}