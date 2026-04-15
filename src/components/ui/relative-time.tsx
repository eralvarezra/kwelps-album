'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'

export function RelativeTime({ date }: { date: Date }) {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    setFormatted(
      formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: es,
      })
    )
  }, [date])

  return <span suppressHydrationWarning>{formatted || '...'}</span>
}