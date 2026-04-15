import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getCollection } from '@/lib/actions/collections'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const collection = await getCollection(id)

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    return NextResponse.json(collection)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}