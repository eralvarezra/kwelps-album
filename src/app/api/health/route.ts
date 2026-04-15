import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  checks: {
    database: { status: string; latency?: number; error?: string }
    environment: { status: string; missing?: string[] }
  }
}

/**
 * Health check endpoint for monitoring and load balancers
 *
 * GET /api/health
 *
 * Returns:
 * - 200 if all checks pass (healthy)
 * - 503 if any critical check fails (unhealthy)
 */
export async function GET() {
  const startTime = Date.now()
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'checking' },
    environment: { status: 'checking' },
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart
    checks.database = {
      status: 'healthy',
      latency: dbLatency,
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }

  // Check required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_WEBHOOK_ID',
  ]

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  )

  checks.environment = {
    status: missingEnvVars.length === 0 ? 'healthy' : 'degraded',
    missing: missingEnvVars.length > 0 ? missingEnvVars : undefined,
  }

  // Determine overall status
  let overallStatus: HealthCheckResult['status'] = 'healthy'

  if (checks.database.status === 'unhealthy') {
    overallStatus = 'unhealthy'
  } else if (checks.environment.status === 'degraded') {
    overallStatus = 'degraded'
  }

  const response: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  }

  const totalLatency = Date.now() - startTime

  // Add total latency to response headers
  const headers = new Headers({
    'X-Response-Time': `${totalLatency}ms`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  })

  // Return 503 if unhealthy, 200 otherwise
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, { status: statusCode, headers })
}