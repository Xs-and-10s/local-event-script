/**
 * /d3 demo routes — "Living Map"
 *
 * All external API calls are proxied here so:
 *   1. API keys never reach the browser
 *   2. CORS issues are handled server-side
 *   3. Responses are cached to avoid hammering upstream services
 *   4. Missing keys degrade gracefully (warning, not 500)
 *
 * Routes:
 *   GET  /d3                  — serve d3.html
 *   GET  /api/d3/earthquakes  — proxy USGS GeoJSON feed (no key)
 *   GET  /api/d3/weather      — aggregate Open-Meteo for 30-pt US grid (no key)
 *   GET  /api/d3/fires        — proxy NASA FIRMS (FIRMS_MAP_KEY required)
 *   GET  /api/d3/flights      — proxy OpenSky ADS-B (OPENSKY_* optional)
 *   GET  /api/d3/presence     — SSE stream for multi-user timeline presence
 *   POST /api/d3/presence     — update this session's presence state
 */

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { cache, TTL } from '../cache.ts'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')  // local-event-script/

// ─────────────────────────────────────────────────────────────────────────────
// Environment — lazy getters, read at call-time not module-init time.
// Avoids ESM hoisting: d3.ts imports are resolved before index.ts's
// top-level await env loader runs. Reading inside functions means we
// always see the final process.env state (populated by --env-file).
// ─────────────────────────────────────────────────────────────────────────────

const getFirmsKey      = () => process.env['FIRMS_MAP_KEY']        || ''
const getOpenskyId     = () => process.env['OPENSKY_CLIENT_ID']    || ''
const getOpenskySecret = () => process.env['OPENSKY_CLIENT_SECRET'] || ''

// Log key status at startup — called from index.ts after env is loaded
export function logD3KeyStatus() {
  const firmsOk   = getFirmsKey()    ? '✓ present' : '✗ missing (fires disabled)  '
  const openskyOk = (getOpenskyId() && getOpenskySecret()) ? '✓ present' : '✗ missing (flights disabled)'
  console.log(`  │  FIRMS_MAP_KEY:       ${firmsOk.padEnd(30)}│`)
  console.log(`  │  OpenSky:             ${openskyOk.padEnd(30)}│`)
}

// ─────────────────────────────────────────────────────────────────────────────
// US grid for Open-Meteo — 30 points covering CONUS
// 6 columns × 5 rows, roughly aligned with climate zones
// ─────────────────────────────────────────────────────────────────────────────

const US_WEATHER_GRID: Array<{ lat: number; lon: number; label: string }> = [
  // Pacific NW → NE
  { lat: 47.6,  lon: -122.3, label: 'seattle'     },
  { lat: 46.9,  lon: -114.1, label: 'missoula'    },
  { lat: 45.8,  lon: -108.5, label: 'billings'    },
  { lat: 46.9,  lon: -96.8,  label: 'fargo'       },
  { lat: 44.9,  lon: -93.1,  label: 'minneapolis' },
  { lat: 44.5,  lon: -73.2,  label: 'burlington'  },
  // Northern mid → Northeast
  { lat: 42.4,  lon: -122.6, label: 'medford'     },
  { lat: 41.7,  lon: -111.8, label: 'ogden'       },
  { lat: 41.0,  lon: -104.8, label: 'cheyenne'    },
  { lat: 41.3,  lon: -96.0,  label: 'omaha'       },
  { lat: 41.9,  lon: -87.6,  label: 'chicago'     },
  { lat: 42.4,  lon: -71.1,  label: 'boston'      },
  // Central band
  { lat: 37.8,  lon: -122.4, label: 'san-francisco' },
  { lat: 36.2,  lon: -115.2, label: 'las-vegas'   },
  { lat: 39.7,  lon: -104.9, label: 'denver'      },
  { lat: 38.3,  lon: -98.5,  label: 'wichita'     },
  { lat: 39.1,  lon: -84.5,  label: 'cincinnati'  },
  { lat: 40.7,  lon: -74.0,  label: 'new-york'    },
  // Southern mid
  { lat: 34.1,  lon: -118.2, label: 'los-angeles' },
  { lat: 33.4,  lon: -112.1, label: 'phoenix'     },
  { lat: 35.5,  lon: -97.5,  label: 'okc'         },
  { lat: 35.1,  lon: -89.9,  label: 'memphis'     },
  { lat: 35.2,  lon: -80.8,  label: 'charlotte'   },
  { lat: 38.9,  lon: -77.0,  label: 'dc'          },
  // South → SE
  { lat: 32.7,  lon: -117.2, label: 'san-diego'   },
  { lat: 29.7,  lon: -95.4,  label: 'houston'     },
  { lat: 30.3,  lon: -81.7,  label: 'jacksonville' },
  { lat: 29.9,  lon: -90.1,  label: 'new-orleans' },
  { lat: 33.7,  lon: -84.4,  label: 'atlanta'     },
  { lat: 25.8,  lon: -80.2,  label: 'miami'       },
]

// ─────────────────────────────────────────────────────────────────────────────
// Presence (multi-user timeline) — server-sent events
// ─────────────────────────────────────────────────────────────────────────────

interface PresenceState {
  id: string
  initials: string
  hour: number
  pinned: boolean
  pinnedHour: number | null
  lastSeen: number
}

// In-memory presence store — keyed by session ID
const presenceStore = new Map<string, PresenceState>()
// Active SSE response streams
const presenceStreams = new Set<(data: string) => void>()

// Evict stale sessions (inactive > 30s) and notify all streams
function prunePresence() {
  const cutoff = Date.now() - 30_000
  let changed = false
  for (const [id, state] of presenceStore) {
    if (state.lastSeen < cutoff) {
      presenceStore.delete(id)
      changed = true
    }
  }
  if (changed) broadcastPresence()
}

function broadcastPresence() {
  const users = Array.from(presenceStore.values()).map(({ id, initials, hour, pinned, pinnedHour }) => ({
    id, initials, hour, pinned, pinnedHour,
  }))
  const payload = `data: ${JSON.stringify(users)}\n\n`
  for (const send of presenceStreams) {
    try { send(payload) } catch { /* stream closed */ }
  }
}

// Evict stale sessions every 15s
setInterval(prunePresence, 15_000)

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

const d3 = new Hono()

// ── GET /api/d3/earthquakes ──────────────────────────────────────────────────
// Proxies USGS significant_month.geojson — no API key needed.
// Returns the full GeoJSON FeatureCollection.

d3.get('/earthquakes', async (c) => {
  const cached = cache.get<object>('earthquakes')
  if (cached) {
    return c.json({ source: 'cache', ...cached })
  }

  try {
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson'
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`USGS responded ${res.status}`)
    const data = await res.json() as object

    cache.set('earthquakes', data, TTL.EARTHQUAKES)
    console.log(`[d3] earthquake feed fetched: ${(data as { metadata?: { count?: number } }).metadata?.count ?? '?'} events`)
    return c.json({ source: 'live', ...data })
  } catch (err) {
    console.error('[d3] earthquake fetch failed:', err)
    return c.json({ error: 'Failed to fetch earthquake data', features: [] }, 502)
  }
})

// ── GET /api/d3/weather ──────────────────────────────────────────────────────
// Fetches wind_speed_10m, wind_direction_10m, temperature_2m for 30 US grid
// points from Open-Meteo — no API key needed.
// Returns: { points: [{ lat, lon, label, hourly: { time, temp, windSpeed, windDir } }] }
// Cache: 1 hour

d3.get('/weather', async (c) => {
  const cached = cache.get<object>('weather')
  if (cached) {
    return c.json({ source: 'cache', points: cached })
  }

  try {
    // Fetch all 30 points in parallel
    const results = await Promise.allSettled(
      US_WEATHER_GRID.map(async ({ lat, lon, label }) => {
        const params = new URLSearchParams({
          latitude:  String(lat),
          longitude: String(lon),
          hourly:    'temperature_2m,wind_speed_10m,wind_direction_10m',
          forecast_days: '7',
          timezone:  'UTC',
          wind_speed_unit: 'ms',
        })
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`,
          { signal: AbortSignal.timeout(8_000) }
        )
        if (!res.ok) throw new Error(`Open-Meteo ${res.status} for ${label}`)
        const data = await res.json() as {
          hourly: {
            time: string[]
            temperature_2m: number[]
            wind_speed_10m: number[]
            wind_direction_10m: number[]
          }
        }
        return {
          lat, lon, label,
          hourly: {
            time:      data.hourly.time,
            temp:      data.hourly.temperature_2m,
            windSpeed: data.hourly.wind_speed_10m,
            windDir:   data.hourly.wind_direction_10m,
          },
        }
      })
    )

    const points = results
      .filter((r): r is PromiseFulfilledResult<typeof results[0] extends PromiseFulfilledResult<infer T> ? T : never> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)

    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) console.warn(`[d3] weather: ${failed}/${US_WEATHER_GRID.length} points failed`)
    console.log(`[d3] weather grid fetched: ${points.length} points, 168h each`)

    const response: Record<string, unknown> = { source: 'live', points }
    if (points.length === 0) {
      response['warning'] = 'All weather grid points failed to fetch — Open-Meteo may be unreachable'
    } else if (failed > 0) {
      response['warning'] = `${failed} of ${US_WEATHER_GRID.length} weather grid points failed`
    }

    cache.set('weather', points, TTL.WEATHER)
    return c.json(response)
  } catch (err) {
    console.error('[d3] weather fetch failed:', err)
    return c.json({ error: 'Failed to fetch weather data', points: [] }, 502)
  }
})

// ── GET /api/d3/fires ────────────────────────────────────────────────────────
// Proxies NASA FIRMS VIIRS NOAA-20 active fire detections for CONUS bbox.
// Requires FIRMS_MAP_KEY — degrades gracefully if missing.
// bbox: -125,24,-66,50 (CONUS)
// Returns: { fires: [{ lat, lon, frp, brightness, datetime }], warning? }

d3.get('/fires', async (c) => {
  if (!getFirmsKey()) {
    return c.json({
      fires: [],
      warning: 'FIRMS_MAP_KEY not configured. Get a free key at https://firms.modaps.eosdis.nasa.gov/api/',
    })
  }

  const cached = cache.get<object[]>('fires')
  if (cached) {
    return c.json({ source: 'cache', fires: cached })
  }

  try {
    // FIRMS area API: /api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAY_RANGE}
    // VIIRS_NOAA20_NRT = near real-time, updated every ~12 hours
    // bbox = west,south,east,north  (CONUS)
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${getFirmsKey()}/VIIRS_NOAA20_NRT/-125,24,-66,50/2`
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)')
      console.error(`[d3] FIRMS ${res.status}: ${body.slice(0, 200)}`)
      throw new Error(`FIRMS responded ${res.status}`)
    }

    const csv = await res.text()
    const fires = parseFirmsCSV(csv)

    cache.set('fires', fires, TTL.FIRES)
    console.log(`[d3] FIRMS fire data fetched: ${fires.length} hotspots (2-day window)`)
    return c.json({ source: 'live', fires })
  } catch (err) {
    console.error('[d3] FIRMS fetch failed:', err)
    return c.json({ error: 'Failed to fetch fire data', fires: [] }, 502)
  }
})

// FIRMS CSV parser — returns minimal objects for efficient transfer
function parseFirmsCSV(csv: string): Array<{
  lat: number; lon: number; frp: number; brightness: number; datetime: string
}> {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0]!.split(',')
  const idx = {
    lat:        header.indexOf('latitude'),
    lon:        header.indexOf('longitude'),
    brightness: header.indexOf('bright_ti4'),
    frp:        header.indexOf('frp'),
    date:       header.indexOf('acq_date'),
    time:       header.indexOf('acq_time'),
  }

  const fires = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',')
    const lat  = parseFloat(cols[idx.lat]!)
    const lon  = parseFloat(cols[idx.lon]!)
    const frp  = parseFloat(cols[idx.frp]!)
    const brt  = parseFloat(cols[idx.brightness]!)
    const date = cols[idx.date]!
    const time = cols[idx.time]!.padStart(4, '0')

    if (isNaN(lat) || isNaN(lon)) continue

    // Convert FIRMS acq_time (HHMM) to ISO datetime
    const datetime = `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`
    fires.push({ lat, lon, frp: frp || 0, brightness: brt || 0, datetime })
  }
  return fires
}

// ── GET /api/d3/flights ──────────────────────────────────────────────────────
// Proxies OpenSky Network live state vectors for CONUS bbox.
// Requires OPENSKY_CLIENT_ID + OPENSKY_CLIENT_SECRET (free account).
// Degrades gracefully if missing — flight layer stays disabled.
// Returns: { flights: [{ icao24, callsign, lat, lon, alt, vel, hdg }], warning? }

d3.get('/flights', async (c) => {
  if (!getOpenskyId() || !getOpenskySecret()) {
    return c.json({
      flights: [],
      warning: 'OpenSky credentials not configured. Get a free account at https://opensky-network.org/',
    })
  }

  const cached = cache.get<object[]>('flights')
  if (cached) {
    return c.json({ source: 'cache', flights: cached })
  }

  try {
    // OAuth2 client credentials flow
    const tokenRes = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     getOpenskyId(),
          client_secret: getOpenskySecret(),
        }),
        signal: AbortSignal.timeout(8_000),
      }
    )
    if (!tokenRes.ok) throw new Error(`OpenSky auth ${tokenRes.status}`)
    const { access_token } = await tokenRes.json() as { access_token: string }

    // CONUS bounding box: lamin=24, lomin=-125, lamax=50, lomax=-66
    const params = new URLSearchParams({
      lamin: '24', lomin: '-125', lamax: '50', lomax: '-66',
    })
    const stateRes = await fetch(
      `https://opensky-network.org/api/states/all?${params}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(10_000),
      }
    )
    if (!stateRes.ok) throw new Error(`OpenSky states ${stateRes.status}`)
    const { states } = await stateRes.json() as { states: unknown[][] | null }

    if (!states) {
      return c.json({ source: 'live', flights: [] })
    }

    // State vector indices per OpenSky API docs
    const flights = states
      .filter(s => s[5] !== null && s[6] !== null && !s[8]) // must have position, not on ground
      .map(s => ({
        icao24:        s[0] as string,
        callsign:      (s[1] as string)?.trim() || null,
        origin_country: s[2] as string,  // used for domestic/international classification
        lon:     s[5] as number,
        lat:     s[6] as number,
        alt:     s[7] as number,   // barometric altitude (m)
        vel:     s[9] as number,   // ground speed (m/s)
        hdg:     s[10] as number,  // true track (deg, 0=N)
      }))

    cache.set('flights', flights, TTL.FLIGHTS)
    console.log(`[d3] OpenSky: ${flights.length} aircraft in CONUS airspace`)
    return c.json({ source: 'live', flights })
  } catch (err) {
    console.error('[d3] OpenSky fetch failed:', err)
    return c.json({ error: 'Failed to fetch flight data', flights: [] }, 502)
  }
})

// ── GET /api/d3/presence — SSE stream ───────────────────────────────────────
// Each connected client receives the full presence array whenever any user
// updates their state. Reconnect-friendly (no stored message history).

d3.get('/presence', async (c) => {
  const sessionId = c.req.header('X-Session-Id') || crypto.randomUUID()

  return streamSSE(c, async (stream) => {
    // Send current snapshot immediately on connect
    const users = Array.from(presenceStore.values()).map(
      ({ id, initials, hour, pinned, pinnedHour }) => ({ id, initials, hour, pinned, pinnedHour })
    )
    await stream.writeSSE({ data: JSON.stringify(users) })

    // Register this stream to receive future broadcasts
    const send = (payload: string) => {
      // streamSSE doesn't expose raw write; use the stream object's pipe
      stream.writeSSE({ data: payload.replace(/^data: /m, '').replace(/\n\n$/, '') }).catch(() => {})
    }
    presenceStreams.add(send)

    // Keep alive until client disconnects
    await stream.sleep(2147483647) // ~25 days (effectively forever)
    presenceStreams.delete(send)
  })
})

// ── POST /api/d3/presence ────────────────────────────────────────────────────
// Body: { id, initials, hour, pinned, pinnedHour }
// Updates the server presence store and broadcasts to all connected clients.

d3.post('/presence', async (c) => {
  try {
    const body = await c.req.json() as Partial<PresenceState>

    if (!body.id || !body.initials) {
      return c.json({ error: 'id and initials are required' }, 400)
    }

    presenceStore.set(body.id, {
      id:          body.id,
      initials:    body.initials.slice(0, 3),  // max 2–3 chars
      hour:        body.hour        ?? 0,
      pinned:      body.pinned      ?? false,
      pinnedHour:  body.pinnedHour  ?? null,
      lastSeen:    Date.now(),
    })

    broadcastPresence()
    return c.json({ ok: true })
  } catch {
    return c.json({ error: 'Invalid body' }, 400)
  }
})

export { d3 }
