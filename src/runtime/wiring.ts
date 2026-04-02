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
    const root = host.getRootNode()
    const target = root instanceof Document ? root : (root as ShadowRoot).ownerDocument ?? document
    const trigger = _currentHandlerEvent.get(host) ?? null
    target.dispatchEvent(new CustomEvent(event, {
      detail: { payload, __broadcastOrigin: host, __broadcastTrigger: trigger },
      bubbles: false,
      composed: false,
    }))
  }

  // Walk up the _lesParent chain, dispatching on each ancestor's host element.
  // Every ancestor with an on-event handler for this event will fire it.
  // Propagation always reaches root — no implicit stopping.
  //
  // auto-relay: if an ancestor has the `auto-relay` attribute, the bubble is
  // ALSO re-broadcast on document so JS document.addEventListener listeners
  // (and LES instances outside this tree) receive it — without needing explicit
  // relay on-event handlers in the ancestor's LES config.
  const bubble = (event: string, payload: unknown[]) => {
    console.log(`[LES] bubble "${event}"`, payload.length ? payload : '')
    const docRoot = host.getRootNode()
    const doc = docRoot instanceof Document ? docRoot : (docRoot as ShadowRoot).ownerDocument ?? document
    let current = (host as any)._lesParent as Element | null
    while (current) {
      // Dispatch on ancestor — ancestor's hostListener(s) fire for this event
      current.dispatchEvent(new CustomEvent(event, {
        detail: { payload, __bubbleOrigin: host },
        bubbles: false,
        composed: false,
      }))
      // If this ancestor has the auto-relay attribute, re-broadcast globally.
      // __autoRelayOrigin stamps the event so the ancestor's own docListener
      // skips it (the hostListener already fired above — no double-handling).
      if ((current as HTMLElement).hasAttribute('auto-relay')) {
        console.log(`[LES] auto-relay "${event}" via #${(current as Element).id || '(no id)'}`)
        doc.dispatchEvent(new CustomEvent(event, {
          detail: { payload, __bubbleOrigin: host, __autoRelayOrigin: current },
          bubbles: false,
          composed: false,
        }))
      }
      current = (current as any)._lesParent as Element | null
    }
  }

  // Walk all registered LES descendants depth-first, dispatching on each.
  const cascade = (event: string, payload: unknown[]) => {
    console.log(`[LES] cascade "${event}"`, payload.length ? payload : '')
    const visit = (el: any) => {
      const children: Set<Element> = el._lesChildren ?? new Set()
      for (const child of children) {
        child.dispatchEvent(new CustomEvent(event, {
          detail: { payload, __cascadeOrigin: host },
          bubbles: false,
          composed: false,
        }))
        visit(child)
      }
    }
    visit(host)
  }

  // Looks up a named function in the global LESBridge registry and calls it.
  const forward = async (name: string, payload: unknown[]) => {
    const registry = (globalThis as any).LESBridge as Map<string, (...args: unknown[]) => unknown> | undefined
    if (!registry) {
      console.warn(`[LES] forward "${name}": LESBridge not initialized. Add <use-module type="bridge"> or set window.LESBridge before LES init.`)
      return
    }
    const fn = registry.get(name)
    if (!fn) {
      console.warn(`[LES] forward "${name}": no bridge registered. Available: [${[...registry.keys()].join(', ')}]`)
      return
    }
    console.log(`[LES] forward "${name}"`, payload.length ? payload : '')
    const result = fn(...payload)
    if (result instanceof Promise) await result
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
    bubble,
    cascade,
    forward,
  }
}

// Tracks which event name is currently being handled per host element.
// Used to stamp broadcasts so docListeners can detect same-event relay loops.
// JS is single-threaded: safe to set synchronously before execute(), read in broadcast().
const _currentHandlerEvent = new WeakMap<Element, string>()

/**
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
 * Attaches event listeners on BOTH the host AND document for all <on-event> handlers.
 *
 * emit      → dispatched on host, bubbles:false     → host listener fires only
 * broadcast → dispatched on document, bubbles:false → doc listener fires only
 *
 * Loop prevention for same-event relay (`on-event X → broadcast X`):
 *   Before execute(), we stamp _currentHandlerEvent[host] = handler.event.
 *   broadcast() reads this and stamps __broadcastTrigger on the CustomEvent.
 *   docListener skips if: origin===host AND trigger===this handler's event.
 *   This prevents: host handles X → broadcasts X → docListener handles X → loop.
 *
 * Cross-event delivery (`on-event A → broadcast B`, A≠B) is NOT blocked:
 *   #page-controller handles analysis:computed → broadcasts page:data-ready.
 *   Its own docListener for page:data-ready sees trigger=analysis:computed ≠ page:data-ready → FIRES ✓
 */
export function wireEventHandlers(
  wiring: ParsedWiring,
  host: Element,
  getCtx: () => import('./executor.js').LESContext
): () => void {
  const cleanups: Array<() => void> = []

  const doc: Document =
    host.getRootNode() instanceof Document
      ? (host.getRootNode() as Document)
      : (host as Element).ownerDocument ?? document

  for (const handler of wiring.handlers) {
    const run = (e: Event) => {
      _currentHandlerEvent.set(host, handler.event)
      const ctx = getCtx()
      const handlerScope = ctx.scope.child()
      const detail = (e as CustomEvent).detail ?? {}
      handlerScope.set('event', e)
      handlerScope.set('payload', detail.payload ?? [])
      execute(handler.body, { ...ctx, scope: handlerScope }).catch(err => {
        console.error(`[LES] Error in handler for "${handler.event}":`, err)
      })
    }

    // Host listener → emit path
    const hostListener = (e: Event) => run(e)

    // Doc listener → broadcast path; skip same-event relay loops only
    const docListener = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {}
      const sameOrigin  = detail.__broadcastOrigin === host
      const sameTrigger = detail.__broadcastTrigger === handler.event
      // Only skip if this host rebroadcasts the exact event it's handling (relay loop)
      if (sameOrigin && sameTrigger) return
      // Skip auto-relay events that this element itself re-broadcast.
      // The hostListener already fired when the bubble hit this element directly.
      if (detail.__autoRelayOrigin === host) return
      run(e)
    }

    host.addEventListener(handler.event, hostListener)
    doc.addEventListener(handler.event, docListener)
    cleanups.push(() => {
      host.removeEventListener(handler.event, hostListener)
      doc.removeEventListener(handler.event, docListener)
    })
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
