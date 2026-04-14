'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { collectionSchema, type CollectionInput } from '@/lib/validations/collection'
import { requireAdmin } from '@/lib/auth/admin'

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