# Milestone 2: Content Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin panel for managing collections and photos with Supabase Storage integration.

**Architecture:** Next.js 14 App Router with Server Actions for CRUD operations. Admin authentication via email check. Supabase Storage for image uploads. Zod for validation, React Hook Form for forms.

**Tech Stack:** Next.js 14, TypeScript, Prisma 7, Supabase (Auth + Storage), Tailwind CSS, Zod, React Hook Form

---

## File Structure

```
/src/app/(admin)/
├── layout.tsx                    # Admin layout with auth guard
├── admin/
│   ├── page.tsx                  # Admin dashboard
│   ├── collections/
│   │   ├── page.tsx              # Collections list
│   │   ├── new/page.tsx          # Create collection
│   │   └── [id]/
│   │       ├── page.tsx          # Edit collection
│   │       └── photos/page.tsx   # Manage photos
│   └── photos/
│       └── page.tsx              # All photos view

/src/lib/actions/
├── collections.ts                # Collection server actions
└── photos.ts                     # Photo server actions

/src/lib/storage/
└── supabase-storage.ts           # Storage upload helper

/src/lib/validations/
├── collection.ts                 # Zod schema for collection
└── photo.ts                     # Zod schema for photo

/src/components/admin/
├── admin-nav.tsx                 # Admin navigation
├── collection-form.tsx           # Collection form
├── photo-uploader.tsx           # Image upload component
├── photo-grid.tsx                # Photo grid display
└── rarity-badge.tsx             # Rarity indicator

/src/lib/supabase/
└── server.ts                     # Already exists, may need storage client
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install form and validation dependencies**

```bash
cd "C:\Users\Erick\Desktop\Album virtual\kwelps-album"
npm install react-hook-form @hookform/resolvers lucide-react
```

Expected: Dependencies installed successfully

- [ ] **Step 2: Commit dependencies**

```bash
git add package.json package-lock.json
git commit -m "feat: add react-hook-form, zod resolvers, and lucide icons"
```

---

## Task 2: Create Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/collection.ts`
- Create: `src/lib/validations/photo.ts`

- [ ] **Step 1: Create collection validation schema**

Create `src/lib/validations/collection.ts`:

```typescript
import { z } from 'zod'

export const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  active: z.boolean().optional(),
})

export type CollectionInput = z.infer<typeof collectionSchema>
```

- [ ] **Step 2: Create photo validation schema**

Create `src/lib/validations/photo.ts`:

```typescript
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
```

- [ ] **Step 3: Commit validation schemas**

```bash
git add src/lib/validations/
git commit -m "feat: add Zod validation schemas for collection and photo"
```

---

## Task 3: Create Supabase Storage Helper

**Files:**
- Create: `src/lib/storage/supabase-storage.ts`

- [ ] **Step 1: Create storage upload helper**

Create `src/lib/storage/supabase-storage.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'photos'

export async function uploadPhoto(
  file: File,
  collectionId: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const supabase = await createClient()

  // Generate unique filename
  const ext = file.name.split('.').pop()
  const fileName = `photos/${collectionId}/original-${crypto.randomUUID()}.${ext}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  // Generate thumbnail URL using Supabase transformation
  const thumbnailUrl = `${urlData.publicUrl}?width=200&height=200&resize=cover`

  return {
    url: urlData.publicUrl,
    thumbnailUrl,
  }
}

export async function deletePhoto(url: string): Promise<void> {
  const supabase = await createClient()

  // Extract path from URL
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/storage/v1/object/public/photos/')
  if (pathParts.length < 2) {
    throw new Error('Invalid photo URL')
  }

  const path = pathParts[1]

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}
```

- [ ] **Step 2: Commit storage helper**

```bash
git add src/lib/storage/
git commit -m "feat: add Supabase Storage upload helper"
```

---

## Task 4: Create Collection Server Actions

**Files:**
- Create: `src/lib/actions/collections.ts`

- [ ] **Step 1: Create collection server actions**

Create `src/lib/actions/collections.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { collectionSchema, type CollectionInput } from '@/lib/validations/collection'
import { requireAdmin } from '@/lib/auth/admin'

export async function getCollections() {
  return prisma.collection.findMany({
    include: {
      _count: {
        select: { photos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      photos: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createCollection(data: CollectionInput) {
  await requireAdmin()

  const validated = collectionSchema.parse(data)

  const collection = await prisma.collection.create({
    data: validated,
  })

  revalidatePath('/admin/collections')
  return collection
}

export async function updateCollection(id: string, data: Partial<CollectionInput>) {
  await requireAdmin()

  const validated = collectionSchema.partial().parse(data)

  const collection = await prisma.collection.update({
    where: { id },
    data: validated,
  })

  revalidatePath('/admin/collections')
  revalidatePath(`/admin/collections/${id}`)
  return collection
}

export async function deleteCollection(id: string) {
  await requireAdmin()

  // Check if collection has photos
  const photoCount = await prisma.photo.count({
    where: { collectionId: id },
  })

  if (photoCount > 0) {
    throw new Error('Cannot delete collection with photos. Delete photos first.')
  }

  await prisma.collection.delete({
    where: { id },
  })

  revalidatePath('/admin/collections')
}

export async function toggleCollectionActive(id: string, active: boolean) {
  await requireAdmin()

  const collection = await prisma.collection.update({
    where: { id },
    data: { active },
  })

  revalidatePath('/admin/collections')
  return collection
}
```

- [ ] **Step 2: Commit collection actions**

```bash
git add src/lib/actions/collections.ts
git commit -m "feat: add collection server actions with CRUD operations"
```

---

## Task 5: Create Admin Auth Helper

**Files:**
- Create: `src/lib/auth/admin.ts`

- [ ] **Step 1: Create admin auth helper**

Create `src/lib/auth/admin.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminEmail = process.env.ADMIN_EMAIL

  if (user.email !== adminEmail) {
    redirect('/dashboard?error=unauthorized')
  }

  return user
}

export async function isAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  return user.email === process.env.ADMIN_EMAIL
}
```

- [ ] **Step 2: Commit admin auth helper**

```bash
git add src/lib/auth/admin.ts
git commit -m "feat: add admin authentication helper"
```

---

## Task 6: Update Middleware for Admin Routes

**Files:**
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Update middleware to check admin routes**

Update `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect admin routes - only allow ADMIN_EMAIL
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (user.email !== adminEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Commit middleware update**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: add admin route protection in middleware"
```

---

## Task 7: Create Photo Server Actions

**Files:**
- Create: `src/lib/actions/photos.ts`

- [ ] **Step 1: Create photo server actions**

Create `src/lib/actions/photos.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { photoSchema, type PhotoInput } from '@/lib/validations/photo'
import { requireAdmin } from '@/lib/auth/admin'
import { uploadPhoto, deletePhoto } from '@/lib/storage/supabase-storage'

export async function getPhotos(collectionId?: string) {
  const where = collectionId ? { collectionId } : {}

  return prisma.photo.findMany({
    where,
    include: {
      collection: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPhoto(id: string) {
  return prisma.photo.findUnique({
    where: { id },
    include: {
      collection: true,
    },
  })
}

export async function createPhoto(data: PhotoInput) {
  await requireAdmin()

  const validated = photoSchema.parse(data)

  const photo = await prisma.photo.create({
    data: validated,
  })

  revalidatePath(`/admin/collections/${validated.collectionId}/photos`)
  return photo
}

export async function createPhotoWithUpload(
  formData: FormData
): Promise<{ success: boolean; photo?: typeof photo; error?: string }> {
  await requireAdmin()

  const file = formData.get('file') as File
  const collectionId = formData.get('collectionId') as string
  const rarity = formData.get('rarity') as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

  if (!file || !collectionId || !rarity) {
    return { success: false, error: 'Missing required fields' }
  }

  try {
    const { url, thumbnailUrl } = await uploadPhoto(file, collectionId)

    const photo = await prisma.photo.create({
      data: {
        collectionId,
        url,
        thumbnailUrl,
        rarity,
      },
    })

    revalidatePath(`/admin/collections/${collectionId}/photos`)
    return { success: true, photo }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function updatePhoto(
  id: string,
  data: Partial<Pick<PhotoInput, 'rarity' | 'thumbnailUrl'>>
) {
  await requireAdmin()

  const photo = await prisma.photo.update({
    where: { id },
    data,
  })

  revalidatePath(`/admin/collections/${photo.collectionId}/photos`)
  return photo
}

export async function deletePhotoAction(id: string) {
  await requireAdmin()

  const photo = await prisma.photo.findUnique({
    where: { id },
  })

  if (!photo) {
    throw new Error('Photo not found')
  }

  // Delete from storage
  try {
    await deletePhoto(photo.url)
  } catch {
    // Continue even if storage delete fails
  }

  // Delete from database
  await prisma.photo.delete({
    where: { id },
  })

  revalidatePath(`/admin/collections/${photo.collectionId}/photos`)
}
```

- [ ] **Step 2: Commit photo actions**

```bash
git add src/lib/actions/photos.ts
git commit -m "feat: add photo server actions with upload support"
```

---

## Task 8: Create Admin Navigation Component

**Files:**
- Create: `src/components/admin/admin-nav.tsx`

- [ ] **Step 1: Create admin navigation**

Create `src/components/admin/admin-nav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  Images,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/collections', label: 'Collections', icon: FolderOpen },
  { href: '/admin/photos', label: 'Photos', icon: Images },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 min-h-screen bg-gray-900 text-white p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <p className="text-sm text-gray-400">Kwelps Album</p>
      </div>

      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Commit admin navigation**

```bash
git add src/components/admin/admin-nav.tsx
git commit -m "feat: add admin navigation component"
```

---

## Task 9: Create Admin Layout

**Files:**
- Create: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create admin layout**

Create `src/app/(admin)/layout.tsx`:

```typescript
import { AdminNav } from '@/components/admin/admin-nav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit admin layout**

```bash
git add src/app/\(admin\)/layout.tsx
git commit -m "feat: add admin layout with navigation"
```

---

## Task 10: Create Admin Dashboard Page

**Files:**
- Create: `src/app/(admin)/admin/page.tsx`

- [ ] **Step 1: Create admin dashboard**

Create `src/app/(admin)/admin/page.tsx`:

```typescript
import { getCollections } from '@/lib/actions/collections'
import { getPhotos } from '@/lib/actions/photos'
import { requireAdmin } from '@/lib/auth/admin'
import { Collection, Photo, Users, DollarSign } from 'lucide-react'

export default async function AdminDashboardPage() {
  await requireAdmin()

  const [collections, photos] = await Promise.all([
    getCollections(),
    getPhotos(),
  ])

  const activeCollections = collections.filter((c) => c.active).length
  const totalPhotos = photos.length

  const stats = [
    { label: 'Collections', value: collections.length, icon: Collection, color: 'bg-blue-500' },
    { label: 'Active Collections', value: activeCollections, icon: Collection, color: 'bg-green-500' },
    { label: 'Total Photos', value: totalPhotos, icon: Photo, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Collections</h2>
        {collections.length === 0 ? (
          <p className="text-gray-500">No collections yet. Create one to get started.</p>
        ) : (
          <ul className="space-y-2">
            {collections.slice(0, 5).map((collection) => (
              <li key={collection.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span>{collection.name}</span>
                <span className={`px-2 py-1 text-xs rounded ${
                  collection.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {collection.active ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit admin dashboard**

```bash
git add src/app/\(admin\)/admin/page.tsx
git commit -m "feat: add admin dashboard with stats overview"
```

---

## Task 11: Create Collections List Page

**Files:**
- Create: `src/app/(admin)/admin/collections/page.tsx`

- [ ] **Step 1: Create collections list page**

Create `src/app/(admin)/admin/collections/page.tsx`:

```typescript
import Link from 'next/link'
import { getCollections } from '@/lib/actions/collections'
import { requireAdmin } from '@/lib/auth/admin'
import { Plus, Pencil, Trash2, Images } from 'lucide-react'

export default async function CollectionsPage() {
  await requireAdmin()

  const collections = await getCollections()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Link
          href="/admin/collections/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500 mb-4">No collections yet.</p>
          <Link
            href="/admin/collections/new"
            className="text-blue-600 hover:underline"
          >
            Create your first collection
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {collections.map((collection) => (
                <tr key={collection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{collection.name}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                    {collection.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      collection.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {collection.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {collection._count.photos}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/collections/${collection.id}/photos`}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Manage Photos"
                      >
                        <Images className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit collections list page**

```bash
git add src/app/\(admin\)/admin/collections/page.tsx
git commit -m "feat: add collections list page with table view"
```

---

## Task 12: Create Collection Form Component

**Files:**
- Create: `src/components/admin/collection-form.tsx`

- [ ] **Step 1: Create collection form component**

Create `src/components/admin/collection-form.tsx`:

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { collectionSchema, type CollectionInput } from '@/lib/validations/collection'
import { createCollection, updateCollection } from '@/lib/actions/collections'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CollectionFormProps {
  collection?: {
    id: string
    name: string
    description: string | null
    active: boolean
  }
}

export function CollectionForm({ collection }: CollectionFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: collection?.name ?? '',
      description: collection?.description ?? '',
      active: collection?.active ?? true,
    },
  })

  const onSubmit = async (data: CollectionInput) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (collection) {
        await updateCollection(collection.id, data)
        router.push('/admin/collections')
      } else {
        await createCollection(data)
        router.push('/admin/collections')
      }
    } catch (err) {
      setError((err as Error).message)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Collection name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          id="description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('active')}
          type="checkbox"
          id="active"
          className="w-4 h-4 rounded border-gray-300"
        />
        <label htmlFor="active" className="text-sm text-gray-700">
          Active (visible to users)
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : collection ? 'Update Collection' : 'Create Collection'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit collection form**

```bash
git add src/components/admin/collection-form.tsx
git commit -m "feat: add collection form with validation"
```

---

## Task 13: Create New Collection Page

**Files:**
- Create: `src/app/(admin)/admin/collections/new/page.tsx`

- [ ] **Step 1: Create new collection page**

Create `src/app/(admin)/admin/collections/new/page.tsx`:

```typescript
import { CollectionForm } from '@/components/admin/collection-form'

export default function NewCollectionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Collection</h1>
      <CollectionForm />
    </div>
  )
}
```

- [ ] **Step 2: Commit new collection page**

```bash
git add src/app/\(admin\)/admin/collections/new/page.tsx
git commit -m "feat: add new collection page"
```

---

## Task 14: Create Edit Collection Page

**Files:**
- Create: `src/app/(admin)/admin/collections/[id]/page.tsx`

- [ ] **Step 1: Create edit collection page**

Create `src/app/(admin)/admin/collections/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { getCollection } from '@/lib/actions/collections'
import { CollectionForm } from '@/components/admin/collection-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCollectionPage({ params }: Props) {
  const { id } = await params
  const collection = await getCollection(id)

  if (!collection) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Collection</h1>
      <CollectionForm collection={collection} />
    </div>
  )
}
```

- [ ] **Step 2: Commit edit collection page**

```bash
git add src/app/\(admin\)/admin/collections/\[id\]/page.tsx
git commit -m "feat: add edit collection page"
```

---

## Task 15: Create Rarity Badge Component

**Files:**
- Create: `src/components/admin/rarity-badge.tsx`

- [ ] **Step 1: Create rarity badge component**

Create `src/components/admin/rarity-badge.tsx`:

```typescript
import type { Rarity } from '@prisma/client'

interface RarityBadgeProps {
  rarity: Rarity
}

const rarityConfig: Record<Rarity, { label: string; className: string }> = {
  COMMON: {
    label: 'Common',
    className: 'bg-gray-100 text-gray-800',
  },
  RARE: {
    label: 'Rare',
    className: 'bg-blue-100 text-blue-800',
  },
  EPIC: {
    label: 'Epic',
    className: 'bg-purple-100 text-purple-800',
  },
  LEGENDARY: {
    label: 'Legendary',
    className: 'bg-yellow-100 text-yellow-800',
  },
}

export function RarityBadge({ rarity }: RarityBadgeProps) {
  const config = rarityConfig[rarity]

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${config.className}`}>
      {config.label}
    </span>
  )
}
```

- [ ] **Step 2: Commit rarity badge**

```bash
git add src/components/admin/rarity-badge.tsx
git commit -m "feat: add rarity badge component"
```

---

## Task 16: Create Photo Uploader Component

**Files:**
- Create: `src/components/admin/photo-uploader.tsx`

- [ ] **Step 1: Create photo uploader component**

Create `src/components/admin/photo-uploader.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createPhotoWithUpload } from '@/lib/actions/photos'
import { Rarity } from '@prisma/client'
import { Upload, X } from 'lucide-react'

interface PhotoUploaderProps {
  collectionId: string
  onSuccess?: () => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function PhotoUploader({ collectionId, onSuccess }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [rarities, setRarities] = useState<Record<string, Rarity>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(
      (file) => ALLOWED_TYPES.includes(file.type) && file.size <= MAX_SIZE
    )
    setFiles((prev) => [...prev, ...validFiles])
    setRarities((prev) => {
      const updated = { ...prev }
      validFiles.forEach((file) => {
        updated[file.name] = 'COMMON'
      })
      return updated
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_SIZE,
  })

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
    setRarities((prev) => {
      const updated = { ...prev }
      delete updated[file.name]
      return updated
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('collectionId', collectionId)
        formData.append('rarity', rarities[file.name])

        return createPhotoWithUpload(formData)
      })
    )

    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      setError(`${failures.length} uploads failed`)
    } else {
      setFiles([])
      setRarities({})
      onSuccess?.()
    }

    setUploading(false)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600">
          {isDragActive ? 'Drop files here' : 'Drag & drop images, or click to select'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          JPG, PNG, WebP up to 5MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <select
                value={rarities[file.name]}
                onChange={(e) =>
                  setRarities((prev) => ({
                    ...prev,
                    [file.name]: e.target.value as Rarity,
                  }))
                }
                className="px-3 py-1 border rounded"
              >
                <option value="COMMON">Common</option>
                <option value="RARE">Rare</option>
                <option value="EPIC">Epic</option>
                <option value="LEGENDARY">Legendary</option>
              </select>
              <button
                type="button"
                onClick={() => removeFile(file)}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Install react-dropzone**

```bash
cd "C:\Users\Erick\Desktop\Album virtual\kwelps-album"
npm install react-dropzone
```

- [ ] **Step 3: Commit photo uploader**

```bash
git add src/components/admin/photo-uploader.tsx package.json package-lock.json
git commit -m "feat: add photo uploader with drag and drop"
```

---

## Task 17: Create Photo Grid Component

**Files:**
- Create: `src/components/admin/photo-grid.tsx`

- [ ] **Step 1: Create photo grid component**

Create `src/components/admin/photo-grid.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Rarity } from '@prisma/client'
import { RarityBadge } from './rarity-badge'
import { updatePhoto, deletePhotoAction } from '@/lib/actions/photos'
import { Trash2, Pencil } from 'lucide-react'

interface Photo {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: Rarity
  createdAt: Date
}

interface PhotoGridProps {
  photos: Photo[]
  collectionId: string
  onDelete?: () => void
}

export function PhotoGrid({ photos, collectionId, onDelete }: PhotoGridProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    setDeleting(photoId)
    try {
      await deletePhotoAction(photoId)
      onDelete?.()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const handleRarityChange = async (photoId: string, rarity: Rarity) => {
    try {
      await updatePhoto(photoId, { rarity })
    } catch (error) {
      alert((error as Error).message)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No photos in this collection yet. Upload some to get started.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden group">
          <div className="aspect-square relative">
            <img
              src={photo.thumbnailUrl || photo.url}
              alt="Photo"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={deleting === photo.id}
                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-2">
            <select
              value={photo.rarity}
              onChange={(e) => handleRarityChange(photo.id, e.target.value as Rarity)}
              className="w-full text-sm px-2 py-1 border rounded"
            >
              <option value="COMMON">Common</option>
              <option value="RARE">Rare</option>
              <option value="EPIC">Epic</option>
              <option value="LEGENDARY">Legendary</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit photo grid**

```bash
git add src/components/admin/photo-grid.tsx
git commit -m "feat: add photo grid component with rarity selection"
```

---

## Task 18: Create Manage Photos Page

**Files:**
- Create: `src/app/(admin)/admin/collections/[id]/photos/page.tsx`

- [ ] **Step 1: Create manage photos page**

Create `src/app/(admin)/admin/collections/[id]/photos/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { getCollection } from '@/lib/actions/collections'
import { getPhotos } from '@/lib/actions/photos'
import { PhotoUploader } from '@/components/admin/photo-uploader'
import { PhotoGrid } from '@/components/admin/photo-grid'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ManagePhotosPage({ params }: Props) {
  const { id } = await params
  const [collection, photos] = await Promise.all([
    getCollection(id),
    getPhotos(id),
  ])

  if (!collection) {
    notFound()
  }

  return (
    <div>
      <Link
        href="/admin/collections"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      <h1 className="text-2xl font-bold mb-2">{collection.name}</h1>
      {collection.description && (
        <p className="text-gray-500 mb-6">{collection.description}</p>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Upload Photos</h2>
          <PhotoUploader collectionId={id} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">
            Photos ({photos.length})
          </h2>
          <PhotoGrid photos={photos} collectionId={id} />
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit manage photos page**

```bash
git add src/app/\(admin\)/admin/collections/\[id\]/photos/page.tsx
git commit -m "feat: add manage photos page with upload and grid"
```

---

## Task 19: Create All Photos Page

**Files:**
- Create: `src/app/(admin)/admin/photos/page.tsx`

- [ ] **Step 1: Create all photos page**

Create `src/app/(admin)/admin/photos/page.tsx`:

```typescript
import { getPhotos } from '@/lib/actions/photos'
import { requireAdmin } from '@/lib/auth/admin'
import { PhotoGrid } from '@/components/admin/photo-grid'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AllPhotosPage() {
  await requireAdmin()

  const photos = await getPhotos()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">All Photos</h1>
          <p className="text-gray-500">{photos.length} total photos</p>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500 mb-4">No photos yet.</p>
          <Link
            href="/admin/collections"
            className="text-blue-600 hover:underline"
          >
            Go to Collections to add photos
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(new Set(photos.map(p => p.collection.name))).map((collectionName) => {
            const collectionPhotos = photos.filter(p => p.collection.name === collectionName)
            return (
              <div key={collectionName}>
                <h2 className="text-lg font-semibold mb-3">{collectionName}</h2>
                <PhotoGrid
                  photos={collectionPhotos}
                  collectionId={collectionPhotos[0].collectionId}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit all photos page**

```bash
git add src/app/\(admin\)/admin/photos/page.tsx
git commit -m "feat: add all photos page grouped by collection"
```

---

## Task 20: Update Navbar for Admin Link

**Files:**
- Modify: `src/components/layout/navbar.tsx`

- [ ] **Step 1: Add admin link to navbar for admin users**

Update `src/components/layout/navbar.tsx`:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  email: string
}

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ email: user.email ?? '' })
        setIsAdmin(user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Kwelps Album
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/album" className="text-gray-600 hover:text-gray-900">
              Album
            </Link>
            <Link href="/store" className="text-gray-600 hover:text-gray-900">
              Store
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                Admin
              </Link>
            )}
            {user && (
              <span className="text-gray-600 text-sm">{user.email}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit navbar update**

```bash
git add src/components/layout/navbar.tsx
git commit -m "feat: add admin link to navbar for admin users"
```

---

## Task 21: Create Supabase Storage Bucket

**Files:**
- Create: `docs/supabase-storage-setup.md`

- [ ] **Step 1: Create storage setup documentation**

Create `docs/supabase-storage-setup.md`:

```markdown
# Supabase Storage Setup

## Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `photos`
4. Check "Make bucket public"
5. Click "Create bucket"

## Set Storage Policies

Run this SQL in the SQL Editor:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Allow admin (service role) to upload
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');

-- Allow admin to delete
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos');
```

## Verify Setup

1. Go to Storage → photos bucket
2. Try uploading a test file
3. Verify the file is accessible via public URL
```

- [ ] **Step 2: Commit storage setup docs**

```bash
git add docs/supabase-storage-setup.md
git commit -m "docs: add Supabase Storage setup instructions"
```

---

## Task 22: Final Verification and Testing

- [ ] **Step 1: Run build to check for errors**

```bash
cd "C:\Users\Erick\Desktop\Album virtual\kwelps-album"
npm run build
```

Expected: Build completes without errors

- [ ] **Step 2: Verify all routes**

Start dev server and navigate to:
- `/admin` - Dashboard (admin only)
- `/admin/collections` - Collections list
- `/admin/collections/new` - Create collection
- `/admin/collections/[id]` - Edit collection
- `/admin/collections/[id]/photos` - Manage photos
- `/admin/photos` - All photos

- [ ] **Step 3: Test admin access**

1. Login as admin (email matches ADMIN_EMAIL)
2. Verify can access /admin routes
3. Login as regular user
4. Verify cannot access /admin routes (redirects to dashboard)

- [ ] **Step 4: Commit final build fix if needed**

```bash
git add .
git commit -m "fix: resolve any build errors"
```

---

## Success Criteria

- [ ] Admin can create collections
- [ ] Admin can edit collection name/description
- [ ] Admin can toggle collection active status
- [ ] Admin can delete empty collections
- [ ] Admin can upload photos to collection
- [ ] Admin can change photo rarity
- [ ] Admin can delete photos
- [ ] Non-admin users cannot access /admin routes
- [ ] Upload rejects invalid file types
- [ ] Upload rejects files over 5MB
- [ ] Photos display with correct rarity badges
- [ ] Collections list shows photo count

---

## Dependencies Required

```bash
npm install react-hook-form @hookform/resolvers lucide-react react-dropzone
```

---

## Next Milestone

After completing Milestone 2, proceed to **Milestone 3: Wallet & Economy**