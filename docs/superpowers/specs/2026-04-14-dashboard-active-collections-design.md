# Dashboard Active Collections Design

> **Created:** 2026-04-14
> **Status:** Approved

## Overview

Add a section to the dashboard showing all active collections with a random common photo as background, the collection name, prize, and a button to go to the store with that collection pre-selected.

## Goals

1. Show active collections in the dashboard
2. Display a random common photo as background for each collection card
3. Show collection name and prize
4. Allow users to go directly to the store with the collection pre-selected

## Non-Goals

- Collection management (admin feature)
- Detailed collection statistics in dashboard
- Photo browsing in dashboard

## Architecture

### Components

**Dashboard Page** (`src/app/(dashboard)/dashboard/page.tsx`)
- Fetch active collections with one common photo each
- Render new section between cards and explanatory section

**Store Client** (`src/app/(dashboard)/store/store-client.tsx`)
- Accept URL parameter `?collection=<id>`
- Pre-select collection from URL parameter

### Data Flow

1. Dashboard server component fetches:
   - All active collections
   - One random COMMON photo per collection
   
2. Dashboard renders collection cards with:
   - Photo as background with dark overlay
   - Collection name
   - Prize text
   - "Ir a Tienda" button linking to `/store?collection=<id>`

3. Store page receives collection parameter:
   - Uses `useSearchParams()` to get `collection` param
   - Sets `selectedCollectionId` from URL param if present
   - Falls back to first collection if no param

## User Flow

1. User visits dashboard
2. Sees "Colecciones Disponibles" section
3. Sees cards for each active collection with:
   - Random common photo as background
   - Collection name
   - Prize amount
   - "Ir a Tienda" button
4. Clicks "Ir a Tienda" on Collection B
5. Navigates to `/store?collection=B_ID`
6. Store page loads with Collection B pre-selected

## UI Design

### Section Layout

```
Position: Between "Tarjetas superiores" and "Sección explicativa"

Section Title: "Colecciones Disponibles"

Card Layout: Horizontal grid (responsive)
- Desktop: 3 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row

Card Design:
- Background: Photo with gradient overlay (from-black/70 to-transparent)
- Height: ~200px
- Rounded corners: rounded-xl
- Border: border border-white/10

Card Content (stacked from top to bottom):
- Collection name (top): text-white font-bold
- Prize (middle): text-yellow-400 text-sm
- "Ir a Tienda" button (bottom): bg-purple-600 hover:bg-purple-700
```

### Card Component

```tsx
<Link href={`/store?collection=${collection.id}`}>
  <div className="relative h-48 rounded-xl overflow-hidden border border-white/10">
    {/* Background photo */}
    <img 
      src={photo.url} 
      alt="" 
      className="absolute inset-0 w-full h-full object-cover"
    />
    {/* Dark overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    {/* Content */}
    <div className="absolute inset-0 p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-white">{collection.name}</h3>
        <p className="text-sm text-yellow-400">Premio: {collection.prize}</p>
      </div>
      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
        Ir a Tienda
      </button>
    </div>
  </div>
</Link>
```

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/page.tsx` | Add active collections section with photo backgrounds |
| `src/app/(dashboard)/store/store-client.tsx` | Accept `collection` URL param and pre-select |

## Implementation Notes

1. **Fetching photos**: Use Prisma to get one random COMMON photo per collection
2. **URL parameter**: Use `useSearchParams()` in store-client to read `?collection=xxx`
3. **Empty state**: Show message if no active collections
4. **Single collection**: If only one collection, still show the section
5. **Photo fallback**: If no COMMON photos, skip showing that collection or use placeholder

## Edge Cases

1. **No active collections**: Show "No hay colecciones activas" message
2. **Collection with no COMMON photos**: Use first available photo of any rarity
3. **Collection with no photos**: Skip from display
4. **Invalid collection ID in URL**: Fall back to first active collection

## Testing Checklist

- [ ] Active collections display with photos
- [ ] Collection name and prize show correctly
- [ ] "Ir a Tienda" button links to correct collection
- [ ] Store pre-selects collection from URL parameter
- [ ] Falls back to first collection if invalid ID
- [ ] Responsive grid works on mobile/tablet/desktop
- [ ] Dark overlay makes text readable over any photo