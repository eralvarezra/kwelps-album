// Weighted random selection for gacha system
// Rarity weights based on real gacha games:
// - COMMON: 55% (typical gacha: 50-70%)
// - RARE: 35% (typical gacha: 27-47%)
// - EPIC: 8.5% (typical gacha: 4-12%)
// - LEGENDARY: 1.5% (typical gacha: 0.5-2%)

import { randomBytes } from 'crypto'

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 55,
  RARE: 35,
  EPIC: 8.5,
  LEGENDARY: 1.5,
}

export const RARITY_ORDER: Rarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY']

/**
 * Generate a cryptographically secure random number between 0 and 1
 * Uses Node.js crypto module for better randomness
 */
function secureRandom(): number {
  // Get 4 random bytes (32 bits of randomness)
  const buffer = randomBytes(4)
  // Convert to a 32-bit unsigned integer
  const randomInt = buffer.readUInt32BE(0)
  // Divide by max value to get a number between 0 and 1
  return randomInt / 0xFFFFFFFF
}

/**
 * Selects a random rarity based on weighted probabilities
 * Uses cryptographically secure random number generator
 */
export function selectRandomRarity(): Rarity {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, w) => sum + w, 0)
  let random = secureRandom() * totalWeight

  for (const rarity of RARITY_ORDER) {
    random -= RARITY_WEIGHTS[rarity]
    if (random <= 0) {
      return rarity
    }
  }

  return 'COMMON'
}

/**
 * Selects a random rarity with guaranteed rare or higher (bad luck protection)
 */
export function selectRandomRarityWithGuarantee(): Rarity {
  // First roll is normal
  const firstRoll = selectRandomRarity()

  // If it's rare or higher, we're done
  if (firstRoll !== 'COMMON') {
    return firstRoll
  }

  // Second roll - guaranteed rare or higher (redistribute weights)
  const guaranteedWeights = {
    RARE: 80.5, // 35 / 43.5 * 100 (proportional to original)
    EPIC: 19.5, // 8.5 / 43.5 * 100
    LEGENDARY: 0, // Legendary only from pity
  }

  const random = secureRandom() * 100
  if (random < guaranteedWeights.EPIC) {
    return 'EPIC'
  }
  return 'RARE'
}

/**
 * Generates an array of rarities for a pack (4 photos)
 * Includes bad luck protection: at least 1 rare or higher
 */
export function generatePackRarities(isGuaranteedLegendary: boolean): Rarity[] {
  const rarities: Rarity[] = []

  // If guaranteed legendary, first card is legendary
  if (isGuaranteedLegendary) {
    rarities.push('LEGENDARY')
  } else {
    rarities.push(selectRandomRarity())
  }

  // Second card - normal roll
  rarities.push(selectRandomRarity())

  // Third card - normal roll
  rarities.push(selectRandomRarity())

  // Fourth card - with bad luck protection (guaranteed rare+)
  // But skip if we already have a rare+ card
  const hasRareOrHigher = rarities.some(r => r !== 'COMMON')
  if (hasRareOrHigher) {
    rarities.push(selectRandomRarity())
  } else {
    rarities.push(selectRandomRarityWithGuarantee())
  }

  return rarities
}

/**
 * Calculates pity progress (0-20)
 * Legendary guaranteed at 20 pulls without legendary
 */
export function calculatePityProgress(currentCounter: number): {
  pulls: number
  remaining: number
  isGuaranteed: boolean
} {
  return {
    pulls: currentCounter,
    remaining: 20 - currentCounter,
    isGuaranteed: currentCounter >= 20,
  }
}