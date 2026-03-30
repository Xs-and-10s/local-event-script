/**
 * Shake animation primitive
 *
 * Generates a noise-driven displacement keyframe sequence and plays it
 * via the Web Animations API. Three noise modes:
 *
 *   regular  — damped sinusoidal oscillation with harmonics (default)
 *   perlin   — Ken Perlin's improved gradient noise (smooth, organic)
 *   simplex  — Simplex noise (smoother gradients, no axis-aligned artefacts)
 *
 * Axis options: x | y | z | xy | xyz
 *   x   → translateX
 *   y   → translateY
 *   z   → rotateZ (screen-shake / camera-shake feel)
 *   xy  → translateX + translateY (independent noise channels)
 *   xyz → translateX + translateY + rotateZ
 *
 * Options (all optional):
 *   axis:      x | y | z | xy | xyz   (default: x)
 *   noise:     regular | perlin | simplex  (default: regular)
 *   amplitude: Npx                    (default: 8px)
 *   decay:     true | false           (default: true — amplitude fades out)
 *   frequency: N                      (default: 8 — oscillations/sec for regular)
 */

import type { LESPrimitive } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Perlin noise — Ken Perlin's improved 2002 version
// We use 2D evaluation: noise(t, channel) where channel is a fixed offset
// that gives independent curves for x vs y vs z.
// ─────────────────────────────────────────────────────────────────────────────

const PERLIN_PERM: Uint8Array = (() => {
  // Fixed permutation table (deterministic, no randomness needed for animation)
  const p = new Uint8Array(512)
  const base = [
    151,160,137, 91, 90, 15,131, 13,201, 95, 96, 53,194,233,  7,225,
    140, 36,103, 30, 69,142,  8, 99, 37,240, 21, 10, 23,190,  6,148,
    247,120,234, 75,  0, 26,197, 62, 94,252,219,203,117, 35, 11, 32,
     57,177, 33, 88,237,149, 56, 87,174, 20,125,136,171,168, 68,175,
     74,165, 71,134,139, 48, 27,166, 77,146,158,231, 83,111,229,122,
     60,211,133,230,220,105, 92, 41, 55, 46,245, 40,244,102,143, 54,
     65, 25, 63,161,  1,216, 80, 73,209, 76,132,187,208, 89, 18,169,
    200,196,135,130,116,188,159, 86,164,100,109,198,173,186,  3, 64,
     52,217,226,250,124,123,  5,202, 38,147,118,126,255, 82, 85,212,
    207,206, 59,227, 47, 16, 58, 17,182,189, 28, 42,223,183,170,213,
    119,248,152,  2, 44,154,163, 70,221,153,101,155,167, 43,172,  9,
    129, 22, 39,253, 19, 98,108,110, 79,113,224,232,178,185,112,104,
    218,246, 97,228,251, 34,242,193,238,210,144, 12,191,179,162,241,
     81, 51,145,235,249, 14,239,107, 49,192,214, 31,181,199,106,157,
    184, 84,204,176,115,121, 50, 45,127,  4,150,254,138,236,205, 93,
    222,114, 67, 29, 24, 72,243,141,128,195, 78, 66,215, 61,156,180,
  ]
  for (let i = 0; i < 256; i++) p[i] = p[i + 256] = base[i]!
  return p
})()

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10) }
function lerp(t: number, a: number, b: number): number { return a + t * (b - a) }
function grad2(hash: number, x: number, y: number): number {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
}

/** Perlin noise, returns value in [-1, 1] */
export function perlin2(x: number, y: number): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  x -= Math.floor(x)
  y -= Math.floor(y)
  const u = fade(x), v = fade(y)
  const a  = PERLIN_PERM[X]!  + Y
  const aa = PERLIN_PERM[a]!,  ab = PERLIN_PERM[a + 1]!
  const b  = PERLIN_PERM[X + 1]! + Y
  const ba = PERLIN_PERM[b]!,  bb = PERLIN_PERM[b + 1]!
  return lerp(v,
    lerp(u, grad2(PERLIN_PERM[aa]!, x, y),     grad2(PERLIN_PERM[ba]!, x - 1, y)),
    lerp(u, grad2(PERLIN_PERM[ab]!, x, y - 1), grad2(PERLIN_PERM[bb]!, x - 1, y - 1))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Simplex noise — 2D simplex (smoother gradients, no grid-aligned artefacts)
// ─────────────────────────────────────────────────────────────────────────────

const SIMPLEX_PERM = PERLIN_PERM // reuse same permutation table

const SIMPLEX_GRAD: [number, number][] = [
  [1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],
]
const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

function simplex2grad(hash: number, x: number, y: number): number {
  const g = SIMPLEX_GRAD[hash & 7]!
  return g[0] * x + g[1] * y
}

/** Simplex noise, returns value in [-1, 1] */
export function simplex2(xin: number, yin: number): number {
  const s  = (xin + yin) * F2
  const i  = Math.floor(xin + s)
  const j  = Math.floor(yin + s)
  const t  = (i + j) * G2
  const x0 = xin - (i - t)
  const y0 = yin - (j - t)

  let i1: number, j1: number
  if (x0 > y0) { i1 = 1; j1 = 0 } else { i1 = 0; j1 = 1 }

  const x1 = x0 - i1 + G2,   y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2*G2,  y2 = y0 - 1 + 2*G2

  const ii = i & 255, jj = j & 255
  const gi0 = SIMPLEX_PERM[ii      + SIMPLEX_PERM[jj]!]!
  const gi1 = SIMPLEX_PERM[ii + i1 + SIMPLEX_PERM[jj + j1]!]!
  const gi2 = SIMPLEX_PERM[ii + 1  + SIMPLEX_PERM[jj + 1]!]!

  const n = (t0: number, x: number, y: number, gi: number) => {
    const r = 0.5 - x*x - y*y
    return r < 0 ? 0 : r*r*r*r * simplex2grad(gi, x, y)
  }

  return 70 * (n(0.5 - x0*x0 - y0*y0, x0, y0, gi0) +
               n(0.5 - x1*x1 - y1*y1, x1, y1, gi1) +
               n(0.5 - x2*x2 - y2*y2, x2, y2, gi2))
}

// ─────────────────────────────────────────────────────────────────────────────
// Regular shake — damped sinusoidal oscillation with harmonics
// ─────────────────────────────────────────────────────────────────────────────

function regularShake(t: number, frequency: number, channel: number): number {
  // Two harmonics at slightly different frequencies for natural feel
  // channel offset prevents x/y from being identical
  const phase = channel * Math.PI * 0.7
  return (
    0.7 * Math.sin(2 * Math.PI * frequency * t + phase) +
    0.3 * Math.sin(2 * Math.PI * frequency * 2.3 * t + phase * 1.4)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyframe generator
// ─────────────────────────────────────────────────────────────────────────────

type NoiseType = 'simplex' | 'perlin' | 'regular'
type ShakeAxis = 'x' | 'y' | 'z' | 'xy' | 'xyz'

interface ShakeOptions {
  axis:      ShakeAxis
  noise:     NoiseType
  amplitude: number     // px (or degrees for z)
  decay:     boolean
  frequency: number     // oscillations/sec (regular mode only)
}

/**
 * Sample the chosen noise function for one axis channel.
 * `t`       — normalised time [0, 1]
 * `channel` — integer offset to produce an independent curve per axis
 */
function sample(
  noise: NoiseType,
  t: number,
  channel: number,
  frequency: number,
  duration: number
): number {
  // Scale t to a range that gives good noise variation
  const scale = 4.0  // how many noise "cycles" over the full duration
  const tx = t * scale + channel * 3.7   // channel offset for independence
  const ty = channel * 11.3              // fixed y offset per channel

  switch (noise) {
    case 'simplex': return simplex2(tx, ty)
    case 'perlin':  return perlin2(tx, ty)
    case 'regular': return regularShake(t, frequency, channel)
  }
}

function buildKeyframes(
  opts: ShakeOptions,
  n: number   // number of keyframes
): Keyframe[] {
  const frames: Keyframe[] = []

  for (let i = 0; i <= n; i++) {
    const t        = i / n                   // [0, 1]
    const envelope = opts.decay ? (1 - t) : 1.0
    const amp      = opts.amplitude * envelope

    let tx = 0, ty = 0, rz = 0

    if (opts.axis.includes('x')) {
      tx = sample(opts.noise, t, 0, opts.frequency, n) * amp
    }
    if (opts.axis.includes('y')) {
      ty = sample(opts.noise, t, 1, opts.frequency, n) * amp
    }
    if (opts.axis === 'z' || opts.axis === 'xyz') {
      // z rotation: amplitude is in degrees, scale down vs px displacement
      const degAmp = amp * 0.15
      rz = sample(opts.noise, t, 2, opts.frequency, n) * degAmp
    }

    const parts: string[] = []
    if (tx !== 0 || opts.axis.includes('x')) parts.push(`translateX(${tx.toFixed(2)}px)`)
    if (ty !== 0 || opts.axis.includes('y')) parts.push(`translateY(${ty.toFixed(2)}px)`)
    if (rz !== 0 || opts.axis === 'z' || opts.axis === 'xyz') parts.push(`rotateZ(${rz.toFixed(3)}deg)`)

    frames.push({
      transform: parts.length > 0 ? parts.join(' ') : 'none',
      offset: t,
    })
  }

  // Ensure first and last frames return to rest
  frames[0]!.transform = buildRestTransform(opts.axis)
  frames[n]!.transform = buildRestTransform(opts.axis)

  return frames
}

function buildRestTransform(axis: ShakeAxis): string {
  const parts: string[] = []
  if (axis.includes('x'))                       parts.push('translateX(0px)')
  if (axis.includes('y'))                       parts.push('translateY(0px)')
  if (axis === 'z' || axis === 'xyz')           parts.push('rotateZ(0deg)')
  return parts.join(' ') || 'none'
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse options from LES option object
// ─────────────────────────────────────────────────────────────────────────────

function parseMs(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  const m = String(val).match(/^(\d+(?:\.\d+)?)(?:px|ms)?$/)
  return m ? parseFloat(m[1]!) : fallback
}

function parsePx(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  const m = String(val).match(/^(\d+(?:\.\d+)?)px$/)
  return m ? parseFloat(m[1]!) : fallback
}

function parseShakeOptions(opts: Record<string, unknown>): ShakeOptions {
  const axis      = (['x','y','z','xy','xyz'].includes(String(opts['axis'] ?? 'x'))
                    ? String(opts['axis'] ?? 'x')
                    : 'x') as ShakeAxis
  const noise     = (['simplex','perlin','regular'].includes(String(opts['noise'] ?? 'regular'))
                    ? String(opts['noise'] ?? 'regular')
                    : 'regular') as NoiseType
  const amplitude = parsePx(opts['amplitude'] as string | number | undefined, 8)
  const decay     = String(opts['decay'] ?? 'true') !== 'false'
  const frequency = parseMs(opts['frequency'] as string | number | undefined, 8)

  return { axis, noise, amplitude, decay, frequency }
}

// ─────────────────────────────────────────────────────────────────────────────
// The primitive
// ─────────────────────────────────────────────────────────────────────────────

/**
 * shake — noise-driven displacement animation.
 *
 * Usage in LES:
 *   shake #field  400ms ease-out [axis: x  noise: regular  amplitude: 8px  decay: true]
 *   shake .card   600ms linear   [axis: xy  noise: simplex  amplitude: 12px]
 *   shake body    800ms linear   [axis: xyz  noise: perlin  amplitude: 6px  decay: true]
 */
export const shake: LESPrimitive = async (selector, duration, _easing, opts, host) => {
  const root  = host.getRootNode() as Document | ShadowRoot
  const scope = root instanceof Document ? root : root.ownerDocument ?? document
  const els   = Array.from(scope.querySelectorAll(selector)) as HTMLElement[]
  if (els.length === 0) return

  const options = parseShakeOptions(opts)

  // ~60fps keyframe density, minimum 12, maximum 60
  const frameCount = Math.min(60, Math.max(12, Math.round(duration / 16)))
  const keyframes  = buildKeyframes(options, frameCount)

  await Promise.all(
    els.map(el =>
      el.animate(keyframes, {
        duration,
        easing:    'linear',   // easing is baked into the noise envelope
        fill:      'none',     // shake returns to rest — no hold needed
        composite: 'add',      // add on top of existing transforms (fill:forwards etc.)
      }).finished.catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        throw err
      })
    )
  )
}
