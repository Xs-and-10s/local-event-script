import type {
  LESNode, ExprNode, SequenceNode, ParallelNode,
  SetNode, EmitNode, BroadcastNode, WaitNode,
  CallNode, BindNode, MatchNode, TryNode, AnimationNode,
} from '@parser/ast.js'
import type { PatternNode } from '@parser/ast.js'
import { LESScope } from './scope.js'
import type { CommandRegistry } from './registry.js'
import type { ModuleRegistry } from '@modules/types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Execution context — everything the executor needs, passed down the call tree
// ─────────────────────────────────────────────────────────────────────────────

export interface LESContext {
  /** Local variable scope for the current call frame */
  scope: LESScope
  /** The <local-event-script> host element — used as querySelector root */
  host: Element
  /** Command definitions registered by <local-command> children */
  commands: CommandRegistry
  /** Animation and other primitive modules */
  modules: ModuleRegistry
  /** Read a Datastar signal value by name (without $ prefix) */
  getSignal: (name: string) => unknown
  /** Write a Datastar signal value by name (without $ prefix) */
  setSignal: (name: string, value: unknown) => void
  /** Dispatch a local CustomEvent on the host (bubbles: false) */
  emitLocal: (event: string, payload: unknown[]) => void
  /** Dispatch a DOM-wide CustomEvent (bubbles: true, composed: true) */
  broadcast: (event: string, payload: unknown[]) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Main executor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a LESNode AST in the given context.
 *
 * Async transparency: every step is awaited regardless of whether it
 * is synchronous or returns a Promise. The author never writes `await`.
 * The `then` connective in LES source maps to sequential `await` here.
 * The `and` connective maps to `Promise.all`.
 */
export async function execute(node: LESNode, ctx: LESContext): Promise<void> {
  switch (node.type) {

    // ── Sequence: A then B then C ──────────────────────────────────────────
    case 'sequence':
      for (const step of (node as SequenceNode).steps) {
        await execute(step, ctx)
      }
      return

    // ── Parallel: A and B and C (Promise.all) ──────────────────────────────
    case 'parallel':
      await Promise.all((node as ParallelNode).branches.map(b => execute(b, ctx)))
      return

    // ── set $signal to expr ────────────────────────────────────────────────
    case 'set': {
      const n = node as SetNode
      const value = evalExpr(n.value, ctx)
      ctx.setSignal(n.signal, value)
      return
    }

    // ── emit event:name [payload] ──────────────────────────────────────────
    case 'emit': {
      const n = node as EmitNode
      const payload = n.payload.map(p => evalExpr(p, ctx))
      ctx.emitLocal(n.event, payload)
      return
    }

    // ── broadcast event:name [payload] ────────────────────────────────────
    case 'broadcast': {
      const n = node as BroadcastNode
      const payload = n.payload.map(p => evalExpr(p, ctx))
      ctx.broadcast(n.event, payload)
      return
    }

    // ── wait Nms ──────────────────────────────────────────────────────────
    case 'wait': {
      const n = node as WaitNode
      await new Promise<void>(resolve => setTimeout(resolve, n.ms))
      return
    }

    // ── call command:name [args] ───────────────────────────────────────────
    case 'call': {
      const n = node as CallNode
      const def = ctx.commands.get(n.command)
      if (!def) {
        console.warn(`[LES] Unknown command: "${n.command}"`)
        return
      }

      // Evaluate guard — falsy = silent no-op (not an error, no rescue)
      if (def.guard) {
        const passes = evalGuard(def.guard, ctx)
        if (!passes) {
          console.debug(`[LES] command "${n.command}" guard rejected`)
          return
        }
      }

      // Build child scope: bind args into it
      const childScope = ctx.scope.child()
      const evaledArgs: Record<string, unknown> = {}
      for (const [key, exprNode] of Object.entries(n.args)) {
        evaledArgs[key] = evalExpr(exprNode, ctx)
      }

      // Apply arg defaults from def (Phase 2 ArgDef parsing — simplified here)
      for (const argDef of def.args) {
        if (!(argDef.name in evaledArgs) && argDef.default) {
          evaledArgs[argDef.name] = evalExpr(argDef.default, ctx)
        }
        childScope.set(argDef.name, evaledArgs[argDef.name] ?? null)
      }

      const childCtx: LESContext = { ...ctx, scope: childScope }
      await execute(def.body, childCtx)
      return
    }

    // ── name <- @verb 'url' [args] ─────────────────────────────────────────
    case 'bind': {
      const n = node as BindNode
      const { verb, url, args } = n.action
      const evaledArgs: Record<string, unknown> = {}
      for (const [key, exprNode] of Object.entries(args)) {
        evaledArgs[key] = evalExpr(exprNode, ctx)
      }

      let result: unknown
      try {
        result = await performAction(verb, url, evaledArgs, ctx)
      } catch (err) {
        // Propagate so enclosing try/rescue can catch it
        throw err
      }

      ctx.scope.set(n.name, result)
      return
    }

    // ── match subject / arms / /match ──────────────────────────────────────
    case 'match': {
      const n = node as MatchNode
      const subject = evalExpr(n.subject, ctx)

      for (const arm of n.arms) {
        const bindings = matchPatterns(arm.patterns, subject)
        if (bindings !== null) {
          // Create child scope with pattern bindings
          const armScope = ctx.scope.child()
          for (const [k, v] of Object.entries(bindings)) {
            armScope.set(k, v)
          }
          const armCtx: LESContext = { ...ctx, scope: armScope }
          await execute(arm.body, armCtx)
          return   // First matching arm wins — no fallthrough
        }
      }

      console.warn('[LES] match: no arm matched subject:', subject)
      return
    }

    // ── try / rescue / afterwards / /try ───────────────────────────────────
    case 'try': {
      const n = node as TryNode
      let threw = false

      try {
        await execute(n.body, ctx)
      } catch (err) {
        threw = true
        if (n.rescue) {
          // Bind the error as `$error` in the rescue scope
          const rescueScope = ctx.scope.child()
          rescueScope.set('error', err)
          const rescueCtx: LESContext = { ...ctx, scope: rescueScope }
          await execute(n.rescue, rescueCtx)
        } else {
          // No rescue clause — re-throw so outer try can catch it
          throw err
        }
      } finally {
        if (n.afterwards) {
          // afterwards always runs if execution entered the try body
          // (guard rejection never reaches here — see `call` handler above)
          await execute(n.afterwards, ctx)
        }
      }

      if (threw && !n.rescue) {
        // Already re-thrown above — unreachable, but TypeScript needs this
      }
      return
    }

    // ── animation primitive ────────────────────────────────────────────────
    case 'animation': {
      const n = node as AnimationNode
      const primitive = ctx.modules.get(n.primitive)

      if (!primitive) {
        console.warn(ctx.modules.hintFor(n.primitive))
        return
      }

      // Resolve selector — substitute any local variable references
      const selector = resolveSelector(n.selector, ctx)

      // Evaluate options
      const options: Record<string, unknown> = {}
      for (const [key, exprNode] of Object.entries(n.options)) {
        options[key] = evalExpr(exprNode, ctx)
      }

      // Await the animation — this is the core of async transparency:
      // Web Animations API returns an Animation with a .finished Promise.
      // `then` in LES source awaits this naturally.
      await primitive(selector, n.duration, n.easing, options, ctx.host)
      return
    }

    // ── raw expression (escape hatch / unknown statements) ─────────────────
    case 'expr': {
      const n = node as ExprNode
      if (n.raw.trim()) {
        // Evaluate as a JS expression for side effects
        // This handles unknown primitives and future keywords gracefully
        evalExpr(n, ctx)
      }
      return
    }

    // ── action (bare @get etc. not inside a bind) ──────────────────────────
    case 'action': {
      // Bare actions without bind just fire and discard the result
      const n = node
      await performAction(n.verb, n.url, {}, ctx)
      return
    }

    default: {
      const exhaustive: never = node
      console.warn('[LES] Unknown node type:', (exhaustive as LESNode).type)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expression evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates a raw JS expression string in a sandboxed context that
 * exposes scope locals and Datastar signals via a Proxy.
 *
 * Signal access: `$feedState` → reads the `feedState` signal
 * Local access:  `filter`    → reads from scope
 *
 * The sandbox is intentionally simple for Phase 3. A proper sandbox
 * (CSP-compatible, no eval fallback) is a future hardening task.
 */
export function evalExpr(node: ExprNode, ctx: LESContext): unknown {
  if (!node.raw.trim()) return undefined

  // Fast path: simple string literal
  if (node.raw.startsWith("'") && node.raw.endsWith("'")) {
    return node.raw.slice(1, -1)
  }
  // Fast path: number literal
  const num = Number(node.raw)
  if (!Number.isNaN(num) && node.raw.trim() !== '') return num
  // Fast path: boolean
  if (node.raw === 'true')  return true
  if (node.raw === 'false') return false
  if (node.raw === 'null' || node.raw === 'nil') return null

  try {
    // Build a flat object of all accessible names:
    // - Scope locals (innermost wins)
    // - Datastar signals via $-prefix stripping
    const scopeSnapshot = ctx.scope.snapshot()

    // Extract signal references from the expression ($name → name)
    const signalNames = [...node.raw.matchAll(/\$([a-zA-Z_]\w*)/g)]
      .map(m => m[1]!)

    const signals: Record<string, unknown> = {}
    for (const name of signalNames) {
      signals[name] = ctx.getSignal(name)
    }

    // Rewrite $name → __sig_name in the expression so we can pass signals
    // as plain variables (avoids $ in JS identifiers)
    let rewritten = node.raw
    for (const name of signalNames) {
      rewritten = rewritten.replaceAll(`$${name}`, `__sig_${name}`)
    }

    // Prefix signal vars in the binding object
    const sigBindings: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(signals)) {
      sigBindings[`__sig_${k}`] = v
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function(
      ...Object.keys(scopeSnapshot),
      ...Object.keys(sigBindings),
      `return (${rewritten})`
    )
    return fn(
      ...Object.values(scopeSnapshot),
      ...Object.values(sigBindings)
    )
  } catch (err) {
    console.warn(`[LES] Expression eval error: ${JSON.stringify(node.raw)}`, err)
    return undefined
  }
}

/**
 * Evaluates a guard expression string (from command `guard` attribute).
 * Returns true if the guard passes (command should run), false to silent-abort.
 */
function evalGuard(guardExpr: string, ctx: LESContext): boolean {
  const result = evalExpr({ type: 'expr', raw: guardExpr }, ctx)
  return Boolean(result)
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to match `subject` against `patterns`.
 *
 * Returns a bindings map if matched (empty map for wildcard/literal matches),
 * or null if the match fails.
 *
 * For tuple patterns, `subject` is matched element-by-element.
 * For or-patterns, any alternative matching returns the bindings.
 */
function matchPatterns(
  patterns: PatternNode[],
  subject: unknown
): Record<string, unknown> | null {
  // Single-pattern (most common): match directly
  if (patterns.length === 1) {
    return matchSingle(patterns[0]!, subject)
  }

  // Tuple pattern: subject must be an array
  if (!Array.isArray(subject)) {
    // Wrap single value in tuple for ergonomics
    // e.g. `[it ok]` against a {ok: true, data: ...} response
    return matchTuple(patterns, subject)
  }

  return matchTuple(patterns, subject)
}

function matchTuple(
  patterns: PatternNode[],
  subject: unknown
): Record<string, unknown> | null {
  // For non-array subjects, try binding each pattern against the whole subject
  // (handles `[it ok]` matching an object where `it` = object, `ok` = status)
  const bindings: Record<string, unknown> = {}

  for (let i = 0; i < patterns.length; i++) {
    const pat = patterns[i]!

    // For tuple patterns against objects, we do a structural match:
    // `[it ok]` against {data: ..., status: 'ok'} binds `it` = data, `ok` = 'ok'
    // This is a simplification — full structural matching comes in a later pass
    const value = Array.isArray(subject)
      ? subject[i]
      : i === 0 ? subject : undefined

    const result = matchSingle(pat, value)
    if (result === null) return null
    Object.assign(bindings, result)
  }

  return bindings
}

function matchSingle(
  pattern: PatternNode,
  value: unknown
): Record<string, unknown> | null {
  switch (pattern.kind) {
    case 'wildcard':
      return {}   // Always matches, binds nothing

    case 'literal':
      return value === pattern.value ? {} : null

    case 'binding':
      return { [pattern.name]: value }   // Always matches, binds name → value

    case 'or': {
      for (const alt of pattern.patterns) {
        const result = matchSingle(alt, value)
        if (result !== null) return result
      }
      return null
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP action
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Performs an HTTP action (@get, @post, etc.).
 *
 * When Datastar actions are available in the host's context, we trigger
 * Datastar's fetch pipeline (which handles signal serialization, SSE
 * response processing, and indicator signals).
 *
 * Falls back to native fetch when Datastar is not present.
 *
 * Note: Datastar's @get / @post are fire-and-forget (they stream SSE back
 * to patch signals/elements). For the bind case (`response <- @get ...`)
 * we use native fetch to get a Promise-based JSON response that LES can
 * bind to a local variable.
 */
async function performAction(
  verb: string,
  url: string,
  args: Record<string, unknown>,
  ctx: LESContext
): Promise<unknown> {
  const method = verb.toUpperCase()

  let fullUrl = url
  let body: string | undefined

  if (method === 'GET' || method === 'DELETE') {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(args)) {
      params.set(k, String(v))
    }
    const qs = params.toString()
    if (qs) fullUrl = `${url}?${qs}`
  } else {
    body = JSON.stringify(args)
  }

  const response = await fetch(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...(body ? { body } : {}),
  })

  if (!response.ok) {
    throw new Error(`[LES] HTTP ${response.status} from ${method} ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await response.json()
  }
  return await response.text()
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves variable references in an animation selector.
 *
 * Example: `[data-item-id: id]` where `id` is a local variable
 * becomes `[data-item-id="123"]` after substitution.
 *
 * Simple approach for Phase 3: look for `: varname` patterns in attribute
 * selectors and substitute from scope.
 */
function resolveSelector(selector: string, ctx: LESContext): string {
  // Handle attribute selector with variable: [data-item-id: id]
  return selector.replace(/\[([^\]]+):\s*(\w+)\]/g, (_match, attr, varName) => {
    const value = ctx.scope.get(varName) ?? ctx.getSignal(varName)
    return `[${attr}="${String(value)}"]`
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard-aware command execution (used by Phase 4 event wiring)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a command by name, checking its guard first.
 * Returns true if the command ran, false if the guard rejected it.
 *
 * This is the public API for Phase 4 event handlers that call commands.
 */
export async function runCommand(
  name: string,
  args: Record<string, unknown>,
  ctx: LESContext
): Promise<boolean> {
  const def = ctx.commands.get(name)
  if (!def) {
    console.warn(`[LES] Unknown command: "${name}"`)
    return false
  }

  if (def.guard) {
    if (!evalGuard(def.guard, ctx)) return false
  }

  const scope = ctx.scope.child()
  for (const argDef of def.args) {
    scope.set(argDef.name, args[argDef.name] ?? null)
  }

  await execute(def.body, { ...ctx, scope })
  return true
}
