import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'photos'

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize({ height: 100, withoutEnlargement: true })
    .blur(10)
    .jpeg({ quality: 60 })
    .toBuffer()
}

export async function uploadPhoto(
  file: File,
  collectionId: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const supabase = await createClient()

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg'
  const uuid = crypto.randomUUID()
  const originalPath = `photos/${collectionId}/original-${uuid}.${ext}`
  const thumbnailPath = `photos/${collectionId}/thumbnail-${uuid}.jpg`

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const originalBuffer = Buffer.from(arrayBuffer)

  // Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(originalBuffer)

  // Upload original
  const { error: originalError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(originalPath, originalBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (originalError) {
    throw new Error(`Upload failed: ${originalError.message}`)
  }

  // Upload thumbnail
  const { error: thumbnailError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(thumbnailPath, thumbnailBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (thumbnailError) {
    // Try to clean up original if thumbnail fails
    await supabase.storage.from(BUCKET_NAME).remove([originalPath])
    throw new Error(`Thumbnail upload failed: ${thumbnailError.message}`)
  }

  // Get public URLs
  const { data: originalUrl } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(originalPath)

  const { data: thumbnailUrl } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(thumbnailPath)

  return {
    url: originalUrl.publicUrl,
    thumbnailUrl: thumbnailUrl.publicUrl,
  }
}

export async function deletePhoto(url: string): Promise<void> {
  const supabase = await createClient()

  // Extract path from URL
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/storage/v1/object/public/photos/')
  if (pathParts.length < 2) {
    throw new Error('Invalid photo URL')
  }

  const path = pathParts[1]

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}