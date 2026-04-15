'use client'

import { useEffect, useState } from 'react'

export function FormattedDate({ date }: { date: Date | string }) {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    setFormatted(new Date(date).toLocaleDateString())
  }, [date])

  return <span suppressHydrationWarning>{formatted || '...'}</span>
}