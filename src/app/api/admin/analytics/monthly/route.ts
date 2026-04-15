import { NextRequest, NextResponse } from 'next/server'
import { getMonthlyStats } from '@/lib/actions/analytics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const stats = await getMonthlyStats(year)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly statistics' },
      { status: 500 }
    )
  }
}