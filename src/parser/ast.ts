// ─────────────────────────────────────────────────────────────────────────────
// LES AST node types
// Every construct in the LES mini-language maps to exactly one of these nodes.
// The parser (Phase 2) produces these; the executor (Phase 3) consumes them.
// ─────────────────────────────────────────────────────────────────────────────

/** A raw JavaScript expression string — evaluated by the runtime in scope. */
export interface ExprNode {
  type: 'expr'
  raw: string
}

/** A then-chain: steps execute in order, each awaited before the next starts. */
export interface SequenceNode {
  type: 'sequence'
  steps: LESNode[]
}

/**
 * An and-group: all branches start simultaneously (Promise.all).
 * Used for concurrent animations:
 *   fade-out #splash 200ms ease-in and
 *   slide-down #splash 180ms ease-in
 */
export interface ParallelNode {
  type: 'parallel'
  branches: LESNode[]
}

/** set $signal to <expr> — writes a Datastar signal */
export interface SetNode {
  type: 'set'
  /** Signal name without the $ prefix e.g. 'feedState' */
  signal: string
  value: ExprNode
}

/**
 * emit event:name [payload, ...] — dispatches a local CustomEvent
 * on the host <local-event-script> element (bubbles: false).
 */
export interface EmitNode {
  type: 'emit'
  event: string
  payload: ExprNode[]
}

/**
 * broadcast event:name [payload, ...] — dispatches a DOM CustomEvent
 * with bubbles: true, composed: true so external Datastar listeners hear it.
 */
export interface BroadcastNode {
  type: 'broadcast'
  event: string
  payload: ExprNode[]
}

/** wait 300ms — suspends execution for the given duration */
export interface WaitNode {
  type: 'wait'
  /** Duration in milliseconds */
  ms: number
}

/**
 * call command:name [arg: value, ...] — invokes a <local-command> by name.
 * If the command's guard fails, execution stops silently (not an error).
 */
export interface CallNode {
  type: 'call'
  command: string
  args: Record<string, ExprNode>
}

/**
 * name <- @verb 'url' [arg: value, ...] — async fetch, binds result to name.
 * The fetch is await-transparent: `then` after this line waits for it to resolve.
 */
export interface BindNode {
  type: 'bind'
  /** Local variable name to store the result in */
  name: string
  action: ActionNode
}

/** @get/@post/@put/@patch/@delete — a Datastar backend action */
export interface ActionNode {
  type: 'action'
  /** HTTP verb: 'get' | 'post' | 'put' | 'patch' | 'delete' */
  verb: string
  url: string
  args: Record<string, ExprNode>
}

// ─── Pattern matching ────────────────────────────────────────────────────────

export type PatternNode =
  | { kind: 'literal';  value: string | number | boolean | null }
  | { kind: 'binding';  name: string }   // named capture: 'it', 'error', etc.
  | { kind: 'wildcard' }                 // _
  | { kind: 'or';       patterns: PatternNode[] }  // 0 | 1 | 2

export interface MatchArm {
  /** All patterns in the arm, applied left-to-right. First match wins. */
  patterns: PatternNode[]
  body: LESNode
}

/**
 * match subject
 *   [pattern ...] -> body
 *   [_]           -> fallback
 * /match
 */
export interface MatchNode {
  type: 'match'
  subject: ExprNode
  arms: MatchArm[]
}

// ─── Error handling ──────────────────────────────────────────────────────────

/**
 * try
 *   body
 * rescue
 *   error handler (optional)
 * afterwards
 *   always runs if execution entered the try block (optional)
 * /try
 *
 * Guard rejection is NOT an error — rescue and afterwards do not fire.
 */
export interface TryNode {
  type: 'try'
  body: LESNode
  rescue?: LESNode
  afterwards?: LESNode
}

// ─── Animation ───────────────────────────────────────────────────────────────

/**
 * <primitive> <selector> <duration>ms <easing> [<key>: <value>, ...]
 *
 * Examples:
 *   stagger-enter .feed-item  120ms ease-out [gap: 40ms  from: right]
 *   pulse .feed-item.is-updated  300ms ease-in-out
 *   slide-out [data-item-id: id]  150ms ease-in [to: right]
 */
export interface AnimationNode {
  type: 'animation'
  /** Primitive name: 'fade-in', 'stagger-enter', 'pulse', etc. */
  primitive: string
  /**
   * CSS selector string. May be:
   *   '.feed-item'            → class selector
   *   '#splash.visible'       → id + class guard
   *   '[data-item-id: id]'   → attribute selector (id is a local variable)
   */
  selector: string
  /** Duration in milliseconds */
  duration: number
  /** CSS easing function string e.g. 'ease-out', 'ease-in-out' */
  easing: string
  /** Named options from the trailing [...] block */
  options: Record<string, ExprNode>
}

// ─── Union ───────────────────────────────────────────────────────────────────

export type LESNode =
  | SequenceNode
  | ParallelNode
  | SetNode
  | EmitNode
  | BroadcastNode
  | WaitNode
  | CallNode
  | BindNode
  | ActionNode
  | MatchNode
  | TryNode
  | AnimationNode
  | ExprNode
