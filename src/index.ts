/**
 * local-event-script — main entry point
 *
 * Import order matters for custom element registration:
 *   1. Host element first (LocalEventScript)
 *   2. Child elements that reference it
 *   3. Datastar bridge last (optional — fails gracefully if Datastar absent)
 *
 * Usage via importmap + script tag:
 *
 *   <script type="importmap">
 *     {
 *       "imports": {
 *         "datastar": "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-RC.8/bundles/datastar.js"
 *       }
 *     }
 *   </script>
 *   <script type="module" src="/dist/local-event-script.js"></script>
 *
 * Without the importmap (or with datastar absent), LES runs in standalone mode:
 * all custom elements work, Datastar signal watching and @action passthrough
 * are unavailable.
 */

// ─── Custom elements ──────────────────────────────────────────────────────────
// Each import registers its element(s) as a side effect.

export { LocalEventScript } from '@elements/LocalEventScript.js'
export { LocalCommand }     from '@elements/LocalCommand.js'
export { OnEvent }          from '@elements/OnEvent.js'
export { OnSignal }         from '@elements/OnSignal.js'
export { OnLoad, OnEnter, OnExit } from '@elements/Lifecycle.js'
export { UseModule }        from '@elements/UseModule.js'

// ─── Runtime utilities ────────────────────────────────────────────────────────

/**
 * Resolves once all LES custom elements are defined and ready to use.
 *
 * Primarily useful when loading LES via dynamic import() or from a CDN,
 * where the caller cannot be certain the bundle has evaluated before
 * attempting to create or interact with LES elements.
 *
 *   const { lesReady } = await import('./local-event-script.js')
 *   await lesReady
 *   // <local-event-script> is now defined; safe to attach elements
 *
 * When loading via a static <script type="module"> in <head>, elements are
 * defined synchronously during module evaluation — lesReady resolves on the
 * next microtask and is effectively immediate.
 */
export const lesReady: Promise<void> =
  customElements.whenDefined('local-event-script').then(() => undefined)

// ─── Type exports (for TypeScript consumers) ──────────────────────────────────
export type { LESNode }                   from '@parser/ast.js'
export type { LESModule, LESPrimitive }   from '@modules/types.js'
export type { CommandDef, ArgDef }        from '@runtime/registry.js'
export { LESScope }                       from '@runtime/scope.js'

// ─── Datastar bridge (optional) ───────────────────────────────────────────────
// Dynamic import so the bundle works without Datastar present.
import { registerDatastarBridge } from '@datastar/plugin.js'
registerDatastarBridge()
export type { LESConfig, CommandDecl, EventHandlerDecl, SignalWatcherDecl,
              OnLoadDecl, OnEnterDecl, OnExitDecl, ModuleDecl } from '@parser/config.js'
export { readConfig, logConfig } from '@parser/reader.js'
export { stripBody }             from '@parser/stripBody.js'
export { parseLES, LESParser, LESParseError } from '@parser/index.js'
