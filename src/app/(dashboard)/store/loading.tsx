export default function StoreLoading() {
  return (
    <div style={{ paddingTop: 54, color: 'var(--ink)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 14px', borderBottom: '0.5px solid rgba(26,20,24,0.1)' }}>
        <div className="skeleton" style={{ width: 80, height: 36, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: 120, height: 11 }} />
      </div>

      <div style={{ padding: '14px 16px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Collection chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[90, 70, 80].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 30, borderRadius: 2, flexShrink: 0 }} />
          ))}
        </div>

        {/* Pity card */}
        <div className="skeleton" style={{ height: 80, borderRadius: 2 }} />

        {/* Pack cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="skeleton" style={{ height: 160, borderRadius: 2 }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 2 }} />
        </div>

        {/* Odds table */}
        <div className="skeleton" style={{ height: 100, borderRadius: 2 }} />
      </div>
    </div>
  )
}
