/**
 * Phase 4: wires the parsed config into live runtime behavior.
 *
 * Responsibilities:
 *   1. Register all <local-command> parsed defs into the CommandRegistry
 *   2. Attach CustomEvent listeners on the host for each <on-event>
 *   3. Wire <on-load> to fire after DOM is ready
 *   4. Build the LESContext used by the executor
 *
 * <on-signal> and <on-enter>/<on-exit> are wired in Phase 5/6.
 */

import { execute, evalExpr } from './executor.js'
import { LESScope } from './scope.js'
import type { CommandRegistry } from './registry.js'
import type { ModuleRegistry } from '@modules/types.js'
import type { LESConfig } from '@parser/config.js'
import type { LESNode } from '@parser/ast.js'
import { parseLES } from '@parser/index.js'

export interface ParsedWiring {
  commands:  Array<{ name: string; guard: string | null; argsRaw: string; body: LESNode }>
  handlers:  Array<{ event: string; body: LESNode }>
  watchers:  Array<{ signal: string; when: string | null; body: LESNode }>
  lifecycle: {
    onLoad:  LESNode[]
    onEnter: Array<{ when: string | null; body: LESNode }>
    onExit:  LESNode[]
  }
}

/** Builds a LESContext for the host element. */
export function buildContext(
  host: Element,
  commands: CommandRegistry,
  modules: ModuleRegistry,
  signals: { get: (k: string) => unknown; set: (k: string, v: unknown) => void }
): import('./executor.js').LESContext {
  const scope = new LESScope()

  const emitLocal = (event: string, payload: unknown[]) => {
    console.log(`[LES] emit "${event}"`, payload.length ? payload : '')
    host.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: false,
      composed: false,
    }))
  }

  const broadcast = (event: string, payload: unknown[]) => {
    console.log(`[LES] broadcast "${event}"`, payload.length ? payload : '')
    // Dispatch on document directly, not on the host element.
    // This prevents the host's own on-event listeners from catching the
    // broadcast — the host is the origin, not a receiver.
    // Listeners on document (e.g. document.addEventListener) and Datastar
    // data-on: bindings on any DOM element still receive it normally.
    const root = host.getRootNode()
    const target = root instanceof Document ? root : (root as ShadowRoot).ownerDocument ?? document
    target.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: false,   // already at the top — bubbling is meaningless here
      composed: false,
    }))
  }

  return {
    scope,
    host,
    commands,
    modules,
    getSignal: signals.get,
    setSignal: signals.set,
    emitLocal,
    broadcast,
  }
}

/**
 * Registers all parsed commands into the registry.
 * Called once during _init, before any events are wired.
 */
export function registerCommands(
  wiring: ParsedWiring,
  registry: CommandRegistry
): void {
  for (const cmd of wiring.commands) {
    // Parse argsRaw into ArgDef[] (simplified — full arg parsing in Phase 2 refinement)
    const args = parseArgsRaw(cmd.argsRaw)
    const def: import('./registry.js').CommandDef = {
      name: cmd.name,
      args,
      body: cmd.body,
      element: document.createElement('local-command'),
    }
    if (cmd.guard) def.guard = cmd.guard
    registry.register(def)
  }
  console.log(`[LES] registered ${wiring.commands.length} commands`)
}

/**
 * Attaches event listeners on the host for all <on-event> handlers.
 * Returns a cleanup function that removes all listeners.
 */
export function wireEventHandlers(
  wiring: ParsedWiring,
  host: Element,
  getCtx: () => import('./executor.js').LESContext
): () => void {
  const cleanups: Array<() => void> = []

  for (const handler of wiring.handlers) {
    const listener = (e: Event) => {
      const ctx = getCtx()
      // Expose event detail in scope
      const handlerScope = ctx.scope.child()
      const detail = (e as CustomEvent).detail ?? {}
      handlerScope.set('event', e)
      handlerScope.set('payload', detail.payload ?? [])
      const handlerCtx = { ...ctx, scope: handlerScope }

      execute(handler.body, handlerCtx).catch(err => {
        console.error(`[LES] Error in handler for "${handler.event}":`, err)
      })
    }

    host.addEventListener(handler.event, listener)
    cleanups.push(() => host.removeEventListener(handler.event, listener))
    console.log(`[LES] wired event handler: "${handler.event}"`)
  }

  return () => cleanups.forEach(fn => fn())
}

/**
 * Fires all <on-load> bodies.
 * Called after commands are registered and event handlers are wired,
 * so emit/call statements in on-load can reach their targets.
 */
export async function fireOnLoad(
  wiring: ParsedWiring,
  getCtx: () => import('./executor.js').LESContext
): Promise<void> {
  for (const body of wiring.lifecycle.onLoad) {
    try {
      await execute(body, getCtx())
    } catch (err) {
      console.error('[LES] Error in on-load:', err)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Arg parsing (simplified — full type-checked version in Phase 2 refinement)
// ─────────────────────────────────────────────────────────────────────────────

import type { ArgDef } from './registry.js'
import type { ExprNode } from '@parser/ast.js'

function parseArgsRaw(raw: string): ArgDef[] {
  if (!raw.trim()) return []
  // Strip outer brackets: "[from:str  to:str  attempt:int=0]" → "from:str  to:str  attempt:int=0"
  const inner = raw.replace(/^\[|\]$/g, '').trim()
  if (!inner) return []

  return inner.split(/\s{2,}|\s(?=\w+:)/).map(s => s.trim()).filter(Boolean).map(part => {
    // `name:type=default` or `name:type`
    const eqIdx = part.indexOf('=')
    const colonIdx = part.indexOf(':')
    if (colonIdx === -1) return { name: part, type: 'dyn' }

    const name = part.slice(0, colonIdx).trim()
    const rest = part.slice(colonIdx + 1)

    if (eqIdx === -1) {
      return { name, type: rest.trim() }
    } else {
      const type = part.slice(colonIdx + 1, eqIdx).trim()
      const defaultRaw = part.slice(eqIdx + 1).trim()
      const defaultExpr: ExprNode = { type: 'expr', raw: defaultRaw }
      return { name, type, default: defaultExpr }
    }
  })
}
