import { NextRequest, NextResponse } from 'next/server'
import { getRecentTransactions } from '@/lib/actions/analytics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const transactions = await getRecentTransactions(limit)
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching recent transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent transactions' },
      { status: 500 }
    )
  }
}