import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const coverStyles = ['blush', 'noir', 'cream', 'blush'] as const
type CoverStyle = typeof coverStyles[number]

const coverTheme: Record<CoverStyle, { bg: string; text: string; accent: string; sub: string }> = {
  blush: { bg: 'linear-gradient(165deg, #f5d9d1 0%, #e8b8ac 50%, #c9847a 100%)', text: '#2a1519', accent: '#8a2f3b', sub: 'rgba(42,21,25,0.65)' },
  noir:  { bg: 'linear-gradient(165deg, #1a1418 0%, #0c090b 100%)',                text: '#f5e8df', accent: '#e8a4a4', sub: 'rgba(245,232,223,0.6)' },
  cream: { bg: 'linear-gradient(165deg, #f5ede0 0%, #e0d2b8 100%)',                text: '#2a1f17', accent: '#b8593a', sub: 'rgba(42,31,23,0.6)' },
}

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [activeCollections, ownedUserPhotos] = await Promise.all([
    prisma.collection.findMany({
      where: { active: true },
      include: { _count: { select: { photos: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userPhoto.findMany({
      where: { userId: user.id },
      select: { photo: { select: { collectionId: true } } },
    }),
  ])

  const ownedByCollection = ownedUserPhotos.reduce((acc, up) => {
    const cid = up.photo.collectionId
    acc[cid] = (acc[cid] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const collections = activeCollections.map((c, i) => ({
    id: c.id,
    name: c.name,
    edition: c.description ?? 'Edición 2026',
    total: c._count.photos,
    owned: ownedByCollection[c.id] ?? 0,
    style: coverStyles[i % coverStyles.length],
    num: String(i + 1).padStart(2, '0'),
  }))

  const totalOwned = collections.reduce((s, c) => s + c.owned, 0)
  const totalPhotos = collections.reduce((s, c) => s + c.total, 0)

  return (
    <div style={{ color: 'var(--ink)', paddingTop: '54px' }}>

      {/* Masthead */}
      <div style={{ padding: '10px 16px 14px', borderBottom: '0.5px solid rgba(26,20,24,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.4em', color: 'var(--ink)' }}>KWELPS</div>
          <Link href="/store" style={{ textDecoration: 'none', padding: '6px 14px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 100 }}>
            Comprar
          </Link>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
          Tu Colección
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,20,24,0.55)' }}>
          {collections.length} {collections.length === 1 ? 'edición' : 'ediciones'} · {totalOwned} de {totalPhotos} piezas
        </div>
      </div>

      <div style={{ padding: '14px 16px 100px' }}>

        {/* Section label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Ediciones</div>
          <Link href="/album" style={{ fontSize: 10, color: 'rgba(26,20,24,0.5)', textDecoration: 'none' }}>álbum →</Link>
        </div>

        {collections.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 12, color: 'rgba(26,20,24,0.45)' }}>
            No hay colecciones activas
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {collections.map(c => {
              const theme = coverTheme[c.style]
              const pct = c.total > 0 ? (c.owned / c.total) * 100 : 0
              const words = c.name.split(' ')
              const line1 = words[0]
              const line2 = words.slice(1).join(' ') || c.edition

              return (
                <Link key={c.id} href={`/album?collection=${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '3/4.2',
                    background: theme.bg,
                    borderRadius: 4,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}>
                    {/* Top row */}
                    <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.25em', color: theme.text }}>KWELPS</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: theme.sub, letterSpacing: '0.1em' }}>N°{c.num}</div>
                    </div>

                    {/* Active badge */}
                    <div style={{ position: 'absolute', top: 34, right: 14, background: theme.accent, color: c.style === 'noir' ? 'var(--ink)' : '#fff', fontSize: 7, fontWeight: 700, padding: '3px 7px', borderRadius: 2, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Activa
                    </div>

                    {/* Big K watermark */}
                    <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '70%', aspectRatio: '1', borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15, fontSize: 68, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: theme.text }}>K</div>

                    {/* Title */}
                    <div style={{ position: 'absolute', bottom: 46, left: 14, right: 14 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: theme.text, letterSpacing: '-0.02em', lineHeight: 0.95, fontStyle: 'italic' }}>
                        {line1}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 300, color: theme.text, letterSpacing: '-0.02em', lineHeight: 0.95 }}>
                        {line2}
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: 8, color: theme.sub, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                        {c.edition}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: theme.accent, fontWeight: 600 }}>
                        {c.owned}/{c.total}
                      </div>
                    </div>

                    {/* Progress bar at very bottom */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.15)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: theme.accent, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
