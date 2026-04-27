import { getWallet, getTransactionHistory } from '@/lib/actions/wallet'
import Link from 'next/link'
import { DepositForm } from './deposit-form'
import { RelativeTime } from '@/components/ui/relative-time'

export const dynamic = 'force-dynamic'

const typeLabels: Record<string, string> = {
  DEPOSIT: 'Depósito',
  PACK_PURCHASE: 'Compra de Pack',
  SINGLE_PURCHASE: 'Compra Individual',
}

export default async function WalletPage() {
  const wallet = await getWallet()
  const transactions = await getTransactionHistory(50)

  if (!wallet) {
    return (
      <div style={{ padding: '54px 16px 16px', color: 'var(--ink)', textAlign: 'center', fontSize: 12 }}>
        No se encontró la wallet
      </div>
    )
  }

  const balance = Number(wallet.balance)

  const totalDeposited = transactions
    .filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalSpent = transactions
    .filter(t => t.type !== 'DEPOSIT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  return (
    <div style={{ color: 'var(--ink)', paddingTop: '54px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
          ←
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          Mi Wallet
        </div>
        <div style={{ width: 28 }} />
      </div>

      <div style={{ padding: '8px 16px 30px' }}>

        {/* Masthead */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            Wallet
          </div>
          <Link href="/store" style={{ textDecoration: 'none', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--wine)', borderBottom: '1px solid var(--wine)', paddingBottom: 2 }}>
            Ir a tienda →
          </Link>
        </div>

        {/* Balance hero card */}
        <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '20px 18px', borderRadius: 2, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)' }}>
                Balance Actual
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontStyle: 'italic', fontWeight: 400, lineHeight: 1, marginTop: 6, letterSpacing: '-0.02em' }}>
              ${balance.toFixed(2)}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(250,247,242,0.6)', marginTop: 6, letterSpacing: '0.05em' }}>
              Kwelps Coins · disponibles
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 18 }}>
          {[
            { label: 'Depositado', value: `$${totalDeposited.toFixed(2)}`, tone: 'var(--wine)' },
            { label: 'Gastado',    value: `$${totalSpent.toFixed(2)}`,     tone: 'var(--wine)' },
            { label: 'Transacc.',  value: String(transactions.length),     tone: 'var(--ink)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 8px', background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.12)', borderRadius: 2 }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.55)' }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', fontWeight: 500, marginTop: 3, color: s.tone, lineHeight: 1 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Deposit form (PayPal + Telegram) */}
        <DepositForm currentBalance={balance} />

        {/* Transaction history */}
        <div style={{ padding: 14, background: 'var(--paper-card)', border: '0.5px solid rgba(26,20,24,0.15)', borderRadius: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,20,24,0.6)' }}>Historial</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 2 }}>
                Transacciones
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(26,20,24,0.5)' }}>
              {transactions.length} items
            </div>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11, color: 'rgba(26,20,24,0.45)' }}>
              No hay transacciones aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {transactions.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? '0.5px solid rgba(26,20,24,0.08)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{typeLabels[tx.type] ?? tx.type}</div>
                    <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(26,20,24,0.5)', marginTop: 2, letterSpacing: '0.05em' }}>
                      <RelativeTime date={tx.createdAt} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontStyle: 'italic', fontWeight: 500, color: tx.type === 'DEPOSIT' ? 'var(--ink)' : 'var(--wine)', lineHeight: 1 }}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}${Math.abs(Number(tx.amount)).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 7, color: 'rgba(26,20,24,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3, fontWeight: 700 }}>
                      {tx.status === 'COMPLETED' ? 'Completado' : tx.status === 'PENDING' ? 'Pendiente' : 'Fallido'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
