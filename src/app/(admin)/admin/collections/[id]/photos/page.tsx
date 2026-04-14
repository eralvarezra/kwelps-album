'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { deletePhotoAction, deletePhotos, getPhotoDeletionImpact } from '@/lib/actions/photos'
import { UploadForm } from './upload-form'

type Photo = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  createdAt: string
}

type Collection = {
  id: string
  name: string
  photos: Photo[]
}

const rarityColors = {
  COMMON: 'bg-gray-500/30 text-gray-300 border border-gray-500/50',
  RARE: 'bg-blue-500/30 text-blue-400 border border-blue-500/50',
  EPIC: 'bg-purple-500/30 text-purple-400 border border-purple-500/50',
  LEGENDARY: 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50',
}

// Probabilidades del gacha
const RARITY_PROBS = {
  COMMON: 0.55,
  RARE: 0.35,
  EPIC: 0.085,
  LEGENDARY: 0.015,
}

// Precios
const PACK_PRICE = 5.00
const PHOTOS_PER_PACK = 3
const PITY_THRESHOLD = 20

// Calcular costo estimado para completar una rareza
function calculateRarityCost(count: number, probability: number, usePity: boolean = false): { pulls: number; cost: number } {
  if (count === 0) return { pulls: 0, cost: 0 }

  const gamma = 0.577
  const basePulls = count * (Math.log(count) + gamma)
  const pullsNeeded = Math.ceil(basePulls / probability)

  let adjustedPulls = pullsNeeded
  if (usePity && probability < 0.02) {
    const pityPulls = count * PITY_THRESHOLD * 0.6
    adjustedPulls = Math.min(pullsNeeded, pityPulls)
  }

  const packsNeeded = Math.ceil(adjustedPulls / PHOTOS_PER_PACK)
  const cost = packsNeeded * PACK_PRICE

  return { pulls: adjustedPulls, cost }
}

// Calcular fusión potencial
function calculateFusionPotential(photos: Photo[]): Record<string, number> {
  const counts = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 }
  photos.forEach(p => counts[p.rarity]++)

  const commonFusion = Math.floor(counts.COMMON / 4)
  const rareFusion = Math.floor((counts.RARE + commonFusion) / 4)
  const epicFusion = Math.floor((counts.EPIC + rareFusion) / 4)

  return {
    commonToRare: commonFusion,
    rareToEpic: rareFusion,
    epicToLegendary: epicFusion,
  }
}

export default function CollectionPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteImpact, setDeleteImpact] = useState({ photoCount: 0, affectedUsers: 0 })
  const [isDeleting, setIsDeleting] = useState(false)

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) {
        next.delete(photoId)
      } else {
        next.add(photoId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (!collection) return
    if (selectedPhotos.size === collection.photos.length) {
      setSelectedPhotos(new Set())
    } else {
      setSelectedPhotos(new Set(collection.photos.map(p => p.id)))
    }
  }

  async function handleBulkDeleteClick() {
    if (selectedPhotos.size === 0) return
    try {
      const impact = await getPhotoDeletionImpact(Array.from(selectedPhotos))
      setDeleteImpact(impact)
      setDeleteDialogOpen(true)
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function handleConfirmBulkDelete() {
    setIsDeleting(true)
    try {
      await deletePhotos(Array.from(selectedPhotos))
      setSelectedPhotos(new Set())
      setDeleteDialogOpen(false)
      window.location.reload()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle ESC key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteDialogOpen) {
        setDeleteDialogOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteDialogOpen])

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/admin/collections/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setCollection(data)
          setLoading(false)
        })
    })
  }, [params])

  async function handleDelete(photoId: string) {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      await deletePhotoAction(photoId)
      // Refresh the page
      window.location.reload()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>
  }

  if (!collection) {
    return <div className="text-gray-400">Collection not found</div>
  }

  // Calcular estadísticas
  const rarityCounts = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 }
  collection.photos.forEach(p => rarityCounts[p.rarity]++)

  const commonCost = calculateRarityCost(rarityCounts.COMMON, RARITY_PROBS.COMMON)
  const rareCost = calculateRarityCost(rarityCounts.RARE, RARITY_PROBS.RARE)
  const epicCost = calculateRarityCost(rarityCounts.EPIC, RARITY_PROBS.EPIC)
  const legendaryCost = calculateRarityCost(rarityCounts.LEGENDARY, RARITY_PROBS.LEGENDARY, true)

  const fusionPotential = calculateFusionPotential(collection.photos)

  const totalWithoutFusion = commonCost.cost + rareCost.cost + epicCost.cost + legendaryCost.cost
  const fusionSavings = (fusionPotential.commonToRare * 4 * PACK_PRICE / PHOTOS_PER_PACK) * 0.5
  const totalWithFusion = Math.max(totalWithoutFusion - fusionSavings, totalWithoutFusion * 0.6)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/admin/collections" className="text-purple-400 hover:text-purple-300 mb-2 block transition-colors">
            ← Back to Collections
          </Link>
          <h1 className="text-2xl font-bold text-white">{collection.name} - Photos</h1>
        </div>
      </div>

      {/* Collection Stats */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Collection Stats</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-500/20 border border-gray-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-300">{rarityCounts.COMMON}</p>
            <p className="text-xs text-gray-500">Common (55%)</p>
          </div>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{rarityCounts.RARE}</p>
            <p className="text-xs text-gray-500">Rare (35%)</p>
          </div>
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{rarityCounts.EPIC}</p>
            <p className="text-xs text-gray-500">Epic (8.5%)</p>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{rarityCounts.LEGENDARY}</p>
            <p className="text-xs text-gray-500">Legendary (1.5%)</p>
          </div>
        </div>

        <div className="text-sm text-gray-400 text-center">
          Total: <span className="text-white font-bold">{collection.photos.length}</span> photos
        </div>
      </div>

      {/* Cost Calculator */}
      {collection.photos.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">💰 Cost to Complete Collection</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Without Fusion</p>
              <p className="text-2xl font-bold text-red-400">${totalWithoutFusion.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">Pure pack opening</p>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">With Fusion</p>
              <p className="text-2xl font-bold text-green-400">${totalWithFusion.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">Converting duplicates</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-300 mb-2">🔗 Fusion Potential</p>
              <div className="space-y-1 text-xs">
                <p className="text-gray-400">
                  <span className="text-gray-300">{fusionPotential.commonToRare}</span> Common → Rare
                </p>
                <p className="text-gray-400">
                  <span className="text-blue-400">{fusionPotential.rareToEpic}</span> Rare → Epic
                </p>
                <p className="text-gray-400">
                  <span className="text-purple-400">{fusionPotential.epicToLegendary}</span> Epic → Legendary
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-500">
              * Estimates based on {PHOTOS_PER_PACK} photos per pack at ${PACK_PRICE.toFixed(2)}.
              Legendary pity every {PITY_THRESHOLD} packs. Actual costs may vary ±30%.
            </p>
          </div>
        </div>
      )}

      {/* Bulk Selection Bar */}
      {selectedPhotos.size > 0 && (
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <span className="text-white">
            <strong>{selectedPhotos.size}</strong> photos selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedPhotos(new Set())}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500"
            >
              Clear
            </button>
            <button
              onClick={handleBulkDeleteClick}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <UploadForm collectionId={collection.id} />
        </div>

        {/* Photos Grid */}
        <div className="lg:col-span-2">
          {/* Select All Header */}
          {collection.photos.length > 0 && (
            <div className="mb-2">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collection.photos.length > 0 && selectedPhotos.size === collection.photos.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all photos"
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">Select all ({collection.photos.length} photos)</span>
              </label>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {collection.photos.map((photo) => (
              <div key={photo.id} className="glass rounded-xl overflow-hidden group relative">
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(photo.id)}
                    onChange={() => togglePhotoSelection(photo.id)}
                    aria-label={`Select photo ${photo.rarity}`}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700/80 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
                <div className="aspect-square relative bg-gray-800/50 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt="Photo"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${rarityColors[photo.rarity]}`}>
                    {photo.rarity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {collection.photos.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-gray-400">No photos in this collection yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Delete Photos</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                Are you sure you want to delete <span className="text-white font-medium">{deleteImpact.photoCount}</span> photos?
              </p>
              {deleteImpact.affectedUsers > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">
                    <strong>{deleteImpact.affectedUsers}</strong> users have collected these photos.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}