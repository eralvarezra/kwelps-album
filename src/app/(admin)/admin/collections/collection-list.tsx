'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toggleCollectionActive, getCollectionDeletionImpact, deleteCollection } from '@/lib/actions/collections'

type Collection = {
  id: string
  name: string
  description: string | null
  active: boolean
  createdAt: Date
  _count: { photos: number }
}

export function CollectionList({ collections }: { collections: Collection[] }) {
  const router = useRouter()

  async function handleToggle(id: string, currentActive: boolean) {
    await toggleCollectionActive(id, !currentActive)
    router.refresh()
  }

  type DeleteState = {
    isOpen: boolean
    collectionId: string | null
    collectionName: string
    photoCount: number
    affectedUsers: number
    isDeleting: boolean
  }

  const [deleteState, setDeleteState] = useState<DeleteState>({
    isOpen: false,
    collectionId: null,
    collectionName: '',
    photoCount: 0,
    affectedUsers: 0,
    isDeleting: false,
  })

  async function handleDeleteClick(id: string) {
    try {
      const impact = await getCollectionDeletionImpact(id)
      setDeleteState({
        isOpen: true,
        collectionId: id,
        collectionName: impact.name,
        photoCount: impact.photoCount,
        affectedUsers: impact.affectedUsers,
        isDeleting: false,
      })
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteState.collectionId) return

    setDeleteState(prev => ({ ...prev, isDeleting: true }))
    try {
      await deleteCollection(deleteState.collectionId)
      setDeleteState(prev => ({ ...prev, isOpen: false }))
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
      setDeleteState(prev => ({ ...prev, isDeleting: false }))
    }
  }

  if (collections.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-gray-400">No collections yet. Create your first collection!</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-white/5">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
              Name
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
              Photos
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
              Status
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {collections.map((collection) => (
            <tr key={collection.id} className="hover:bg-white/5">
              <td className="px-5 py-4">
                <div className="text-sm font-medium text-white">{collection.name}</div>
                {collection.description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {collection.description}
                  </div>
                )}
              </td>
              <td className="px-5 py-4">
                <span className="px-2 py-1 text-sm bg-white/10 text-gray-300 rounded-lg">
                  {collection._count.photos} photos
                </span>
              </td>
              <td className="px-5 py-4">
                <button
                  onClick={() => handleToggle(collection.id, collection.active)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    collection.active
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {collection.active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="px-5 py-4 text-right text-sm font-medium space-x-3">
                <Link
                  href={`/admin/collections/${collection.id}`}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/collections/${collection.id}/photos`}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Photos
                </Link>
                <button
                  onClick={() => handleDeleteClick(collection.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete Confirmation Dialog */}
      {deleteState.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Delete Collection</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                Are you sure you want to delete <span className="text-white font-medium">{deleteState.collectionName}</span>?
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  This will permanently delete <strong>{deleteState.photoCount}</strong> photos.
                </p>
                {deleteState.affectedUsers > 0 && (
                  <p className="text-red-400 text-sm mt-1">
                    <strong>{deleteState.affectedUsers}</strong> users have collected photos from this collection.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteState(prev => ({ ...prev, isOpen: false }))}
                disabled={deleteState.isDeleting}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteState.isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteState.isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}