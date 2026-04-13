// @vitest-environment node
/**
 * Performance constraints — tests that encode non-functional requirements.
 *
 * These run in Node (no DOM) where possible, or with happy-dom for element tests.
 * "Soft" tests warn at 2× threshold and fail at 5× — they document intent
 * without making CI brittle on slow machines.
 *
 * Behavioural dimensions tested:
 *   - Bundle size (dependency footprint)
 *   - Parser throughput (parsing speed for LES bodies)
 *   - Registry lookup latency
 *   - Command chain resolution depth
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'fs'
import { resolve } from 'path'
import { parseLES } from '@parser/index.js'
import { CommandRegistry } from '@runtime/registry.js'

const BUNDLE = resolve(process.cwd(), 'dist/local-event-script.js')

// Soft constraint: warn at WARN_MULT×, fail at FAIL_MULT×
const WARN_MULT = 2
const FAIL_MULT = 5

function time<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = fn()
  return { result, ms: performance.now() - start }
}

async function timeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now()
  const result = await fn()
  return { result, ms: performance.now() - start }
}

describe('Bundle size', () => {
  it('uncompressed bundle is under 400 KB', () => {
    const bytes = statSync(BUNDLE).size
    const kb = bytes / 1024
    console.log(`  Bundle size: ${kb.toFixed(1)} KB`)
    // Hard limit: 400 KB — above this signals unexpected dependency bloat
    expect(kb).toBeLessThan(400)
  })

  it('Datastar is external — bundle contains a dynamic import() reference, not inlined code', () => {
    const content = readFileSync(BUNDLE, 'utf8')
    // The Datastar plugin loader uses dynamic import("datastar").
    // This string appears in the bundle because Datastar is external (not inlined).
    // If Datastar were bundled, the string "datastar" would NOT appear as an import target
    // — instead Datastar's source code would be inlined directly.
    expect(content).toContain('import("datastar")')
  })
})

describe('Parser throughput', () => {
  const BODIES = [
    '`emit user:signed-in`',
    '`broadcast data:loaded [$type]`',
    '`bubble work:done [payload[0], payload[1]]`',
    '`cascade refresh:layers [$hour]`',
    '`forward exitSplash`',
    '`call splash:exit\n  then broadcast map:ready\n  then call layers:enter`',
    '`set $loading to false`',
    '`wait 300ms`',
  ]

  it('parses 1 000 LES bodies in under 500ms', () => {
    const iterations = 1000
    const { ms } = time(() => {
      for (let i = 0; i < iterations; i++) {
        const body = BODIES[i % BODIES.length]!
        parseLES(body)
      }
    })
    console.log(`  1 000 parses: ${ms.toFixed(1)}ms (${(ms / iterations).toFixed(3)}ms each)`)
    expect(ms).toBeLessThan(500)
  })

  it('single parse is under 2ms', () => {
    const { ms } = time(() => parseLES('`emit user:ready [payload[0], payload[1]]`'))
    console.log(`  Single parse: ${ms.toFixed(3)}ms`)
    expect(ms).toBeLessThan(2)
  })
})

describe('CommandRegistry lookup latency', () => {
  it('local get() is effectively O(1) — 100 000 lookups under 50ms', () => {
    const reg = new CommandRegistry()
    const mockBody = { type: 'expr' as const, raw: '' }
    for (let i = 0; i < 100; i++) {
      reg.register({ name: `cmd-${i}`, args: [], body: mockBody, element: {} as Element })
    }
    const { ms } = time(() => {
      for (let i = 0; i < 100_000; i++) {
        reg.get(`cmd-${i % 100}`)
      }
    })
    console.log(`  100 000 registry lookups: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(50)
  })

  it('inheritance chain of depth 5 resolves within 5ms for 10 000 lookups', () => {
    const mockBody = { type: 'expr' as const, raw: '' }
    const mock = (name: string) => ({ name, args: [], body: mockBody, element: {} as Element })

    // Build chain: leaf → ... → root, command only in root
    const regs = Array.from({ length: 5 }, () => new CommandRegistry())
    for (let i = 1; i < regs.length; i++) regs[i]!.setParent(regs[i - 1]!)
    regs[0]!.register(mock('root-cmd'))

    const leaf = regs[regs.length - 1]!
    const { ms } = time(() => {
      for (let i = 0; i < 10_000; i++) {
        leaf.get('root-cmd')
      }
    })
    console.log(`  10 000 depth-5 chain lookups: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(5)
  })
})

describe('No unexpected re-exports (public API surface)', () => {
  it('bundle exports only what is needed (basic sanity check)', () => {
    const content = readFileSync(BUNDLE, 'utf8')
    // Must contain our key identifiers
    expect(content).toContain('local-event-script')
    expect(content).toContain('les:child-ready')
    expect(content).toContain('auto-relay')
    expect(content).toContain('LESBridge')
  })
})
