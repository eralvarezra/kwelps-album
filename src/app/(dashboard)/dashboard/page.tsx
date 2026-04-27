import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { WelcomeBonusModal } from '@/components/ui/welcome-bonus-modal'

const howItWorks = [
  { n: '01', t: 'Recargá',    d: 'Suma saldo a tu wallet con PayPal o Sinpe.' },
  { n: '02', t: 'Comprá',     d: 'Elegí pack de 6 fotos o 2 fotos.' },
  { n: '03', t: 'Coleccioná', d: 'Las fotos llegan a tu álbum por rareza.' },
  { n: '04', t: 'Fusioná',    d: '4 fotos iguales = 1 de mayor rareza.' },
  { n: '05', t: 'Completá',   d: 'Termina la colección y reclamá tu premio.' },
]

const rarities = [
  { l: 'Común', c: '#c0b5a8', p: '55%' },
  { l: 'Raro',  c: '#8a7a6a', p: '35%' },
  { l: 'Épico', c: '#e8a4a4', p: '8.5%' },
  { l: 'Leg.',  c: '#d4a356', p: '1.5%' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: { email: user.email! },
  })

  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0, bonusClaimed: false },
    update: {},
  })

  await prisma.pityCounter.upsert({
    where: { userId: user.id },
    create: { userId: user.id, legendaryCounter: 0 },
    update: {},
  })

  const [wallet, activeCollections, ownedUserPhotos] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.collection.findMany({
      where: { active: true },
      include: {
        _count: { select: { photos: true } },
        photos: {
          where: { rarity: 'COMMON' },
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { url: true, thumbnailUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userPhoto.findMany({
      where: { userId: user.id },
      select: { photo: { select: { collectionId: true } } },
    }),
  ])

  const balance = wallet?.balance ? Number(wallet.balance) : 0
  const username = user.email?.split('@')[0] ?? 'usuario'

  const ownedByCollection = ownedUserPhotos.reduce((acc, up) => {
    const cid = up.photo.collectionId
    acc[cid] = (acc[cid] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const collections = activeCollections.map(c => ({
    id: c.id,
    name: c.name,
    edition: c.description ?? 'Colección',
    prize: c.prize,
    total: c._count.photos,
    owned: ownedByCollection[c.id] ?? 0,
    coverUrl: c.photos[0]?.thumbnailUrl ?? c.photos[0]?.url ?? '',
  }))

  const [hero, ...rest] = collections

  return (
    <>
      <WelcomeBonusModal show={wallet?.bonusClaimed === false} />

      <div style={{ color: 'var(--ink)', paddingTop: '54px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--ink)', color: 'var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, fontWeight: 500,
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, marginLeft: 10 }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.55)' }}>
              Bienvenido
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 1 }}>{username}</div>
          </div>
          <Link href="/wallet" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '6px 12px', borderRadius: 100,
              background: 'var(--ink)', color: 'var(--paper)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13 }}>$</span>
              {balance.toFixed(2)}
            </div>
          </Link>
        </div>

        <div style={{ padding: '4px 16px 0' }}>

          {/* Masthead */}
          <div style={{ marginTop: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--wine)' }}>
              KWELPS · ÁLBUM
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.95, marginTop: 6 }}>
              Tu álbum
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.95, marginTop: -2 }}>
              de fotografías.
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(26,20,24,0.6)', lineHeight: 1.5, marginTop: 12, marginBottom: 16, maxWidth: 300 }}>
            Coleccionalas, fusionalas y completa ediciones para reclamar premios especiales.
          </div>

          {/* Active collections quick-pick */}
          {collections.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.55)', marginBottom: 10 }}>
                Colecciones activas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {collections.map(c => {
                  const pct = c.total > 0 ? (c.owned / c.total) * 100 : 0
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
                      {/* Thumb */}
                      <div style={{
                        width: 44, height: 44, flexShrink: 0, borderRadius: 2,
                        backgroundImage: c.coverUrl ? `url(${c.coverUrl})` : undefined,
                        background: c.coverUrl ? undefined : 'var(--paper-warm)',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                          <div style={{ flex: 1, height: 2, background: 'rgba(26,20,24,0.08)', borderRadius: 1, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--ink)' }} />
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(26,20,24,0.5)', flexShrink: 0 }}>
                            {c.owned}/{c.total}
                          </div>
                        </div>
                      </div>
                      {/* CTA */}
                      <Link href={`/store?collection=${c.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, whiteSpace: 'nowrap' }}>
                          Comprar →
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hero collection */}
          {hero && (
            <Link href={`/album?collection=${hero.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                position: 'relative', borderRadius: 2, overflow: 'hidden',
                height: 220, marginBottom: 12,
                backgroundImage: hero.coverUrl ? `url(${hero.coverUrl})` : undefined,
                background: hero.coverUrl ? undefined : 'var(--ink)',
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)' }} />

                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(250,247,242,0.95)', color: 'var(--ink)', padding: '4px 8px', fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                  Activa
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--paper)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {hero.owned}/{hero.total}
                </div>

                <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, color: 'var(--paper)' }}>
                  <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rarity-legendary)' }}>
                    {hero.edition}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 3, letterSpacing: '-0.02em' }}>
                    {hero.name}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.25)', marginTop: 10, position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: -0.5,
                      width: `${hero.total > 0 ? (hero.owned / hero.total) * 100 : 0}%`,
                      height: 2, background: 'var(--rarity-legendary)',
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)' }}>
                      Premio · {hero.prize}
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.25em', color: 'var(--paper)' }}>
                      ABRIR →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* CTA pair */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
            <Link href="/store" style={{ textDecoration: 'none' }}>
              <div style={{ padding: 14, textAlign: 'center', background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2 }}>
                Comprar Pack
              </div>
            </Link>
            <Link href="/wallet" style={{ textDecoration: 'none' }}>
              <div style={{ padding: 14, textAlign: 'center', background: 'var(--blush)', color: 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2 }}>
                Recargar
              </div>
            </Link>
          </div>

          {/* Other collections */}
          {rest.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)' }}>
                    También en curso
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 2 }}>
                    Otras ediciones
                  </div>
                </div>
                <Link href="/collections" style={{ textDecoration: 'none', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)' }}>
                  Ver todas
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {rest.map(c => (
                  <Link key={c.id} href={`/album?collection=${c.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', gap: 10, padding: 10, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
                      <div style={{
                        width: 70, flexShrink: 0, aspectRatio: '1',
                        backgroundImage: c.coverUrl ? `url(${c.coverUrl})` : undefined,
                        background: c.coverUrl ? undefined : 'var(--paper-warm)',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        borderRadius: 2, overflow: 'hidden', position: 'relative',
                      }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--blush-deep)' }}>
                            {c.edition}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 2, color: 'var(--ink)' }}>
                            {c.name}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(26,20,24,0.55)' }}>
                            {c.owned}/{c.total}
                          </div>
                          <div style={{ flex: 1, height: 1, background: 'rgba(26,20,24,0.1)', margin: '0 8px', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: -0.5, width: `${c.total > 0 ? (c.owned / c.total) * 100 : 0}%`, height: 2, background: 'var(--blush-deep)' }} />
                          </div>
                          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink)' }}>
                            Ver →
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Premios — dark hero */}
          <div style={{ padding: 18, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 2, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 180, color: 'rgba(232,164,164,0.06)', lineHeight: 1, fontWeight: 400, pointerEvents: 'none' }}>
              P
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)' }}>El Premio</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', fontWeight: 400, lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em' }}>
                Completá &<br />
                <span style={{ color: 'var(--rose)' }}>reclamá</span>
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(250,247,242,0.7)', marginTop: 12, maxWidth: 240 }}>
                Cuando termines una colección, contactanos por Telegram con la captura y enviamos tu premio físico.
              </div>
              <div style={{ marginTop: 16 }}>
                <a href="https://t.me/kwelps" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: 'var(--rose)', color: 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', borderRadius: 2, textDecoration: 'none' }}>
                  Telegram
                </a>
              </div>
            </div>
          </div>

          {/* Cómo funciona */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)' }}>Sobre Kwelps</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 2, marginBottom: 14 }}>
              ¿Cómo funciona?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {howItWorks.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < howItWorks.length - 1 ? '0.5px solid rgba(26,20,24,0.1)' : 'none' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--wine)', lineHeight: 1, minWidth: 24 }}>
                    {step.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>{step.t}</div>
                    <div style={{ fontSize: 10, color: 'rgba(26,20,24,0.6)', marginTop: 2, lineHeight: 1.4 }}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rareza legend */}
          <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2, marginBottom: 14 }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.55)', marginBottom: 10 }}>Rarezas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {rarities.map((r, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderTop: `2px solid ${r.c}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>{r.l}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, fontWeight: 500, marginTop: 3, color: r.c }}>{r.p}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CR strip */}
          <div style={{ padding: 14, background: 'var(--blush)', color: '#2a1519', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, color: 'var(--wine)', fontWeight: 500 }}>CR</div>
            <div style={{ flex: 1, fontSize: 10, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700 }}>Costa Rica</div>
              <div style={{ color: 'rgba(42,21,25,0.7)' }}>Recargá por Sinpe Móvil vía Telegram.</div>
            </div>
            <a href="https://t.me/kwelps" target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--wine)', textDecoration: 'none' }}>
              Abrir →
            </a>
          </div>

        </div>
      </div>
    </>
  )
}
