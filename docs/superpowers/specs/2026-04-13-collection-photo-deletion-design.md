# Collection and Photo Deletion Design

**Date:** 2026-04-13
**Author:** Claude
**Status:** Approved

## Overview

Allow admins to delete collections (including photos) and bulk-delete multiple photos within a collection. Both operations show warnings about affected users before proceeding.

## Requirements

1. **Delete Collections** - Admin can delete a collection along with all its photos and associated UserPhotos
2. **Bulk Delete Photos** - Admin can select and delete multiple photos within a collection at once
3. **Impact Warnings** - Both operations show affected user count before deletion

## Technical Design

### 1. Collection Deletion

#### Backend Changes

**File:** `src/lib/actions/collections.ts`

Modify existing `deleteCollection` function to:
- Remove the blocking check for existing photos
- Use Prisma's cascade delete (already configured in schema)
- Count affected users before deletion for warning display

```typescript
export async function deleteCollection(id: string) {
  await requireAdmin()

  // Get impact info before deletion
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      _count: {
        select: { photos: true }
      },
      photos: {
        include: {
          _count: {
            select: { userPhotos: true }
          }
        }
      }
    }
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const affectedUsersCount = await prisma.userPhoto.count({
    where: {
      photo: { collectionId: id }
    }
  })

  await prisma.collection.delete({
    where: { id }
  })

  revalidatePath('/admin/collections')
  return { photoCount: collection._count.photos, affectedUsers: affectedUsersCount }
}
```

**New action for preview:**

```typescript
export async function getCollectionDeletionImpact(id: string) {
  await requireAdmin()

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: {
      name: true,
      _count: {
        select: { photos: true }
      }
    }
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const affectedUsersCount = await prisma.userPhoto.count({
    where: {
      photo: { collectionId: id }
    }
  })

  return {
    name: collection.name,
    photoCount: collection._count.photos,
    affectedUsers: affectedUsersCount
  }
}
```

#### Frontend Changes

**File:** `src/app/(admin)/admin/collections/collection-list.tsx`

Add:
1. Delete button in the Actions column
2. Confirmation dialog component with impact info
3. State management for dialog open/close
4. Call to `getCollectionDeletionImpact` before showing dialog
5. Call to `deleteCollection` on confirm

### 2. Bulk Photo Deletion

#### Backend Changes

**File:** `src/lib/actions/photos.ts`

New action:

```typescript
export async function deletePhotos(photoIds: string[]) {
  await requireAdmin()

  if (photoIds.length === 0) {
    throw new Error('No photos selected')
  }

  // Get impact info
  const affectedUsersCount = await prisma.userPhoto.count({
    where: { photoId: { in: photoIds } }
  })

  // Delete photos (cascade handles UserPhotos)
  await prisma.photo.deleteMany({
    where: { id: { in: photoIds } }
  })

  revalidatePath('/admin/collections')
  return { deletedCount: photoIds.length, affectedUsers: affectedUsersCount }
}

export async function getPhotoDeletionImpact(photoIds: string[]) {
  await requireAdmin()

  const affectedUsersCount = await prisma.userPhoto.count({
    where: { photoId: { in: photoIds } }
  })

  return {
    photoCount: photoIds.length,
    affectedUsers: affectedUsersCount
  }
}
```

#### Frontend Changes

**File:** `src/app/(admin)/admin/collections/[id]/photos/page.tsx`

Modify to add:
1. Checkbox on each photo row
2. "Select all" checkbox in header
3. Selection state management (Set of selected photo IDs)
4. Action bar showing "X selected" when items are selected
5. Delete button that opens confirmation dialog
6. Confirmation dialog showing impact

**New component (optional):** `photo-selection-bar.tsx` for the bulk action UI

## Database Considerations

The Prisma schema already has cascade deletes configured:
- `Photo` has `onDelete: Cascade` from `Collection`
- `UserPhoto` has `onDelete: Cascade` from `Photo`

No schema changes needed.

## UI/UX Flow

### Collection Deletion Flow

1. Admin clicks "Delete" button on collection row
2. Dialog opens with:
   - Collection name
   - "This will delete X photos"
   - "X users have collected photos from this collection"
   - Confirm/Cancel buttons
3. On confirm, collection is deleted and list refreshes

### Bulk Photo Deletion Flow

1. Admin navigates to collection photos page
2. Admin selects photos via checkboxes
3. Action bar appears showing "X photos selected"
4. Admin clicks "Delete" button
5. Dialog opens showing:
   - "Delete X photos?"
   - "X users have collected these photos"
   - Confirm/Cancel buttons
6. On confirm, photos are deleted and page refreshes

## Files to Modify

1. `src/lib/actions/collections.ts` - Add `getCollectionDeletionImpact`, modify `deleteCollection`
2. `src/lib/actions/photos.ts` - Add `deletePhotos`, `getPhotoDeletionImpact`
3. `src/app/(admin)/admin/collections/collection-list.tsx` - Add delete button and dialog
4. `src/app/(admin)/admin/collections/[id]/photos/page.tsx` - Add selection UI and bulk delete