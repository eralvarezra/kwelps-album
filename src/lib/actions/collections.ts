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

  // Check if collection has photos
  const photoCount = await prisma.photo.count({
    where: { collectionId: id },
  })

  if (photoCount > 0) {
    throw new Error('Cannot delete collection with photos. Delete photos first.')
  }

  await prisma.collection.delete({
    where: { id },
  })

  revalidatePath('/admin/collections')
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