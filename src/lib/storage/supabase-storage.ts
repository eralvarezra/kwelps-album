import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'photos'

export async function uploadPhoto(
  file: File,
  collectionId: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const supabase = await createClient()

  // Generate unique filename
  const ext = file.name.split('.').pop()
  const fileName = `photos/${collectionId}/original-${crypto.randomUUID()}.${ext}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  // Generate thumbnail URL using Supabase transformation
  const thumbnailUrl = `${urlData.publicUrl}?width=200&height=200&resize=cover`

  return {
    url: urlData.publicUrl,
    thumbnailUrl,
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