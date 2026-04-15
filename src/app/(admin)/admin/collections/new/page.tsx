'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCollection } from '@/lib/actions/collections'

export default function NewCollectionPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prize, setPrize] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await createCollection({ name, description: description || undefined, prize })
      router.push('/admin/collections')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">New Collection</h1>

      <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-6">
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
            {loading ? 'Creating...' : 'Create Collection'}
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
  )
}