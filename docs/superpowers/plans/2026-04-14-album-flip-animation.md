# Album Flip Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3D page flip animation and remove empty slots from album grid.

**Architecture:** Modify BookPage to render dynamic grid (no empty slots), enhance BookSpread with flip animation state and 3D CSS transforms, update globals.css with flip keyframes.

**Tech Stack:** React, TypeScript, CSS 3D Transforms

---

## File Structure

```
src/components/book/BookPage.tsx      # Remove fixed slots, dynamic grid
src/components/book/BookSpread.tsx    # Add flip state, animation logic
src/app/globals.css                   # Flip animation keyframes (partial updates)
```

---

### Task 1: Dynamic Grid in BookPage

**Files:**
- Modify: `src/components/book/BookPage.tsx`

- [ ] **Step 1: Remove fixed slots array**

Replace the fixed slots array with direct photo rendering. Find lines 13-16:

```tsx
const slots = Array.from({ length: 6 }, (_, i) => ({
  photo: photos[i] || null,
  number: startIndex + i,
}))
```

Replace with:

```tsx
// Photos are rendered directly - no empty slots
```

- [ ] **Step 2: Update the grid rendering**

Find lines 24-39 (the slots.map loop) and replace with:

```tsx
{photos.map((photo, index) => (
  <PhotoCard
    key={photo.id}
    photo={photo}
    number={startIndex + index}
    size="standard"
    onClick={() => onPhotoClick?.(photo)}
  />
))}
```

- [ ] **Step 3: Remove unused code**

Remove the `slots` variable entirely and the conditional rendering that showed "?" for empty slots.

- [ ] **Step 4: Update grid to be dynamic**

The grid should remain 2x3 but only render actual photos. The CSS grid will naturally adjust spacing. If there are fewer photos, they'll be centered.

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: Build passes with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/book/BookPage.tsx
git commit -m "feat: remove empty slots from album grid"
```

---

### Task 2: 3D Flip Animation in BookSpread

**Files:**
- Modify: `src/components/book/BookSpread.tsx`

- [ ] **Step 1: Add flip animation state**

Add new state variables after `currentPage` state (around line 20):

```tsx
const [currentPage, setCurrentPage] = useState(0)
const [isFlipping, setIsFlipping] = useState(false)
const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)
```

- [ ] **Step 2: Create precomputed pages array**

The `pages` array is already computed. Add memoization for previous and next pages after line 27:

```tsx
const pages: AlbumPhoto[][] = []
for (let i = 0; i < photos.length; i += photosPerPage) {
  pages.push(photos.slice(i, i + photosPerPage))
}

const totalPages = Math.max(pages.length, 1)
const startNumber = currentPage * photosPerPage + 1
const currentPagePhotos = pages[currentPage] || []
const nextPagePhotos = pages[currentPage + 1] || []
const prevPagePhotos = pages[currentPage - 1] || []
```

- [ ] **Step 3: Update navigation functions**

Replace `flipNext` and `flipPrev` functions (lines 38-50) with animated versions:

```tsx
const flipNext = useCallback(() => {
  if (canFlipNext && !isFlipping) {
    setFlipDirection('next')
    setIsFlipping(true)
    onFlip?.()
    
    // Update page after animation midpoint
    setTimeout(() => {
      setCurrentPage(currentPage + 1)
    }, 300)
    
    // Reset flip state after animation
    setTimeout(() => {
      setIsFlipping(false)
      setFlipDirection(null)
    }, 600)
  }
}, [currentPage, canFlipNext, isFlipping, onFlip])

const flipPrev = useCallback(() => {
  if (canFlipPrev && !isFlipping) {
    setFlipDirection('prev')
    setIsFlipping(true)
    onFlip?.()
    
    // Update page after animation midpoint
    setTimeout(() => {
      setCurrentPage(currentPage - 1)
    }, 300)
    
    // Reset flip state after animation
    setTimeout(() => {
      setIsFlipping(false)
      setFlipDirection(null)
    }, 600)
  }
}, [currentPage, canFlipPrev, isFlipping, onFlip])
```

- [ ] **Step 4: Update the render to include flip structure**

Replace the return statement (lines 52-101) with:

```tsx
return (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    {/* Album container - responsive sizing */}
    <div className="w-full h-auto flex items-center justify-center">
      <div
        className="album-container rounded-2xl overflow-hidden"
        style={{
          width: 'min(600px, 90vw)',
          height: 'min(750px, 70vh)',
          perspective: '1200px',
        }}
      >
        {/* Page container with 3D context */}
        <div 
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Previous page (behind current, visible when flipping prev) */}
          {isFlipping && flipDirection === 'prev' && (
            <div
              className="absolute inset-0"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
              }}
            >
              <BookPage
                photos={prevPagePhotos}
                startIndex={(currentPage - 1) * photosPerPage + 1}
                onPhotoClick={onPhotoClick}
              />
            </div>
          )}
          
          {/* Current page - flips out when going next */}
          <div
            className={`absolute inset-0 ${isFlipping && flipDirection === 'next' ? 'page-flip-out' : ''}`}
            style={{
              backfaceVisibility: 'hidden',
            }}
          >
            <BookPage
              photos={currentPagePhotos}
              startIndex={startNumber}
              onPhotoClick={onPhotoClick}
            />
          </div>
          
          {/* Next page - flips in when going next */}
          {isFlipping && flipDirection === 'next' && (
            <div
              className="absolute inset-0 page-flip-in"
              style={{
                backfaceVisibility: 'hidden',
              }}
            >
              <BookPage
                photos={nextPagePhotos}
                startIndex={(currentPage + 1) * photosPerPage + 1}
                onPhotoClick={onPhotoClick}
              />
            </div>
          )}
          
          {/* Current page (behind) when flipping prev */}
          {isFlipping && flipDirection === 'prev' && (
            <div
              className="absolute inset-0 page-flip-in-reverse"
              style={{
                backfaceVisibility: 'hidden',
              }}
            >
              <BookPage
                photos={currentPagePhotos}
                startIndex={startNumber}
                onPhotoClick={onPhotoClick}
              />
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Navigation arrows */}
    <button
      onClick={flipPrev}
      disabled={!canFlipPrev || isFlipping}
      className="nav-arrow absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-16 sm:w-12 sm:h-24 rounded-r-lg flex items-center justify-center text-white/60 hover:text-white"
      aria-label="Previous page"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>

    <button
      onClick={flipNext}
      disabled={!canFlipNext || isFlipping}
      className="nav-arrow absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-16 sm:w-12 sm:h-24 rounded-l-lg flex items-center justify-center text-white/60 hover:text-white"
      aria-label="Next page"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>

    {/* Page indicator */}
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2">
      <span className="text-xs sm:text-sm text-white/40 font-medium">
        {currentPage + 1} / {totalPages}
      </span>
    </div>
  </div>
)
```

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: Build passes. Note: There may be unused variable warnings for `prevPagePhotos` - this is okay for now.

- [ ] **Step 6: Commit**

```bash
git add src/components/book/BookSpread.tsx
git commit -m "feat: add 3D flip animation state and structure"
```

---

### Task 3: Flip Animation CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add flip animation classes**

Add the following CSS classes after the existing `page-flip-back` keyframes (around line 178):

```css
/* 3D Page Flip Animations */
.page-flip-out {
  animation: page-flip-out 600ms ease-in-out forwards;
  transform-origin: left center;
}

.page-flip-in {
  animation: page-flip-in 600ms ease-in-out forwards;
  transform-origin: right center;
}

.page-flip-in-reverse {
  animation: page-flip-in-reverse 600ms ease-in-out forwards;
  transform-origin: right center;
}

@keyframes page-flip-out {
  0% {
    transform: perspective(1200px) rotateY(0deg);
  }
  100% {
    transform: perspective(1200px) rotateY(-180deg);
  }
}

@keyframes page-flip-in {
  0% {
    transform: perspective(1200px) rotateY(180deg);
  }
  100% {
    transform: perspective(1200px) rotateY(0deg);
  }
}

@keyframes page-flip-in-reverse {
  0% {
    transform: perspective(1200px) rotateY(-180deg);
  }
  100% {
    transform: perspective(1200px) rotateY(0deg);
  }
}
```

- [ ] **Step 2: Remove or update old keyframes**

The existing `page-flip-forward` and `page-flip-back` keyframes (lines 150-178) can be removed as they are replaced by the new animations above.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add 3D flip animation CSS keyframes"
```

---

### Task 4: Integration Testing

- [ ] **Step 1: Test flip animation**

Open the album in browser and verify:
1. Clicking right arrow flips page with 3D animation
2. Clicking left arrow flips page with 3D animation
3. Sound plays during flip
4. Rapid clicks don't break animation (disabled during flip)
5. Page indicator updates correctly

- [ ] **Step 2: Test dynamic grid**

Verify:
1. Pages with 6 photos show full 2x3 grid
2. Last page with fewer photos shows only those photos (no "?" slots)
3. Photos are centered properly

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "fix: any integration fixes for flip animation"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Dynamic grid - Task 1
- ✅ 3D flip animation - Tasks 2, 3
- ✅ Remove empty slots - Task 1
- ✅ Sound sync - Task 2 (onFlip called at animation start)

**2. Placeholder scan:**
- No TBDs, TODOs, or incomplete sections
- All code blocks contain actual implementation code

**3. Type consistency:**
- Uses existing `AlbumPhoto` type from `@/lib/actions/album`
- Uses existing `BookPage` and `PhotoCard` components
- State types are primitive (boolean, string)

---

## Testing Checklist (Manual)

- [ ] Grid shows only photos that exist (no "?" slots)
- [ ] Flip animation plays when navigating forward
- [ ] Flip animation plays when navigating backward
- [ ] Sound plays synchronously with animation
- [ ] Rapid clicks don't break animation
- [ ] Last page shows correct photo count
- [ ] Single page works without navigation
- [ ] Works on mobile devices