'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function getWallet() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const ip = (forwarded ? forwarded.split(',')[0].trim() : realIp) || 'unknown'

  // Ensure user exists in our database (trigger may have created it without IP)
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email!, registrationIp: ip },
    update: { email: user.email! },
  })
  await prisma.user.updateMany({
    where: { id: user.id, registrationIp: null },
    data: { registrationIp: ip },
  })

  // Ensure wallet exists
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0, bonusClaimed: false },
    update: {},
  })

  // Ensure pity counter exists
  await prisma.pityCounter.upsert({
    where: { userId: user.id },
    create: { userId: user.id, legendaryCounter: 0 },
    update: {},
  })

  return wallet
}

export async function getBalance() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    select: { balance: true },
  })

  return wallet?.balance ?? 0
}

export async function getTransactionHistory(limit = 20) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return transactions
}

export async function adminAddBalance(userId: string, amount: number) {
  await requireAdmin()

  if (amount <= 0) {
    throw new Error('Amount must be positive')
  }

  // Create transaction and update wallet in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create transaction record with ADMIN source (excluded from revenue stats)
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'COMPLETED',
        source: 'ADMIN',
      },
    })

    // Update wallet balance AND adminBalance
    const wallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount,
        },
        adminBalance: {
          increment: amount,
        },
      },
    })

    return { transaction, wallet }
  })

  revalidatePath('/admin/users')
  revalidatePath('/dashboard')

  return result
}

export async function adminDeductBalance(userId: string, amount: number) {
  await requireAdmin()

  if (amount <= 0) {
    throw new Error('Amount must be positive')
  }

  const result = await prisma.$transaction(async (tx) => {
    // Check current admin balance (can only deduct admin-given balance)
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    })

    if (!wallet || wallet.adminBalance.toNumber() < amount) {
      throw new Error('Insufficient admin balance. Can only deduct balance that was given by admin.')
    }

    // Create transaction record with ADMIN source
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'PACK_PURCHASE',
        amount: -amount,
        status: 'COMPLETED',
        source: 'ADMIN',
      },
    })

    // Update both balance and adminBalance
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount,
        },
        adminBalance: {
          decrement: amount,
        },
      },
    })

    return { transaction, wallet: updatedWallet }
  })

  revalidatePath('/admin/users')
  revalidatePath('/dashboard')

  return result
}

export async function getAllUsersWithWallets() {
  await requireAdmin()

  const users = await prisma.user.findMany({
    include: {
      wallet: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize Decimal values for Client Components
  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    wallet: user.wallet
      ? {
          ...user.wallet,
          balance: user.wallet.balance.toNumber(),
          adminBalance: user.wallet.adminBalance.toNumber(),
        }
      : null,
  }))
}

/**
 * Admin: Give cards to a user
 */
export async function adminGiveCards(
  userId: string,
  photoId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  if (quantity <= 0) {
    return { success: false, error: 'Quantity must be positive' }
  }

  // Verify photo exists
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { collection: true },
  })

  if (!photo) {
    return { success: false, error: 'Photo not found' }
  }

  // Add or update user's photo
  await prisma.userPhoto.upsert({
    where: {
      userId_photoId: {
        userId,
        photoId,
      },
    },
    create: {
      userId,
      photoId,
      quantity,
    },
    update: {
      quantity: {
        increment: quantity,
      },
    },
  })

  revalidatePath('/admin/users')

  return { success: true }
}

/**
 * Admin: Get all photos for selection with card numbers
 */
export async function adminGetAllPhotos() {
  await requireAdmin()

  // Get all collections with their photos
  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      photos: {
        orderBy: [
          { rarity: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
  })

  // Rarity order for consistent numbering
  const rarityOrder = { COMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 }

  // Flatten and assign card numbers
  const allPhotos: {
    id: string
    url: string
    thumbnailUrl: string | null
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
    collectionId: string
    collectionName: string
    collectionActive: boolean
    cardNumber: number
  }[] = []

  for (const collection of collections) {
    // Sort photos: by rarity (COMMON, RARE, EPIC, LEGENDARY), then by createdAt
    const sortedPhotos = [...collection.photos].sort((a, b) => {
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity]
      if (rarityDiff !== 0) return rarityDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    sortedPhotos.forEach((photo, index) => {
      allPhotos.push({
        id: photo.id,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        rarity: photo.rarity,
        collectionId: collection.id,
        collectionName: collection.name,
        collectionActive: collection.active,
        cardNumber: index + 1,
      })
    })
  }

  return allPhotos
}

export async function adminBulkUpdateBalance(
  userIds: string[],
  amount: number,
  operation: 'add' | 'deduct'
): Promise<{ success: number; failed: number; errors: string[] }> {
  await requireAdmin()

  if (!userIds.length) {
    return { success: 0, failed: 0, errors: ['No users selected'] }
  }
  if (amount <= 0) {
    return { success: 0, failed: 0, errors: ['Amount must be positive'] }
  }

  let success = 0
  const errors: string[] = []

  for (const userId of userIds) {
    try {
      if (operation === 'add') {
        await adminAddBalance(userId, amount)
      } else {
        await adminDeductBalance(userId, amount)
      }
      success++
    } catch (err) {
      errors.push(userId + ': ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  revalidatePath('/admin/users')
  return { success, failed: errors.length, errors }
}

export async function claimWelcomeBonus(): Promise<{
  success: boolean
  error?: string
  bonusPhoto?: { id: string; url: string; rarity: string; collectionName: string }
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  try {
    let bonusPhoto: { id: string; url: string; rarity: string; collectionName: string } | null = null

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } })

      if (!wallet || wallet.bonusClaimed) {
        throw new Error('Bono no disponible')
      }

      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { registrationIp: true },
      })

      if (currentUser?.registrationIp && currentUser.registrationIp !== 'unknown') {
        const ipAlreadyClaimed = await tx.wallet.findFirst({
          where: {
            bonusClaimed: true,
            user: { registrationIp: currentUser.registrationIp },
            NOT: { userId: user.id },
          },
        })
        if (ipAlreadyClaimed) {
          throw new Error('Bono no disponible')
        }
      }

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: 2,
          status: 'COMPLETED',
          source: 'ADMIN',
        },
      })

      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { increment: 2 },
          adminBalance: { increment: 2 },
          bonusClaimed: true,
        },
      })

      // Pick a random COMMON or RARE photo from the active collection
      const activeCollection = await tx.collection.findFirst({
        where: { active: true },
        include: {
          photos: {
            where: { rarity: { in: ['COMMON', 'RARE'] } },
            select: { id: true, url: true, rarity: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (activeCollection && activeCollection.photos.length > 0) {
        const randomIndex = Math.floor(
          (crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * activeCollection.photos.length
        )
        const chosenPhoto = activeCollection.photos[randomIndex]

        await tx.userPhoto.upsert({
          where: { userId_photoId: { userId: user.id, photoId: chosenPhoto.id } },
          create: { userId: user.id, photoId: chosenPhoto.id, quantity: 1 },
          update: { quantity: { increment: 1 } },
        })

        bonusPhoto = { id: chosenPhoto.id, url: chosenPhoto.url, rarity: chosenPhoto.rarity, collectionName: activeCollection.name }
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/wallet')
    revalidatePath('/album')
    return { success: true, bonusPhoto: bonusPhoto ?? undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al reclamar' }
  }
}
