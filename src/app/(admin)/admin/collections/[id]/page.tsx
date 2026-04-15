'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCollection } from '@/lib/actions/collections'

type Photo = {
  id: string
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
}

type Collection = {
  id: string
  name: string
  description: string | null
  prize: string
  photos: Photo[]
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

  // Coupon collector problem approximation
  // Expected pulls = n * (ln(n) + gamma) where gamma ≈ 0.577
  // With probability adjustment
  const gamma = 0.577
  const basePulls = count * (Math.log(count) + gamma)
  const pullsNeeded = Math.ceil(basePulls / probability)

  // Adjust for pity (legendary case)
  let adjustedPulls = pullsNeeded
  if (usePity && probability < 0.02) {
    // Con pity, máximo 20 pulls por legendario
    const pityPulls = count * PITY_THRESHOLD * 0.6 // 60% del máximo
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

  // 4 comunes → 1 raro
  const commonFusion = Math.floor(counts.COMMON / 4)

  // 4 raros → 1 épico
  const rareFusion = Math.floor((counts.RARE + commonFusion) / 4)

  // 4 épicos → 1 legendario
  const epicFusion = Math.floor((counts.EPIC + rareFusion) / 4)

  return {
    commonToRare: commonFusion,
    rareToEpic: rareFusion,
    epicToLegendary: epicFusion,
  }
}

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prize, setPrize] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/admin/collections/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setCollection(data)
          setName(data.name)
          setDescription(data.description || '')
          setPrize(data.prize || '')
        })
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { id } = await params
      await updateCollection(id, { name, description: description || undefined, prize })
      router.push('/admin/collections')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!collection) {
    return <div className="text-gray-400">Loading...</div>
  }

  // Calcular estadísticas
  const rarityCounts = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 }
  collection.photos.forEach(p => rarityCounts[p.rarity]++)

  const commonCost = calculateRarityCost(rarityCounts.COMMON, RARITY_PROBS.COMMON)
  const rareCost = calculateRarityCost(rarityCounts.RARE, RARITY_PROBS.RARE)
  const epicCost = calculateRarityCost(rarityCounts.EPIC, RARITY_PROBS.EPIC)
  const legendaryCost = calculateRarityCost(rarityCounts.LEGENDARY, RARITY_PROBS.LEGENDARY, true)

  const fusionPotential = calculateFusionPotential(collection.photos)

  // Costo total sin fusión
  const totalWithoutFusion = commonCost.cost + rareCost.cost + epicCost.cost + legendaryCost.cost

  // Costo con fusión (aproximado)
  const fusionSavings = (fusionPotential.commonToRare * 4 * PACK_PRICE / PHOTOS_PER_PACK) * 0.5
  const totalWithFusion = Math.max(totalWithoutFusion - fusionSavings, totalWithoutFusion * 0.6)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Edit Collection</h1>
        <Link
          href={`/admin/collections/${collection.id}/photos`}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
        >
          Manage Photos
        </Link>
      </div>

      {/* Collection Stats */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Collection Stats</h2>

        {collection.photos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No photos in this collection yet</p>
            <Link
              href={`/admin/collections/${collection.id}/photos`}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              Add Photos
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-500/20 border border-gray-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-300">{rarityCounts.COMMON}</p>
                <p className="text-xs text-gray-500">Common</p>
                <p className="text-xs text-gray-600">55% drop rate</p>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{rarityCounts.RARE}</p>
                <p className="text-xs text-gray-500">Rare</p>
                <p className="text-xs text-gray-600">35% drop rate</p>
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">{rarityCounts.EPIC}</p>
                <p className="text-xs text-gray-500">Epic</p>
                <p className="text-xs text-gray-600">8.5% drop rate</p>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{rarityCounts.LEGENDARY}</p>
                <p className="text-xs text-gray-500">Legendary</p>
                <p className="text-xs text-gray-600">1.5% drop rate</p>
              </div>
            </div>

            <div className="text-sm text-gray-400 text-center">
              Total: <span className="text-white font-bold">{collection.photos.length}</span> photos
            </div>
          </>
        )}
      </div>

      {/* Cost Calculator - only show if there are photos */}
      {collection.photos.length > 0 && (
      <div className="glass rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">💰 Cost to Complete Collection</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Estimated Cost by Rarity</h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-500/10 rounded-lg">
                <span className="text-gray-400">Common ({rarityCounts.COMMON})</span>
                <span className="text-white font-medium">${commonCost.cost.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
                <span className="text-gray-400">Rare ({rarityCounts.RARE})</span>
                <span className="text-blue-400 font-medium">${rareCost.cost.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
                <span className="text-gray-400">Epic ({rarityCounts.EPIC})</span>
                <span className="text-purple-400 font-medium">${epicCost.cost.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg">
                <span className="text-gray-400">Legendary ({rarityCounts.LEGENDARY})</span>
                <span className="text-yellow-400 font-medium">${legendaryCost.cost.toFixed(0)}</span>
                <span className="text-xs text-gray-500">(with pity)</span>
              </div>
            </div>
          </div>

          {/* Total estimates */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Without Fusion</p>
              <p className="text-3xl font-bold text-red-400">${totalWithoutFusion.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">Pure pack opening</p>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">With Fusion</p>
              <p className="text-3xl font-bold text-green-400">${totalWithFusion.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">Converting duplicates</p>
            </div>

            {/* Fusion potential */}
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
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500">
            * Estimates based on {PHOTOS_PER_PACK} photos per pack at ${PACK_PRICE.toFixed(2)}.
            Legendary pity guaranteed every {PITY_THRESHOLD} packs.
            Actual costs may vary ±30% due to randomness.
          </p>
        </div>
      </div>
      )}

      {/* Edit Form */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Edit Details</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl">{error}</div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
          </div>

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
              placeholder="e.g., $10 Steam Gift Card"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Prize shown to users (send screenshot to <a href="http://t.me/kwelps" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">@kwelps</a> to claim)
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}