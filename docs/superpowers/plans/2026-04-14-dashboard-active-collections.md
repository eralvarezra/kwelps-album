# Dashboard Active Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add active collections section to dashboard with photo backgrounds and store pre-selection.

**Architecture:** Fetch active collections with random common photos in dashboard server component, render cards with background images and links to store with collection parameter. Modify store-client to accept URL parameter for pre-selection.

**Tech Stack:** Next.js App Router, Prisma, React

---

## File Structure

```
src/app/(dashboard)/dashboard/page.tsx  # Add active collections section
src/app/(dashboard)/store/store-client.tsx  # Accept collection URL param
```

---

### Task 1: Add Active Collections Section to Dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Add import for Prisma Photo type and fetch active collections**

Find the data fetching section (around line 38-46) and add a new query for active collections with photos:

```tsx
// Get real data
const [wallet, photoCount, activeCollections] = await Promise.all([
  prisma.wallet.findUnique({
    where: { userId: user.id },
  }),
  prisma.userPhoto.count({
    where: { userId: user.id },
  }),
  prisma.collection.findMany({
    where: { active: true },
    include: {
      photos: {
        where: { rarity: 'COMMON' },
        select: { id: true, url: true, thumbnailUrl: true },
      },
    },
  }),
])
```

- [ ] **Step 2: Prepare collection data with random photos**

Add after the data fetching (after line 48):

```tsx
const balance = wallet?.balance ? Number(wallet.balance) : 0
const uniquePhotos = photoCount

// Get one random common photo per collection
const collectionsWithPhotos = activeCollections.map(collection => {
  const randomIndex = Math.floor(Math.random() * collection.photos.length)
  const randomPhoto = collection.photos[randomIndex]
  return {
    id: collection.id,
    name: collection.name,
    prize: collection.prize,
    photo: randomPhoto || null,
  }
}).filter(c => c.photo) // Only show collections with photos
```

- [ ] **Step 3: Add the Active Collections section**

Add a new section between the cards grid and the "¿Qué es Kwelps Album?" section (after line 103, before line 105):

```tsx
      </div>

      {/* Active Collections Section */}
      {collectionsWithPhotos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Colecciones Disponibles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionsWithPhotos.map(collection => (
              <Link
                key={collection.id}
                href={`/store?collection=${collection.id}`}
                className="block"
              >
                <div className="relative h-48 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors">
                  {/* Background photo */}
                  <img
                    src={collection.photo?.url || ''}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  {/* Content */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{collection.name}</h3>
                      <p className="text-sm text-yellow-400 mt-1">Premio: {collection.prize}</p>
                    </div>
                    <div className="flex justify-end">
                      <span className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                        Ir a Tienda
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

Expected: Build passes with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: add active collections section to dashboard"
```

---

### Task 2: Accept Collection URL Parameter in Store

**Files:**
- Modify: `src/app/(dashboard)/store/store-client.tsx`

- [ ] **Step 1: Add useSearchParams import**

Update the imports at the top (line 1-8):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { purchasePack, purchaseSingle, getStoreInfo } from '@/lib/actions/store'
```

- [ ] **Step 2: Add searchParams hook and effect**

After the state declarations (around line 35), add:

```tsx
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())

  const searchParams = useSearchParams()
  const collectionParam = searchParams.get('collection')

  // Set collection from URL param on mount
  useEffect(() => {
    if (collectionParam) {
      const collectionExists = data.collections.find(c => c.id === collectionParam)
      if (collectionExists) {
        setSelectedCollectionId(collectionParam)
      }
    }
  }, [collectionParam, data.collections])
```

- [ ] **Step 3: Update selectedCollectionId initial state**

Change the initial state (line 28-30) to use the URL parameter if available:

```tsx
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    collectionParam || initialData.collections[0]?.id || null
  )
```

Wait - this won't work because `collectionParam` is read inside the component but we're using it for initial state. Let me fix this with a different approach:

Actually, the useEffect approach in Step 2 handles this correctly. Keep the original initial state:

```tsx
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    initialData.collections[0]?.id || null
  )
```

And the useEffect will update it if there's a URL parameter.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/store/store-client.tsx
git commit -m "feat: accept collection URL parameter in store for pre-selection"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Active collections displayed - Task 1
- ✅ Photo as background - Task 1
- ✅ Collection name and prize - Task 1
- ✅ "Ir a Tienda" button with collection param - Task 1
- ✅ Store pre-selects from URL - Task 2

**2. Placeholder scan:**
- No TBDs, TODOs, or incomplete sections
- All code blocks contain implementation code

**3. Type consistency:**
- Uses existing Prisma types
- `collection.prize` was added earlier in this session
- `useSearchParams` from next/navigation is standard

---

## Testing Checklist (Manual)

- [ ] Dashboard shows active collections section
- [ ] Each collection shows photo background
- [ ] Collection name and prize display correctly
- [ ] "Ir a Tienda" button navigates to store with collection param
- [ ] Store pre-selects correct collection from URL
- [ ] Store falls back to first collection if invalid param
- [ ] Responsive grid works on different screen sizes