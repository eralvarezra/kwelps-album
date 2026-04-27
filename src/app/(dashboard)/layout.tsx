import { BottomNav } from '@/components/layout/bottom-nav'
import { SideNav } from '@/components/layout/side-nav'
import { PageTransition } from '@/components/layout/page-transition'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-shell" style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <SideNav />
      <main className="dashboard-main" style={{
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
