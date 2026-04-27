import { RegisterForm } from '@/components/auth/register-form'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'var(--paper)' }}>

      {/* Decorative blurred shelf background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, padding: 20, filter: 'blur(10px)', opacity: 0.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontStyle: 'italic', color: 'var(--ink)' }}>Kwelps</div>
            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ink)' }}>Vol. 01</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['var(--blush)', 'var(--ink)', '#2a1e22', 'var(--rose)'] as string[]).map((bg, i) => (
              <div key={i} style={{ aspectRatio: '0.7', background: bg, borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,24,0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 390, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ background: 'var(--paper)', borderRadius: 3, boxShadow: '0 40px 80px rgba(26,20,24,0.5)', overflow: 'hidden' }}>

          {/* Ornamental header strip */}
          <div style={{ background: 'var(--ink)', color: 'var(--rose)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Crear cuenta</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.1em', color: 'rgba(232,164,164,0.7)' }}>Kwelps · 2026</div>
          </div>

          <div style={{ padding: '24px 22px 28px' }}>

            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--wine)', marginBottom: 8 }}>
                Un regalo para ti
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic', fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.03em' }}>
                Bienvenida
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.03em', color: 'var(--wine)', marginBottom: 14 }}>
                al álbum
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(26,20,24,0.15)' }} />
                <div style={{ fontSize: 12, color: 'rgba(26,20,24,0.4)' }}>❦</div>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(26,20,24,0.15)' }} />
              </div>

              {/* Gift highlight */}
              <div style={{ padding: '14px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 2, marginBottom: 14 }}>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)', marginBottom: 4 }}>Tu crédito de bienvenida</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontStyle: 'italic', fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  $2.00<span style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontStyle: 'normal', fontWeight: 700, letterSpacing: '0.3em', marginLeft: 6, color: 'var(--rose)', verticalAlign: 'middle' }}>USD</span>
                </div>
                <div style={{ fontSize: 9, marginTop: 4, color: 'rgba(250,247,242,0.6)', letterSpacing: '0.05em' }}>Para probar tu suerte en la tienda</div>
              </div>
            </div>

            <RegisterForm />

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(26,20,24,0.55)' }}>¿Ya tienes cuenta? </span>
              <Link href="/login" style={{ fontSize: 10, fontWeight: 700, color: 'var(--wine)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                Inicia sesión
              </Link>
            </div>

            <div style={{ marginTop: 14, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(26,20,24,0.35)', letterSpacing: '0.1em' }}>
              ¡Buena suerte, coleccionista!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
