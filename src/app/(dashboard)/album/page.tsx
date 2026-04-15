import { getAlbum, getAlbumStats } from '@/lib/actions/album'
import { AlbumClient } from './album-client'

export default async function AlbumPage() {
  const [album, stats] = await Promise.all([
    getAlbum(),
    getAlbumStats(),
  ])

  return <AlbumClient initialAlbum={album} initialStats={stats} />
}