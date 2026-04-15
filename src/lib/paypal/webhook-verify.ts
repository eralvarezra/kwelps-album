import crypto from 'crypto'

/**
 * PayPal Webhook Signature Verification
 *
 * Verifies that webhook requests actually come from PayPal by checking
 * the cryptographic signature against PayPal's public certificate.
 *
 * @see https://developer.paypal.com/api/rest/webhooks/rest/
 */

// Certificate cache with 1-hour TTL to avoid repeated downloads
const certCache = new Map<string, { cert: string; expiresAt: number }>()

export interface WebhookHeaders {
  transmissionId: string
  transmissionTime: string
  certUrl: string
  transmissionSig: string
  authAlgo: string
}

/**
 * Calculate CRC32 checksum of the raw body (returns decimal form)
 * PayPal requires the CRC32 to be in decimal, not hexadecimal
 */
function calculateCrc32(rawBody: string): number {
  // CRC32 lookup table
  const crc32Table: number[] = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crc32Table.push(c)
  }

  // Calculate CRC32
  let crc = 0xffffffff
  for (let i = 0; i < rawBody.length; i++) {
    crc = crc32Table[(crc ^ rawBody.charCodeAt(i)) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Download and cache PayPal certificate
 *
 * Validates that the certificate URL is from a PayPal domain to prevent
 * certificate injection attacks.
 */
async function getCertificate(certUrl: string): Promise<string> {
  // Security: Validate cert URL is from PayPal domain
  try {
    const url = new URL(certUrl)
    const validDomains = ['.paypal.com', '.paypalobjects.com']
    const isValidDomain = validDomains.some(domain =>
      url.hostname.endsWith(domain)
    )

    if (!isValidDomain) {
      throw new Error(`Invalid certificate URL: must be from PayPal domain, got ${url.hostname}`)
    }
  } catch {
    throw new Error('Invalid certificate URL format')
  }

  // Check cache
  const cached = certCache.get(certUrl)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.cert
  }

  // Download certificate
  const response = await fetch(certUrl)
  if (!response.ok) {
    throw new Error(`Failed to download certificate: ${response.status}`)
  }

  const cert = await response.text()

  // Cache for 1 hour
  certCache.set(certUrl, {
    cert,
    expiresAt: Date.now() + 60 * 60 * 1000,
  })

  return cert
}

/**
 * Verify PayPal webhook signature
 *
 * @param rawBody - The raw request body as a string (must be exact, before JSON parsing)
 * @param headers - The PayPal signature headers from the request
 * @param webhookId - Your webhook ID from PayPal Developer Portal
 * @returns Object with verified boolean and optional error message
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headers: WebhookHeaders,
  webhookId: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    // Validate webhook ID is provided
    if (!webhookId) {
      return { verified: false, error: 'PAYPAL_WEBHOOK_ID not configured' }
    }

    // 1. Calculate CRC32 of raw body (decimal form)
    const crc = calculateCrc32(rawBody)

    // 2. Construct the expected message string
    // Format: transmissionId|transmissionTime|webhookId|crc32
    const message = `${headers.transmissionId}|${headers.transmissionTime}|${webhookId}|${crc}`

    // 3. Get PayPal's certificate
    const certPem = await getCertificate(headers.certUrl)

    // 4. Decode signature from base64
    const signatureBuffer = Buffer.from(headers.transmissionSig, 'base64')

    // 5. Verify signature using RSA-SHA256
    const verifier = crypto.createVerify('SHA256')
    verifier.update(message)
    verifier.end()

    const verified = verifier.verify(certPem, signatureBuffer)

    return { verified }
  } catch (error) {
    console.error('PayPal webhook verification error:', error)
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    }
  }
}

/**
 * Extract PayPal webhook headers from a Next.js Request
 *
 * Required headers:
 * - paypal-transmission-id
 * - paypal-transmission-time
 * - paypal-cert-url
 * - paypal-transmission-sig
 * - paypal-auth-algo (optional, defaults to SHA256withRSA)
 */
export function extractPayPalHeaders(request: Request): WebhookHeaders | null {
  const transmissionId = request.headers.get('paypal-transmission-id')
  const transmissionTime = request.headers.get('paypal-transmission-time')
  const certUrl = request.headers.get('paypal-cert-url')
  const transmissionSig = request.headers.get('paypal-transmission-sig')
  const authAlgo = request.headers.get('paypal-auth-algo') || 'SHA256withRSA'

  // All required headers must be present
  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
    console.error('PayPal webhook missing required headers:', {
      hasTransmissionId: !!transmissionId,
      hasTransmissionTime: !!transmissionTime,
      hasCertUrl: !!certUrl,
      hasTransmissionSig: !!transmissionSig,
    })
    return null
  }

  return {
    transmissionId,
    transmissionTime,
    certUrl,
    transmissionSig,
    authAlgo,
  }
}

/**
 * Verify that a webhook event type should be processed
 */
export function isRelevantEventType(eventType: string): boolean {
  const relevantTypes = [
    'CHECKOUT.ORDER.COMPLETED',
    'CHECKOUT.ORDER.APPROVED',
    'PAYMENT.CAPTURE.COMPLETED',
    'PAYMENT.CAPTURE.DENIED',
  ]
  return relevantTypes.includes(eventType)
}