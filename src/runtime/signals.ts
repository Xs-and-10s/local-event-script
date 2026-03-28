/**
 * Phase 5b: Signal watcher wiring
 *
 * <on-signal> reacts whenever a named Datastar signal changes.
 * The `when` guard is re-evaluated on every change — if falsy, the
 * handle body does not run (not an error, just filtered out).
 *
 * In Phase 5 we use a simple local notification path: whenever
 * LocalEventScript._setSignal() writes a value, it calls into
 * notifySignalWatchers(). This handles the fallback (no Datastar) case.
 *
 * Phase 6 replaces the notification path with Datastar's effect() system,
 * which is more efficient (batched, deduped, reactive graph-aware).
 *
 * The watcher fires the body asynchronously (non-blocking) to match
 * the behaviour of Datastar's reactive effects.
 */

import { execute, evalExpr } from './executor.js'
import type { LESContext } from './executor.js'
import type { LESNode } from '@parser/ast.js'

export interface SignalWatcherDecl {
  /** Signal name with $ prefix: "$feedState" */
  signal: string
  /** Optional guard expression — null means always fires */
  when: string | null
  body: LESNode
}

/**
 * Checks all signal watchers to see if any should fire for the
 * given signal name change.
 *
 * Called from LocalEventScript._setSignal() after every write.
 * Also called from Phase 6 Datastar effect() subscriptions.
 *
 * @param changedSignal  The signal name *without* the $ prefix
 * @param watchers       All on-signal declarations for this LES instance
 * @param getCtx         Returns the current execution context
 */
export function notifySignalWatchers(
  changedSignal: string,
  watchers: SignalWatcherDecl[],
  getCtx: () => LESContext
): void {
  for (const watcher of watchers) {
    // Normalize: strip leading $ for comparison
    const watchedKey = watcher.signal.replace(/^\$/, '')

    if (watchedKey !== changedSignal) continue

    const ctx = getCtx()

    // Evaluate `when` guard
    if (watcher.when) {
      const passes = Boolean(evalExpr({ type: 'expr', raw: watcher.when }, ctx))
      if (!passes) continue
    }

    // Fire the body asynchronously — don't block the signal write path
    execute(watcher.body, ctx).catch(err => {
      console.error(`[LES] Error in on-signal "${watcher.signal}":`, err)
    })
  }
}

/**
 * Creates a Datastar-compatible effect subscription for one signal watcher.
 * Used in Phase 6 when Datastar is present.
 *
 * @param watcher   The on-signal declaration
 * @param effect    Datastar's effect() function
 * @param getCtx    Returns the current execution context
 */
export function wireSignalWatcherViaDatastar(
  watcher: SignalWatcherDecl,
  effect: (fn: () => void) => void,
  getCtx: () => LESContext
): void {
  effect(() => {
    const ctx = getCtx()

    // Reading the signal inside an effect() auto-subscribes us to it
    const signalKey = watcher.signal.replace(/^\$/, '')
    ctx.getSignal(signalKey) // subscription side-effect

    if (watcher.when) {
      const passes = Boolean(evalExpr({ type: 'expr', raw: watcher.when }, ctx))
      if (!passes) return
    }

    execute(watcher.body, ctx).catch(err => {
      console.error(`[LES] Error in on-signal "${watcher.signal}" (Datastar):`, err)
    })
  })
}
