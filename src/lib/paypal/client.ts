// PayPal configuration using REST API directly

const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get PayPal access token using OAuth2
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token')
  }

  const data = await response.json()

  // Cache token (subtract 60 seconds for safety margin)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return data.access_token
}

/**
 * Create a PayPal order for wallet deposit
 */
export async function createOrder(amount: number, userId: string): Promise<{ orderId: string; approvalUrl: string }> {
  const accessToken = await getAccessToken()

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating PayPal order - amount:', amount)
  }

  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
        description: `Kwelps Album - Wallet Deposit`,
        custom_id: userId,
      },
    ],
    application_context: {
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paypal/capture`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?payment=cancelled`,
      brand_name: 'Kwelps Album',
    },
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  })

  if (!response.ok) {
    const error = await response.text()
    // Log error details only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('PayPal create order error:', error)
    }
    throw new Error(`Failed to create PayPal order: ${response.status}`)
  }

  const data = await response.json()

  // Find the approval URL
  const approvalLink = data.links?.find((link: { rel: string; href: string }) => link.rel === 'approve')
  const approvalUrl = approvalLink?.href || ''

  return {
    orderId: data.id,
    approvalUrl,
  }
}

/**
 * Capture a PayPal order after user approval
 */
export async function captureOrder(orderId: string): Promise<{
  success: boolean
  amount: number
  customId: string
}> {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    // Log error details only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('PayPal capture order error:', error)
    }
    throw new Error(`Failed to capture PayPal order: ${response.status}`)
  }

  const data = await response.json()

  // Extract purchase unit details
  const purchaseUnit = data.purchase_units?.[0]

  // The custom_id might be in different places depending on PayPal's response
  let customId = purchaseUnit?.custom_id || purchaseUnit?.payments?.captures?.[0]?.custom_id || ''

  // Amount might also be in different places
  let amount = parseFloat(purchaseUnit?.amount?.value || '0')
  if (amount === 0) {
    amount = parseFloat(purchaseUnit?.payments?.captures?.[0]?.amount?.value || '0')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('PayPal capture successful - orderId:', orderId, 'amount:', amount)
  }

  return {
    success: data.status === 'COMPLETED',
    amount,
    customId,
  }
}

/**
 * Verify a PayPal order by fetching its details
 */
export async function verifyOrder(orderId: string): Promise<{
  status: string
  amount: number
  customId: string
}> {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to verify PayPal order')
  }

  const data = await response.json()
  const purchaseUnit = data.purchase_units?.[0]

  return {
    status: data.status,
    amount: parseFloat(purchaseUnit?.amount?.value || '0'),
    customId: purchaseUnit?.custom_id || '',
  }
}