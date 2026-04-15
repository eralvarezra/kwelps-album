'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

export type AdminUser = {
  id: string
  email: string
  emailConfirmed: boolean
  createdAt: string
  lastSignInAt: string | null
}

/**
 * Get all users from Supabase Auth with their email confirmation status
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireAdmin()

  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error('Failed to fetch users')
  }

  return data.users.map((user) => ({
    id: user.id,
    email: user.email || '',
    emailConfirmed: !!user.email_confirmed_at,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at || null,
  }))
}

/**
 * Manually confirm a user's email
 */
export async function confirmUserEmail(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })

  if (error) {
    console.error('Error confirming email:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

/**
 * Manually confirm multiple users' emails
 */
export async function confirmMultipleEmails(
  userIds: string[]
): Promise<{ success: boolean; confirmed: number; errors: string[] }> {
  await requireAdmin()

  const supabaseAdmin = createAdminClient()
  const errors: string[] = []
  let confirmed = 0

  for (const userId of userIds) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (error) {
      errors.push(`User ${userId}: ${error.message}`)
    } else {
      confirmed++
    }
  }

  revalidatePath('/admin/users')
  return { success: errors.length === 0, confirmed, errors }
}