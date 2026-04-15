import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getPhotos } from '@/lib/actions/photos'

export async function GET() {
  try {
    await requireAdmin()
    const photos = await getPhotos()
    return NextResponse.json(photos)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}