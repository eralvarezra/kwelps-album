'use client'

import { useState } from 'react'

type Particle = {
  id: number
  left: number
  top: number
  delay: number
  duration: number
}

// Generate particles once using lazy initializer
// This runs only once when component mounts (not on every render)
function generateParticles(): Particle[] {
  if (typeof window === 'undefined') return []
  return [...Array(20)].map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 1 + Math.random(),
  }))
}

export function LegendaryParticles() {
  // Lazy initializer - only runs once on client-side
  const [particles] = useState(generateParticles)

  if (particles.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  )
}