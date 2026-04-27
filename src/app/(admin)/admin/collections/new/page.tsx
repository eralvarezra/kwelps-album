'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCollectionWithPrizes } from '@/lib/actions/collections'

type PrizeMode = 'per_page' | 'completion' | 'both' | null

const PHOTOS_PER_PAGE_RECOMMENDED = 10

const inp = {
  width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff',
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
}
const btn = (active = true) => ({
  padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
  cursor: active ? 'pointer' : 'not-allowed', border: 'none',
  background: active ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.08)',
  color: active ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'opacity 0.15s',
  opacity: active ? 1 : 0.7,
})
const card = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, padding: '20px 22px',
}

export default function NewCollectionPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Step 2
  const [prizeMode, setPrizeMode] = useState<PrizeMode>(null)

  // Step 3 — per page
  const [numPages, setNumPages] = useState('')
  const [pageDescriptions, setPageDescriptions] = useState<string[]>([])

  // Step 3 — completion
  const [completionPrize, setCompletionPrize] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const parsedPages = parseInt(numPages) || 0
  const recommendedPhotos = parsedPages * PHOTOS_PER_PAGE_RECOMMENDED
  const hasPerPage  = prizeMode === 'per_page' || prizeMode === 'both'
  const hasCompletion = prizeMode === 'completion' || prizeMode === 'both'

  function handlePageCountChange(val: string) {
    setNumPages(val)
    const n = parseInt(val) || 0
    setPageDescriptions(prev => {
      const next = Array.from({ length: n }, (_, i) => prev[i] ?? '')
      return next
    })
  }

  function setPageDesc(i: number, val: string) {
    setPageDescriptions(prev => prev.map((d, idx) => idx === i ? val : d))
  }

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const prizes: { type: 'PER_PAGE' | 'COMPLETION'; pageNumber?: number; description: string }[] = []

      if (hasPerPage) {
        pageDescriptions.forEach((desc, i) => {
          if (desc.trim()) {
            prizes.push({ type: 'PER_PAGE', pageNumber: i + 1, description: desc.trim() })
          }
        })
      }

      if (hasCompletion && completionPrize.trim()) {
        prizes.push({ type: 'COMPLETION', description: completionPrize.trim() })
      }

      await createCollectionWithPrizes(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          prize: '',
          photosPerPage: PHOTOS_PER_PAGE_RECOMMENDED,
        },
        prizes
      )
      router.push('/admin/collections')
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const canGoStep2 = name.trim().length > 0
  const canGoStep3 = prizeMode !== null
  const canCreate  = !hasPerPage
    ? (hasCompletion ? completionPrize.trim().length > 0 : false)
    : pageDescriptions.some(d => d.trim().length > 0) && (!hasCompletion || completionPrize.trim().length > 0)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20 }}>←</button>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Nueva Colección</h1>
        {/* Step dots */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {([1,2,3] as const).map(s => (
            <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: step >= s ? '#7c3aed' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── STEP 1: Info básica ── */}
      {step === 1 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
              Paso 1 — Información básica
            </div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>Nombre *</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Victoria Secret 2024" autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>Descripción</label>
            <textarea
              style={{ ...inp, resize: 'none' as const, lineHeight: 1.5 }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Descripción opcional de la colección"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button style={btn(false)} onClick={() => router.back()}>Cancelar</button>
            <button style={btn(canGoStep2)} disabled={!canGoStep2} onClick={() => setStep(2)}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Tipo de premio ── */}
      {step === 2 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Paso 2 — Tipo de premios
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            ¿Cómo quieres estructurar los premios de <strong style={{ color: '#fff' }}>{name}</strong>?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(
              [
                { id: 'per_page',   label: 'Premio por página',         desc: 'Cada página tiene su propio premio al completarse' },
                { id: 'completion', label: 'Premio al completar álbum', desc: 'Un único premio al coleccionar todas las fotos' },
                { id: 'both',       label: 'Ambos',                     desc: 'Premios por página y al completar toda la colección' },
              ] as { id: PrizeMode; label: string; desc: string }[]
            ).map(opt => (
              <button
                key={opt.id!}
                onClick={() => setPrizeMode(opt.id)}
                style={{
                  padding: '14px 16px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', border: 'none',
                  background: prizeMode === opt.id ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                  outline: prizeMode === opt.id ? '1.5px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{opt.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button style={btn(true)} onClick={() => setStep(1)}>← Atrás</button>
            <button style={btn(canGoStep3)} disabled={!canGoStep3} onClick={() => setStep(3)}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Configurar premios ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            Paso 3 — Configurar premios
          </div>

          {/* Per page config */}
          {hasPerPage && (
            <div style={card}>
              <div style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
                Premios por página
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.6, marginBottom: 16, marginTop: 0 }}>
                Recomendamos <strong style={{ color: '#fff' }}>10 fotos por página</strong>.
              </p>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                ¿Cuántas páginas tendrá el álbum?
              </label>
              <input
                type="number"
                min={1}
                max={50}
                style={{ ...inp, marginBottom: 10 }}
                value={numPages}
                onChange={e => handlePageCountChange(e.target.value)}
                placeholder="Ej. 4"
              />
              {parsedPages > 0 && (
                <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  Con <strong style={{ color: '#a78bfa' }}>{parsedPages} páginas</strong> × 10 fotos = <strong style={{ color: '#fff' }}>{recommendedPhotos} fotos totales</strong> recomendadas.
                </div>
              )}
              {parsedPages > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: parsedPages }, (_, i) => (
                    <div key={i}>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 5 }}>
                        Premio — Página {i + 1}
                        <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>(fotos {i * 10 + 1}–{(i + 1) * 10})</span>
                      </label>
                      <input
                        style={inp}
                        value={pageDescriptions[i] ?? ''}
                        onChange={e => setPageDesc(i, e.target.value)}
                        placeholder={`Ej. $5 USD en PayPal`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completion prize */}
          {hasCompletion && (
            <div style={card}>
              <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
                Premio al completar álbum
              </div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                Descripción del premio *
              </label>
              <input
                style={inp}
                value={completionPrize}
                onChange={e => setCompletionPrize(e.target.value)}
                placeholder="Ej. Sesión fotográfica exclusiva"
              />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
                El usuario debe enviar screenshot al <a href="https://t.me/kwelps" target="_blank" rel="noopener" style={{ color: '#a78bfa' }}>@kwelps</a> para reclamar.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button style={btn(true)} onClick={() => setStep(2)}>← Atrás</button>
            <button style={btn(canCreate && !loading)} disabled={!canCreate || loading} onClick={handleCreate}>
              {loading ? 'Creando...' : 'Crear colección ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
