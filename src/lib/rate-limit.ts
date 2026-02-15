/**
 * In-memory sliding-window rate limiter
 * Used to protect auth endpoints from brute-force and spam attacks.
 * No external dependencies — uses a Map with automatic cleanup.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Periodic cleanup interval (5 minutes) to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimers = new Map<string, NodeJS.Timeout>();

/**
 * Creates a rate limiter instance with the given configuration.
 * Each limiter has its own store keyed by a name, so different
 * endpoints can have independent limits.
 *
 * @param name - Unique name for this limiter (e.g., 'auth-pin')
 * @param config - Rate limit configuration
 */
export function createRateLimiter(name: string, config: RateLimiterConfig) {
  if (!stores.has(name)) {
    stores.set(name, new Map());

    // Set up periodic cleanup to prevent unbounded memory growth
    const timer = setInterval(() => {
      const store = stores.get(name);
      if (!store) return;

      const now = Date.now();
      for (const [key, entry] of store) {
        // Remove entries where all timestamps are outside the window
        entry.timestamps = entry.timestamps.filter(
          (t) => now - t < config.windowMs
        );
        if (entry.timestamps.length === 0) {
          store.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);

    // Don't prevent process exit
    timer.unref();
    cleanupTimers.set(name, timer);
  }

  const store = stores.get(name)!;

  return {
    /**
     * Check if a request from the given key (typically IP) should be allowed.
     * @param key - Identifier for the client (IP address)
     * @returns Object with `allowed` boolean and `retryAfterMs` if blocked
     */
    check(key: string): { allowed: boolean; retryAfterMs?: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry) {
        store.set(key, { timestamps: [now] });
        return { allowed: true };
      }

      // Filter to only timestamps within the current window
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < config.windowMs
      );

      if (entry.timestamps.length >= config.maxRequests) {
        // Calculate when the oldest request in the window expires
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = config.windowMs - (now - oldestInWindow);
        return { allowed: false, retryAfterMs };
      }

      entry.timestamps.push(now);
      return { allowed: true };
    },
  };
}

/**
 * Extracts the client IP address from a request.
 * Checks x-forwarded-for (reverse proxy) first, falls back to x-real-ip,
 * then to a default value.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs: client, proxy1, proxy2
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') || 'unknown';
}
