import { NextResponse } from 'next/server'
import { getSummaryStats } from '@/lib/actions/analytics'

export async function GET() {
  try {
    const stats = await getSummaryStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching summary stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary statistics' },
      { status: 500 }
    )
  }
}