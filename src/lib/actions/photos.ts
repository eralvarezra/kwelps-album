'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { photoSchema, type PhotoInput } from '@/lib/validations/photo'
import { requireAdmin } from '@/lib/auth/admin'
import { uploadPhoto, deletePhoto } from '@/lib/storage/supabase-storage'

export async function getPhotos(collectionId?: string) {
  const where = collectionId ? { collectionId } : {}

  return prisma.photo.findMany({
    where,
    include: {
      collection: {
        select: { name: true, id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPhoto(id: string) {
  return prisma.photo.findUnique({
    where: { id },
    include: {
      collection: true,
    },
  })
}

export async function createPhoto(data: PhotoInput) {
  await requireAdmin()

  const validated = photoSchema.parse(data)

  const photo = await prisma.photo.create({
    data: validated,
  })

  revalidatePath(`/admin/collections/${validated.collectionId}/photos`)
  return photo
}

export async function createPhotoWithUpload(
  formData: FormData
): Promise<{ success: boolean; photo?: { id: string; url: string }; error?: string }> {
  await requireAdmin()

  const file = formData.get('file') as File
  const collectionId = formData.get('collectionId') as string
  const rarity = formData.get('rarity') as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

  if (!file || !collectionId || !rarity) {
    return { success: false, error: 'Missing required fields' }
  }

  try {
    const { url, thumbnailUrl } = await uploadPhoto(file, collectionId)

    const photo = await prisma.photo.create({
      data: {
        collectionId,
        url,
        thumbnailUrl,
        rarity,
      },
    })

    revalidatePath(`/admin/collections/${collectionId}/photos`)
    return { success: true, photo: { id: photo.id, url: photo.url } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function updatePhoto(
  id: string,
  data: Partial<Pick<PhotoInput, 'rarity' | 'thumbnailUrl'>>
) {
  await requireAdmin()

  const photo = await prisma.photo.update({
    where: { id },
    data,
  })

  revalidatePath(`/admin/collections/${photo.collectionId}/photos`)
  return photo
}

export async function deletePhotoAction(id: string) {
  await requireAdmin()

  const photo = await prisma.photo.findUnique({
    where: { id },
  })

  if (!photo) {
    throw new Error('Photo not found')
  }

  // Delete from storage
  try {
    await deletePhoto(photo.url)
  } catch {
    // Continue even if storage delete fails
  }

  // Delete from database
  await prisma.photo.delete({
    where: { id },
  })

  revalidatePath(`/admin/collections/${photo.collectionId}/photos`)
}