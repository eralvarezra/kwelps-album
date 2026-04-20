import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getClientIp, checkRateLimit, RATE_LIMITS, createIpRateLimitKey } from '@/lib/rate-limit'

/**
 * Create or update user in our database after Supabase signup
 *
 * SECURITY: This endpoint requires authentication. It only allows creating
 * the user record for the currently authenticated Supabase user.
 */
export async function POST(request: NextRequest) {
  try {
    // 0. Rate limiting check (before expensive operations)
    const ip = getClientIp(request)
    const rateLimitKey = createIpRateLimitKey(ip, 'user:create')
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.USER_CREATE)

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

    // 1. Verify authentication - only allow authenticated users to create their own record
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { id, email } = body

    // 3. Validate that the authenticated user matches the requested user ID
    if (id !== authUser.id) {
      console.error(`User ID mismatch: authenticated=${authUser.id}, requested=${id}`)
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    // 4. Validate required fields
    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
    }

    // 5. Use email from auth if not provided or mismatch
    const userEmail = email || authUser.email

    // 6. Create user if not exists (upsert for idempotency)
    const user = await prisma.user.upsert({
      where: { id },
      create: { id, email: userEmail },
      update: { email: userEmail },
    })

    // 7. Create wallet if not exists
    const wallet = await prisma.wallet.upsert({
      where: { userId: id },
      create: { userId: id, balance: 0, adminBalance: 0, bonusClaimed: false },
      update: {},
    })

    // 8. Create pity counter if not exists
    await prisma.pityCounter.upsert({
      where: { userId: id },
      create: { userId: id, legendaryCounter: 0 },
      update: {},
    })

    return NextResponse.json({ success: true, user, wallet })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}