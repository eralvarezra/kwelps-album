import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function resetBalances() {
  console.log('🔄 Reseteando balances y transacciones...\n')

  try {
    // 1. Eliminar todas las transacciones
    const deletedTransactions = await prisma.transaction.deleteMany()
    console.log(`✅ Transacciones eliminadas: ${deletedTransactions.count}`)

    // 2. Resetear balances de wallets a 0
    const updatedWallets = await prisma.wallet.updateMany({
      data: {
        balance: 0,
        adminBalance: 0,
      },
    })
    console.log(`✅ Wallets reseteadas: ${updatedWallets.count}`)

    // 3. Resetear contadores de pity
    const updatedPity = await prisma.pityCounter.updateMany({
      data: {
        legendaryCounter: 0,
        lastPullAt: null,
      },
    })
    console.log(`✅ Pity counters reseteados: ${updatedPity.count}`)

    // 4. Eliminar fotos de usuarios (cards obtenidas)
    const deletedUserPhotos = await prisma.userPhoto.deleteMany()
    console.log(`✅ UserPhotos eliminadas: ${deletedUserPhotos.count}`)

    // 5. Mostrar estado actual
    console.log('\n📊 Estado actual:')

    const users = await prisma.user.findMany({
      include: {
        wallet: true,
        _count: {
          select: { transactions: true },
        },
      },
    })

    console.log('\nUsuarios:')
    for (const user of users) {
      console.log(`  - ${user.email}: Balance $${user.wallet?.balance || 0}, Transacciones: ${user._count.transactions}`)
    }

    console.log('\n✅ Reset completado!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

resetBalances()