import { NextResponse } from 'next/server'
import { getAlbum, getAlbumStats } from '@/lib/actions/album'

export async function GET() {
  try {
    const [album, stats] = await Promise.all([
      getAlbum(),
      getAlbumStats(),
    ])

    return NextResponse.json({ album, stats })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}