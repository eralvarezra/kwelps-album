import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const ip = getClientIp(request)

      if (user && user.email) {
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            create: { id: user.id, email: user.email, registrationIp: ip },
            update: { email: user.email },
          })
          await prisma.user.updateMany({
            where: { id: user.id, registrationIp: null },
            data: { registrationIp: ip },
          })

          await prisma.wallet.upsert({
            where: { userId: user.id },
            create: { userId: user.id, balance: 0, adminBalance: 0, bonusClaimed: false },
            update: {},
          })

          await prisma.pityCounter.upsert({
            where: { userId: user.id },
            create: { userId: user.id, legendaryCounter: 0 },
            update: {},
          })
        } catch (err) {
          console.error('Error creating user in database:', err)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Unable to verify email. The link may have expired.`)
}
