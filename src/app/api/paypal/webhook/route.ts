import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  extractPayPalHeaders,
  isRelevantEventType,
} from '@/lib/paypal/webhook-verify'

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID

// PayPal webhook handler with signature verification
export async function POST(request: Request) {
  try {
    // 1. Get raw body BEFORE parsing JSON (critical for CRC32 calculation)
    const rawBody = await request.text()

    // 2. Extract PayPal signature headers
    const headers = extractPayPalHeaders(request)
    if (!headers) {
      console.error('PayPal webhook: missing required signature headers')
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      )
    }

    // 3. Verify webhook signature (CRITICAL SECURITY CHECK)
    if (!WEBHOOK_ID) {
      console.error('CRITICAL: PAYPAL_WEBHOOK_ID environment variable not set')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    const { verified, error: verifyError } = await verifyWebhookSignature(
      rawBody,
      headers,
      WEBHOOK_ID
    )

    if (!verified) {
      console.error('PayPal webhook signature verification failed:', verifyError)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 4. Parse JSON from raw body (after signature verification)
    const body = JSON.parse(rawBody)

    // 5. Check if event type is relevant
    const eventType = body.event_type
    if (!isRelevantEventType(eventType)) {
      return NextResponse.json({ status: 'ignored', reason: 'event_type not relevant' })
    }

    // 6. Process the webhook event
    if (eventType === 'CHECKOUT.ORDER.COMPLETED') {
      const order = body.resource
      const orderId = order.id

      // Check if we already processed this order (idempotency)
      const existingTransaction = await prisma.transaction.findFirst({
        where: { paypalOrderId: orderId },
      })

      if (existingTransaction) {
        return NextResponse.json({ status: 'already_processed' })
      }

      // Extract details
      const purchaseUnit = order.purchase_units?.[0]
      const amount = parseFloat(purchaseUnit?.amount?.value || '0')
      const userId = purchaseUnit?.custom_id

      if (!userId || amount <= 0) {
        return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
      }

      // Process the deposit in a transaction
      await prisma.$transaction(async (tx) => {
        // Create transaction
        await tx.transaction.create({
          data: {
            userId,
            type: 'DEPOSIT',
            amount,
            status: 'COMPLETED',
            paypalOrderId: orderId,
            source: 'PAYPAL',
          },
        })

        // Update wallet
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: amount } },
        })
      })

      return NextResponse.json({ status: 'processed' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}