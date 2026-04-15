'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWallet() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Ensure user exists in our database
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: { email: user.email! },
  })

  // Ensure wallet exists
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0 },
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
 * Admin: Get all photos for selection
 */
export async function adminGetAllPhotos() {
  await requireAdmin()

  const photos = await prisma.photo.findMany({
    include: {
      collection: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
    orderBy: [
      { collection: { createdAt: 'desc' } },
      { rarity: 'asc' },
    ],
  })

  return photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    rarity: photo.rarity,
    collectionId: photo.collectionId,
    collectionName: photo.collection.name,
    collectionActive: photo.collection.active,
  }))
}