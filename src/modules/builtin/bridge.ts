/**
 * LES Bridge Module — `<use-module type="bridge">`
 *
 * Provides the `forward` primitive for decoupled JS↔LES integration.
 * Loading this module initializes the global LESBridge registry and
 * validates that declarative <local-bridge> children have been processed.
 *
 * Usage pattern:
 *
 *   <!-- In HTML, inside a local-event-script: -->
 *   <use-module type="bridge">
 *   <local-bridge name="exitSplash"     fn="window.exitSplash">
 *   <local-bridge name="shakeAndPan"    fn="window.shakeAndPan">
 *
 *   <!-- In a local-command body: -->
 *   forward exitSplash
 *
 * Alternatively, register bridges in JS before LES initializes:
 *   window.LESBridge.set('exitSplash', window.exitSplash)
 *
 * The bridge Map lives on globalThis so it's mockable in tests:
 *   globalThis.LESBridge = new Map([['exitSplash', mockFn]])
 */

import type { LESModule } from '../types.js'

// Ensure LESBridge exists. LocalEventScript constructor also does this,
// but the module may be loaded before any LES element connects.
if (!('LESBridge' in globalThis)) {
  ;(globalThis as any).LESBridge = new Map<string, (...args: unknown[]) => unknown>()
  console.log('[LES:bridge] LESBridge initialized')
}

const bridgeModule: LESModule = {
  name: 'bridge',
  // No animation primitives — `forward` is handled directly in executor.ts.
  // This module's job is initialization and documentation of the bridge pattern.
  primitives: {},
}

export default bridgeModule
