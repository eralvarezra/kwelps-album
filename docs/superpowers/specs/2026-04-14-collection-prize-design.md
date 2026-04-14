# Collection Prize Design

**Date:** 2026-04-14
**Author:** Claude
**Status:** Approved

## Overview

Add a `prize` field to collections, making it mandatory on creation, editable afterward, and visible in both admin panel and user album.

## Requirements

1. **Prize field** - Simple text field for the prize name/description
2. **Mandatory on creation** - Admin must enter a prize when creating a collection
3. **Editable** - Admin can update the prize at any time
4. **Visible everywhere** - Prize shows in admin panel and user album

## Technical Design

### Database Schema

**File:** `prisma/schema.prisma`

Add `prize` field to `Collection` model:

```prisma
model Collection {
  id          String   @id @default(uuid())
  name        String
  description String?
  prize       String   // New field - required
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  photos      Photo[]

  @@map("collections")
}
```

### Validation Schema

**File:** `src/lib/validations/collection.ts`

Add prize validation:

```typescript
export const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  prize: z.string().min(1, 'Prize is required').max(200, 'Prize must be 200 characters or less'),
  active: z.boolean().optional(),
})
```

### Backend Actions

**File:** `src/lib/actions/collections.ts`

- `createCollection` - already accepts `CollectionInput`, will include `prize`
- `updateCollection` - already accepts `Partial<CollectionInput>`, will include `prize`
- `getCollections` - already returns full collection, will include `prize`
- `getCollection` - already returns full collection, will include `prize`

**File:** `src/lib/actions/album.ts`

- `getAlbum` - returns collections with photos, should include `prize`
- `getCollectionAlbum` - returns single collection, should include `prize`

Update `AlbumCollection` type to include `prize: string`.

### Frontend Admin

**File:** `src/app/(admin)/admin/collections/new/page.tsx`

Add prize input field:
- Label: "Prize *"
- Required text input
- Max 200 characters
- Styled consistently with existing form

**File:** `src/app/(admin)/admin/collections/[id]/page.tsx`

Add prize input field:
- Label: "Prize"
- Editable text input
- Pre-populated with existing prize value

**File:** `src/app/(admin)/admin/collections/collection-list.tsx`

Show prize in table:
- New column "Prize" after "Name"
- Truncate long text with ellipsis if needed

### Frontend User

**File:** `src/lib/actions/album.ts`

Update `AlbumCollection` type and queries to include prize.

**File:** Album components (where collection name is displayed)

Show prize alongside collection name, e.g.:
- "Collection Name - Premio: iPhone 15"

## Migration

After schema change, run:

```bash
npx prisma migrate dev --name add-collection-prize
```

## Files to Modify

1. `prisma/schema.prisma` - Add `prize` field
2. `src/lib/validations/collection.ts` - Add prize validation
3. `src/lib/actions/collections.ts` - No changes needed (already uses CollectionInput)
4. `src/lib/actions/album.ts` - Update type and queries
5. `src/app/(admin)/admin/collections/new/page.tsx` - Add prize input
6. `src/app/(admin)/admin/collections/[id]/page.tsx` - Add prize input
7. `src/app/(admin)/admin/collections/collection-list.tsx` - Show prize in table
8. Album components - Show prize to users