/**
 * In-memory sliding-window rate limiter for API routes.
 *
 * Tracks requests by route and trusted client identifier. Old entries are
 * cleaned up periodically to avoid memory leaks.
 */

interface RateLimitEntry {
  timestamps: number[]
  /** Current reset time in ms since epoch (when the oldest window slot expires) */
  resetTime: number
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Window size in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  /** Seconds until the next request is allowed (0 if success) */
  retryAfter: number
  /** Maximum requests allowed (for headers) */
  limit: number
  /** Remaining requests in the current window */
  remaining: number
}

/** Default limits for general API routes */
const DEFAULT_OPTIONS: RateLimitOptions = {
  maxRequests: 60,
  windowMs: 60_000, // 1 minute
}

const store = new Map<string, RateLimitEntry>()

/** Periodic cleanup — runs every 60 seconds */
const CLEANUP_INTERVAL = 60_000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      // Remove entries where all timestamps are expired
      entry.timestamps = entry.timestamps.filter((t) => t > now - entry.resetTime)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Allow the timer to not block process exit
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

/**
 * Extract a client identifier from the request.
 * Prefer platform-provided connection identity; do not trust the first
 * x-forwarded-for value because clients can forge it.
 */
function getClientIp(req: Request): string {
  // Vercel and most managed runtimes expose the connection IP here.
  const connectionIp = (req as Request & { ip?: string }).ip
  if (connectionIp) return connectionIp

  // x-real-ip is set by the trusted reverse proxy in supported deployments.
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()

  // Never use the client-controlled x-forwarded-for value as an identity.
  // Use a stable fallback for local development instead.
  const ua = req.headers.get("user-agent") || "unknown"
  return `local-${ua.slice(0, 50)}`
}

/**
 * Rate limit a request.
 *
 * @param req - The incoming Request object
 * @param options - Rate limit configuration (max requests + window)
 * @returns Result indicating success/failure with metadata
 */
export async function rateLimit(
  req: Request,
  options: Partial<RateLimitOptions> = {}
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = { ...DEFAULT_OPTIONS, ...options }

  startCleanup()

  const ip = getClientIp(req)
  const route = new URL(req.url).pathname
  const key = `rl:${route}:${ip}`
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [], resetTime: windowMs }
    store.set(key, entry)
  }

  // Purge expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  // Check if limit exceeded
  if (entry.timestamps.length >= maxRequests) {
    // Calculate when the oldest timestamp expires
    const oldest = entry.timestamps[0]
    const retryAfterMs = oldest + windowMs - now
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000))

    return {
      success: false,
      retryAfter,
      limit: maxRequests,
      remaining: 0,
    }
  }

  // Record this request
  entry.timestamps.push(now)

  return {
    success: true,
    retryAfter: 0,
    limit: maxRequests,
    remaining: maxRequests - entry.timestamps.length,
  }
}

/**
 * Helper to apply rate limiting to a route handler.
 * Returns a 429 response if the limit is exceeded, otherwise continues.
 *
 * Usage:
 * ```ts
 * export async function POST(req: Request) {
 *   const limit = await applyRateLimit(req, { maxRequests: 5, windowMs: 3600000 })
 *   if (limit) return limit
 *   // ... handler logic
 * }
 * ```
 *
 * @returns A 429 Response if rate-limited, or null if OK to proceed
 */
export async function applyRateLimit(
  req: Request,
  options: Partial<RateLimitOptions> = {}
): Promise<Response | null> {
  const result = await rateLimit(req, options)

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter: result.retryAfter }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  return null
}
