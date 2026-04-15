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

    // Get all collections with their photos count
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        active: true,
        photos: {
          select: {
            id: true,
            rarity: true,
          },
        },
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

    // Calculate progress per collection
    const collectionProgress = collections.map((collection) => {
      const totalPhotos = collection.photos.length
      const totalByRarity = {
        COMMON: collection.photos.filter(p => p.rarity === 'COMMON').length,
        RARE: collection.photos.filter(p => p.rarity === 'RARE').length,
        EPIC: collection.photos.filter(p => p.rarity === 'EPIC').length,
        LEGENDARY: collection.photos.filter(p => p.rarity === 'LEGENDARY').length,
      }

      // Get user's unique photos in this collection
      const userPhotosInCollection = photos.filter(p => p.collectionId === collection.id)
      const uniquePhotosCollected = userPhotosInCollection.length
      const uniqueByRarity = {
        COMMON: userPhotosInCollection.filter(p => p.rarity === 'COMMON').length,
        RARE: userPhotosInCollection.filter(p => p.rarity === 'RARE').length,
        EPIC: userPhotosInCollection.filter(p => p.rarity === 'EPIC').length,
        LEGENDARY: userPhotosInCollection.filter(p => p.rarity === 'LEGENDARY').length,
      }

      const percentage = totalPhotos > 0 ? Math.round((uniquePhotosCollected / totalPhotos) * 100) : 0
      const remaining = totalPhotos - uniquePhotosCollected
      const missingByRarity = {
        COMMON: totalByRarity.COMMON - uniqueByRarity.COMMON,
        RARE: totalByRarity.RARE - uniqueByRarity.RARE,
        EPIC: totalByRarity.EPIC - uniqueByRarity.EPIC,
        LEGENDARY: totalByRarity.LEGENDARY - uniqueByRarity.LEGENDARY,
      }

      return {
        id: collection.id,
        name: collection.name,
        active: collection.active,
        totalPhotos,
        uniquePhotosCollected,
        remaining,
        percentage,
        totalByRarity,
        uniqueByRarity,
        missingByRarity,
      }
    })

    return NextResponse.json({
      collections: collections.map(c => ({
        id: c.id,
        name: c.name,
        active: c.active,
      })),
      photos,
      collectionProgress,
    })
  } catch (error) {
    console.error('Error fetching user collection:', error)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}