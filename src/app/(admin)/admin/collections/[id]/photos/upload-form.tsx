'use client'

import { useState } from 'react'
import { bulkUploadPhotos } from '@/lib/actions/photos'

type PhotoItem = {
  file: File
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
}

const rarityOptions = [
  { value: 'COMMON', label: 'Common', color: 'bg-gray-500/30 text-gray-300 border-gray-500/50' },
  { value: 'RARE', label: 'Rare', color: 'bg-blue-500/30 text-blue-400 border-blue-500/50' },
  { value: 'EPIC', label: 'Epic', color: 'bg-purple-500/30 text-purple-400 border-purple-500/50' },
  { value: 'LEGENDARY', label: 'Legendary', color: 'bg-yellow-500/30 text-yellow-400 border-yellow-500/50' },
] as const

export function UploadForm({ collectionId }: { collectionId: string }) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [defaultRarity, setDefaultRarity] = useState<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'>('COMMON')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newPhotos: PhotoItem[] = files.map((file) => ({
      file,
      rarity: defaultRarity,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
    // Reset input
    e.target.value = ''
  }

  function updatePhotoRarity(index: number, rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY') {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, rarity } : p)))
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function setAllRarity(rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY') {
    setDefaultRarity(rarity)
    setPhotos((prev) => prev.map((p) => ({ ...p, rarity })))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (photos.length === 0) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const result = await bulkUploadPhotos(photos.map((p) => ({
        file: p.file,
        rarity: p.rarity,
        collectionId,
      })))

      if (result.success) {
        setSuccess(true)
        setPhotos([])
        // Refresh page
        window.location.reload()
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-bold text-white">Bulk Upload Photos</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl">{error}</div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 p-4 rounded-xl">
          Photos uploaded successfully!
        </div>
      )}

      {/* File Input */}
      <div>
        <label htmlFor="file-input" className="block text-sm font-medium text-gray-300 mb-2">
          Select Images (multiple)
        </label>
        <input
          type="file"
          id="file-input"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:font-medium file:hover:bg-purple-700 transition-colors cursor-pointer"
        />
        <p className="text-xs text-gray-500 mt-1">You can select multiple images at once</p>
      </div>

      {/* Set All Rarity */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Set All to Rarity</label>
        <div className="grid grid-cols-4 gap-2">
          {rarityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAllRarity(option.value)}
              className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                defaultRarity === option.value
                  ? `${option.color} border ring-2 ring-purple-500/50`
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Preview List */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={() => {
                photos.forEach((p) => URL.revokeObjectURL(p.preview))
                setPhotos([])
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {photos.map((photo, index) => (
              <div key={index} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                <img
                  src={photo.preview}
                  alt={photo.file.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{photo.file.name}</p>
                  <div className="flex gap-1 mt-1">
                    {rarityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updatePhotoRarity(index, option.value)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          photo.rarity === option.value
                            ? option.color
                            : 'bg-white/10 text-gray-400'
                        }`}
                      >
                        {option.label.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rarity Count Summary */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-500/20 rounded-lg p-2">
            <p className="text-lg font-bold text-gray-300">{photos.filter(p => p.rarity === 'COMMON').length}</p>
            <p className="text-[10px] text-gray-500">Common</p>
          </div>
          <div className="bg-blue-500/20 rounded-lg p-2">
            <p className="text-lg font-bold text-blue-400">{photos.filter(p => p.rarity === 'RARE').length}</p>
            <p className="text-[10px] text-gray-500">Rare</p>
          </div>
          <div className="bg-purple-500/20 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">{photos.filter(p => p.rarity === 'EPIC').length}</p>
            <p className="text-[10px] text-gray-500">Epic</p>
          </div>
          <div className="bg-yellow-500/20 rounded-lg p-2">
            <p className="text-lg font-bold text-yellow-400">{photos.filter(p => p.rarity === 'LEGENDARY').length}</p>
            <p className="text-[10px] text-gray-500">Legendary</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || photos.length === 0}
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
      >
        {loading ? `Uploading ${photos.length} photos...` : `Upload ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`}
      </button>
    </form>
  )
}