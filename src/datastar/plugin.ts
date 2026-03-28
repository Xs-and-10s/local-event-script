/**
 * Datastar bridge — registers <local-event-script> as a Datastar attribute plugin.
 *
 * Phase 0: stub that imports the registration function and sets up the shape.
 * Phase 6: fills in signal watching, @action passthrough, and reactive effect wiring.
 *
 * LES is designed to work without Datastar (standalone custom elements only).
 * This file is only imported when Datastar is present in the importmap.
 * The main index.ts conditionally imports it via a try/catch dynamic import.
 */
import type { LocalEventScript } from '@elements/LocalEventScript.js'

let bridgeRegistered = false

export async function registerDatastarBridge(): Promise<void> {
  if (bridgeRegistered) return

  try {
    const { attribute } = await import('datastar')

    attribute({
      name: 'local-event-script',
      // No key suffix expected (data-local-event-script, not data-local-event-script:key)
      requirement: {
        key: 'denied',
        value: 'denied',
      },
      apply({ el, effect, signal }) {
        const host = el as LocalEventScript

        // Phase 6 will wire signal watching and @action passthrough here.
        // Phase 0: just connect the Datastar primitives so the host knows
        // they're available.
        host.connectDatastar({ effect, signal })

        console.log('[LES:datastar] attribute plugin applied to', el.id || el)

        // Return cleanup function — called when element is removed from DOM.
        return () => {
          host.disconnectDatastar()
          console.log('[LES:datastar] attribute plugin cleaned up', el.id || el)
        }
      },
    })

    bridgeRegistered = true
    console.log('[LES:datastar] bridge registered')
  } catch {
    // Datastar not present — LES runs in standalone mode.
    console.log('[LES] Running in standalone mode (Datastar not found in importmap)')
  }
}
