# Album Flip Animation Design

> **Created:** 2026-04-14
> **Status:** Approved

## Overview

Implement a realistic 3D page flip animation for the photo album and remove empty slots from the grid. Only photos that exist should be displayed, with a dynamic grid that adjusts to the number of photos on each page.

## Goals

1. Remove empty "?" slots - only show actual photos
2. Add 3D flip animation when changing pages
3. Dynamic grid that adjusts to photo count
4. Maintain existing functionality (navigation, photo click, sound)

## Non-Goals

- Adding new photo management features
- Changing the photo upload flow
- Modifying the modal or header

## Architecture

### Approach: CSS 3D Transform

Use native CSS 3D transforms with `perspective` and `rotateY` to create a realistic book page flip effect. No additional dependencies required.

### File Changes

| File | Change |
|------|--------|
| `src/components/book/BookPage.tsx` | Dynamic grid instead of fixed 6 slots |
| `src/components/book/BookSpread.tsx` | Add 3D flip animation structure and logic |
| `src/app/globals.css` | Add flip animation keyframes and 3D styles |

## Design Details

### Section 1: Dynamic Grid (BookPage.tsx)

**Current behavior:** Fixed 2x3 grid (6 slots), empty slots show "?" with number.

**New behavior:** Only render photos that exist on the current page.

**Grid layout by photo count:**
- 6 photos: 2x3 grid (2 columns, 3 rows)
- 5 photos: 2x3 grid (first 2 columns filled, 1 photo in last row)
- 4 photos: 2x2 grid
- 3 photos: 3x1 or 1x3 grid (responsive)
- 1-2 photos: Centered horizontally

**Implementation:**
```tsx
// Remove fixed slots array
// Render only actual photos
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

### Section 2: 3D Flip Animation (BookSpread.tsx)

**Structure:**
```
<div className="perspective-container"> // perspective: 1200px
  <div className="flip-container"> // transform-style: preserve-3d
    <div className="page-front"> // Current page, rotateY: 0° to -180°
      <BookPage ... />
    </div>
    <div className="page-back"> // Next page, rotateY: 180° to 0°
      <BookPage ... />
    </div>
  </div>
</div>
```

**Animation flow:**
1. User clicks navigation arrow
2. `isFlipping` state set to true
3. Current page rotates from 0° to -180° (flips out to left)
4. Next page rotates from 180° to 0° (flips in from right)
5. Animation duration: 600ms
6. Sound effect plays at animation start
7. After animation completes, update current page and reset `isFlipping`

**State changes:**
```tsx
const [currentPage, setCurrentPage] = useState(0)
const [isFlipping, setIsFlipping] = useState(false)
const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)
```

### Section 3: CSS Styles (globals.css)

**Keyframes for flip animation:**
```css
/* Flip out (current page disappearing) */
@keyframes flipOut {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(-180deg); }
}

/* Flip in (next page appearing) */
@keyframes flipIn {
  0% { transform: rotateY(180deg); }
  100% { transform: rotateY(0deg); }
}

.flip-container {
  perspective: 1200px;
  transform-style: preserve-3d;
}

.page-front {
  backface-visibility: hidden;
  transform-origin: left center;
}

.page-back {
  backface-visibility: hidden;
  transform-origin: right center;
}

.page-front.flipping-out {
  animation: flipOut 600ms ease-in-out forwards;
}

.page-back.flipping-in {
  animation: flipIn 600ms ease-in-out forwards;
}
```

### Section 4: Navigation Arrows

**Current:** Arrows always visible, disabled state when no prev/next.

**New:** Same behavior, but during flip animation:
- Arrows temporarily disabled
- Prevent double-clicks during animation

## User Flow

1. User opens album
2. Sees photos arranged in dynamic grid (no empty slots)
3. Clicks right arrow or swipes left
4. Hears flip sound
5. Sees current page flip out (3D rotation to left)
6. Sees next page flip in (3D rotation from right)
7. Animation completes, can navigate again

## Edge Cases

1. **Single page:** No flip animation, no navigation arrows
2. **Last page with few photos:** Grid adjusts, no empty slots
3. **Rapid clicks:** Debounce during animation (600ms)
4. **Mobile touch:** Support swipe gestures for flip (optional enhancement)

## Testing Checklist

- [ ] Grid shows only photos that exist (no "?" slots)
- [ ] Flip animation plays when navigating forward
- [ ] Flip animation plays when navigating backward
- [ ] Sound plays synchronously with animation
- [ ] Rapid clicks don't break animation
- [ ] Last page shows correct photo count
- [ ] Single page works without navigation
- [ ] Works on mobile devices

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/book/BookPage.tsx` | Remove fixed slots, render dynamic grid |
| `src/components/book/BookSpread.tsx` | Add flip state, animation logic, 3D structure |
| `src/app/globals.css` | Add perspective, keyframes, flip classes |

## Implementation Notes

1. Use CSS `perspective` on parent container for 3D effect
2. Use `backface-visibility: hidden` to hide the back of pages
3. Use `transform-origin` to control rotation pivot point
4. Sync sound effect with animation start
5. Disable navigation during flip animation