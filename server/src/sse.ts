// ─────────────────────────────────────────────────────────────────────────────
// Datastar SSE helpers
//
// Builds the SSE wire format that Datastar's client expects.
// Spec: https://data-star.dev/reference/sse
//
// Two event types:
//   datastar-patch-elements   — add/remove/replace DOM nodes
//   datastar-patch-signals    — update client-side signal values
// ─────────────────────────────────────────────────────────────────────────────

export type PatchMode =
  | 'outer'    // replace element including its tag (default)
  | 'inner'    // replace element's children only
  | 'replace'  // alias for outer
  | 'prepend'  // insert before first child
  | 'append'   // insert after last child
  | 'before'   // insert before the element
  | 'after'    // insert after the element
  | 'remove'   // remove matched element(s)

export interface PatchElementsOptions {
  selector?: string
  mode?: PatchMode
  useViewTransition?: boolean
}

/**
 * Formats a datastar-patch-elements SSE event.
 * Each HTML line must be prefixed with `data: elements `.
 */
export function patchElements(html: string, opts: PatchElementsOptions = {}): string {
  const lines: string[] = ['event: datastar-patch-elements']

  if (opts.selector) lines.push(`data: selector ${opts.selector}`)
  if (opts.mode && opts.mode !== 'outer') lines.push(`data: mode ${opts.mode}`)
  if (opts.useViewTransition) lines.push('data: useViewTransition true')

  // Each HTML line needs its own `data: elements ` prefix
  for (const line of html.split('\n')) {
    lines.push(`data: elements ${line}`)
  }

  // SSE event is terminated by a blank line
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

/**
 * Formats a datastar-patch-signals SSE event.
 * Merges the provided signals object into the client's signal tree.
 */
export function patchSignals(signals: Record<string, unknown>, onlyIfMissing = false): string {
  const lines = ['event: datastar-patch-signals']
  if (onlyIfMissing) lines.push('data: onlyIfMissing true')
  lines.push(`data: signals ${JSON.stringify(signals)}`)
  lines.push('')
  lines.push('')
  return lines.join('\n')
}

/** SSE response headers required by Datastar */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',  // disable Nginx buffering if behind a proxy
} as const
