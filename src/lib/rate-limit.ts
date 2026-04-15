/**
 * Rate Limiting System
 *
 * Provides in-memory rate limiting for API routes and server actions.
 * Uses sliding window algorithm with configurable limits per endpoint.
 *
 * For production, consider using Redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

// In-memory store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval to prevent memory leaks (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Predefined rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limit to prevent brute force
  AUTH: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute

  // User creation - moderate limit
  USER_CREATE: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute

  // PayPal endpoints - moderate limit
  PAYPAL: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute

  // Gacha purchases - higher limit for normal gameplay
  GACHA: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute

  // Admin endpoints - higher limit for trusted users
  ADMIN: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute

  // Default for unspecified endpoints
  DEFAULT: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
} as const

/**
 * Get client IP from request headers
 *
 * Handles various proxy configurations:
 * - x-forwarded-for (standard proxy header)
 * - x-real-ip (Nginx)
 * - fallback to 'unknown' if not available
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, use the first one
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return 'unknown'
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter: number // Seconds until reset
}

/**
 * Check and increment rate limit for a key
 *
 * @param key - Unique identifier (e.g., IP + endpoint)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): RateLimitResult {
  const now = Date.now()
  const resetAt = now + config.windowMs

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // No entry or expired - create new entry
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
      retryAfter: Math.ceil(config.windowMs / 1000),
    }
  }

  // Entry exists and is within window
  if (entry.count >= config.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  }
}

/**
 * Create rate limit key for IP-based limiting
 */
export function createIpRateLimitKey(ip: string, endpoint: string): string {
  return `ip:${ip}:${endpoint}`
}

/**
 * Create rate limit key for user-based limiting
 */
export function createUserIdRateLimitKey(userId: string, endpoint: string): string {
  return `user:${userId}:${endpoint}`
}

/**
 * Higher-order function to add rate limiting to API routes
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: Request) => {
 *     // Your handler code
 *   },
 *   RATE_LIMITS.PAYPAL
 * )
 * ```
 */
export function withRateLimit<T extends Request>(
  handler: (request: T) => Promise<Response>,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT,
  endpoint: string = 'default'
): (request: T) => Promise<Response> {
  return async (request: T): Promise<Response> => {
    const ip = getClientIp(request)
    const key = createIpRateLimitKey(ip, endpoint)
    const result = checkRateLimit(key, config)

    // Add rate limit headers
    const headers = new Headers({
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    })

    if (!result.allowed) {
      headers.set('Retry-After', String(result.retryAfter))
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers),
          },
        }
      )
    }

    const response = await handler(request)

    // Add rate limit headers to response
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Rate limit check for server actions (user-based)
 *
 * @param userId - The authenticated user's ID
 * @param action - The action name (e.g., 'purchasePack')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkUserRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): RateLimitResult {
  const key = createUserIdRateLimitKey(userId, action)
  return checkRateLimit(key, config)
}

/**
 * Throw an error if rate limited (for server actions)
 *
 * @throws Error with message containing retryAfter
 */
export function enforceRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): void {
  const result = checkUserRateLimit(userId, action, config)
  if (!result.allowed) {
    throw new Error(
      `Rate limit exceeded. Please wait ${result.retryAfter} seconds before trying again.`
    )
  }
}