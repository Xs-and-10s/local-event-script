/**
 * Phase 6: Datastar attribute plugin
 *
 * Registers <local-event-script> as a Datastar attribute plugin so that:
 *
 *   1. Datastar's effect() and signal() primitives are handed to the host
 *      element, enabling proper reactive signal watching via the dependency
 *      graph rather than manual notification.
 *
 *   2. Signal writes from `set $x to y` in LES propagate into Datastar's
 *      root object so data-text, data-show, etc. update reactively.
 *
 *   3. $-prefixed signals in LES expressions resolve from Datastar's root,
 *      giving LES full read access to all Datastar state.
 *
 *   4. Signal watchers on-signal are re-wired through Datastar's effect()
 *      system for proper batching and deduplication.
 *
 * LES works without Datastar (standalone mode). The bridge is purely additive.
 */

import type { LocalEventScript } from '@elements/LocalEventScript.js'
import { wireSignalWatcherViaDatastar } from '@runtime/signals.js'

let bridgeRegistered = false

export async function registerDatastarBridge(): Promise<void> {
  if (bridgeRegistered) return

  try {
    const datastar = await import('datastar')
    const { attribute } = datastar

    // ── Register as a Datastar attribute plugin ────────────────────────────
    // Matches elements with a `data-local-event-script` attribute OR (via
    // name matching) the <local-event-script> custom element itself when
    // Datastar scans the DOM.
    //
    // The name 'local-event-script' causes Datastar to apply this plugin
    // to any element with data-local-event-script="..." in the DOM.
    // We also patch <local-event-script> directly in the MutationObserver
    // path via the host element's connectedCallback.
    attribute({
      name: 'local-event-script',
      requirement: {
        key: 'denied',
        value: 'denied',
      },
      apply({ el, effect, signal }) {
        const host = el as LocalEventScript

        // Phase 6a: hand Datastar's reactive primitives to the host
        host.connectDatastar({ effect, signal })

        // Phase 6b: if the host is already initialized (wiring ran before
        // Datastar attribute plugin fired), re-wire signal watchers through
        // Datastar's effect() for proper reactivity
        const wiring = host.wiring
        if (wiring && wiring.watchers.length > 0) {
          for (const watcher of wiring.watchers) {
            wireSignalWatcherViaDatastar(watcher, effect, () => host.context!)
          }
          console.log(`[LES:datastar] re-wired ${wiring.watchers.length} signal watchers via Datastar effect()`)
        }

        console.log('[LES:datastar] attribute plugin applied to', el.id || el.tagName)

        return () => {
          host.disconnectDatastar()
          console.log('[LES:datastar] attribute plugin cleaned up', el.id || el.tagName)
        }
      },
    })

    bridgeRegistered = true
    console.log('[LES:datastar] bridge registered')

  } catch {
    console.log('[LES] running in standalone mode (Datastar not available)')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal integration utilities
// Used by executor.ts when Datastar is present
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads a signal value from Datastar's root object.
 * Falls back to undefined if Datastar is not available.
 *
 * This is called by the LESContext.getSignal function when the Datastar
 * bridge is connected, giving LES expressions access to all Datastar signals.
 */
export function readDatastarSignal(
  name: string,
  dsSignal: (<T>(name: string, init?: T) => { value: T }) | undefined
): unknown {
  if (!dsSignal) return undefined
  try {
    return dsSignal(name).value
  } catch {
    return undefined
  }
}

/**
 * Writes a value to Datastar's signal tree.
 * This triggers Datastar's reactive graph — any data-text, data-show,
 * data-class attributes bound to this signal will update automatically.
 */
export function writeDatastarSignal(
  name: string,
  value: unknown,
  dsSignal: (<T>(name: string, init?: T) => { value: T }) | undefined
): void {
  if (!dsSignal) return
  try {
    const sig = dsSignal<unknown>(name, value)
    sig.value = value
  } catch {
    // Signal may not exist yet — it will be created by data-signals on the host
  }
}
