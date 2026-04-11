import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminEmail = process.env.ADMIN_EMAIL

  if (user.email !== adminEmail) {
    redirect('/dashboard?error=unauthorized')
  }

  return user
}

export async function isAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  return user.email === process.env.ADMIN_EMAIL
}