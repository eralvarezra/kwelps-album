import { z } from 'zod'

export const raritySchema = z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])

export const photoSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  url: z.string().url('Invalid URL'),
  thumbnailUrl: z.string().url('Invalid URL').optional(),
  rarity: raritySchema,
})

export type PhotoInput = z.infer<typeof photoSchema>

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB