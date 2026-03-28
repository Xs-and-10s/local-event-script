/**
 * Phase 5a: IntersectionObserver wiring
 *
 * One shared IntersectionObserver is created per <local-event-script> host.
 * It watches the host element itself (not its children).
 *
 * on-enter: fires when the host crosses into the viewport
 *   - Each <on-enter> has an optional `when` guard evaluated at fire time
 *   - Multiple <on-enter> children are all checked in declaration order
 *
 * on-exit: fires when the host leaves the viewport
 *   - Always fires unconditionally (no `when` guard on on-exit)
 *   - Multiple <on-exit> children all fire
 *
 * The observer is disconnected in disconnectedCallback via the returned cleanup fn.
 */

import { execute, evalExpr } from './executor.js'
import type { LESContext } from './executor.js'
import type { LESNode } from '@parser/ast.js'

export interface OnEnterDecl {
  when: string | null
  body: LESNode
}

/**
 * Attaches an IntersectionObserver to the host element.
 *
 * @returns A cleanup function that disconnects the observer.
 */
export function wireIntersectionObserver(
  host: Element,
  onEnter: OnEnterDecl[],
  onExit: LESNode[],
  getCtx: () => LESContext,
): () => void {
  if (onEnter.length === 0 && onExit.length === 0) {
    // Nothing to observe — skip creating the IO entirely
    return () => {}
  }

  let wasIntersecting: boolean | null = null

  const observer = new IntersectionObserver(
    (entries) => {
      // IO fires once immediately on attach with the current state.
      // We track `wasIntersecting` to avoid spurious on-exit on first tick.
      for (const entry of entries) {
        const nowIntersecting = entry.isIntersecting

        if (nowIntersecting && wasIntersecting !== true) {
          // Entered viewport
          wasIntersecting = true
          handleEnter(onEnter, getCtx)
        } else if (!nowIntersecting && wasIntersecting === true) {
          // Exited viewport (only after we've been in it)
          wasIntersecting = false
          handleExit(onExit, getCtx)
        } else if (wasIntersecting === null) {
          // First tick — record state but don't fire exit for initially-off-screen
          wasIntersecting = nowIntersecting
        }
      }
    },
    {
      // Default threshold: fire when any pixel of the host enters/exits
      threshold: 0,
    }
  )

  observer.observe(host)
  console.log('[LES] IntersectionObserver attached', (host as HTMLElement).id || host.tagName)

  return () => {
    observer.disconnect()
    console.log('[LES] IntersectionObserver disconnected')
  }
}

function handleEnter(decls: OnEnterDecl[], getCtx: () => LESContext): void {
  const ctx = getCtx()

  for (const decl of decls) {
    // Evaluate `when` guard — if absent, always fires
    if (decl.when) {
      const passes = Boolean(evalExpr({ type: 'expr', raw: decl.when }, ctx))
      if (!passes) {
        console.log(`[LES] on-enter guard rejected: ${decl.when}`)
        continue
      }
    }

    execute(decl.body, ctx).catch(err => {
      console.error('[LES] Error in on-enter:', err)
    })
  }
}

function handleExit(bodies: LESNode[], getCtx: () => LESContext): void {
  const ctx = getCtx()

  for (const body of bodies) {
    execute(body, ctx).catch(err => {
      console.error('[LES] Error in on-exit:', err)
    })
  }
}
