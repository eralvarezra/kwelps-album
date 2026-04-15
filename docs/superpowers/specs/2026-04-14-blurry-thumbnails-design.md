# Blurry Thumbnails for Photo Protection

> **Created:** 2026-04-14
> **Status:** Approved

## Overview

Implement separate blurry thumbnails for all photos to prevent users from easily copying full-quality image URLs. Thumbnails are displayed everywhere in the app, while full-quality images are only accessible via the download button.

## Goals

1. Protect photos from casual URL copying
2. Generate blurry thumbnails automatically on upload
3. Migrate existing photos to have thumbnails
4. Maintain user experience with download functionality

## Non-Goals

- Signed URLs or token-based authentication
- Watermarking
- DRM-style protection

## Architecture

### Storage Structure

```
photos/
├── {collectionId}/
│   ├── original-{uuid}.jpg    → Full quality (used for download only)
│   └── thumbnail-{uuid}.jpg  → Blurry 100px (used for display)
```

### Upload Flow

1. Receive file in server action
2. Generate thumbnail with `sharp`:
   - Resize to 100px height (aspect ratio preserved)
   - Apply Gaussian blur (σ = 10)
   - Convert to JPEG quality 60
3. Upload both files to Supabase Storage
4. Save both URLs to database

### Display Rules

| Location | Image Used |
|----------|------------|
| Album grid | thumbnailUrl |
| Album modal preview | thumbnailUrl |
| Download button | url (full quality) |
| Dashboard collections | thumbnailUrl |
| Store gacha results | thumbnailUrl (initially hidden) |
| Store revealed card | thumbnailUrl |
| Admin photo list | thumbnailUrl |

### Migration Script

Process all existing photos:
1. Query all photos from database
2. For each photo:
   - Download original from Supabase
   - Generate blurry thumbnail
   - Upload thumbnail to Supabase
   - Update photo.thumbnailUrl in database
3. Report progress and errors

## Implementation Details

### Thumbnail Generation

Using `sharp` library:

```typescript
const thumbnail = await sharp(originalBuffer)
  .resize({ height: 100, withoutEnlargement: true })
  .blur(10)
  .jpeg({ quality: 60 })
  .toBuffer()
```

### Database Schema

No schema changes needed. The `Photo` model already has:
- `url` - Full quality image URL
- `thumbnailUrl` - Currently same as url, will be separate blurry version

### Error Handling

- If thumbnail generation fails, log error and continue with original as fallback
- Migration script should handle partial failures gracefully
- Report which photos failed at the end

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/storage/supabase-storage.ts` | Add thumbnail generation with sharp |
| `package.json` | Add sharp dependency |
| `src/lib/actions/album.ts` | Ensure thumbnailUrl is returned |
| `src/components/book/PhotoModal.tsx` | Use thumbnailUrl for preview |
| `src/app/(dashboard)/dashboard/page.tsx` | Use thumbnailUrl |
| `scripts/migrate-thumbnails.ts` | New migration script |

## Testing Checklist

- [ ] New uploads generate both original and thumbnail
- [ ] Thumbnail is blurry and small (100px)
- [ ] Album displays blurry thumbnails
- [ ] Download button gives full quality
- [ ] Dashboard shows blurry thumbnails
- [ ] Store shows blurry thumbnails
- [ ] Migration script processes existing photos
- [ ] Migration handles errors gracefully
- [ ] Migration can be run multiple times safely (idempotent)