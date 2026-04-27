export default function AlbumLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--paper)', paddingTop: 54 }}>
      {/* Stats strip */}
      <div style={{ padding: '10px 16px 12px', borderBottom: '0.5px solid rgba(26,20,24,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div className="skeleton" style={{ width: 140, height: 22 }} />
          <div className="skeleton" style={{ width: 40, height: 10 }} />
        </div>
        <div className="skeleton" style={{ height: 2, marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ width: 28, height: 10 }} />)}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '0.5px solid rgba(26,20,24,0.12)', display: 'flex' }}>
        {['Álbum', 'Fusión', 'Legendario'].map((label, i) => (
          <div key={label} style={{ flex: 1, padding: '10px 4px', display: 'flex', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: 48, height: 9 }} />
          </div>
        ))}
      </div>

      {/* Rarity chips */}
      <div style={{ padding: '8px 16px 6px', display: 'flex', gap: 6 }}>
        {[80, 60, 55, 50, 55].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 28, borderRadius: 100, flexShrink: 0 }} />
        ))}
      </div>

      {/* Book skeleton */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 8px', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: '100%', aspectRatio: '0.58', maxHeight: '70vh', borderRadius: 3 }} />
        {/* Page dots */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 0 4px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ width: i === 0 ? 14 : 4, height: 3, borderRadius: 2 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
