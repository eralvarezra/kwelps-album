'use client'

import { useState, useEffect, useMemo } from 'react'
import { deletePhotoAction, updatePhotosRarity } from '@/lib/actions/photos'

type Photo = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  collection: {
    id: string
    name: string
  }
}

const rarityConfig = {
  COMMON: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  RARE: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  EPIC: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  LEGENDARY: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
}

const RARITIES: Array<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'> = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY']

export default function AllPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [selectedRarity, setSelectedRarity] = useState<string>('')
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [bulkRarity, setBulkRarity] = useState<string>('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetch('/api/admin/photos')
      .then((res) => res.json())
      .then((data) => {
        setPhotos(data)
        setLoading(false)
      })
  }, [])

  const collections = useMemo(() => {
    const uniqueCollections = new Map<string, string>()
    photos.forEach((photo) => {
      if (!uniqueCollections.has(photo.collection.id)) {
        uniqueCollections.set(photo.collection.id, photo.collection.name)
      }
    })
    return Array.from(uniqueCollections.entries()).map(([id, name]) => ({ id, name }))
  }, [photos])

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (selectedCollection && photo.collection.id !== selectedCollection) return false
      if (selectedRarity && photo.rarity !== selectedRarity) return false
      return true
    })
  }, [photos, selectedCollection, selectedRarity])

  const selectedFilteredCount = useMemo(() => {
    return filteredPhotos.filter(p => selectedPhotos.has(p.id)).length
  }, [filteredPhotos, selectedPhotos])

  function togglePhotoSelection(photoId: string) {
    const newSet = new Set(selectedPhotos)
    if (newSet.has(photoId)) {
      newSet.delete(photoId)
    } else {
      newSet.add(photoId)
    }
    setSelectedPhotos(newSet)
  }

  function selectAllFiltered() {
    const newSet = new Set(selectedPhotos)
    filteredPhotos.forEach(p => newSet.add(p.id))
    setSelectedPhotos(newSet)
  }

  function deselectAll() {
    setSelectedPhotos(new Set())
  }

  async function handleBulkDelete() {
    if (selectedPhotos.size === 0) return
    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedPhotos.size} fotos?`)) return

    setUpdating(true)
    try {
      await Promise.all(Array.from(selectedPhotos).map(id => deletePhotoAction(id)))
      setPhotos(photos.filter(p => !selectedPhotos.has(p.id)))
      setSelectedPhotos(new Set())
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleBulkRarityChange() {
    if (selectedPhotos.size === 0 || !bulkRarity) return

    setUpdating(true)
    try {
      await updatePhotosRarity(Array.from(selectedPhotos), bulkRarity as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY')
      setPhotos(photos.map(p =>
        selectedPhotos.has(p.id) ? { ...p, rarity: bulkRarity as Photo['rarity'] } : p
      ))
      setSelectedPhotos(new Set())
      setBulkRarity('')
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete(photoId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta foto?')) return

    try {
      await deletePhotoAction(photoId)
      setPhotos(photos.filter((p) => p.id !== photoId))
      setSelectedPhotos(prev => {
        const newSet = new Set(prev)
        newSet.delete(photoId)
        return newSet
      })
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Todas las Fotos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="collection-filter" className="text-sm font-medium text-gray-300">
            Colección:
          </label>
          <select
            id="collection-filter"
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="" className="bg-[#1e293b] text-white">Todas</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id} className="bg-[#1e293b] text-white">
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="rarity-filter" className="text-sm font-medium text-gray-300">
            Rareza:
          </label>
          <select
            id="rarity-filter"
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="" className="bg-[#1e293b] text-white">Todas</option>
            {RARITIES.map((rarity) => (
              <option key={rarity} value={rarity} className="bg-[#1e293b] text-white">
                {rarity}
              </option>
            ))}
          </select>
        </div>

        {(selectedCollection || selectedRarity) && (
          <button
            onClick={() => {
              setSelectedCollection('')
              setSelectedRarity('')
            }}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedPhotos.size > 0 && (
        <div className="glass rounded-xl p-4 border border-purple-500/30 bg-purple-500/10">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-purple-300">
              {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''} seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
            </span>

            <div className="flex items-center gap-2">
              <select
                value={bulkRarity}
                onChange={(e) => setBulkRarity(e.target.value)}
                className="bg-[#1e293b] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-[#1e293b] text-white">Cambiar rareza...</option>
                {RARITIES.map((rarity) => (
                  <option key={rarity} value={rarity} className="bg-[#1e293b] text-white">
                    {rarity}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkRarityChange}
                disabled={!bulkRarity || updating}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Aplicar
              </button>
            </div>

            <button
              onClick={handleBulkDelete}
              disabled={updating}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Eliminar seleccionadas
            </button>

            <button
              onClick={deselectAll}
              className="text-sm text-gray-400 hover:text-white"
            >
              Deseleccionar todo
            </button>
          </div>
        </div>
      )}

      {/* Select All Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={selectAllFiltered}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Seleccionar todas las filtradas ({filteredPhotos.length})
        </button>
        {selectedFilteredCount > 0 && (
          <span className="text-sm text-gray-400">
            ({selectedFilteredCount} seleccionadas en esta vista)
          </span>
        )}
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-gray-400">
            {photos.length === 0
              ? 'No hay fotos aún. Agrega fotos a través de una colección.'
              : 'No hay fotos que coincidan con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredPhotos.map((photo) => {
            const config = rarityConfig[photo.rarity]
            const isSelected = selectedPhotos.has(photo.id)
            return (
              <div
                key={photo.id}
                className={`glass rounded-xl overflow-hidden group transition-all ${
                  isSelected ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
                }`}
              >
                <div
                  className="aspect-square relative bg-gray-800 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt="Photo"
                    className="w-full h-full object-cover"
                  />
                  {/* Selection checkbox */}
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePhotoSelection(photo.id)
                    }}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'bg-black/50 border-white/50 hover:border-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(photo.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-all"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {photo.rarity}
                  </span>
                  <p className="text-xs text-gray-500 truncate">{photo.collection.name}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhoto.url}
              alt="Photo"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-xl w-10 h-10 flex items-center justify-center text-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}