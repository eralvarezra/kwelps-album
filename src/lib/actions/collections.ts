'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { collectionSchema, collectionPrizeSchema, type CollectionInput, type CollectionPrizeInput } from '@/lib/validations/collection'
import { requireAdmin } from '@/lib/auth/admin'
import { deletePhoto } from '@/lib/storage/supabase-storage'

export async function getCollections() {
  return prisma.collection.findMany({
    include: {
      _count: {
        select: { photos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      photos: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createCollection(data: CollectionInput) {
  await requireAdmin()

  const validated = collectionSchema.parse(data)

  const collection = await prisma.collection.create({
    data: validated,
  })

  revalidatePath('/admin/collections')
  return collection
}

export async function createCollectionWithPrizes(
  data: CollectionInput,
  prizes: CollectionPrizeInput[]
) {
  await requireAdmin()

  const validated = collectionSchema.parse(data)
  const validatedPrizes = prizes.map(p => collectionPrizeSchema.parse(p))

  const collection = await prisma.$transaction(async (tx) => {
    const col = await tx.collection.create({ data: validated })
    if (validatedPrizes.length > 0) {
      await tx.collectionPrize.createMany({
        data: validatedPrizes.map(p => ({ ...p, collectionId: col.id })),
      })
    }
    return col
  })

  revalidatePath('/admin/collections')
  return collection
}

export async function getCollectionPrizes(collectionId: string) {
  return prisma.collectionPrize.findMany({
    where: { collectionId },
    orderBy: [{ type: 'asc' }, { pageNumber: 'asc' }],
  })
}

export async function upsertCollectionPrizes(
  collectionId: string,
  prizes: CollectionPrizeInput[]
) {
  await requireAdmin()

  const validatedPrizes = prizes.map(p => collectionPrizeSchema.parse(p))

  await prisma.$transaction(async (tx) => {
    await tx.collectionPrize.deleteMany({ where: { collectionId } })
    if (validatedPrizes.length > 0) {
      await tx.collectionPrize.createMany({
        data: validatedPrizes.map(p => ({ ...p, collectionId })),
      })
    }
  })

  revalidatePath(`/admin/collections/${collectionId}`)
}

export async function updateCollection(id: string, data: Partial<CollectionInput>) {
  await requireAdmin()

  const validated = collectionSchema.partial().parse(data)

  const collection = await prisma.collection.update({
    where: { id },
    data: validated,
  })

  revalidatePath('/admin/collections')
  revalidatePath(`/admin/collections/${id}`)
  return collection
}

export async function deleteCollection(id: string) {
  await requireAdmin()

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: {
      _count: {
        select: { photos: true }
      }
    }
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const affectedUsersCount = await prisma.userPhoto.count({
    where: {
      photo: { collectionId: id }
    }
  })

  // Get all photos to delete from storage
  const photos = await prisma.photo.findMany({
    where: { collectionId: id },
    select: { url: true, thumbnailUrl: true }
  })

  // Delete files from storage (best effort)
  for (const photo of photos) {
    try {
      await deletePhoto(photo.url, photo.thumbnailUrl)
    } catch {
      // Continue even if storage delete fails
    }
  }

  await prisma.collection.delete({
    where: { id }
  })

  revalidatePath('/admin/collections')
  return { photoCount: collection._count.photos, affectedUsers: affectedUsersCount }
}

export async function toggleCollectionActive(id: string, active: boolean) {
  await requireAdmin()

  const collection = await prisma.collection.update({
    where: { id },
    data: { active },
  })

  revalidatePath('/admin/collections')
  return collection
}

export async function getCollectionDeletionImpact(id: string) {
  await requireAdmin()

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: {
      name: true,
      _count: {
        select: { photos: true }
      }
    }
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const affectedUsersCount = await prisma.userPhoto.count({
    where: {
      photo: { collectionId: id }
    }
  })

  return {
    name: collection.name,
    photoCount: collection._count.photos,
    affectedUsers: affectedUsersCount
  }
}