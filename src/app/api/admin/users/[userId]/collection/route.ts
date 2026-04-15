import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()
    const { userId } = await params

    // Get all collections
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        active: true,
      },
    })

    // Get user's photos with details
    const userPhotos = await prisma.userPhoto.findMany({
      where: { userId },
      include: {
        photo: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: { photo: { rarity: 'asc' } },
    })

    // Transform to simpler format
    const photos = userPhotos
      .filter((up) => up.quantity > 0)
      .map((up) => ({
        id: up.photo.id,
        url: up.photo.url,
        thumbnailUrl: up.photo.thumbnailUrl,
        rarity: up.photo.rarity,
        quantity: up.quantity,
        collectionId: up.photo.collection.id,
        collectionName: up.photo.collection.name,
      }))

    return NextResponse.json({ collections, photos })
  } catch (error) {
    console.error('Error fetching user collection:', error)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}