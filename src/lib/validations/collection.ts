import { z } from 'zod'

export const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  prize: z.string().min(1, 'Prize is required').max(200, 'Prize must be 200 characters or less'),
  active: z.boolean().optional(),
})

export type CollectionInput = z.infer<typeof collectionSchema>