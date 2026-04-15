# Blurry Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate separate blurry thumbnails for all photos to prevent users from copying full-quality image URLs.

**Architecture:** Use `sharp` library to generate blurry thumbnails (100px, blur) on upload. Store both original and thumbnail in Supabase Storage. Display thumbnail everywhere, only use full URL for download button. Migration script processes existing photos.

**Tech Stack:** Next.js, Supabase Storage, sharp (image processing), Prisma

---

## File Structure

```
package.json                           # Add sharp dependency
src/lib/storage/supabase-storage.ts    # Add thumbnail generation
src/components/book/PhotoModal.tsx     # Use thumbnailUrl for display
scripts/migrate-thumbnails.ts          # New migration script
```

---

### Task 1: Install Sharp Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sharp package**

Run:
```bash
npm install sharp
npm install -D @types/sharp
```

Expected: Package installed successfully.

- [ ] **Step 2: Verify installation**

Run:
```bash
npm run build
```

Expected: Build passes with no errors.

---

### Task 2: Add Thumbnail Generation to Storage Module

**Files:**
- Modify: `src/lib/storage/supabase-storage.ts`

- [ ] **Step 1: Add sharp import**

Add at the top of the file (line 1):
```typescript
import sharp from 'sharp'
```

- [ ] **Step 2: Add thumbnail generation helper function**

Add after the imports (before line 5):
```typescript
const BUCKET_NAME = 'photos'

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize({ height: 100, withoutEnlargement: true })
    .blur(10)
    .jpeg({ quality: 60 })
    .toBuffer()
}
```

- [ ] **Step 3: Update uploadPhoto function**

Replace the entire `uploadPhoto` function (lines 5-38) with:
```typescript
export async function uploadPhoto(
  file: File,
  collectionId: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const supabase = await createClient()

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg'
  const uuid = crypto.randomUUID()
  const originalPath = `photos/${collectionId}/original-${uuid}.${ext}`
  const thumbnailPath = `photos/${collectionId}/thumbnail-${uuid}.jpg`

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const originalBuffer = Buffer.from(arrayBuffer)

  // Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(originalBuffer)

  // Upload original
  const { error: originalError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(originalPath, originalBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (originalError) {
    throw new Error(`Upload failed: ${originalError.message}`)
  }

  // Upload thumbnail
  const { error: thumbnailError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(thumbnailPath, thumbnailBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (thumbnailError) {
    // Try to clean up original if thumbnail fails
    await supabase.storage.from(BUCKET_NAME).remove([originalPath])
    throw new Error(`Thumbnail upload failed: ${thumbnailError.message}`)
  }

  // Get public URLs
  const { data: originalUrl } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(originalPath)

  const { data: thumbnailUrl } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(thumbnailPath)

  return {
    url: originalUrl.publicUrl,
    thumbnailUrl: thumbnailUrl.publicUrl,
  }
}
```

- [ ] **Step 4: Verify build passes**

Run:
```bash
npm run build
```

Expected: Build passes with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/storage/supabase-storage.ts
git commit -m "feat: add blurry thumbnail generation on upload"
```

---

### Task 3: Update PhotoModal to Use Thumbnails

**Files:**
- Modify: `src/components/book/PhotoModal.tsx`

- [ ] **Step 1: Check current PhotoModal implementation**

First read the current file to understand the structure.

Run:
```bash
head -100 src/components/book/PhotoModal.tsx
```

- [ ] **Step 2: Update modal preview image**

Find the main image display in the modal and change from `url` to `thumbnailUrl`:

```tsx
// Find the main image element and change:
src={photo.url}
// To:
src={photo.thumbnailUrl || photo.url}
```

The download button should still use `photo.url` for full quality.

- [ ] **Step 3: Verify the download functionality still works**

Ensure the download button uses the full quality URL:
```tsx
// Download button should use photo.url
const downloadUrl = photo.url
```

- [ ] **Step 4: Verify build passes**

Run:
```bash
npm run build
```

Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/book/PhotoModal.tsx
git commit -m "feat: use thumbnail in modal preview, full quality for download"
```

---

### Task 4: Create Migration Script for Existing Photos

**Files:**
- Create: `scripts/migrate-thumbnails.ts`

- [ ] **Step 1: Create scripts directory if needed**

Run:
```bash
mkdir -p scripts
```

- [ ] **Step 2: Create the migration script**

Create `scripts/migrate-thumbnails.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const prisma = new PrismaClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for storage access
)

const BUCKET_NAME = 'photos'

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize({ height: 100, withoutEnlargement: true })
    .blur(10)
    .jpeg({ quality: 60 })
    .toBuffer()
}

async function migratePhoto(photo: { id: string; url: string; thumbnailUrl: string }) {
  // Skip if thumbnail is already different from url
  if (photo.thumbnailUrl !== photo.url) {
    console.log(`  Skipping ${photo.id} - already has thumbnail`)
    return { skipped: true }
  }

  try {
    // Extract path from URL
    const urlObj = new URL(photo.url)
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/photos/')
    if (pathParts.length < 2) {
      throw new Error('Invalid photo URL format')
    }

    const originalPath = pathParts[1]

    // Download original
    console.log(`  Downloading original from ${originalPath}`)
    const { data: originalData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(originalPath)

    if (downloadError || !originalData) {
      throw new Error(`Download failed: ${downloadError?.message}`)
    }

    // Convert to buffer
    const originalBuffer = Buffer.from(await originalData.arrayBuffer())

    // Generate thumbnail
    console.log(`  Generating thumbnail`)
    const thumbnailBuffer = await generateThumbnail(originalBuffer)

    // Generate thumbnail path
    const thumbnailPath = originalPath.replace('original-', 'thumbnail-').replace(/\.[^.]+$/, '.jpg')

    // Upload thumbnail
    console.log(`  Uploading thumbnail to ${thumbnailPath}`)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL for thumbnail
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(thumbnailPath)

    // Update database
    console.log(`  Updating database`)
    await prisma.photo.update({
      where: { id: photo.id },
      data: { thumbnailUrl: urlData.publicUrl },
    })

    console.log(`  ✓ Migrated ${photo.id}`)
    return { success: true }
  } catch (error) {
    console.error(`  ✗ Failed: ${error}`)
    return { success: false, error: String(error) }
  }
}

async function main() {
  console.log('Starting thumbnail migration...')

  // Get all photos
  const photos = await prisma.photo.findMany({
    select: { id: true, url: true, thumbnailUrl: true },
  })

  console.log(`Found ${photos.length} photos to process`)

  const results = {
    total: photos.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const photo of photos) {
    console.log(`\nProcessing ${photo.id}...`)
    const result = await migratePhoto(photo)

    if ('skipped' in result && result.skipped) {
      results.skipped++
    } else if ('success' in result && result.success) {
      results.migrated++
    } else {
      results.failed++
      results.errors.push(`${photo.id}: ${result.error}`)
    }
  }

  console.log('\n=== Migration Summary ===')
  console.log(`Total: ${results.total}`)
  console.log(`Migrated: ${results.migrated}`)
  console.log(`Skipped: ${results.skipped}`)
  console.log(`Failed: ${results.failed}`)

  if (results.errors.length > 0) {
    console.log('\nErrors:')
    results.errors.forEach(e => console.log(`  - ${e}`))
  }

  await prisma.$disconnect()
}

main().catch(console.error)
```

- [ ] **Step 3: Add script to package.json**

Add to the `scripts` section of `package.json`:
```json
"scripts": {
  ...,
  "migrate:thumbnails": "tsx scripts/migrate-thumbnails.ts"
}
```

- [ ] **Step 4: Install tsx if not present**

Run:
```bash
npm install -D tsx
```

- [ ] **Step 5: Verify script compiles**

Run:
```bash
npx tsc scripts/migrate-thumbnails.ts --noEmit --esModuleInterop --moduleResolution node
```

Expected: No TypeScript errors (may show warnings about missing types, that's okay).

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-thumbnails.ts package.json package-lock.json
git commit -m "feat: add migration script for existing photo thumbnails"
```

---

### Task 5: Update Dashboard to Use Thumbnails

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Verify dashboard already uses thumbnailUrl**

The dashboard was updated in a previous commit. Check that `collection.photo.thumbnailUrl` is used:
```bash
grep -n "thumbnailUrl" src/app/\(dashboard\)/dashboard/page.tsx
```

Expected: Should show usage of `thumbnailUrl` in the collection cards.

- [ ] **Step 2: If not using thumbnailUrl, update**

If the dashboard is still using `url`, change:
```tsx
src={collection.photo?.url}
// To:
src={collection.photo?.thumbnailUrl || collection.photo?.url}
```

- [ ] **Step 3: Commit if changes were needed**

Only commit if changes were made.

---

### Task 6: Integration Testing

- [ ] **Step 1: Test new photo upload**

1. Go to admin panel
2. Upload a new photo
3. Verify both original and thumbnail are created in Supabase Storage
4. Verify thumbnail appears blurry and small (100px height)
5. Verify database has both `url` and `thumbnailUrl` set

- [ ] **Step 2: Test album display**

1. View album page
2. Verify photos appear blurry in the grid
3. Click on a photo to open modal
4. Verify modal shows blurry thumbnail
5. Click download button
6. Verify downloaded image is full quality

- [ ] **Step 3: Test dashboard**

1. View dashboard
2. Verify collection cards show blurry thumbnails
3. Verify text is readable over the blurry background

- [ ] **Step 4: Run migration script (optional, requires SUPABASE_SERVICE_ROLE_KEY)**

```bash
npm run migrate:thumbnails
```

Verify:
- Script processes all existing photos
- Thumbnails are generated and uploaded
- Database is updated with new thumbnailUrl values
- Check Supabase Storage for new thumbnail files

---

## Self-Review

**1. Spec coverage:**
- ✅ Thumbnail generation on upload - Task 2
- ✅ Blurry thumbnails (100px, blur 10) - Task 2
- ✅ Display thumbnailUrl everywhere - Tasks 3, 5
- ✅ Download uses full url - Task 3
- ✅ Migration script - Task 4
- ✅ Both existing and new photos - Tasks 2, 4

**2. Placeholder scan:**
- No TBDs, TODOs, or incomplete sections
- All code blocks contain implementation code
- Migration script includes error handling

**3. Type consistency:**
- Uses existing Prisma Photo model
- Uses existing Supabase client
- `uploadPhoto` return type matches expected `{ url: string; thumbnailUrl: string }`

---

## Testing Checklist (Manual)

- [ ] New uploads create both original and thumbnail
- [ ] Thumbnail is blurry (blur applied)
- [ ] Thumbnail is small (100px height)
- [ ] Album displays blurry thumbnails
- [ ] Modal shows blurry thumbnail
- [ ] Download button gives full quality image
- [ ] Dashboard shows blurry thumbnails
- [ ] Store shows blurry thumbnails
- [ ] Migration script runs successfully
- [ ] Migration handles errors gracefully
- [ ] Migration is idempotent (safe to run multiple times)