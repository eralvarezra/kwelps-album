import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'

export default function LoginPage() {
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
            {(['var(--ink)', 'var(--blush)', 'var(--rose)', '#2a1e22'] as string[]).map((bg, i) => (
              <div key={i} style={{ aspectRatio: '0.7', background: bg, borderRadius: 2 }} />
            ))}
          </div>
        </div>
        {/* Dim overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,24,0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 390, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ background: 'var(--paper)', borderRadius: 3, boxShadow: '0 40px 80px rgba(26,20,24,0.5)', overflow: 'hidden' }}>

          {/* Ornamental header strip */}
          <div style={{ background: 'var(--ink)', color: 'var(--rose)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Iniciar sesión</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.1em', color: 'rgba(232,164,164,0.7)' }}>Kwelps · 2026</div>
          </div>

          <div style={{ padding: '24px 22px 28px' }}>

            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--wine)', marginBottom: 8 }}>
                Tu colección te espera
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic', fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.03em' }}>
                Bienvenida
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.03em', color: 'var(--wine)', marginBottom: 14 }}>
                de vuelta
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(26,20,24,0.15)' }} />
                <div style={{ fontSize: 12, color: 'rgba(26,20,24,0.4)' }}>❦</div>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(26,20,24,0.15)' }} />
              </div>
            </div>

            <LoginForm />

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(26,20,24,0.55)' }}>¿No tienes cuenta? </span>
              <Link href="/register" style={{ fontSize: 10, fontWeight: 700, color: 'var(--wine)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                Regístrate
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
