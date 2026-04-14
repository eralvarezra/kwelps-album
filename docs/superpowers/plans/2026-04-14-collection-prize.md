# Collection Prize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mandatory prize field to collections, visible in admin panel and user album.

**Architecture:** Add `prize` field to Prisma schema, update validation and types, add UI inputs in admin forms, display prize in admin list and user album.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Tailwind CSS

---

## File Structure

```
prisma/schema.prisma                          # Add prize field
src/lib/validations/collection.ts             # Add prize validation
src/lib/actions/album.ts                      # Update AlbumCollection type
src/app/(admin)/admin/collections/new/page.tsx    # Add prize input
src/app/(admin)/admin/collections/[id]/page.tsx   # Add prize input (edit)
src/app/(admin)/admin/collections/collection-list.tsx  # Show prize in table
src/app/(dashboard)/album/album-client.tsx    # Show prize to users
```

---

### Task 1: Add Prize Field to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add prize field to Collection model**

Add `prize` field after `description` in the Collection model:

```prisma
model Collection {
  id          String   @id @default(uuid())
  name        String
  description String?
  prize       String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  photos      Photo[]

  @@map("collections")
}
```

- [ ] **Step 2: Create and run migration**

```bash
npx prisma migrate dev --name add-collection-prize
```

- [ ] **Step 3: Commit schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add prize field to Collection model"
```

---

### Task 2: Update Validation Schema

**Files:**
- Modify: `src/lib/validations/collection.ts`

- [ ] **Step 1: Add prize validation**

Update the schema to include prize:

```typescript
import { z } from 'zod'

export const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  prize: z.string().min(1, 'Prize is required').max(200, 'Prize must be 200 characters or less'),
  active: z.boolean().optional(),
})

export type CollectionInput = z.infer<typeof collectionSchema>
```

- [ ] **Step 2: Commit validation changes**

```bash
git add src/lib/validations/collection.ts
git commit -m "feat: add prize validation to collection schema"
```

---

### Task 3: Update Album Types

**Files:**
- Modify: `src/lib/actions/album.ts`

- [ ] **Step 1: Add prize to AlbumCollection type**

Update the `AlbumCollection` type (around line 16):

```typescript
export type AlbumCollection = {
  id: string
  name: string
  description: string | null
  prize: string
  active: boolean
  totalPhotos: number
  collectedPhotos: number
  photos: AlbumPhoto[]
}
```

- [ ] **Step 2: Commit type changes**

```bash
git add src/lib/actions/album.ts
git commit -m "feat: add prize to AlbumCollection type"
```

---

### Task 4: Add Prize Input to New Collection Form

**Files:**
- Modify: `src/app/(admin)/admin/collections/new/page.tsx`

- [ ] **Step 1: Add prize state and input**

Add prize state after description state (around line 11):

```typescript
const [prize, setPrize] = useState('')
```

Update handleSubmit to include prize (around line 20):

```typescript
await createCollection({ name, description: description || undefined, prize })
```

Add prize input field after description textarea (around line 62):

```typescript
<div>
  <label htmlFor="prize" className="block text-sm font-medium text-gray-300 mb-2">
    Prize *
  </label>
  <input
    type="text"
    id="prize"
    value={prize}
    onChange={(e) => setPrize(e.target.value)}
    required
    maxLength={200}
    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
  />
</div>
```

- [ ] **Step 2: Commit form changes**

```bash
git add src/app/\(admin\)/admin/collections/new/page.tsx
git commit -m "feat: add prize input to new collection form"
```

---

### Task 5: Add Prize Input to Edit Collection Form

**Files:**
- Modify: `src/app/(admin)/admin/collections/[id]/page.tsx`

- [ ] **Step 1: Add prize to Collection type**

Update the Collection type (around line 13):

```typescript
type Collection = {
  id: string
  name: string
  description: string | null
  prize: string
  photos: Photo[]
}
```

- [ ] **Step 2: Add prize state and load data**

Add prize state after description state (around line 88):

```typescript
const [prize, setPrize] = useState('')
```

Update the useEffect to load prize (around line 98):

```typescript
setName(data.name)
setDescription(data.description || '')
setPrize(data.prize || '')
```

- [ ] **Step 3: Update handleSubmit to include prize**

Update the updateCollection call (around line 110):

```typescript
await updateCollection(id, { name, description: description || undefined, prize })
```

- [ ] **Step 4: Add prize input to form**

Add prize input field after description textarea (around line 304):

```typescript
<div>
  <label htmlFor="prize" className="block text-sm font-medium text-gray-300 mb-2">
    Prize *
  </label>
  <input
    type="text"
    id="prize"
    value={prize}
    onChange={(e) => setPrize(e.target.value)}
    required
    maxLength={200}
    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
  />
</div>
```

- [ ] **Step 5: Commit edit form changes**

```bash
git add src/app/\(admin\)/admin/collections/\[id\]/page.tsx
git commit -m "feat: add prize input to edit collection form"
```

---

### Task 6: Show Prize in Collection List

**Files:**
- Modify: `src/app/(admin)/admin/collections/collection-list.tsx`

- [ ] **Step 1: Add prize to Collection type**

Update the Collection type (around line 8):

```typescript
type Collection = {
  id: string
  name: string
  description: string | null
  prize: string
  active: boolean
  createdAt: Date
  _count: { photos: number }
}
```

- [ ] **Step 2: Add Prize column to table**

Add a new column after Name (around line 42):

```typescript
<th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
  Prize
</th>
```

Add prize cell after name cell (around line 61):

```typescript
<td className="px-5 py-4">
  <span className="text-sm text-gray-300 truncate max-w-[150px] block">
    {collection.prize}
  </span>
</td>
```

- [ ] **Step 3: Commit list changes**

```bash
git add src/app/\(admin\)/admin/collections/collection-list.tsx
git commit -m "feat: show prize in collection list table"
```

---

### Task 7: Show Prize in User Album

**Files:**
- Modify: `src/components/book/BookHeader.tsx`
- Modify: `src/app/(dashboard)/album/album-client.tsx`

- [ ] **Step 1: Add prize prop to BookHeader**

Update the props type (line 3-17):

```typescript
type BookHeaderProps = {
  collectionName: string
  collectionPrize?: string
  collected: number
  total: number
  byRarity: {
    COMMON: number
    RARE: number
    EPIC: number
    LEGENDARY: number
  }
  currentPage: number
  totalPages: number
  onSoundToggle?: () => void
  isMuted?: boolean
}
```

Update the function signature (line 19):

```typescript
export function BookHeader({
  collectionName,
  collectionPrize,
  collected,
  total,
  byRarity,
  onSoundToggle,
  isMuted,
}: BookHeaderProps) {
```

Add prize display after collection name (line 35):

```typescript
<h1 className="text-base font-bold text-white tracking-tight">{collectionName}</h1>
{collectionPrize && (
  <p className="text-xs text-yellow-400 mt-0.5">Premio: {collectionPrize}</p>
)}
```

- [ ] **Step 2: Pass prize to BookHeader in album-client.tsx**

Update BookHeader usage (around line 296):

```typescript
<BookHeader
  collectionName={collection?.name || 'Mi Álbum'}
  collectionPrize={collection?.prize}
  collected={collection?.collectedPhotos || 0}
  total={collection?.totalPhotos || 0}
  byRarity={byRarity}
  currentPage={1}
  totalPages={Math.ceil((collection?.photos.length || 0) / 6)}
  onSoundToggle={toggleMute}
  isMuted={muted}
/>
```

- [ ] **Step 3: Commit album changes**

```bash
git add src/components/book/BookHeader.tsx src/app/\(dashboard\)/album/album-client.tsx
git commit -m "feat: display collection prize in user album view"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Prize field added to schema - Task 1
- ✅ Prize validation added - Task 2
- ✅ Types updated - Task 3
- ✅ Prize input in new collection form - Task 4
- ✅ Prize input in edit collection form - Task 5
- ✅ Prize shown in admin list - Task 6
- ✅ Prize shown in user album - Task 7

**2. Placeholder scan:**
- All code blocks contain complete implementations
- No TBDs or TODOs

**3. Type consistency:**
- `prize: string` in Prisma schema
- `prize: z.string().min(1)` in validation
- `prize: string` in AlbumCollection type
- `prize: string` in Collection types in frontend components