import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Kwelps Album
        </h1>
        <p className="text-gray-600 mb-8">
          Collect and trade adorable Kwelps photos!
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  )
}