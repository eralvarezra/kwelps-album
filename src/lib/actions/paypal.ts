'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createOrder, captureOrder, verifyOrder } from '@/lib/paypal/client'

/**
 * Create a PayPal order for wallet deposit
 */
export async function createDepositOrder(amount: number): Promise<{
  success: boolean
  orderId?: string
  approvalUrl?: string
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (amount <= 0 || amount > 1000) {
    return { success: false, error: 'Invalid amount. Must be between $0.01 and $1000' }
  }

  try {
    const result = await createOrder(amount, user.id)
    return {
      success: true,
      orderId: result.orderId,
      approvalUrl: result.approvalUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Capture a completed PayPal order and credit the wallet
 */
export async function captureDepositOrder(orderId: string): Promise<{
  success: boolean
  amount?: number
  newBalance?: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Capture the order
    const captureResult = await captureOrder(orderId)

    if (!captureResult.success) {
      return { success: false, error: 'Payment capture failed' }
    }

    // Verify the user matches
    if (captureResult.customId !== user.id) {
      return { success: false, error: 'User mismatch' }
    }

    const amount = captureResult.amount

    // Process the deposit in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount,
          status: 'COMPLETED',
          paypalOrderId: orderId,
        },
      })

      // Update wallet balance
      const wallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: { increment: amount },
        },
      })

      return { transaction, wallet }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallet')

    return {
      success: true,
      amount,
      newBalance: result.wallet.balance.toNumber(),
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Check PayPal order status
 */
export async function checkOrderStatus(orderId: string): Promise<{
  status: string
  amount: number
}> {
  const result = await verifyOrder(orderId)
  return {
    status: result.status,
    amount: result.amount,
  }
}