import { NextResponse } from 'next/server'
import { createDepositOrder } from '@/lib/actions/paypal'
import { getClientIp, checkRateLimit, RATE_LIMITS, createIpRateLimitKey } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Rate limiting check
    const ip = getClientIp(request)
    const rateLimitKey = createIpRateLimitKey(ip, 'paypal:create-order')
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.PAYPAL)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const { amount } = await request.json()

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    const result = await createDepositOrder(amount)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      orderId: result.orderId,
      approvalUrl: result.approvalUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}