export default function CollectionsLoading() {
  return (
    <div style={{ color: 'var(--ink)', paddingTop: '54px' }}>
      {/* Masthead */}
      <div style={{ padding: '10px 16px 14px', borderBottom: '0.5px solid rgba(26,20,24,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.4em' }}>KWELPS</div>
          <div className="skeleton" style={{ width: 70, height: 28, borderRadius: 100 }} />
        </div>
        <div className="skeleton" style={{ width: 180, height: 36, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 140, height: 12 }} />
      </div>

      <div style={{ padding: '14px 16px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div className="skeleton" style={{ width: 70, height: 10 }} />
          <div className="skeleton" style={{ width: 50, height: 10 }} />
        </div>

        {/* 2×2 grid of cover skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', aspectRatio: '3/4.2', borderRadius: 4 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
