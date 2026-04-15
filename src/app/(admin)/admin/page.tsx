import { requireAdmin } from '@/lib/auth/admin'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  FolderOpen,
  Users,
  Image,
  DollarSign,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { CurrentDate } from '@/components/ui/current-date'
import { FormattedDate } from '@/components/ui/formatted-date'

export default async function AdminDashboard() {
  await requireAdmin()

  const [
    collectionCount,
    photoCount,
    userCount,
    photosByRarity,
    totalDeposits,
    recentDeposits,
    activeCollection,
    depositCount,
  ] = await Promise.all([
    prisma.collection.count(),
    prisma.photo.count(),
    prisma.user.count(),
    prisma.photo.groupBy({
      by: ['rarity'],
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { type: 'DEPOSIT', status: 'COMPLETED', source: 'PAYPAL' },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { type: 'DEPOSIT', status: 'COMPLETED' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
      },
    }),
    prisma.collection.findFirst({
      where: { active: true },
      include: { _count: { select: { photos: true } } },
    }),
    prisma.transaction.count({
      where: { type: 'DEPOSIT', status: 'COMPLETED', source: 'PAYPAL' },
    }),
  ])

  const depositTotal = Number(totalDeposits._sum.amount || 0)

  const rarityConfig: Record<string, { bg: string; border: string; text: string }> = {
    COMMON: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' },
    RARE: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
    EPIC: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
    LEGENDARY: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          <CurrentDate />
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Depósitos</p>
              <p className="text-3xl font-bold text-green-400">${depositTotal.toFixed(2)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="glass rounded-xl p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Depósitos</p>
              <p className="text-3xl font-bold text-white">{depositCount}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="glass rounded-xl p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Usuarios</p>
              <p className="text-3xl font-bold text-white">{userCount}</p>
            </div>
            <Users className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="glass rounded-xl p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Fotos en Plataforma</p>
              <p className="text-3xl font-bold text-white">{photoCount}</p>
            </div>
            <Activity className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white shadow-lg shadow-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Colecciones</p>
              <p className="text-3xl font-bold">{collectionCount}</p>
            </div>
            <FolderOpen className="w-10 h-10 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Colección Activa</p>
              <p className="text-3xl font-bold">{activeCollection?._count.photos || 0}</p>
            </div>
            <Image className="w-10 h-10 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Collection */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-purple-400" />
            Colección Activa
          </h2>
          {activeCollection ? (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-white">{activeCollection.name}</h3>
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-sm font-medium">
                  Activa
                </span>
              </div>
              <p className="text-gray-400 mb-4">{activeCollection._count.photos} fotos disponibles</p>
              <Link
                href={`/admin/collections/${activeCollection.id}/photos`}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Gestionar fotos →
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">No hay colecciones activas</p>
              <Link
                href="/admin/collections"
                className="text-purple-400 hover:text-purple-300 text-sm mt-2 block"
              >
                Activar una colección →
              </Link>
            </div>
          )}
        </div>

        {/* Photos by Rarity */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Fotos por Rareza</h2>
          <div className="grid grid-cols-2 gap-3">
            {photosByRarity.map((item) => {
              const config = rarityConfig[item.rarity]
              return (
                <div
                  key={item.rarity}
                  className={`rounded-xl p-4 border ${config.bg} ${config.border}`}
                >
                  <p className={`text-sm font-medium ${config.text}`}>{item.rarity}</p>
                  <p className="text-2xl font-bold text-white">{item._count}</p>
                  <p className="text-xs text-gray-500">
                    {item.rarity === 'COMMON' ? '55%' : item.rarity === 'RARE' ? '35%' : item.rarity === 'EPIC' ? '8.5%' : '1.5%'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Deposits */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Depósitos Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Usuario</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Monto</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fuente</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentDeposits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                    No hay depósitos aún
                  </td>
                </tr>
              ) : (
                recentDeposits.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5">
                    <td className="px-5 py-4 text-sm text-gray-300">{tx.user.email}</td>
                    <td className="px-5 py-4 text-sm font-medium text-green-400">
                      +${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-lg text-xs ${
                        tx.source === 'ADMIN'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {tx.source === 'ADMIN' ? 'Admin' : 'PayPal'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      <FormattedDate date={tx.createdAt} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/collections/new"
            className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-4 rounded-xl hover:bg-blue-500/20 transition-colors text-center"
          >
            <FolderOpen className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Nueva Colección</span>
          </Link>
          <Link
            href="/admin/photos"
            className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl hover:bg-green-500/20 transition-colors text-center"
          >
            <Image className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Ver Fotos</span>
          </Link>
          <Link
            href="/admin/users"
            className="bg-purple-500/10 border border-purple-500/30 text-purple-400 p-4 rounded-xl hover:bg-purple-500/20 transition-colors text-center"
          >
            <Users className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Usuarios</span>
          </Link>
          <Link
            href="/admin/collections"
            className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-xl hover:bg-yellow-500/20 transition-colors text-center"
          >
            <Activity className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Estadísticas</span>
          </Link>
        </div>
      </div>
    </div>
  )
}