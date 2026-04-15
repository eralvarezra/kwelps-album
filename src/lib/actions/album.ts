'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AlbumPhoto = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  quantity: number
  obtainedAt: Date
}

export type AlbumCollection = {
  id: string
  name: string
  description: string | null
  prize: string
  active: boolean
  totalPhotos: number
  collectedPhotos: number
  photos: AlbumPhoto[]
}

export type AlbumStats = {
  totalPhotos: number
  uniquePhotos: number
  duplicates: number
  byRarity: {
    COMMON: { total: number; collected: number }
    RARE: { total: number; collected: number }
    EPIC: { total: number; collected: number }
    LEGENDARY: { total: number; collected: number }
  }
}

/**
 * Get user's album with all collections and collected photos
 */
export async function getAlbum() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  // Get all collections with their photos
  const collections = await prisma.collection.findMany({
    include: {
      photos: {
        orderBy: { rarity: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get user's collected photos
  const userPhotos = await prisma.userPhoto.findMany({
    where: { userId: user.id },
    include: {
      photo: true,
    },
  })

  // Create a map for quick lookup
  const userPhotoMap = new Map(
    userPhotos.map((up) => [up.photoId, { quantity: up.quantity, obtainedAt: up.obtainedAt }])
  )

  // Build album data
  const album: AlbumCollection[] = collections.map((collection) => {
    const photos: AlbumPhoto[] = collection.photos.map((photo) => {
      const collected = userPhotoMap.get(photo.id)
      return {
        id: photo.id,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        rarity: photo.rarity,
        quantity: collected?.quantity ?? 0,
        obtainedAt: collected?.obtainedAt ?? new Date(),
      }
    })

    const collectedPhotos = photos.filter((p) => p.quantity > 0).length

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      prize: collection.prize,
      active: collection.active,
      totalPhotos: collection.photos.length,
      collectedPhotos,
      photos,
    }
  })

  return album
}

/**
 * Get user's album statistics
 */
export async function getAlbumStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get all photos in active collection
  const activeCollection = await prisma.collection.findFirst({
    where: { active: true },
    include: { photos: true },
  })

  if (!activeCollection) {
    return null
  }

  // Get user's collected photos
  const userPhotos = await prisma.userPhoto.findMany({
    where: { userId: user.id },
    include: { photo: true },
  })

  // Calculate stats
  const byRarity = {
    COMMON: { total: 0, collected: 0 },
    RARE: { total: 0, collected: 0 },
    EPIC: { total: 0, collected: 0 },
    LEGENDARY: { total: 0, collected: 0 },
  }

  // Count total by rarity
  for (const photo of activeCollection.photos) {
    byRarity[photo.rarity].total++
  }

  // Count collected by rarity
  let uniquePhotos = 0
  let duplicates = 0

  for (const up of userPhotos) {
    if (up.photo.collectionId === activeCollection.id) {
      if (up.quantity > 0) {
        uniquePhotos++
        byRarity[up.photo.rarity].collected++
      }
      if (up.quantity > 1) {
        duplicates += up.quantity - 1
      }
    }
  }

  return {
    totalPhotos: activeCollection.photos.length,
    uniquePhotos,
    duplicates,
    byRarity,
    collectionName: activeCollection.name,
  }
}

/**
 * Get a specific collection's album view
 */
export async function getCollectionAlbum(collectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      photos: {
        orderBy: [{ rarity: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!collection) {
    return null
  }

  // Get user's collected photos for this collection
  const userPhotos = await prisma.userPhoto.findMany({
    where: {
      userId: user.id,
      photo: { collectionId },
    },
    include: { photo: true },
  })

  const userPhotoMap = new Map(
    userPhotos.map((up) => [up.photoId, { quantity: up.quantity, obtainedAt: up.obtainedAt }])
  )

  const photos: AlbumPhoto[] = collection.photos.map((photo) => {
    const collected = userPhotoMap.get(photo.id)
    return {
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      rarity: photo.rarity,
      quantity: collected?.quantity ?? 0,
      obtainedAt: collected?.obtainedAt ?? new Date(),
    }
  })

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    prize: collection.prize,
    active: collection.active,
    totalPhotos: collection.photos.length,
    collectedPhotos: photos.filter((p) => p.quantity > 0).length,
    photos,
  }
}

/**
 * Get recent pulls for the user
 */
export async function getRecentPulls(limit = 10) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const recentPhotos = await prisma.userPhoto.findMany({
    where: { userId: user.id },
    include: {
      photo: {
        include: { collection: true },
      },
    },
    orderBy: { obtainedAt: 'desc' },
    take: limit,
  })

  return recentPhotos.map((up) => ({
    id: up.photo.id,
    url: up.photo.url,
    thumbnailUrl: up.photo.thumbnailUrl,
    rarity: up.photo.rarity,
    collectionName: up.photo.collection.name,
    obtainedAt: up.obtainedAt,
  }))
}

/**
 * Fusion ranks mapping
 */
const FUSION_RANKS: Record<string, 'RARE' | 'EPIC' | 'LEGENDARY' | null> = {
  COMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: null, // Cannot fuse legendary
}

type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

/**
 * Fuse 4 cards (can be same or different photos) into 1 higher rarity card
 * photoIds can contain duplicates if user has enough quantity
 * All cards must be from the same collection, and the result will be from that same collection
 */
export async function fuseCards(photoIds: string[]): Promise<{ success: boolean; newPhoto?: { id: string; url: string; thumbnailUrl: string | null; rarity: Rarity; collectionName: string }; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (photoIds.length !== 4) {
    return { success: false, error: 'You need exactly 4 cards to fuse' }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Count how many times each photoId appears
    const photoIdCounts = new Map<string, number>()
    for (const id of photoIds) {
      photoIdCounts.set(id, (photoIdCounts.get(id) || 0) + 1)
    }

    // Get user's photos with collection info
    const userPhotos = await tx.userPhoto.findMany({
      where: {
        userId: user.id,
        photoId: { in: [...photoIdCounts.keys()] },
      },
      include: { photo: { include: { collection: true } } },
    })

    // Verify user has enough quantity of each photo
    for (const [photoId, count] of photoIdCounts) {
      const userPhoto = userPhotos.find((up) => up.photoId === photoId)
      if (!userPhoto || userPhoto.quantity < count) {
        throw new Error(`You don't have enough of this card`)
      }
    }

    // Verify all photos have the same rarity
    const rarities = userPhotos.map((up) => up.photo.rarity)
    const uniqueRarities = [...new Set(rarities)]
    if (uniqueRarities.length !== 1) {
      throw new Error('All cards must have the same rarity')
    }

    // Verify all photos are from the same collection
    const collectionIds = userPhotos.map((up) => up.photo.collectionId)
    const uniqueCollectionIds = [...new Set(collectionIds)]
    if (uniqueCollectionIds.length !== 1) {
      throw new Error('All cards must be from the same collection')
    }

    const currentRarity = uniqueRarities[0] as Rarity
    const nextRarity = FUSION_RANKS[currentRarity]

    if (!nextRarity) {
      throw new Error('Cannot fuse legendary cards')
    }

    // Get the collection from the fused cards (not the active collection)
    const fusionCollectionId = uniqueCollectionIds[0]
    const fusionCollection = await tx.collection.findUnique({
      where: { id: fusionCollectionId },
      include: { photos: true },
    })

    if (!fusionCollection) {
      throw new Error('Collection not found')
    }

    // Get all photos of the next rarity in the SAME collection as the fused cards
    const nextRarityPhotos = fusionCollection.photos.filter(
      (p) => p.rarity === nextRarity
    )

    if (nextRarityPhotos.length === 0) {
      throw new Error(`No ${nextRarity} cards available in this collection`)
    }

    // Get user's existing photos of next rarity in this collection
    const userNextRarityPhotos = await tx.userPhoto.findMany({
      where: {
        userId: user.id,
        photo: {
          collectionId: fusionCollectionId,
          rarity: nextRarity,
        },
      },
      select: { photoId: true },
    })

    const ownedPhotoIds = new Set(userNextRarityPhotos.map((up) => up.photoId))

    // Prefer photos the user doesn't own yet (guaranteed new card)
    const unownedPhotos = nextRarityPhotos.filter((p) => !ownedPhotoIds.has(p.id))

    let selectedPhoto
    if (unownedPhotos.length > 0) {
      // Give user a new card they don't have
      selectedPhoto = unownedPhotos[Math.floor(Math.random() * unownedPhotos.length)]
    } else {
      // All cards of this rarity are owned, give a random one (duplicate)
      selectedPhoto = nextRarityPhotos[Math.floor(Math.random() * nextRarityPhotos.length)]
    }

    // Deduct quantities from original cards
    for (const [photoId, count] of photoIdCounts) {
      const userPhoto = userPhotos.find((up) => up.photoId === photoId)!
      if (userPhoto.quantity > count) {
        await tx.userPhoto.update({
          where: { id: userPhoto.id },
          data: { quantity: { decrement: count } },
        })
      } else {
        // Remove the entry if quantity equals count
        await tx.userPhoto.delete({
          where: { id: userPhoto.id },
        })
      }
    }

    // Add the new card
    const existingNewPhoto = await tx.userPhoto.findUnique({
      where: {
        userId_photoId: {
          userId: user.id,
          photoId: selectedPhoto.id,
        },
      },
    })

    if (existingNewPhoto) {
      // Increment quantity if already owned
      await tx.userPhoto.update({
        where: { id: existingNewPhoto.id },
        data: { quantity: { increment: 1 } },
      })
    } else {
      // Create new entry
      await tx.userPhoto.create({
        data: {
          userId: user.id,
          photoId: selectedPhoto.id,
          quantity: 1,
        },
      })
    }

    return {
      newPhoto: {
        id: selectedPhoto.id,
        url: selectedPhoto.url,
        thumbnailUrl: selectedPhoto.thumbnailUrl,
        rarity: nextRarity,
        collectionName: fusionCollection.name,
      },
    }
  })

  revalidatePath('/album')
  revalidatePath('/dashboard')

  return { success: true, newPhoto: result.newPhoto }
}

/**
 * Get cards available for fusion (duplicates)
 */
export async function getFusableCards() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { COMMON: [], RARE: [], EPIC: [], LEGENDARY: [] }
  }

  const userPhotos = await prisma.userPhoto.findMany({
    where: {
      userId: user.id,
      quantity: { gte: 1 },
    },
    include: {
      photo: true,
    },
  })

  const fusableCards: Record<Rarity, typeof userPhotos> = {
    COMMON: [],
    RARE: [],
    EPIC: [],
    LEGENDARY: [],
  }

  // Group by rarity and only include if quantity >= 4
  for (const up of userPhotos) {
    const rarity = up.photo.rarity as Rarity
    if (up.quantity >= 4 && FUSION_RANKS[rarity]) {
      fusableCards[rarity].push(up)
    }
  }

  return fusableCards
}

/**
 * Exchange 5 legendary cards for 1 missing legendary from the same collection
 * The user gets a legendary they don't have yet from the same collection
 */
export async function exchangeLegendary(
  photoIds: string[]
): Promise<{ success: boolean; newPhoto?: { id: string; url: string; thumbnailUrl: string | null; rarity: Rarity; collectionName: string }; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (photoIds.length !== 5) {
    return { success: false, error: 'You need exactly 5 legendary cards to exchange' }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Count how many times each photoId appears
    const photoIdCounts = new Map<string, number>()
    for (const id of photoIds) {
      photoIdCounts.set(id, (photoIdCounts.get(id) || 0) + 1)
    }

    // Get user's legendary photos with collection info
    const userPhotos = await tx.userPhoto.findMany({
      where: {
        userId: user.id,
        photoId: { in: [...photoIdCounts.keys()] },
      },
      include: { photo: { include: { collection: true } } },
    })

    // Verify user has enough quantity of each photo (must leave at least 1 of each)
    for (const [photoId, count] of photoIdCounts) {
      const userPhoto = userPhotos.find((up) => up.photoId === photoId)
      if (!userPhoto || userPhoto.quantity < count) {
        throw new Error(`You don't have enough of this card`)
      }
      // Cannot reduce to 0 - must keep at least 1 of each card
      if (userPhoto.quantity === count) {
        throw new Error(`You can't exchange all your copies of a card. You must keep at least 1.`)
      }
    }

    // Verify all photos are legendary
    const rarities = userPhotos.map((up) => up.photo.rarity)
    const uniqueRarities = [...new Set(rarities)]
    if (uniqueRarities.length !== 1 || uniqueRarities[0] !== 'LEGENDARY') {
      throw new Error('All cards must be legendary')
    }

    // Verify all photos are from the same collection
    const collectionIds = userPhotos.map((up) => up.photo.collectionId)
    const uniqueCollectionIds = [...new Set(collectionIds)]
    if (uniqueCollectionIds.length !== 1) {
      throw new Error('All cards must be from the same collection')
    }

    const collectionId = uniqueCollectionIds[0]

    // Get the collection
    const collection = await tx.collection.findUnique({
      where: { id: collectionId },
      include: { photos: true },
    })

    if (!collection) {
      throw new Error('Collection not found')
    }

    // Get all legendary photos from this collection
    const allLegendaries = collection.photos.filter((p) => p.rarity === 'LEGENDARY')

    if (allLegendaries.length === 0) {
      throw new Error('No legendary cards in this collection')
    }

    // Get user's existing legendary photos in this collection
    const userLegendaryPhotos = await tx.userPhoto.findMany({
      where: {
        userId: user.id,
        photo: {
          collectionId: collectionId,
          rarity: 'LEGENDARY',
        },
      },
      select: { photoId: true },
    })

    const ownedPhotoIds = new Set(userLegendaryPhotos.map((up) => up.photoId))

    // Find legendaries the user doesn't have
    const missingLegendaries = allLegendaries.filter((p) => !ownedPhotoIds.has(p.id))

    if (missingLegendaries.length === 0) {
      throw new Error('You already have all legendary cards in this collection!')
    }

    // Give user a random missing legendary
    const selectedPhoto = missingLegendaries[Math.floor(Math.random() * missingLegendaries.length)]

    // Deduct quantities from original cards
    for (const [photoId, count] of photoIdCounts) {
      const userPhoto = userPhotos.find((up) => up.photoId === photoId)!
      if (userPhoto.quantity > count) {
        await tx.userPhoto.update({
          where: { id: userPhoto.id },
          data: { quantity: { decrement: count } },
        })
      } else {
        await tx.userPhoto.delete({
          where: { id: userPhoto.id },
        })
      }
    }

    // Add the new legendary card
    await tx.userPhoto.create({
      data: {
        userId: user.id,
        photoId: selectedPhoto.id,
        quantity: 1,
      },
    })

    return {
      newPhoto: {
        id: selectedPhoto.id,
        url: selectedPhoto.url,
        thumbnailUrl: selectedPhoto.thumbnailUrl,
        rarity: 'LEGENDARY' as Rarity,
        collectionName: collection.name,
      },
    }
  })

  revalidatePath('/album')
  revalidatePath('/dashboard')

  return { success: true, newPhoto: result.newPhoto }
}

/**
 * Get legendary exchange info for a collection
 * Returns count of legendaries and how many missing legendaries exist
 */
export async function getLegendaryExchangeInfo(collectionId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get active collection if not specified
  let targetCollectionId = collectionId
  if (!targetCollectionId) {
    const activeCollection = await prisma.collection.findFirst({
      where: { active: true },
      select: { id: true },
    })
    targetCollectionId = activeCollection?.id
  }

  if (!targetCollectionId) {
    return null
  }

  const collection = await prisma.collection.findUnique({
    where: { id: targetCollectionId },
    include: { photos: { where: { rarity: 'LEGENDARY' } } },
  })

  if (!collection) {
    return null
  }

  // Get user's legendary photos in this collection
  const userLegendaries = await prisma.userPhoto.findMany({
    where: {
      userId: user.id,
      photo: {
        collectionId: targetCollectionId,
        rarity: 'LEGENDARY',
      },
    },
    include: { photo: true },
  })

  const totalLegendariesOwned = userLegendaries.reduce((sum, up) => sum + up.quantity, 0)
  const uniqueLegendariesOwned = userLegendaries.length
  const totalLegendariesInCollection = collection.photos.length
  const missingLegendaries = totalLegendariesInCollection - uniqueLegendariesOwned

  return {
    collectionId: targetCollectionId,
    collectionName: collection.name,
    totalLegendariesOwned,
    uniqueLegendariesOwned,
    totalLegendariesInCollection,
    missingLegendaries,
    canExchange: totalLegendariesOwned >= 5 && missingLegendaries > 0,
  }
}

/**
 * Sell a duplicate legendary card for $1 balance
 * Only available when user has all legendaries in the collection
 */
export async function sellLegendary(
  photoId: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Get user's photo
    const userPhoto = await tx.userPhoto.findFirst({
      where: {
        userId: user.id,
        photoId,
      },
      include: {
        photo: {
          include: { collection: true },
        },
      },
    })

    if (!userPhoto || userPhoto.quantity < 1) {
      throw new Error('You don\'t have this card')
    }

    // Verify it's legendary
    if (userPhoto.photo.rarity !== 'LEGENDARY') {
      throw new Error('Only legendary cards can be sold')
    }

    const collectionId = userPhoto.photo.collectionId

    // Get all legendary photos in this collection
    const allLegendaries = await tx.photo.findMany({
      where: {
        collectionId,
        rarity: 'LEGENDARY',
      },
    })

    // Get user's existing legendary photos in this collection
    const userLegendaries = await tx.userPhoto.findMany({
      where: {
        userId: user.id,
        photo: {
          collectionId,
          rarity: 'LEGENDARY',
        },
      },
      select: { photoId: true },
    })

    const ownedPhotoIds = new Set(userLegendaries.map((up) => up.photoId))

    // Check if user has all legendaries in this collection
    const hasAllLegendaries = allLegendaries.every((p) => ownedPhotoIds.has(p.id))

    if (!hasAllLegendaries) {
      throw new Error('You can only sell legendary cards when you have all legendaries in the collection')
    }

    // Check if user has more than 1 of this card (must keep at least 1)
    if (userPhoto.quantity <= 1) {
      throw new Error('You must keep at least 1 copy of each legendary card')
    }

    // Deduct the card
    await tx.userPhoto.update({
      where: { id: userPhoto.id },
      data: { quantity: { decrement: 1 } },
    })

    // Add $1 to user's balance via wallet and transaction
    const wallet = await tx.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 1, adminBalance: 0 },
      update: { balance: { increment: 1 } },
    })

    // Create transaction record
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'DEPOSIT',
        amount: 1,
        status: 'COMPLETED',
        source: 'ADMIN', // Using ADMIN source for legendary sales
      },
    })

    return { newBalance: wallet.balance.toNumber() }
  })

  revalidatePath('/album')
  revalidatePath('/dashboard')
  revalidatePath('/wallet')

  return { success: true, newBalance: result.newBalance }
}