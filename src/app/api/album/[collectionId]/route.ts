import { NextResponse } from 'next/server'
import { getCollectionAlbum } from '@/lib/actions/album'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { collectionId } = await params
    const album = await getCollectionAlbum(collectionId)

    if (!album) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    return NextResponse.json(album)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}