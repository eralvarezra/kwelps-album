# Collection and Photo Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to delete collections (with cascade) and bulk-delete photos with impact warnings.

**Architecture:** Add server actions for deletion with impact preview, then add UI with confirmation dialogs showing affected users.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Server Actions

---

## File Structure

```
src/lib/actions/
├── collections.ts      # Add getCollectionDeletionImpact, modify deleteCollection
└── photos.ts           # Add deletePhotos, getPhotoDeletionImpact

src/app/(admin)/admin/collections/
├── collection-list.tsx # Add delete button + confirmation dialog
└── [id]/photos/
    └── page.tsx        # Add checkbox selection + bulk delete UI
```

---

### Task 1: Add Collection Deletion Backend Actions

**Files:**
- Modify: `src/lib/actions/collections.ts`

- [ ] **Step 1: Add getCollectionDeletionImpact function**

Add after the existing `toggleCollectionActive` function:

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

- [ ] **Step 2: Modify deleteCollection to allow cascade delete**

Replace the existing `deleteCollection` function (lines 58-75) with:

```typescript
export async function deleteCollection(id: string) {
  await requireAdmin()

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: {
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

  await prisma.collection.delete({
    where: { id }
  })

  revalidatePath('/admin/collections')
  return { photoCount: collection._count.photos, affectedUsers: affectedUsersCount }
}
```

- [ ] **Step 3: Commit backend changes**

```bash
git add src/lib/actions/collections.ts
git commit -m "feat: add collection deletion with cascade support and impact preview"
```

---

### Task 2: Add Bulk Photo Deletion Backend Actions

**Files:**
- Modify: `src/lib/actions/photos.ts`

- [ ] **Step 1: Add getPhotoDeletionImpact function**

Add at the end of the file:

```typescript
export async function getPhotoDeletionImpact(photoIds: string[]) {
  await requireAdmin()

  if (photoIds.length === 0) {
    return { photoCount: 0, affectedUsers: 0 }
  }

  const affectedUsersCount = await prisma.userPhoto.count({
    where: { photoId: { in: photoIds } }
  })

  return {
    photoCount: photoIds.length,
    affectedUsers: affectedUsersCount
  }
}
```

- [ ] **Step 2: Add deletePhotos function**

Add after `getPhotoDeletionImpact`:

```typescript
export async function deletePhotos(photoIds: string[]): Promise<{ success: boolean; deletedCount?: number; affectedUsers?: number; error?: string }> {
  await requireAdmin()

  if (photoIds.length === 0) {
    return { success: false, error: 'No photos selected' }
  }

  try {
    // Get photos to delete from storage
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, url: true, collectionId: true }
    })

    const affectedUsersCount = await prisma.userPhoto.count({
      where: { photoId: { in: photoIds } }
    })

    // Delete from storage
    for (const photo of photos) {
      try {
        await deletePhoto(photo.url)
      } catch {
        // Continue even if storage delete fails
      }
    }

    // Delete from database (cascade handles UserPhotos)
    await prisma.photo.deleteMany({
      where: { id: { in: photoIds } }
    })

    const collectionId = photos[0]?.collectionId
    if (collectionId) {
      revalidatePath(`/admin/collections/${collectionId}/photos`)
    }
    revalidatePath('/admin/collections')

    return { success: true, deletedCount: photoIds.length, affectedUsers: affectedUsersCount }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
```

- [ ] **Step 3: Commit backend changes**

```bash
git add src/lib/actions/photos.ts
git commit -m "feat: add bulk photo deletion with impact preview"
```

---

### Task 3: Add Collection Delete UI

**Files:**
- Modify: `src/app/(admin)/admin/collections/collection-list.tsx`

- [ ] **Step 1: Add imports and state for delete dialog**

Replace the imports at the top with:

```typescript
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toggleCollectionActive, getCollectionDeletionImpact, deleteCollection } from '@/lib/actions/collections'
```

- [ ] **Step 2: Add delete confirmation state and handler**

Add after the `handleToggle` function (before `if (collections.length === 0)`):

```typescript
type DeleteState = {
  isOpen: boolean
  collectionId: string | null
  collectionName: string
  photoCount: number
  affectedUsers: number
  isDeleting: boolean
}

const [deleteState, setDeleteState] = useState<DeleteState>({
  isOpen: false,
  collectionId: null,
  collectionName: '',
  photoCount: 0,
  affectedUsers: 0,
  isDeleting: false,
})

async function handleDeleteClick(id: string) {
  try {
    const impact = await getCollectionDeletionImpact(id)
    setDeleteState({
      isOpen: true,
      collectionId: id,
      collectionName: impact.name,
      photoCount: impact.photoCount,
      affectedUsers: impact.affectedUsers,
      isDeleting: false,
    })
  } catch (err) {
    alert((err as Error).message)
  }
}

async function handleConfirmDelete() {
  if (!deleteState.collectionId) return

  setDeleteState(prev => ({ ...prev, isDeleting: true }))
  try {
    await deleteCollection(deleteState.collectionId)
    setDeleteState(prev => ({ ...prev, isOpen: false }))
    router.refresh()
  } catch (err) {
    alert((err as Error).message)
    setDeleteState(prev => ({ ...prev, isDeleting: false }))
  }
}
```

- [ ] **Step 3: Add delete button to table row**

In the `<td>` with "Actions", add a Delete link after the "Photos" link:

```typescript
<td className="px-5 py-4 text-right text-sm font-medium space-x-3">
  <Link
    href={`/admin/collections/${collection.id}`}
    className="text-purple-400 hover:text-purple-300"
  >
    Edit
  </Link>
  <Link
    href={`/admin/collections/${collection.id}/photos`}
    className="text-purple-400 hover:text-purple-300"
  >
    Photos
  </Link>
  <button
    onClick={() => handleDeleteClick(collection.id)}
    className="text-red-400 hover:text-red-300"
  >
    Delete
  </button>
</td>
```

- [ ] **Step 4: Add delete confirmation dialog**

Add at the end of the component, before the closing `</div>`:

```typescript
{/* Delete Confirmation Dialog */}
{deleteState.isOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="glass rounded-xl p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-bold text-white mb-4">Delete Collection</h3>
      <div className="space-y-3 mb-6">
        <p className="text-gray-300">
          Are you sure you want to delete <span className="text-white font-medium">{deleteState.collectionName}</span>?
        </p>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">
            This will permanently delete <strong>{deleteState.photoCount}</strong> photos.
          </p>
          {deleteState.affectedUsers > 0 && (
            <p className="text-red-400 text-sm mt-1">
              <strong>{deleteState.affectedUsers}</strong> users have collected photos from this collection.
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setDeleteState(prev => ({ ...prev, isOpen: false }))}
          disabled={deleteState.isDeleting}
          className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmDelete}
          disabled={deleteState.isDeleting}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
        >
          {deleteState.isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit UI changes**

```bash
git add src/app/\(admin\)/admin/collections/collection-list.tsx
git commit -m "feat: add collection delete button with confirmation dialog"
```

---

### Task 4: Add Bulk Photo Selection and Delete UI

**Files:**
- Modify: `src/app/(admin)/admin/collections/[id]/photos/page.tsx`

- [ ] **Step 1: Update imports and add selection state**

Replace the imports at the top with:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { deletePhotoAction, deletePhotos, getPhotoDeletionImpact } from '@/lib/actions/photos'
import { UploadForm } from './upload-form'
```

Add state for selection after existing state declarations (after `const [loading, setLoading] = useState(true)`):

```typescript
const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [deleteImpact, setDeleteImpact] = useState({ photoCount: 0, affectedUsers: 0 })
const [isDeleting, setIsDeleting] = useState(false)
```

- [ ] **Step 2: Add selection handlers**

Add after the state declarations:

```typescript
function togglePhotoSelection(photoId: string) {
  setSelectedPhotos(prev => {
    const next = new Set(prev)
    if (next.has(photoId)) {
      next.delete(photoId)
    } else {
      next.add(photoId)
    }
    return next
  })
}

function toggleSelectAll() {
  if (!collection) return
  if (selectedPhotos.size === collection.photos.length) {
    setSelectedPhotos(new Set())
  } else {
    setSelectedPhotos(new Set(collection.photos.map(p => p.id)))
  }
}

async function handleBulkDeleteClick() {
  if (selectedPhotos.size === 0) return
  try {
    const impact = await getPhotoDeletionImpact(Array.from(selectedPhotos))
    setDeleteImpact(impact)
    setDeleteDialogOpen(true)
  } catch (err) {
    alert((err as Error).message)
  }
}

async function handleConfirmBulkDelete() {
  setIsDeleting(true)
  try {
    await deletePhotos(Array.from(selectedPhotos))
    setSelectedPhotos(new Set())
    setDeleteDialogOpen(false)
    window.location.reload()
  } catch (err) {
    alert((err as Error).message)
  } finally {
    setIsDeleting(false)
  }
}
```

- [ ] **Step 3: Add selection bar UI**

Add after the cost calculator section (before the grid):

```typescript
{/* Bulk Selection Bar */}
{selectedPhotos.size > 0 && (
  <div className="glass rounded-xl p-4 flex items-center justify-between">
    <span className="text-white">
      <strong>{selectedPhotos.size}</strong> photos selected
    </span>
    <div className="flex gap-3">
      <button
        onClick={() => setSelectedPhotos(new Set())}
        className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500"
      >
        Clear
      </button>
      <button
        onClick={handleBulkDeleteClick}
        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
      >
        Delete Selected
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add checkbox to photo grid header**

Before the photo grid, add a header row with select all:

```typescript
{/* Select All Header */}
{collection.photos.length > 0 && (
  <div className="mb-2">
    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
      <input
        type="checkbox"
        checked={collection.photos.length > 0 && selectedPhotos.size === collection.photos.length}
        onChange={toggleSelectAll}
        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
      />
      <span className="text-sm">Select all ({collection.photos.length} photos)</span>
    </label>
  </div>
)}
```

- [ ] **Step 5: Add checkbox to each photo card**

Update the photo card div to include a checkbox:

```typescript
<div key={photo.id} className="glass rounded-xl overflow-hidden group relative">
  {/* Selection Checkbox */}
  <div className="absolute top-2 left-2 z-10">
    <input
      type="checkbox"
      checked={selectedPhotos.has(photo.id)}
      onChange={() => togglePhotoSelection(photo.id)}
      className="w-5 h-5 rounded border-gray-600 bg-gray-700/80 text-purple-600 focus:ring-purple-500 cursor-pointer"
    />
  </div>
  <div className="aspect-square relative bg-gray-800/50 overflow-hidden">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={photo.thumbnailUrl || photo.url}
      alt="Photo"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
      }}
    />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
      <button
        onClick={() => handleDelete(photo.id)}
        className="opacity-0 group-hover:opacity-100 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-all"
      >
        Delete
      </button>
    </div>
  </div>
  <div className="p-2">
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${rarityColors[photo.rarity]}`}>
      {photo.rarity}
    </span>
  </div>
</div>
```

- [ ] **Step 6: Add bulk delete confirmation dialog**

Add at the end of the component, before the closing `</div>`:

```typescript
{/* Bulk Delete Confirmation Dialog */}
{deleteDialogOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="glass rounded-xl p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-bold text-white mb-4">Delete Photos</h3>
      <div className="space-y-3 mb-6">
        <p className="text-gray-300">
          Are you sure you want to delete <span className="text-white font-medium">{deleteImpact.photoCount}</span> photos?
        </p>
        {deleteImpact.affectedUsers > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">
              <strong>{deleteImpact.affectedUsers}</strong> users have collected these photos.
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setDeleteDialogOpen(false)}
          disabled={isDeleting}
          className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmBulkDelete}
          disabled={isDeleting}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Commit UI changes**

```bash
git add src/app/\(admin\)/admin/collections/\[id\]/photos/page.tsx
git commit -m "feat: add bulk photo selection and delete with confirmation"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Collection deletion with cascade - Task 1 & 3
- ✅ Bulk photo deletion - Task 2 & 4
- ✅ Impact warnings showing affected users - Both dialog implementations

**2. Placeholder scan:**
- No TBDs, TODOs, or placeholders found
- All code blocks contain complete implementations

**3. Type consistency:**
- `deleteCollection` returns `{ photoCount, affectedUsers }` - matches dialog state
- `deletePhotos` returns `{ success, deletedCount, affectedUsers, error }` - matches usage
- `getCollectionDeletionImpact` returns `{ name, photoCount, affectedUsers }` - matches usage
- `getPhotoDeletionImpact` returns `{ photoCount, affectedUsers }` - matches usage