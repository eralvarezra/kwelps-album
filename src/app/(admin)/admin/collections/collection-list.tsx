'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toggleCollectionActive, getCollectionDeletionImpact, deleteCollection } from '@/lib/actions/collections'

type Collection = {
  id: string
  name: string
  description: string | null
  prize: string
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
      <div className="glass rounded-xl p-6 lg:p-8 text-center">
        <p className="text-gray-400">No collections yet. Create your first collection!</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {collections.map((collection) => (
          <div key={collection.id} className="glass rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium truncate">{collection.name}</h3>
                {collection.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">{collection.description}</p>
                )}
              </div>
              <button
                onClick={() => handleToggle(collection.id, collection.active)}
                className={`ml-2 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                  collection.active
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {collection.active ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="flex items-center gap-4 mb-3 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Prize:</span>
                <span className="text-yellow-400 truncate max-w-[120px]" title={collection.prize}>
                  {collection.prize || '-'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Photos:</span>
                <span className="text-white">{collection._count.photos}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10">
              <Link
                href={`/admin/collections/${collection.id}`}
                className="flex-1 py-2 text-center text-sm text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                Edit
              </Link>
              <Link
                href={`/admin/collections/${collection.id}/photos`}
                className="flex-1 py-2 text-center text-sm text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                Photos
              </Link>
              <button
                onClick={() => handleDeleteClick(collection.id)}
                className="py-2 px-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Prize
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
                    <span className="text-sm text-yellow-400 truncate max-w-[150px] block" title={collection.prize}>
                      {collection.prize || '-'}
                    </span>
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
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteState.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-5 lg:p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Delete Collection</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-300 text-sm lg:text-base">
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
    </>
  )
}