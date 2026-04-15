import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'photos'
const THUMBNAIL_HEIGHT = 200  // Max height in pixels; maintains aspect ratio
const THUMBNAIL_BLUR = 3      // Gaussian blur sigma for privacy (light blur)
const THUMBNAIL_QUALITY = 70  // JPEG quality (0-100)

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize({ height: THUMBNAIL_HEIGHT, withoutEnlargement: true })
      .blur(THUMBNAIL_BLUR)
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer()
  } catch (error) {
    throw new Error('Failed to generate thumbnail. File may not be a valid image.')
  }
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

export async function deletePhoto(url: string, thumbnailUrl?: string | null): Promise<void> {
  const supabase = await createClient()

  // Extract path from URL
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/storage/v1/object/public/photos/')
  if (pathParts.length < 2) {
    throw new Error('Invalid photo URL')
  }

  const path = pathParts[1]
  const pathsToDelete = [path]

  // Also delete thumbnail if provided
  if (thumbnailUrl) {
    const thumbUrlObj = new URL(thumbnailUrl)
    const thumbParts = thumbUrlObj.pathname.split('/storage/v1/object/public/photos/')
    if (thumbParts.length >= 2) {
      pathsToDelete.push(thumbParts[1])
    }
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete)

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}