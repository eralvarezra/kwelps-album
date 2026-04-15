import { NextResponse } from 'next/server'
import { captureDepositOrder } from '@/lib/actions/paypal'

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const result = await captureDepositOrder(orderId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.newBalance,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to capture order' },
      { status: 500 }
    )
  }
}