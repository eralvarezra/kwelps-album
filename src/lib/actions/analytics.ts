'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'

export type TransactionSourceType = 'PAYPAL' | 'ADMIN'

export type MonthlyStats = {
  month: string
  year: number
  monthNumber: number
  totalDeposits: number
  paypalDeposits: number
  adminDeposits: number
  transactionCount: number
  paypalCount: number
  adminCount: number
}

export type DailyStats = {
  date: string
  total: number
  paypal: number
  admin: number
  count: number
}

export type UserStats = {
  totalUsers: number
  activeUsers: number
  usersWithBalance: number
  totalBalance: number
}

export type CollectionStats = {
  id: string
  name: string
  active: boolean
  totalPhotos: number
  collectedPhotos: number
  uniqueOwners: number
}

/**
 * Get monthly deposit statistics
 */
export async function getMonthlyStats(
  year?: number,
  months: number = 12
): Promise<MonthlyStats[]> {
  await requireAdmin()

  const now = new Date()
  const targetYear = year ?? now.getFullYear()

  // Get all completed deposits from PayPal
  const transactions = await prisma.transaction.findMany({
    where: {
      type: 'DEPOSIT',
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(targetYear, 0, 1),
        lte: new Date(targetYear, 11, 31, 23, 59, 59),
      },
    },
    select: {
      amount: true,
      source: true,
      createdAt: true,
    },
  })

  // Group by month
  const monthlyData: Map<string, MonthlyStats> = new Map()

  // Initialize all months
  for (let m = 0; m < 12; m++) {
    const key = `${targetYear}-${String(m + 1).padStart(2, '0')}`
    monthlyData.set(key, {
      month: getMonthName(m),
      year: targetYear,
      monthNumber: m + 1,
      totalDeposits: 0,
      paypalDeposits: 0,
      adminDeposits: 0,
      transactionCount: 0,
      paypalCount: 0,
      adminCount: 0,
    })
  }

  // Aggregate transactions
  for (const tx of transactions) {
    const month = tx.createdAt.getMonth()
    const key = `${targetYear}-${String(month + 1).padStart(2, '0')}`
    const stats = monthlyData.get(key)!

    const amount = tx.amount.toNumber()

    stats.totalDeposits += amount
    stats.transactionCount += 1

    if (tx.source === 'PAYPAL') {
      stats.paypalDeposits += amount
      stats.paypalCount += 1
    } else if (tx.source === 'ADMIN') {
      stats.adminDeposits += amount
      stats.adminCount += 1
    }
  }

  return Array.from(monthlyData.values())
}

/**
 * Get daily statistics for a specific month
 */
export async function getDailyStats(
  year: number,
  month: number
): Promise<DailyStats[]> {
  await requireAdmin()

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const transactions = await prisma.transaction.findMany({
    where: {
      type: 'DEPOSIT',
      status: 'COMPLETED',
      source: 'PAYPAL',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      source: true,
      createdAt: true,
    },
  })

  // Group by day
  const dailyData: Map<string, DailyStats> = new Map()

  // Initialize all days in the month
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    dailyData.set(dateStr, {
      date: dateStr,
      total: 0,
      paypal: 0,
      admin: 0,
      count: 0,
    })
  }

  // Aggregate
  for (const tx of transactions) {
    const date = tx.createdAt.toISOString().split('T')[0]
    const stats = dailyData.get(date)

    if (stats) {
      const amount = tx.amount.toNumber()
      stats.total += amount
      stats.count += 1

      if (tx.source === 'PAYPAL') {
        stats.paypal += amount
      } else {
        stats.admin += amount
      }
    }
  }

  return Array.from(dailyData.values())
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  await requireAdmin()

  const [totalUsers, usersWithBalance] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.aggregate({
      _sum: { balance: true },
      _count: true,
    }),
  ])

  // Users who have made transactions in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activeUsers = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { userId: true },
    distinct: ['userId'],
  })

  return {
    totalUsers,
    activeUsers: activeUsers.length,
    usersWithBalance: usersWithBalance._count,
    totalBalance: usersWithBalance._sum.balance?.toNumber() ?? 0,
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<CollectionStats[]> {
  await requireAdmin()

  const collections = await prisma.collection.findMany({
    include: {
      _count: {
        select: { photos: true },
      },
    },
  })

  const stats: CollectionStats[] = []

  for (const collection of collections) {
    // Count unique owners for this collection
    const uniqueOwners = await prisma.userPhoto.findMany({
      where: {
        photo: { collectionId: collection.id },
        quantity: { gt: 0 },
      },
      select: { userId: true },
      distinct: ['userId'],
    })

    // Count collected photos
    const collectedPhotos = await prisma.userPhoto.count({
      where: {
        photo: { collectionId: collection.id },
        quantity: { gt: 0 },
      },
    })

    stats.push({
      id: collection.id,
      name: collection.name,
      active: collection.active,
      totalPhotos: collection._count.photos,
      collectedPhotos,
      uniqueOwners: uniqueOwners.length,
    })
  }

  return stats
}

/**
 * Get summary stats for dashboard
 */
export async function getSummaryStats() {
  await requireAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Current month stats
  const currentMonthTransactions = await prisma.transaction.findMany({
    where: {
      type: 'DEPOSIT',
      status: 'COMPLETED',
      source: 'PAYPAL',
      createdAt: {
        gte: startOfMonth,
      },
    },
    select: { amount: true },
  })

  // Last month stats
  const lastMonthTransactions = await prisma.transaction.findMany({
    where: {
      type: 'DEPOSIT',
      status: 'COMPLETED',
      source: 'PAYPAL',
      createdAt: {
        gte: startOfLastMonth,
        lt: startOfMonth,
      },
    },
    select: { amount: true },
  })

  // All time stats
  const allTimeTransactions = await prisma.transaction.findMany({
    where: {
      type: 'DEPOSIT',
      status: 'COMPLETED',
      source: 'PAYPAL',
    },
    select: { amount: true },
  })

  const currentMonthTotal = currentMonthTransactions.reduce(
    (sum, tx) => sum + tx.amount.toNumber(),
    0
  )

  const lastMonthTotal = lastMonthTransactions.reduce(
    (sum, tx) => sum + tx.amount.toNumber(),
    0
  )

  const allTimeTotal = allTimeTransactions.reduce(
    (sum, tx) => sum + tx.amount.toNumber(),
    0
  )

  const percentChange = lastMonthTotal > 0
    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : 0

  return {
    currentMonth: {
      total: currentMonthTotal,
      count: currentMonthTransactions.length,
    },
    lastMonth: {
      total: lastMonthTotal,
      count: lastMonthTransactions.length,
    },
    allTime: {
      total: allTimeTotal,
      count: allTimeTransactions.length,
    },
    percentChange: Math.round(percentChange * 100) / 100,
  }
}

/**
 * Get recent transactions for display
 */
export async function getRecentTransactions(limit: number = 20) {
  await requireAdmin()

  const transactions = await prisma.transaction.findMany({
    where: {
      type: 'DEPOSIT',
      status: 'COMPLETED',
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })

  return transactions.map((tx) => ({
    id: tx.id,
    userId: tx.userId,
    userEmail: tx.user.email,
    amount: tx.amount.toNumber(),
    source: tx.source,
    paypalOrderId: tx.paypalOrderId,
    createdAt: tx.createdAt.toISOString(),
  }))
}

// Helper function
function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month]
}