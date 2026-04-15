import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback handler for email confirmation
 * This route is called when a user clicks the confirmation link in their email
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get the user after successful exchange
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Create user and wallet in our database
        try {
          await fetch(`${origin}/api/user/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: user.id,
              email: user.email,
            }),
          })
        } catch (err) {
          console.error('Error creating user in database:', err)
          // Continue anyway, user can be created later
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Unable to verify email. The link may have expired.`)
}