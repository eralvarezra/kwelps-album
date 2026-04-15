import { z } from 'zod'

export const raritySchema = z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])

export const photoSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  url: z.string().url('Invalid URL'),
  thumbnailUrl: z.string().url('Invalid URL').optional(),
  rarity: raritySchema,
})

export type PhotoInput = z.infer<typeof photoSchema>

// Allowed MIME types for image uploads
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Magic bytes (file signatures) for allowed image types
 * These are the first few bytes that identify the file type
 */
export const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG always starts with FF D8 FF
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
  ],
}

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): mimeType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType)
}

/**
 * Validate file by checking magic bytes
 * This prevents malicious files disguised as images
 *
 * @param buffer - The file buffer (first 12 bytes are enough)
 * @returns The detected MIME type or null if not recognized
 */
export function detectMimeType(buffer: Buffer): string | null {
  // Check JPEG
  if (buffer.length >= 3) {
    const jpegHeader = buffer.slice(0, 3)
    if (jpegHeader[0] === 0xFF && jpegHeader[1] === 0xD8 && jpegHeader[2] === 0xFF) {
      return 'image/jpeg'
    }
  }

  // Check PNG
  if (buffer.length >= 8) {
    const pngHeader = buffer.slice(0, 8)
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    if (pngHeader.every((byte, i) => byte === pngSignature[i])) {
      return 'image/png'
    }
  }

  // Check WebP (RIFF + WEBP)
  if (buffer.length >= 12) {
    const riffHeader = buffer.slice(0, 4)
    const webpMarker = buffer.slice(8, 12)

    if (
      riffHeader[0] === 0x52 && // R
      riffHeader[1] === 0x49 && // I
      riffHeader[2] === 0x46 && // F
      riffHeader[3] === 0x46 && // F
      webpMarker[0] === 0x57 && // W
      webpMarker[1] === 0x45 && // E
      webpMarker[2] === 0x42 && // B
      webpMarker[3] === 0x50    // P
    ) {
      return 'image/webp'
    }
  }

  return null
}

/**
 * Validate that a file buffer matches its claimed MIME type
 *
 * @param buffer - The file buffer
 * @param claimedMimeType - The MIME type from the File object
 * @returns Object with validation result
 */
export function validateImageFile(
  buffer: Buffer,
  claimedMimeType: string
): { valid: boolean; error?: string; detectedType?: string } {
  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }

  // Check claimed MIME type is allowed
  if (!isAllowedMimeType(claimedMimeType)) {
    return {
      valid: false,
      error: `File type "${claimedMimeType}" is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    }
  }

  // Detect actual file type from magic bytes
  const detectedType = detectMimeType(buffer)

  if (!detectedType) {
    return { valid: false, error: 'Could not determine file type. File may be corrupted or not an image.' }
  }

  // Verify claimed type matches detected type
  // Note: We allow some flexibility - JPEG is always detected as image/jpeg
  if (detectedType !== claimedMimeType) {
    return {
      valid: false,
      error: `File type mismatch: claimed "${claimedMimeType}" but detected "${detectedType}"`,
      detectedType,
    }
  }

  return { valid: true, detectedType }
}