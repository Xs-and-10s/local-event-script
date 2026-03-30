/**
 * Simple in-memory TTL cache for the d3 proxy routes.
 *
 * Weather data (Open-Meteo) is rate-limited and slow to aggregate (30 parallel
 * calls). Cache for 1 hour so page refreshes don't re-fetch.
 * Fire data (FIRMS) updates every ~10 minutes satellite pass but we only need
 * fresh data per demo session. Cache for 30 minutes.
 * Earthquake data (USGS) is the real-time heartbeat; short 60s cache to allow
 * rapid dev reloads without hammering USGS.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>()

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  /** Evict all expired entries (call periodically if needed). */
  prune(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

export const cache = new TTLCache()

export const TTL = {
  EARTHQUAKES: 60 * 1000,          //  1 minute
  WEATHER:     60 * 60 * 1000,     //  1 hour
  FIRES:       30 * 60 * 1000,     // 30 minutes
  FLIGHTS:     15 * 1000,          // 15 seconds (OpenSky rate limit)
} as const
