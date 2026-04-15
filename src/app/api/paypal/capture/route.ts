import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { captureOrder } from '@/lib/paypal/client'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  console.log('PayPal capture API - token:', token)

  if (!token) {
    return NextResponse.redirect(new URL('/wallet?payment=error&reason=no_token', request.url))
  }

  try {
    // Capture the order
    console.log('Capturing order:', token)
    const captureResult = await captureOrder(token)

    console.log('Capture result:', captureResult)

    if (!captureResult.success) {
      return NextResponse.redirect(new URL('/wallet?payment=error&reason=capture_failed', request.url))
    }

    const { amount, customId: userId } = captureResult

    console.log('Processing deposit for user:', userId, 'amount:', amount)

    // Process the deposit
    const result = await prisma.$transaction(async (tx) => {
      // Check if this order was already processed
      const existingTx = await tx.transaction.findFirst({
        where: { paypalOrderId: token },
      })

      if (existingTx) {
        // Already processed, just return the wallet
        const wallet = await tx.wallet.findUnique({
          where: { userId: existingTx.userId },
        })
        console.log('Order already processed, wallet balance:', wallet?.balance.toString())
        return { wallet, alreadyProcessed: true }
      }

      // Ensure user exists (create if not)
      let user = await tx.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        console.log('Creating user:', userId)
        user = await tx.user.create({
          data: { id: userId, email: `user-${userId}@temp.local` },
        })
      }

      // Ensure wallet exists
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        console.log('Creating wallet for user:', userId)
        wallet = await tx.wallet.create({
          data: { userId, balance: 0 },
        })
      }

      console.log('Wallet before update:', wallet.balance.toString())

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          status: 'COMPLETED',
          paypalOrderId: token,
        },
      })

      // Update wallet balance
      wallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
      })

      console.log('Wallet after update:', wallet.balance.toString())

      return { wallet, transaction, alreadyProcessed: false }
    })

    console.log('Deposit processed:', result)

    // Revalidate the wallet page to show fresh data
    revalidatePath('/wallet')
    revalidatePath('/dashboard')

    // Redirect with cache busting
    return NextResponse.redirect(new URL(`/wallet?payment=success&t=${Date.now()}`, request.url))
  } catch (error) {
    console.error('Capture error:', error)
    return NextResponse.redirect(new URL(`/wallet?payment=error&reason=${encodeURIComponent((error as Error).message)}`, request.url))
  }
}