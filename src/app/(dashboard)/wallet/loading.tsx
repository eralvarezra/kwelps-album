export default function WalletLoading() {
  return (
    <div style={{ paddingTop: 54, color: 'var(--ink)' }}>
      {/* Hero balance */}
      <div style={{ padding: '24px 16px 20px', borderBottom: '0.5px solid rgba(26,20,24,0.1)', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 100, height: 10, margin: '0 auto 12px' }} />
        <div className="skeleton" style={{ width: 160, height: 64, margin: '0 auto 8px' }} />
        <div className="skeleton" style={{ width: 80, height: 10, margin: '0 auto' }} />
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="skeleton" style={{ height: 60, borderRadius: 2 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 2 }} />
        </div>

        {/* PayPal section */}
        <div className="skeleton" style={{ height: 120, borderRadius: 2 }} />

        {/* Sinpe section */}
        <div className="skeleton" style={{ height: 100, borderRadius: 2 }} />

        {/* Transaction list */}
        <div className="skeleton" style={{ width: 100, height: 10, marginBottom: 4 }} />
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(26,20,24,0.06)' }}>
            <div className="skeleton" style={{ width: 120, height: 10 }} />
            <div className="skeleton" style={{ width: 50, height: 10 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
