# Photo Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add download functionality to PhotoModal allowing users to download COMMON, RARE, and EPIC photos with confirmation dialog.

**Architecture:** Enhance the existing PhotoModal component with a download button, confirmation dialog state, and download logic using blob URLs.

**Tech Stack:** React, TypeScript, Next.js

---

## File Structure

```
src/components/book/PhotoModal.tsx    # Add download button, confirmation dialog, download logic
```

---

### Task 1: Add Download Button to PhotoModal

**Files:**
- Modify: `src/components/book/PhotoModal.tsx`

- [ ] **Step 1: Add showConfirm state and download function**

Add the following state and function inside the PhotoModal component, after the existing state/hooks:

```typescript
const [showConfirm, setShowConfirm] = useState(false)

const handleDownload = useCallback(async () => {
  if (!photo) return
  
  try {
    const response = await fetch(photo.url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    // Extract extension from URL
    const ext = photo.url.split('.').pop()?.split('?')[0] || 'jpg'
    const filename = `kwelps-${photo.rarity.toLowerCase()}-${photo.id.slice(0, 8)}.${ext}`
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setShowConfirm(false)
  } catch (error) {
    console.error('Download failed:', error)
  }
}, [photo])
```

- [ ] **Step 2: Add download button in the header area**

Add the download button after the rarity badge and before the close button. Find the existing rarity badge section (around line 93-102) and add the download button:

```tsx
      {/* Rarity badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${config.bg} ${config.border} border ${config.text}`}>
          {config.label}
        </span>
        {photo.quantity > 1 && (
          <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500/20 border border-orange-500/50 text-orange-400">
            ×{photo.quantity}
          </span>
        )}
      </div>

      {/* Download button - only for COMMON, RARE, EPIC */}
      {photo.rarity !== 'LEGENDARY' && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className="absolute top-4 right-16 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Download photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}
```

- [ ] **Step 3: Add confirmation dialog**

Add the confirmation dialog at the end of the component, before the closing `</div>` but inside the modal container (around line 150):

```tsx
      {/* Photo counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-sm text-white/60 font-medium">
        {currentIndex + 1} / {allPhotos.length}
      </div>

      {/* Download confirmation dialog */}
      {showConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glass rounded-xl p-6 max-w-sm w-full mx-4 text-center">
            <h3 className="text-lg font-bold text-white mb-4">¿Descargar imagen?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
              >
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update close handler to also close confirmation**

Modify the close button click handler to also close the confirmation dialog. Find the close button (around line 80-90) and update the button to close both:

```tsx
      {/* Close button */}
      <button
        onClick={() => { setShowConfirm(false); onClose(); }}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Close"
      >
```

- [ ] **Step 5: Add import for useState**

Verify that `useState` is already imported from React. If not, add it:

```typescript
import { useEffect, useCallback, useState } from 'react'
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`

Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 7: Commit changes**

```bash
git add src/components/book/PhotoModal.tsx
git commit -m "feat: add photo download with confirmation for non-legendary cards"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Download button in modal header - Task 1, Step 2
- ✅ Only visible for COMMON/RARE/EPIC - Task 1, Step 2 (rarity !== 'LEGENDARY')
- ✅ Confirmation dialog - Task 1, Step 3
- ✅ Direct download with filename format - Task 1, Step 1
- ✅ Download button styling - Task 1, Step 2
- ✅ Confirmation dialog styling - Task 1, Step 3

**2. Placeholder scan:**
- No TBDs, TODOs, or incomplete sections
- All code blocks contain actual implementation code

**3. Type consistency:**
- Uses existing `photo.rarity` and `photo.url` from `AlbumPhoto` type
- No new types introduced
- Uses existing `rarityConfig` for styling

---

## Testing Checklist (Manual)

After implementation, verify:
- [ ] Download button appears for COMMON photos
- [ ] Download button appears for RARE photos
- [ ] Download button appears for EPIC photos
- [ ] Download button does NOT appear for LEGENDARY photos
- [ ] Clicking download shows confirmation dialog
- [ ] Cancel closes dialog without download
- [ ] Confirming downloads the image with correct filename
- [ ] Escape key closes both confirmation and modal
- [ ] Works on mobile devices