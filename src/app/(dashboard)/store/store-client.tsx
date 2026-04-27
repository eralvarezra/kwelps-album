'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { purchasePack, purchaseSingle, getStoreInfo } from '@/lib/actions/store'
import type { PullResult, Rarity, StoreInfo } from '@/lib/store/types'
import { PACK_PRICE, SINGLE_PRICE } from '@/lib/store/types'
import Link from 'next/link'
import { LegendaryParticles } from '@/components/ui/legendary-particles'

type StoreData = StoreInfo

const rarityColor: Record<Rarity, string> = {
  COMMON:    '#c0b5a8',
  RARE:      '#8a7a6a',
  EPIC:      '#e8a4a4',
  LEGENDARY: '#d4a356',
}

const rarityLabel: Record<Rarity, string> = {
  COMMON:    'Común',
  RARE:      'Raro',
  EPIC:      'Épico',
  LEGENDARY: 'Legendario',
}

const rarityPct: Record<Rarity, string> = {
  COMMON: '55%', RARE: '35%', EPIC: '8.5%', LEGENDARY: '1.5%',
}

export function StoreClient({ initialData }: { initialData: StoreData }) {
  const [data, setData]                         = useState(initialData)
  const [selectedCollectionId, setSelected]     = useState<string | null>(initialData.collections[0]?.id ?? null)
  const [loading, setLoading]                   = useState<'pack' | 'single' | null>(null)
  const [error, setError]                       = useState('')
  const [pullResults, setPullResults]           = useState<PullResult[] | null>(null)
  const [showAnimation, setShowAnimation]       = useState(false)
  const [revealedCards, setRevealedCards]       = useState<Set<number>>(new Set())

  const searchParams   = useSearchParams()
  const collectionParam = searchParams.get('collection')

  useEffect(() => {
    if (collectionParam) {
      const exists = data.collections.find(c => c.id === collectionParam)
      if (exists) setSelected(collectionParam)
    }
  }, [collectionParam, data.collections])

  const selectedCollection = data.collections.find(c => c.id === selectedCollectionId) ?? data.collections[0]

  async function handlePurchasePack() {
    setLoading('pack'); setError(''); setShowAnimation(true); setRevealedCards(new Set())
    try {
      const result = await purchasePack(selectedCollectionId ?? undefined)
      setPullResults(result.photos)
      setData(await getStoreInfo())
    } catch (err) {
      setError((err as Error).message)
      setShowAnimation(false)
    } finally { setLoading(null) }
  }

  async function handlePurchaseSingle() {
    setLoading('single'); setError(''); setShowAnimation(true); setRevealedCards(new Set())
    try {
      const result = await purchaseSingle(selectedCollectionId ?? undefined)
      setPullResults([result])
      setData(await getStoreInfo())
    } catch (err) {
      setError((err as Error).message)
      setShowAnimation(false)
    } finally { setLoading(null) }
  }

  function revealCard(index: number) { setRevealedCards(prev => new Set(prev).add(index)) }
  function revealAllCards() { if (pullResults) setRevealedCards(new Set(pullResults.map((_, i) => i))) }
  function closeResults() { setPullResults(null); setShowAnimation(false); setRevealedCards(new Set()) }

  if (data.collections.length === 0) {
    return (
      <div style={{ padding: '54px 16px 16px', color: 'var(--ink)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic', marginBottom: 12 }}>Tienda</div>
        <div style={{ fontSize: 12, color: 'rgba(26,20,24,0.55)' }}>No hay colecciones activas en este momento.</div>
      </div>
    )
  }

  const pity = data.pity

  return (
    <div style={{ color: 'var(--ink)', paddingTop: '54px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>←</Link>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>La Tienda</div>
        <div style={{ width: 28 }} />
      </div>

      <div style={{ padding: '8px 16px 30px' }}>

        {/* Masthead + balance pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            Tienda
          </div>
          <Link href="/wallet" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '8px 12px', borderRadius: 2, textAlign: 'right' }}>
              <div style={{ fontSize: 7, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--rose)', fontWeight: 700 }}>Tu Balance</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}>
                ${data.balance.toFixed(2)}
              </div>
            </div>
          </Link>
        </div>

        {/* Collection selector */}
        {data.collections.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)', marginBottom: 8 }}>
              Selecciona una colección
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {data.collections.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  style={{
                    flexShrink: 0, padding: '8px 12px',
                    background: selectedCollectionId === c.id ? 'var(--ink)' : 'transparent',
                    color: selectedCollectionId === c.id ? 'var(--paper)' : 'var(--ink)',
                    border: selectedCollectionId === c.id ? 'none' : '0.5px solid rgba(26,20,24,0.2)',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                    borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 10px', background: 'rgba(138,47,59,0.08)', border: '0.5px solid rgba(138,47,59,0.3)', borderRadius: 2, fontSize: 10, color: 'var(--wine)', marginBottom: 14, lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Pity counter */}
        {pity && (
          <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.15)', borderRadius: 2, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)' }}>
                  Contador de Pity
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', marginTop: 1 }}>
                  {pity.isGuaranteed ? '¡Legendario garantizado!' : `${pity.remaining} pulls restantes`}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(26,20,24,0.6)' }}>
                {pity.current}/40
              </div>
            </div>
            <div style={{ height: 3, background: 'rgba(26,20,24,0.08)', position: 'relative', overflow: 'hidden', borderRadius: 1 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.min((pity.current / 40) * 100, 100)}%`,
                background: pity.isGuaranteed ? 'var(--rarity-legendary)' : 'linear-gradient(90deg, var(--wine) 0%, var(--rose) 100%)',
              }} />
            </div>
            <div style={{ fontSize: 9, color: 'rgba(26,20,24,0.55)', marginTop: 8, lineHeight: 1.5 }}>
              Cada foto que abras suma al contador. A los 40 pulls sin legendario, el siguiente está garantizado.
            </div>
          </div>
        )}

        {/* Pack cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>

          {/* Pack de 4 — noir */}
          <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '16px 14px', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)' }}>Pack de 4</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginTop: 2, lineHeight: 0.95 }}>
                ${PACK_PRICE.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.85, flex: 1 }}>
              <div>· 4 fotos aleatorias</div>
              <div>· Garantizado 1 raro+</div>
              <div>· Pity counter: +4</div>
            </div>
            <button
              onClick={handlePurchasePack}
              disabled={loading !== null || data.balance < PACK_PRICE}
              style={{
                background: loading !== null || data.balance < PACK_PRICE ? 'rgba(232,164,164,0.4)' : 'var(--rose)',
                color: 'var(--ink)', padding: 10, textAlign: 'center',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: loading !== null || data.balance < PACK_PRICE ? 'not-allowed' : 'pointer',
                borderRadius: 2, border: 'none', fontFamily: 'var(--font-body)',
                transition: 'opacity 0.15s',
              }}
            >
              {loading === 'pack' ? 'Comprando...' : data.balance < PACK_PRICE ? 'Saldo insuf.' : 'Comprar'}
            </button>
          </div>

          {/* Foto única — blush */}
          <div style={{ background: 'var(--blush)', color: '#2a1519', padding: '16px 14px', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)' }}>Foto Única</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginTop: 2, lineHeight: 0.95 }}>
                ${SINGLE_PRICE.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.8, flex: 1 }}>
              <div>· 1 foto aleatoria</div>
              <div>· Probabilidades estándar</div>
              <div>· Pity counter: +1</div>
            </div>
            <button
              onClick={handlePurchaseSingle}
              disabled={loading !== null || data.balance < SINGLE_PRICE}
              style={{
                background: loading !== null || data.balance < SINGLE_PRICE ? 'rgba(138,47,59,0.3)' : 'var(--wine)',
                color: loading !== null || data.balance < SINGLE_PRICE ? 'rgba(42,21,25,0.5)' : 'var(--paper)',
                padding: 10, textAlign: 'center',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: loading !== null || data.balance < SINGLE_PRICE ? 'not-allowed' : 'pointer',
                borderRadius: 2, border: 'none', fontFamily: 'var(--font-body)',
                transition: 'opacity 0.15s',
              }}
            >
              {loading === 'single' ? 'Comprando...' : data.balance < SINGLE_PRICE ? 'Saldo insuf.' : 'Comprar'}
            </button>
          </div>
        </div>

        {/* Probabilidades */}
        <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.15)', borderRadius: 2 }}>
          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)', marginBottom: 10 }}>
            Probabilidades
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as Rarity[]).map(r => (
              <div key={r} style={{ padding: '10px 6px', textAlign: 'center', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2, borderTop: `2px solid ${rarityColor[r]}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.02em' }}>{rarityLabel[r]}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', fontWeight: 500, marginTop: 2, lineHeight: 1, color: rarityColor[r] }}>
                  {rarityPct[r]}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(26,20,24,0.5)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                  {selectedCollection?.rarityCount[r] ?? 0} fotos
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer link */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/album" style={{ textDecoration: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)', borderBottom: '1px solid var(--wine)', paddingBottom: 2 }}>
            Ir a Mi Álbum
          </Link>
        </div>
      </div>

      {/* Results modal */}
      {pullResults && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,11,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflowY: 'auto' }}>
          {pullResults.some(p => p.rarity === 'LEGENDARY') && revealedCards.size > 0 && <LegendaryParticles />}

          <div style={{ background: 'var(--ink)', borderRadius: 2, maxWidth: 480, width: '100%', border: '0.5px solid rgba(250,247,242,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 18px' }}>

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)', marginBottom: 6 }}>
                  Apertura
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', color: 'var(--paper)', lineHeight: 1 }}>
                  {revealedCards.size === pullResults.length
                    ? pullResults.filter(p => p.isNew).length > 0
                      ? `${pullResults.filter(p => p.isNew).length} foto${pullResults.filter(p => p.isNew).length > 1 ? 's' : ''} nueva${pullResults.filter(p => p.isNew).length > 1 ? 's' : ''}`
                      : 'Todas duplicadas'
                    : 'Toca para revelar'}
                </div>
              </div>

              {/* Cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: pullResults.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 10, marginBottom: 20, maxWidth: pullResults.length === 1 ? 200 : '100%', margin: pullResults.length === 1 ? '0 auto 20px' : '0 0 20px' }}>
                {pullResults.map((photo, index) => {
                  const isRevealed = revealedCards.has(index)

                  return (
                    <div
                      key={`${photo.id}-${index}`}
                      onClick={() => !isRevealed && revealCard(index)}
                      style={{ aspectRatio: '3/4', borderRadius: 2, overflow: 'hidden', cursor: isRevealed ? 'default' : 'pointer', perspective: '1000px' }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.7s cubic-bezier(.45,.05,.55,.95)', transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

                        {/* Card back */}
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'rgba(250,247,242,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '0.5px solid rgba(250,247,242,0.1)', borderRadius: 2 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontStyle: 'italic', color: 'rgba(250,247,242,0.15)', lineHeight: 1 }}>K</div>
                          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.3)', marginTop: 8 }}>
                            Toca para revelar
                          </div>
                        </div>

                        {/* Card front */}
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 2, overflow: 'hidden' }}>
                          <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.8) 100%)' }} />
                          <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: rarityColor[photo.rarity] }}>
                              {rarityLabel[photo.rarity]}
                            </div>
                          </div>
                          {photo.isNew && (
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--ink)', color: 'var(--paper)', fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', padding: '3px 6px', borderRadius: 100 }}>
                              NUEVA
                            </div>
                          )}
                          {photo.rarity === 'LEGENDARY' && (
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: `inset 0 0 0 2px ${rarityColor.LEGENDARY}, 0 0 20px rgba(212,163,86,0.4)` }} />
                          )}
                          {photo.rarity === 'EPIC' && (
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: `inset 0 0 0 1px ${rarityColor.EPIC}` }} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {revealedCards.size < pullResults.length && (
                  <button
                    onClick={revealAllCards}
                    style={{ padding: '12px', background: 'var(--rose)', color: 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    Revelar Todas
                  </button>
                )}
                {revealedCards.size === pullResults.length && (
                  <Link
                    href="/album"
                    style={{ padding: '12px', background: 'var(--rose)', color: 'var(--ink)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, textDecoration: 'none', textAlign: 'center', display: 'block' }}
                  >
                    Ver Álbum
                  </Link>
                )}
                <button
                  onClick={closeResults}
                  style={{ padding: '12px', background: 'transparent', color: 'rgba(250,247,242,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: 2, border: '0.5px solid rgba(250,247,242,0.15)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
