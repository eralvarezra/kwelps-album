import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { getCollections } from '@/lib/actions/collections'
import { CollectionList } from './collection-list'

export default async function CollectionsPage() {
  await requireAdmin()
  const collections = await getCollections()

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl lg:text-2xl font-bold text-white">Collections</h1>
        <Link
          href="/admin/collections/new"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow text-center text-sm lg:text-base"
        >
          New Collection
        </Link>
      </div>

      <CollectionList collections={collections} />
    </div>
  )
}