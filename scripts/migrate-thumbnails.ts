/**
 * Migration script to generate thumbnails for existing photos.
 *
 * This script processes all photos in the database that have thumbnailUrl
 * pointing to the same file as url (or null), and generates proper blurry
 * thumbnails for them.
 *
 * Usage: npm run migrate:thumbnails
 *
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key for storage access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Constants matching supabase-storage.ts
const BUCKET_NAME = 'photos'
const THUMBNAIL_HEIGHT = 100
const THUMBNAIL_BLUR = 10
const THUMBNAIL_QUALITY = 60

// Progress tracking
interface MigrationStats {
  total: number
  processed: number
  skipped: number
  success: number
  failed: number
  errors: Array<{ photoId: string; error: string }>
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: ['error'],
  })
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize({ height: THUMBNAIL_HEIGHT, withoutEnlargement: true })
    .blur(THUMBNAIL_BLUR)
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer()
}

function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/photos/')
    if (pathParts.length < 2) {
      return null
    }
    return pathParts[1]
  } catch {
    return null
  }
}

function generateThumbnailPath(originalPath: string): string {
  // Replace 'original-' prefix with 'thumbnail-' and change extension to .jpg
  const dir = originalPath.substring(0, originalPath.lastIndexOf('/'))
  const filename = originalPath.substring(originalPath.lastIndexOf('/') + 1)

  // Remove 'original-' prefix if present, otherwise use the base name
  const baseName = filename.startsWith('original-')
    ? filename.substring(9)
    : filename
  const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.')) || baseName

  return `${dir}/thumbnail-${nameWithoutExt}.jpg`
}

async function downloadImage(supabase: SupabaseClient, path: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path)

  if (error || !data) {
    return null
  }

  return Buffer.from(await data.arrayBuffer())
}

async function uploadThumbnail(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    // If file already exists, we can use it (idempotency)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      // File already there, return the URL
    } else {
      return null
    }
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return data.publicUrl
}

async function migratePhoto(
  prisma: PrismaClient,
  supabase: SupabaseClient,
  photo: { id: string; url: string; thumbnailUrl: string | null; collectionId: string },
  stats: MigrationStats
): Promise<void> {
  // Check if thumbnail needs to be generated
  // Skip if thumbnailUrl is already different from url (already migrated)
  if (photo.thumbnailUrl && photo.thumbnailUrl !== photo.url) {
    stats.skipped++
    console.log(`[SKIP] Photo ${photo.id}: already has a distinct thumbnail`)
    return
  }

  console.log(`[PROCESS] Photo ${photo.id}: generating thumbnail...`)

  // Extract path from original URL
  const originalPath = extractPathFromUrl(photo.url)
  if (!originalPath) {
    stats.failed++
    stats.errors.push({
      photoId: photo.id,
      error: 'Could not extract path from URL',
    })
    console.error(`[ERROR] Photo ${photo.id}: could not extract path from URL`)
    return
  }

  // Download original image
  const originalBuffer = await downloadImage(supabase, originalPath)
  if (!originalBuffer) {
    stats.failed++
    stats.errors.push({
      photoId: photo.id,
      error: 'Could not download original image',
    })
    console.error(`[ERROR] Photo ${photo.id}: could not download original image`)
    return
  }

  // Generate thumbnail
  let thumbnailBuffer: Buffer
  try {
    thumbnailBuffer = await generateThumbnail(originalBuffer)
  } catch (error) {
    stats.failed++
    stats.errors.push({
      photoId: photo.id,
      error: `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
    console.error(`[ERROR] Photo ${photo.id}: failed to generate thumbnail`)
    return
  }

  // Generate thumbnail path
  const thumbnailPath = generateThumbnailPath(originalPath)

  // Upload thumbnail
  const thumbnailUrl = await uploadThumbnail(supabase, thumbnailPath, thumbnailBuffer)
  if (!thumbnailUrl) {
    stats.failed++
    stats.errors.push({
      photoId: photo.id,
      error: 'Failed to upload thumbnail',
    })
    console.error(`[ERROR] Photo ${photo.id}: failed to upload thumbnail`)
    return
  }

  // Update database
  try {
    await prisma.photo.update({
      where: { id: photo.id },
      data: { thumbnailUrl },
    })
    stats.success++
    console.log(`[SUCCESS] Photo ${photo.id}: thumbnail created at ${thumbnailUrl}`)
  } catch (error) {
    stats.failed++
    stats.errors.push({
      photoId: photo.id,
      error: `Failed to update database: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
    console.error(`[ERROR] Photo ${photo.id}: failed to update database`)

    // Try to clean up uploaded thumbnail
    await supabase.storage.from(BUCKET_NAME).remove([thumbnailPath])
  }
}

async function main() {
  console.log('=== Thumbnail Migration Script ===\n')
  console.log('Starting migration...\n')

  // Validate environment variables
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set')
    process.exit(1)
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set')
    process.exit(1)
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set')
    process.exit(1)
  }

  // Initialize clients
  const prisma = createPrismaClient()
  const supabase = createSupabaseAdmin()

  // Initialize stats
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    skipped: 0,
    success: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get all photos
    const photos = await prisma.photo.findMany({
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        collectionId: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    stats.total = photos.length
    console.log(`Found ${photos.length} photos in database.\n`)

    if (photos.length === 0) {
      console.log('No photos to process. Exiting.')
      return
    }

    // Process photos in batches to avoid memory issues
    const batchSize = 10
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize)

      for (const photo of batch) {
        stats.processed++
        await migratePhoto(prisma, supabase, photo, stats)
      }

      // Progress update after each batch
      console.log(`\n--- Progress: ${stats.processed}/${stats.total} photos processed ---`)
      console.log(`  Success: ${stats.success}`)
      console.log(`  Skipped: ${stats.skipped}`)
      console.log(`  Failed: ${stats.failed}`)
      console.log('')
    }

    // Final summary
    console.log('\n=== Migration Complete ===\n')
    console.log(`Total photos: ${stats.total}`)
    console.log(`Processed: ${stats.processed}`)
    console.log(`  - Success: ${stats.success}`)
    console.log(`  - Skipped: ${stats.skipped}`)
    console.log(`  - Failed: ${stats.failed}`)

    if (stats.errors.length > 0) {
      console.log('\nErrors:')
      stats.errors.forEach(({ photoId, error }) => {
        console.log(`  - Photo ${photoId}: ${error}`)
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Migration failed with error:', error)
  process.exit(1)
})