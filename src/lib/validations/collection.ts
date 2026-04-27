import { z } from 'zod'

export const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  prize: z.string().max(200).optional().default(''),
  photosPerPage: z.number().int().min(1).max(50).optional().default(10),
  active: z.boolean().optional(),
})

export type CollectionInput = z.infer<typeof collectionSchema>

export const collectionPrizeSchema = z.object({
  type: z.enum(['PER_PAGE', 'COMPLETION']),
  pageNumber: z.number().int().min(1).optional(),
  description: z.string().min(1).max(300),
})

export type CollectionPrizeInput = z.infer<typeof collectionPrizeSchema>