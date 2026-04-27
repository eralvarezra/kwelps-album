import { getAlbum, getAlbumStats } from '@/lib/actions/album'
import { AlbumClient } from './album-client'

export default async function AlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string }>
}) {
  const { collection } = await searchParams
  const [album, stats] = await Promise.all([
    getAlbum(),
    getAlbumStats(),
  ])

  return <AlbumClient initialAlbum={album} initialStats={stats} initialCollectionId={collection} />
}