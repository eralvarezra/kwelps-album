import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase admin client with service role key
 * This client can bypass RLS and perform admin operations
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}