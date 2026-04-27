import { getWallet } from '@/lib/actions/wallet'
import Link from 'next/link'
import { DepositForm } from './deposit-form'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const wallet = await getWallet()

  if (!wallet) {
    return (
      <div style={{ padding: '54px 16px 16px', color: 'var(--ink)', textAlign: 'center', fontSize: 12 }}>
        No se encontró la wallet
      </div>
    )
  }

  const balance = Number(wallet.balance)

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
        <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '20px 18px', borderRadius: 2, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--rose)' }}>
              Balance Actual
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontStyle: 'italic', fontWeight: 400, lineHeight: 1, marginTop: 6, letterSpacing: '-0.02em' }}>
              ${balance.toFixed(2)}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(250,247,242,0.6)', marginTop: 6, letterSpacing: '0.05em' }}>
              Kwelps Coins · disponibles
            </div>
          </div>
        </div>

        {/* Deposit form (PayPal + Telegram) */}
        <DepositForm currentBalance={balance} />

      </div>
    </div>
  )
}
