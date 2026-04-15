'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type MonthlyStats = {
  month: string
  year: number
  monthNumber: number
  totalDeposits: number
  paypalDeposits: number
  adminDeposits: number
  transactionCount: number
  paypalCount: number
  adminCount: number
}

type SummaryStats = {
  currentMonth: { total: number; count: number }
  lastMonth: { total: number; count: number }
  allTime: { total: number; count: number }
  percentChange: number
}

type RecentTransaction = {
  id: string
  userId: string
  userEmail: string
  amount: number
  source: string
  paypalOrderId: string | null
  createdAt: string
}

export default function ReportsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [chartView, setChartView] = useState<'bar' | 'line'>('bar')

  useEffect(() => {
    loadStats()
  }, [selectedYear])

  async function loadStats() {
    setLoading(true)
    try {
      const [monthlyRes, summaryRes, recentRes] = await Promise.all([
        fetch(`/api/admin/analytics/monthly?year=${selectedYear}`),
        fetch('/api/admin/analytics/summary'),
        fetch('/api/admin/analytics/recent'),
      ])

      if (monthlyRes.ok) {
        const data = await monthlyRes.json()
        setMonthlyStats(data)
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummaryStats(data)
      }

      if (recentRes.ok) {
        const data = await recentRes.json()
        setRecentTransactions(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate max value for chart scaling
  const maxValue = Math.max(...monthlyStats.map(m => m.paypalDeposits), 1)

  return (
    <div className="space-y-4 lg:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Reportes y Analytics</h1>
          <p className="text-sm text-gray-400">Estadísticas de depósitos PayPal</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year} className="bg-gray-800">
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadStats()}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <SummaryCard
            title="Este Mes"
            value={`$${summaryStats.currentMonth.total.toFixed(2)}`}
            subtitle={`${summaryStats.currentMonth.count} transacciones`}
            icon="📊"
          />
          <SummaryCard
            title="Mes Pasado"
            value={`$${summaryStats.lastMonth.total.toFixed(2)}`}
            subtitle={`${summaryStats.lastMonth.count} transacciones`}
            icon="📈"
          />
          <SummaryCard
            title="Total Histórico"
            value={`$${summaryStats.allTime.total.toFixed(2)}`}
            subtitle={`${summaryStats.allTime.count} transacciones`}
            icon="💰"
          />
          <SummaryCard
            title="Cambio Mensual"
            value={`${summaryStats.percentChange >= 0 ? '+' : ''}${summaryStats.percentChange}%`}
            subtitle="vs mes anterior"
            icon={summaryStats.percentChange >= 0 ? '📈' : '📉'}
            highlight={summaryStats.percentChange >= 0}
          />
        </div>
      )}

      {/* Chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
          <h2 className="text-base lg:text-lg font-semibold text-white">Depósitos PayPal por Mes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setChartView('bar')}
              className={`px-3 py-1 rounded-lg text-sm ${
                chartView === 'bar' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
              }`}
            >
              Barras
            </button>
            <button
              onClick={() => setChartView('line')}
              className={`px-3 py-1 rounded-lg text-sm ${
                chartView === 'line' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
              }`}
            >
              Línea
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-48 lg:h-64 flex items-center justify-center text-gray-400">
            Cargando...
          </div>
        ) : (
          <div className="h-48 lg:h-64 flex items-end gap-1 lg:gap-2 overflow-x-auto pb-2">
            {monthlyStats.map((month, index) => (
              <div
                key={index}
                className="flex-1 min-w-[24px] lg:min-w-[30px] flex flex-col items-center gap-1"
              >
                {chartView === 'bar' ? (
                  <BarChart value={month.paypalDeposits} maxValue={maxValue} />
                ) : (
                  <LineChart
                    value={month.paypalDeposits}
                    maxValue={maxValue}
                    index={index}
                    data={monthlyStats}
                  />
                )}
                <span className="text-[10px] lg:text-xs text-gray-500 mt-1 truncate w-full text-center">
                  {month.month.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-white/10">
          <h2 className="text-base lg:text-lg font-semibold text-white">Detalle Mensual</h2>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-white/10">
          {monthlyStats.filter(m => m.totalDeposits > 0).length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Sin datos para mostrar
            </div>
          ) : (
            monthlyStats.filter(m => m.totalDeposits > 0).map((month, index) => (
              <div key={index} className="p-4 hover:bg-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-white">{month.month}</span>
                  <span className="text-lg font-bold text-white">${month.totalDeposits.toFixed(2)}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">PayPal: ${month.paypalDeposits.toFixed(2)}</span>
                  <span className="text-blue-400">Admin: ${month.adminDeposits.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {month.transactionCount} transacciones
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Mes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  PayPal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Trans.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {monthlyStats.map((month, index) => (
                <tr key={index} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-white">
                    {month.month} {month.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-400">
                    ${month.paypalDeposits.toFixed(2)}
                    <span className="text-gray-500 text-sm ml-1">({month.paypalCount})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-blue-400">
                    ${month.adminDeposits.toFixed(2)}
                    <span className="text-gray-500 text-sm ml-1">({month.adminCount})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-white font-medium">
                    ${month.totalDeposits.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">
                    {month.transactionCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-white/10">
          <h2 className="text-base lg:text-lg font-semibold text-white">Transacciones Recientes</h2>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-white/10">
          {recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Sin transacciones
            </div>
          ) : (
            recentTransactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-white/5">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm text-white truncate flex-1">{tx.userEmail}</p>
                  <p className="text-sm font-bold text-green-400 ml-2">
                    +${tx.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    tx.source === 'PAYPAL'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {tx.source}
                  </span>
                  <span className="text-gray-500">
                    {format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Fuente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Order ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                    {format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-white text-sm">
                    {tx.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-400 font-medium text-sm">
                    ${tx.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tx.source === 'PAYPAL'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {tx.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs font-mono">
                    {tx.paypalOrderId ? tx.paypalOrderId.slice(0, 20) + '...' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  highlight,
}: {
  title: string
  value: string
  subtitle: string
  icon: string
  highlight?: boolean
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4">
      <div className="flex items-center gap-2 lg:gap-3">
        <span className="text-xl lg:text-2xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400 truncate">{title}</p>
          <p className={`text-lg lg:text-xl font-bold truncate ${
            highlight === true ? 'text-green-400' : highlight === false ? 'text-red-400' : 'text-white'
          }`}>
            {value}
          </p>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

// Bar Chart Component
function BarChart({ value, maxValue }: { value: number; maxValue: number }) {
  const height = maxValue > 0 ? (value / maxValue) * 100 : 0

  return (
    <div className="w-full flex flex-col items-center justify-end h-32 lg:h-48">
      <span className="text-[10px] lg:text-xs text-gray-400 mb-1">
        {value > 0 ? `$${value.toFixed(0)}` : ''}
      </span>
      <div
        className="w-full max-w-[24px] lg:max-w-[30px] bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-300"
        style={{ height: `${Math.max(height, 2)}%` }}
      />
    </div>
  )
}

// Line Chart Component
function LineChart({
  value,
  maxValue,
  index,
  data,
}: {
  value: number
  maxValue: number
  index: number
  data: MonthlyStats[]
}) {
  const height = maxValue > 0 ? (value / maxValue) * 100 : 0

  return (
    <div className="w-full flex flex-col items-center justify-end h-32 lg:h-48 relative">
      <span className="text-[10px] lg:text-xs text-gray-400 mb-1">
        {value > 0 ? `$${value.toFixed(0)}` : ''}
      </span>
      <div className="w-full max-w-[24px] lg:max-w-[30px] h-28 lg:h-40 flex flex-col justify-end relative">
        <div
          className="w-2 h-2 bg-purple-500 rounded-full mx-auto"
          style={{ marginBottom: `${height}%` }}
        />
        {index > 0 && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              x1="50%"
              y1={`${100 - (maxValue > 0 ? (data[index - 1].paypalDeposits / maxValue) * 100 : 0)}%`}
              x2="50%"
              y2={`${100 - height}%`}
              stroke="rgb(147, 51, 234)"
              strokeWidth="2"
            />
          </svg>
        )}
      </div>
    </div>
  )
}