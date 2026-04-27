export default function DashboardLoading() {
  return (
    <div style={{ paddingTop: 54, color: 'var(--ink)' }}>
      {/* Top bar */}
      <div style={{ padding: '10px 16px 14px', borderBottom: '0.5px solid rgba(26,20,24,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: 100, height: 12 }} />
        </div>
        <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 100 }} />
      </div>

      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Masthead */}
        <div>
          <div className="skeleton" style={{ width: 60, height: 9, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '80%', height: 44, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '60%', height: 44 }} />
        </div>

        {/* Hero collection card */}
        <div className="skeleton" style={{ height: 220, borderRadius: 3 }} />

        {/* CTA pair */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="skeleton" style={{ height: 44, borderRadius: 2 }} />
          <div className="skeleton" style={{ height: 44, borderRadius: 2 }} />
        </div>

        {/* Section header */}
        <div className="skeleton" style={{ width: 80, height: 9 }} />

        {/* Other collections list */}
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(26,20,24,0.06)' }}>
            <div className="skeleton" style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 2 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <div className="skeleton" style={{ width: '70%', height: 12 }} />
              <div className="skeleton" style={{ width: '50%', height: 9 }} />
              <div className="skeleton" style={{ height: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
