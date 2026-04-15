'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generatePackRarities } from '@/lib/gacha/rng'
import { PACK_PRICE, SINGLE_PRICE, type PullResult, type PackResult, type Rarity } from '@/lib/store/types'
import { checkUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Get active collection with photos for gacha
 */
async function getActiveCollection(collectionId?: string) {
  const where = collectionId ? { id: collectionId, active: true } : { active: true }

  const collection = await prisma.collection.findFirst({
    where,
    include: {
      photos: true,
    },
  })

  if (!collection) {
    throw new Error('No active collection available')
  }

  return collection
}

/**
 * Select a random photo of a specific rarity from the collection
 */
function selectRandomPhotoByRarity(
  photos: { id: string; url: string; thumbnailUrl: string | null; rarity: Rarity }[],
  rarity: Rarity
) {
  const photosOfRarity = photos.filter((p) => p.rarity === rarity)

  if (photosOfRarity.length === 0) {
    // Fallback to lower rarity if not available
    const fallbackOrder: Rarity[] = ['EPIC', 'RARE', 'COMMON', 'LEGENDARY']
    for (const fallbackRarity of fallbackOrder) {
      const fallback = photos.filter((p) => p.rarity === fallbackRarity)
      if (fallback.length > 0) {
        return fallback[Math.floor(Math.random() * fallback.length)]
      }
    }
    throw new Error('No photos available in collection')
  }

  return photosOfRarity[Math.floor(Math.random() * photosOfRarity.length)]
}

/**
 * Purchase a pack (3 photos)
 */
export async function purchasePack(collectionId?: string): Promise<PackResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Rate limiting check
  const rateLimitResult = checkUserRateLimit(user.id, 'purchasePack', RATE_LIMITS.GACHA)
  if (!rateLimitResult.allowed) {
    throw new Error(`Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`)
  }

  const result = await prisma.$transaction(async (tx) => {
    // Check balance
    const wallet = await tx.wallet.findUnique({
      where: { userId: user.id },
    })

    if (!wallet || wallet.balance.toNumber() < PACK_PRICE) {
      throw new Error('Insufficient balance')
    }

    // Get active collection
    const collection = await tx.collection.findFirst({
      where: collectionId ? { id: collectionId, active: true } : { active: true },
      include: { photos: true },
    })

    if (!collection || collection.photos.length === 0) {
      throw new Error('No active collection with photos')
    }

    // Get pity counter
    let pityCounter = await tx.pityCounter.findUnique({
      where: { userId: user.id },
    })

    if (!pityCounter) {
      pityCounter = await tx.pityCounter.create({
        data: { userId: user.id },
      })
    }

    // Determine if guaranteed legendary
    const isGuaranteedLegendary = pityCounter.legendaryCounter >= 20

    // Generate rarities for pack
    const rarities = generatePackRarities(isGuaranteedLegendary)

    // Select photos
    const selectedPhotos = rarities.map((rarity) =>
      selectRandomPhotoByRarity(collection.photos, rarity)
    )

    // Deduct balance
    await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: { decrement: PACK_PRICE } },
    })

    // Create transaction
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'PACK_PURCHASE',
        amount: PACK_PRICE,
        status: 'COMPLETED',
      },
    })

    // Add photos to user's collection
    const pullResults: PullResult[] = []
    let hadLegendary = false

    for (const photo of selectedPhotos) {
      if (photo.rarity === 'LEGENDARY') {
        hadLegendary = true
      }

      // Check if user already has this photo
      const existingPhoto = await tx.userPhoto.findUnique({
        where: {
          userId_photoId: {
            userId: user.id,
            photoId: photo.id,
          },
        },
      })

      if (existingPhoto) {
        // Increment quantity
        await tx.userPhoto.update({
          where: { id: existingPhoto.id },
          data: { quantity: { increment: 1 } },
        })
        pullResults.push({
          ...photo,
          isNew: false,
        })
      } else {
        // Create new entry
        await tx.userPhoto.create({
          data: {
            userId: user.id,
            photoId: photo.id,
            quantity: 1,
          },
        })
        pullResults.push({
          ...photo,
          isNew: true,
        })
      }
    }

    // Update pity counter
    if (hadLegendary) {
      // Reset pity counter
      await tx.pityCounter.update({
        where: { userId: user.id },
        data: { legendaryCounter: 0 },
      })
    } else {
      // Increment pity counter by 3 (one per photo)
      await tx.pityCounter.update({
        where: { userId: user.id },
        data: { legendaryCounter: { increment: 3 } },
      })
    }

    return { photos: pullResults, totalCost: PACK_PRICE }
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/wallet')
  revalidatePath('/dashboard/album')

  return result
}

/**
 * Purchase a single photo (random from active collection)
 */
export async function purchaseSingle(collectionId?: string): Promise<PullResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Rate limiting check
  const rateLimitResult = checkUserRateLimit(user.id, 'purchaseSingle', RATE_LIMITS.GACHA)
  if (!rateLimitResult.allowed) {
    throw new Error(`Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`)
  }

  const result = await prisma.$transaction(async (tx) => {
    // Check balance
    const wallet = await tx.wallet.findUnique({
      where: { userId: user.id },
    })

    if (!wallet || wallet.balance.toNumber() < SINGLE_PRICE) {
      throw new Error('Insufficient balance')
    }

    // Get active collection
    const collection = await tx.collection.findFirst({
      where: collectionId ? { id: collectionId, active: true } : { active: true },
      include: { photos: true },
    })

    if (!collection || collection.photos.length === 0) {
      throw new Error('No active collection with photos')
    }

    // Get pity counter
    let pityCounter = await tx.pityCounter.findUnique({
      where: { userId: user.id },
    })

    if (!pityCounter) {
      pityCounter = await tx.pityCounter.create({
        data: { userId: user.id },
      })
    }

    // Determine rarity (simpler for single - just weighted random)
    const isGuaranteedLegendary = pityCounter.legendaryCounter >= 20
    let rarity: Rarity

    if (isGuaranteedLegendary) {
      rarity = 'LEGENDARY'
    } else {
      // Weighted random selection
      const weights = { COMMON: 60, RARE: 25, EPIC: 10, LEGENDARY: 5 }
      let random = Math.random() * 100
      rarity = 'COMMON'
      for (const r of ['LEGENDARY', 'EPIC', 'RARE', 'COMMON'] as Rarity[]) {
        if (random < weights[r]) {
          rarity = r
          break
        }
        random -= weights[r]
      }
    }

    // Select random photo of that rarity
    const photo = selectRandomPhotoByRarity(collection.photos, rarity)

    // Deduct balance
    await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: { decrement: SINGLE_PRICE } },
    })

    // Create transaction
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'SINGLE_PURCHASE',
        amount: SINGLE_PRICE,
        status: 'COMPLETED',
      },
    })

    // Add to user's collection
    const existingPhoto = await tx.userPhoto.findUnique({
      where: {
        userId_photoId: {
          userId: user.id,
          photoId: photo.id,
        },
      },
    })

    if (existingPhoto) {
      await tx.userPhoto.update({
        where: { id: existingPhoto.id },
        data: { quantity: { increment: 1 } },
      })
    } else {
      await tx.userPhoto.create({
        data: {
          userId: user.id,
          photoId: photo.id,
          quantity: 1,
        },
      })
    }

    // Update pity counter
    if (rarity === 'LEGENDARY') {
      await tx.pityCounter.update({
        where: { userId: user.id },
        data: { legendaryCounter: 0 },
      })
    } else {
      await tx.pityCounter.update({
        where: { userId: user.id },
        data: { legendaryCounter: { increment: 1 } },
      })
    }

    return {
      ...photo,
      isNew: !existingPhoto,
    }
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/wallet')
  revalidatePath('/dashboard/album')

  return result
}

/**
 * Get user's pity counter info
 */
export async function getPityInfo() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const pityCounter = await prisma.pityCounter.findUnique({
    where: { userId: user.id },
  })

  const counter = pityCounter?.legendaryCounter ?? 0

  return {
    current: counter,
    remaining: 20 - counter,
    isGuaranteed: counter >= 20,
  }
}

/**
 * Get store info (active collections, prices)
 */
export async function getStoreInfo() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const [wallet, collections, pityInfo] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: user.id },
    }),
    prisma.collection.findMany({
      where: { active: true },
      include: {
        photos: {
          select: {
            id: true,
            rarity: true,
          },
        },
      },
    }),
    getPityInfo(),
  ])

  // Format collections with rarity counts
  const formattedCollections = collections.map((collection) => {
    const rarityCount = {
      COMMON: 0,
      RARE: 0,
      EPIC: 0,
      LEGENDARY: 0,
    }

    for (const photo of collection.photos) {
      rarityCount[photo.rarity]++
    }

    return {
      id: collection.id,
      name: collection.name,
      totalPhotos: collection.photos.length,
      rarityCount,
    }
  })

  return {
    balance: wallet?.balance?.toNumber() ?? 0,
    collections: formattedCollections,
    pity: pityInfo,
    prices: {
      pack: PACK_PRICE,
      single: SINGLE_PRICE,
    },
  }
}