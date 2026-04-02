/**
 * workers/worker.js — Universal LES analysis worker
 *
 * A single script runs in every pool worker. The `task` field in each
 * message discriminates which handler to invoke. This means any free
 * worker can handle any task (true pool behaviour), and Turf is only
 * loaded once per worker at startup rather than per-message.
 *
 * Message protocol:
 *   IN:  { id: string, task: string, payload: unknown }
 *   OUT: { id: string, task: string, result?: unknown, error?: string }
 *
 * Tasks:
 *   isobands:temp     — temperature Turf isobands from interpolated grid
 *   isobands:fire     — wildfire density contours
 *   isobands:seismic  — seismic contours weighted by magnitude
 *   aggregation:state — per-state aggregation via pointsWithinPolygon
 *   scoring:poi       — composite POI score ranking
 *
 * All handlers are stubs returning empty results until Step 6 wires
 * in real data. The infrastructure is fully operational.
 */

// ── Load Turf.js ──────────────────────────────────────────────────────────
// importScripts is the worker equivalent of <script src="...">
// UMD bundle exposes `turf` as a global.
importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7.3.4/turf.min.js')

// Confirm Turf loaded
const turfVersion = typeof turf !== 'undefined' ? '7.3.4' : 'MISSING'
// Don't log here — happens in every worker at startup, very noisy

// ── Task handlers ─────────────────────────────────────────────────────────

/**
 * isobands:temp
 * Produces temperature isobands from the 30-point Open-Meteo grid.
 *
 * payload: {
 *   points: [{ lat, lon, temp }]  — temperature values at hour slice
 *   breaks: number[]              — isoline thresholds in °C
 *   bbox: [west, south, east, north]
 * }
 * result: GeoJSON FeatureCollection of Polygon isobands
 */
function handleTempIsobands({ points, breaks, bbox }) {
  if (!points || points.length === 0) return { type: 'FeatureCollection', features: [] }

  try {
    // Build a FeatureCollection of points with 'value' property
    const fc = turf.featureCollection(
      points.map(p => turf.point([p.lon, p.lat], { value: p.temp }))
    )

    // Interpolate to a dense grid using IDW
    const interpolated = turf.interpolate(fc, 40, {
      gridType: 'point',
      property: 'value',
      weight: 2,
      bbox: bbox || [-125, 24, -66, 50],
    })

    // Generate isobands; caller sends dynamic breaks based on actual data range
    const bands = turf.isobands(interpolated, breaks || [0, 5, 10, 15, 20, 25, 30, 35], {
      zProperty: 'value',
    })

    return bands
  } catch (err) {
    // Fallback — return empty collection rather than crashing the worker
    console.error('[worker] isobands:temp error:', err.message)
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * isobands:fire
 * Produces wildfire hotspot density isobands.
 *
 * payload: {
 *   fires: [{ lat, lon, frp }]   — FIRMS hotspots for current hour slice
 *   bbox: [west, south, east, north]
 * }
 * result: GeoJSON FeatureCollection of Polygon isobands
 */
function handleFireIsobands({ fires, bbox }) {
  if (!fires || fires.length === 0) return { type: 'FeatureCollection', features: [] }

  try {
    const fc = turf.featureCollection(
      fires.map(f => turf.point([f.lon, f.lat], { value: Math.log1p(f.frp || 0) }))
    )

    // For sparse fire data, use a coarser grid
    const cellSize = fires.length > 1000 ? 30 : 50
    const interpolated = turf.interpolate(fc, cellSize, {
      gridType: 'point',
      property: 'value',
      weight: 2,
      bbox: bbox || [-125, 24, -66, 50],
    })

    // Compute dynamic breaks based on data range
    const values = interpolated.features.map(f => f.properties.value).filter(Boolean)
    if (values.length === 0) return { type: 'FeatureCollection', features: [] }

    const max = Math.max(...values)
    const step = max / 5
    const breaks = Array.from({ length: 6 }, (_, i) => i * step)

    return turf.isobands(interpolated, breaks, { zProperty: 'value' })
  } catch (err) {
    console.error('[worker] isobands:fire error:', err.message)
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * isobands:seismic
 * Produces seismic contours from earthquake epicenters weighted by magnitude.
 *
 * payload: {
 *   earthquakes: [{ lon, lat, mag }]  — active events in time slice
 *   bbox: [west, south, east, north]
 * }
 * result: GeoJSON FeatureCollection of Polygon isobands
 */
function handleSeismicIsobands({ earthquakes, bbox }) {
  if (!earthquakes || earthquakes.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  try {
    // Weight by 10^(mag/2) — same scale as seismic energy
    const fc = turf.featureCollection(
      earthquakes.map(eq => turf.point(
        [eq.lon, eq.lat],
        { value: Math.pow(10, (eq.mag || 0) / 2) }
      ))
    )

    // power=3 for tight locality — single large earthquake should dominate locally
    const interpolated = turf.interpolate(fc, 30, {
      gridType: 'point',
      property: 'value',
      weight: 3,
      bbox: bbox || [-125, 24, -66, 50],
    })

    const values = interpolated.features.map(f => f.properties.value).filter(v => v > 0)
    if (values.length === 0) return { type: 'FeatureCollection', features: [] }

    const max = Math.max(...values)
    // Logarithmic breaks: denser at low end so faint rings appear around small events
    const breaks = [0, max*0.05, max*0.12, max*0.25, max*0.45, max*0.70, max*0.90]

    return turf.isobands(interpolated, breaks, { zProperty: 'value' })
  } catch (err) {
    console.error('[worker] isobands:seismic error:', err.message)
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * aggregation:state
 * Aggregates per-data-type values per US state polygon.
 * Used for state-centroid spike heights.
 *
 * payload: {
 *   stateFeatures: GeoJSON FeatureCollection  — US states from TopoJSON
 *   fires:         [{ lat, lon, frp }]
 *   weatherPoints: [{ lat, lon, label, hourly }]
 *   hourIndex:     number
 * }
 * result: {
 *   stateFire:    [{ stateId, lon, lat, frp }]
 *   stateTemp:    [{ stateId, lon, lat, temp }]
 *   centroids:    [{ stateId, lon, lat }]
 * }
 */
function handleStateAggregation({ stateFeatures, fires, weatherPoints, hourIndex }) {
  if (!stateFeatures || !stateFeatures.features) {
    return { stateFire: [], stateTemp: [], centroids: [] }
  }

  try {
    const hour = hourIndex || 0
    const centroids = []
    const stateFire = []
    const stateTemp = []

    for (const state of stateFeatures.features) {
      const stateId = state.properties.name || state.id
      const centroid = turf.centroid(state)
      const [lon, lat] = centroid.geometry.coordinates
      centroids.push({ stateId, lon, lat })

      // Fire: sum FRP of hotspots within this state
      if (fires && fires.length > 0) {
        const firePts = turf.featureCollection(
          fires.map(f => turf.point([f.lon, f.lat], { frp: f.frp || 0 }))
        )
        const inside = turf.pointsWithinPolygon(firePts, turf.featureCollection([state]))
        const totalFRP = inside.features.reduce((s, f) => s + (f.properties.frp || 0), 0)

        // FRP-weighted centroid of the actual hotspots — not the state geographic centroid.
        // This points the tour camera to where fires are concentrated, not the state's center.
        let fireLon = lon, fireLat = lat  // fallback: state centroid if weights collapse
        if (inside.features.length > 0 && totalFRP > 0) {
          let wLon = 0, wLat = 0
          for (const f of inside.features) {
            const w = f.properties.frp || 0
            wLon += f.geometry.coordinates[0] * w
            wLat += f.geometry.coordinates[1] * w
          }
          fireLon = wLon / totalFRP
          fireLat = wLat / totalFRP
        }

        stateFire.push({ stateId, lon: fireLon, lat: fireLat, frp: totalFRP })
      }

      // Temperature: median of weather grid points within or nearest to state
      if (weatherPoints && weatherPoints.length > 0) {
        const tempPts = turf.featureCollection(
          weatherPoints
            .filter(p => p.hourly && p.hourly.temp && p.hourly.temp[hour] != null)
            .map(p => turf.point([p.lon, p.lat], { temp: p.hourly.temp[hour] }))
        )

        let stateTemps = []
        if (tempPts.features.length > 0) {
          const inside = turf.pointsWithinPolygon(tempPts, turf.featureCollection([state]))
          stateTemps = inside.features.map(f => f.properties.temp)
        }

        // If no grid points inside, use nearest point
        if (stateTemps.length === 0 && tempPts.features.length > 0) {
          const nearest = turf.nearestPoint(centroid, tempPts)
          stateTemps = [nearest.properties.temp]
        }

        // Median
        if (stateTemps.length > 0) {
          const sorted = stateTemps.slice().sort((a, b) => a - b)
          const median = sorted[Math.floor(sorted.length / 2)]
          stateTemp.push({ stateId, lon, lat, temp: median })
        }
      }
    }

    return { stateFire, stateTemp, centroids }
  } catch (err) {
    console.error('[worker] aggregation:state error:', err.message)
    return { stateFire: [], stateTemp: [], centroids: [] }
  }
}

/**
 * scoring:poi
 * Ranks all events by composite score and returns the top-ranked POI.
 * Called every timeline tick to update the camera pan target.
 *
 * payload: {
 *   earthquakes: [{ lon, lat, mag }]
 *   fires:       [{ lon, lat, frp }]
 *   stateTemp:   [{ lon, lat, temp, stateId }]
 *   weights:     { eq: number, fire: number, temp: number }
 *   tempRange:   { min: number, max: number }
 *   frpMax:      number
 * }
 * result: { lon, lat, score, type } | null
 */
function handlePOIScoring({ earthquakes, fires, stateTemp, weights, tempRange, frpMax }) {
  const w = weights || { eq: 0.5, fire: 0.35, temp: 0.15 }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  const candidates = []

  // Earthquake candidates
  if (earthquakes) {
    for (const eq of earthquakes) {
      // Normalize: M3→0, M9→1
      const score = w.eq * clamp((eq.mag - 3) / 6, 0, 1)
      candidates.push({ lon: eq.lon, lat: eq.lat, score, type: 'earthquake' })
    }
  }

  // Fire candidates (per state aggregate)
  const frpCeil = frpMax || 500_000
  if (fires) {
    for (const f of fires) {
      const score = w.fire * clamp(f.frp / frpCeil, 0, 1)
      candidates.push({ lon: f.lon, lat: f.lat, score, type: 'fire' })
    }
  }

  // Temperature anomaly candidates (per state)
  const tMin = tempRange?.min ?? 0
  const tMax = tempRange?.max ?? 40
  if (stateTemp) {
    for (const t of stateTemp) {
      const score = w.temp * clamp((t.temp - tMin) / Math.max(1, tMax - tMin), 0, 1)
      candidates.push({ lon: t.lon, lat: t.lat, score, type: 'temperature' })
    }
  }

  if (candidates.length === 0) return null

  // Return the highest-scoring candidate
  return candidates.reduce((best, c) => c.score > best.score ? c : best, candidates[0])
}

// ── Dispatch table ─────────────────────────────────────────────────────────

const HANDLERS = {
  'isobands:temp':      handleTempIsobands,
  'isobands:fire':      handleFireIsobands,
  'isobands:seismic':   handleSeismicIsobands,
  'aggregation:state':  handleStateAggregation,
  'scoring:poi':        handlePOIScoring,
}

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = ({ data }) => {
  const { id, task, payload } = data

  if (!HANDLERS[task]) {
    self.postMessage({ id, task, error: `Unknown task: ${task}` })
    return
  }

  try {
    const result = HANDLERS[task](payload)

    // Handle Promise-returning handlers (none currently, but future-proof)
    if (result && typeof result.then === 'function') {
      result
        .then(r => self.postMessage({ id, task, result: r }))
        .catch(err => self.postMessage({ id, task, error: err.message }))
    } else {
      self.postMessage({ id, task, result })
    }
  } catch (err) {
    self.postMessage({ id, task, error: err.message })
  }
}

// Signal readiness
self.postMessage({ id: '__ready__', task: '__ready__', result: { turf: turfVersion } })
