# Photo Download Feature Design

> **Created:** 2026-04-14
> **Status:** Approved

## Overview

Allow users to download photos from their album in original quality. Only COMMON, RARE, and EPIC photos can be downloaded. LEGENDARY photos are excluded to maintain their exclusivity.

## User Flow

1. User opens album and clicks on a photo to view it enlarged in the PhotoModal
2. If the photo is COMMON, RARE, or EPIC, a download button appears in the top-right corner
3. User clicks the download button
4. A confirmation dialog appears within the modal
5. User confirms by clicking "Descargar"
6. The image downloads to their device with filename `kwelps-{rarity}-{id}.{ext}`

## Components

### PhotoModal Enhancement

**Location:** `src/components/book/PhotoModal.tsx`

**Changes:**

1. **Download button** - Added to header area (top-right, before close button)
   - Only visible when `rarity` is COMMON, RARE, or EPIC
   - Icon: download arrow
   - Style: `bg-white/10 hover:bg-white/20` rounded button
   - Position: `absolute top-4 right-16` (left of close button)

2. **Confirmation dialog state** - New state variable:
   ```typescript
   const [showConfirm, setShowConfirm] = useState(false)
   ```

3. **Confirmation dialog UI** - Rendered inside the modal when `showConfirm` is true:
   - Centered overlay with semi-transparent backdrop
   - Title: "¿Descargar imagen?"
   - Buttons: "Cancelar" (cancel) and "Descargar" (download)
   - Download button triggers the actual download

### Download Logic

**Implementation:** Create a download function that:
1. Fetches the image from `photo.url`
2. Creates a blob
3. Creates an object URL
4. Creates a hidden anchor element with `download` attribute
5. Triggers click to download
6. Cleans up object URL

**Filename format:** `kwelps-{rarity}-{photoId}.{extension}`

Example: `kwelps-rare-abc123.jpg`

## Visual Design

### Download Button

```
Position: absolute top-4 right-16 (between rarity badge area and close button)
Size: w-10 h-10
Style: rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center
Icon: Download arrow (SVG)
Visibility: Only when rarity !== 'LEGENDARY'
```

### Confirmation Dialog

```
Position: Fixed centered overlay within modal
Backdrop: bg-black/50 rounded-xl
Container: glass panel with padding
Title: "¿Descargar imagen?"
Buttons:
  - Cancelar: bg-white/10 text-gray-300
  - Descargar: bg-purple-600 text-white
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/book/PhotoModal.tsx` | Add download button, confirmation dialog, download logic |

## Edge Cases

1. **LEGENDARY photos:** No download button shown
2. **Download fails:** Show error toast (optional enhancement)
3. **Mobile:** Button should be touch-friendly (already w-10 h-10)
4. **Image format:** Preserve original extension from URL

## Testing Checklist

- [ ] Download button appears for COMMON photos
- [ ] Download button appears for RARE photos
- [ ] Download button appears for EPIC photos
- [ ] Download button does NOT appear for LEGENDARY photos
- [ ] Clicking download shows confirmation dialog
- [ ] Canceling closes dialog without download
- [ ] Confirming downloads the image with correct filename
- [ ] Download works on mobile