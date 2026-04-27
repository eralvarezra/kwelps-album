import { BottomNav } from '@/components/layout/bottom-nav'
import { PageTransition } from '@/components/layout/page-transition'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <main style={{
        maxWidth: '430px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: '80px',
      }}>
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <BottomNav />
    </div>
  )
}
