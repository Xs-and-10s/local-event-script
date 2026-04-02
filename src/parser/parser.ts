import type {
  LESNode, ExprNode, SequenceNode, ParallelNode,
  SetNode, EmitNode, BroadcastNode, BubbleNode, CascadeNode, ForwardNode,
  WaitNode, CallNode,
  BindNode, ActionNode, MatchNode, MatchArm, PatternNode,
  TryNode, AnimationNode,
} from './ast.js'
import type { Token } from './tokenizer.js'
import {
  endsWithAnd, stripTrailingAnd,
  BLOCK_TERMINATORS, TRY_CLAUSE_KEYWORDS,
} from './tokenizer.js'

// ─────────────────────────────────────────────────────────────────────────────
// Known animation primitive names (registered by the animation module)
// ─────────────────────────────────────────────────────────────────────────────

const ANIMATION_PRIMITIVES = new Set([
  'fade-in', 'fade-out', 'slide-in', 'slide-out',
  'slide-up', 'slide-down', 'pulse',
  'stagger-enter', 'stagger-exit',
  'shake',
])

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

export class LESParser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset]
  }

  private advance(): Token {
    const t = this.tokens[this.pos]
    if (!t) throw new LESParseError('Unexpected end of input', undefined)
    this.pos++
    return t
  }

  private atEnd(): boolean {
    return this.pos >= this.tokens.length
  }

  private tryConsume(text: string): boolean {
    const t = this.peek()
    if (t?.text === text) { this.pos++; return true }
    return false
  }

  // ─── Entry point ───────────────────────────────────────────────────────────

  parse(): LESNode {
    const node = this.parseBlock(-1)
    return node
  }

  // ─── Block parser ──────────────────────────────────────────────────────────

  /**
   * Parses all statements at indent > baseIndent.
   *
   * Stops when it encounters:
   *   - A token with indent <= baseIndent
   *   - A block terminator (/match, /try) — left for the parent to consume
   *   - A try-clause keyword (rescue, afterwards) at indent <= baseIndent
   *   - End of token stream
   *
   * Returns a SequenceNode if multiple steps, otherwise the single node.
   */
  private parseBlock(baseIndent: number): LESNode {
    const steps: LESNode[] = []

    while (!this.atEnd()) {
      const t = this.peek()!

      // Stop: we've returned to or past the parent block's indent
      if (t.indent <= baseIndent) break

      // Stop: block terminators are consumed by the block opener (match/try)
      if (BLOCK_TERMINATORS.has(t.text)) break

      // Stop: try-clause keywords end the current try body
      if (TRY_CLAUSE_KEYWORDS.has(t.text) && t.indent <= baseIndent + 2) break

      // ── Sequential connective: standalone `then` ──────────────────────────
      // `then` alone on a line introduces the next sequential step,
      // which is a block at a deeper indent level.
      if (t.text === 'then') {
        const thenIndent = t.indent
        this.advance() // consume `then`
        const next = this.peek()
        if (next && next.indent > thenIndent) {
          const step = this.parseBlock(thenIndent)
          steps.push(step)
        }
        continue
      }

      // ── Sequential connective: `then X` as prefix ─────────────────────────
      // `then call foo`, `then emit bar`, etc.
      // The `then` is just a visual sequencer — the rest of the line is the step.
      if (t.text.startsWith('then ')) {
        this.advance()
        const rest = t.text.slice(5).trim()
        const step = this.parseSingleLine(rest, t.indent, t)
        steps.push(step)
        continue
      }

      // ── Regular statement (possibly a parallel group) ─────────────────────
      const stmt = this.parseStatementOrParallel(t.indent)
      steps.push(stmt)
    }

    return toSequenceOrSingle(steps)
  }

  // ─── Parallel group ────────────────────────────────────────────────────────

  /**
   * Parses one statement or a group of parallel statements connected by `and`.
   *
   * Lines ending with a standalone `and` indicate that the next line runs
   * concurrently. All parallel branches are wrapped in a ParallelNode.
   *
   * `and`-groups only apply within the same indent level. A deeper-indented
   * line after `and` is an error (would indicate a block, but `and` is
   * a line-level connector, not a block opener).
   */
  private parseStatementOrParallel(blockIndent: number): LESNode {
    const branches: LESNode[] = []

    while (!this.atEnd()) {
      const t = this.peek()!

      // Stop conditions — same as parseBlock's
      if (t.indent < blockIndent) break
      if (t.indent > blockIndent) break   // shouldn't happen here, safety guard
      if (BLOCK_TERMINATORS.has(t.text)) break
      if (TRY_CLAUSE_KEYWORDS.has(t.text)) break
      if (t.text === 'then' || t.text.startsWith('then ')) break

      const hasAnd = endsWithAnd(t.text)
      const lineText = hasAnd ? stripTrailingAnd(t.text) : t.text

      this.advance()

      const stmt = this.parseSingleLine(lineText, t.indent, t)
      branches.push(stmt)

      if (!hasAnd) break
    }

    if (branches.length === 0) return expr('')
    if (branches.length === 1) return branches[0]!
    return { type: 'parallel', branches } satisfies ParallelNode
  }

  // ─── Single-line dispatch ──────────────────────────────────────────────────

  /**
   * Parses a single statement from its text content.
   * The text has already had `then ` prefix and trailing ` and` stripped.
   *
   * Dispatch order matters: more specific patterns must come before general ones.
   */
  private parseSingleLine(text: string, indent: number, token: Token): LESNode {
    const first = firstWord(text)

    // ── Block constructs (consume multiple following tokens) ────────────────
    if (first === 'match') return this.parseMatch(text, indent, token)
    if (first === 'try')   return this.parseTry(indent, token)

    // ── Simple statement dispatch ────────────────────────────────────────────
    if (first === 'set')       return this.parseSet(text, token)
    if (first === 'emit')      return this.parseEmit(text, token)
    if (first === 'broadcast') return this.parseBroadcast(text, token)
    if (first === 'bubble')    return this.parseBubble(text, token)
    if (first === 'cascade')   return this.parseCascade(text, token)
    if (first === 'forward')   return this.parseForward(text, token)
    if (first === 'call')      return this.parseCall(text, token)
    if (first === 'wait')      return this.parseWait(text, token)

    // ── Bare Datastar action: `@get '/url' [args]` (fire-and-await, no bind) ──
    if (first.startsWith('@'))  return this.parseAction(text, token)

    // ── Async bind: `name <- @verb 'url' [args]` ─────────────────────────────
    if (text.includes(' <- ')) return this.parseBind(text, token)

    // ── Animation primitive (built-in) ──────────────────────────────────────
    if (ANIMATION_PRIMITIVES.has(first)) return this.parseAnimation(text, token)

    // ── Animation primitive (userland module) ────────────────────────────────
    // Any word followed by a CSS selector looks like an animation call.
    // Covers both hyphenated names (scroll-reveal, spring-in) and bare names (shake).
    if (looksLikeAnimationCall(text)) {
      return this.parseAnimation(text, token)
    }

    // ── Unknown: store as raw expression (escape hatch / future keywords) ────
    console.warn(`[LES:parser] Unknown statement: ${JSON.stringify(text)}`, token)
    return expr(text)
  }

  // ─── Match block ───────────────────────────────────────────────────────────

  private parseMatch(text: string, indent: number, token: Token): MatchNode {
    // `text` is e.g. "match response" or "match $feedState"
    const subjectRaw = text.slice('match'.length).trim()
    const subject: ExprNode = expr(subjectRaw)
    const arms: MatchArm[] = []

    while (!this.atEnd()) {
      const t = this.peek()!

      // /match terminates the block
      if (t.text === '/match') {
        this.advance()
        break
      }

      // Only consume arm lines at the expected arm indent (indent + 2)
      if (t.indent <= indent) {
        console.warn(`[LES:parser] Unclosed match block — missing /match`, token)
        break
      }

      // Parse an arm: `[pattern] ->` or `[pattern] -> body`
      if (t.text.startsWith('[')) {
        arms.push(this.parseMatchArm(t.indent, t))
        continue
      }

      // Skip unexpected lines inside match
      console.warn(`[LES:parser] Unexpected token inside match block: ${JSON.stringify(t.text)}`, t)
      this.advance()
    }

    return { type: 'match', subject, arms }
  }

  private parseMatchArm(armIndent: number, token: Token): MatchArm {
    const t = this.advance() // consume the arm line

    // Split on ` ->` to separate pattern from body
    const arrowIdx = t.text.indexOf(' ->')
    if (arrowIdx === -1) {
      console.warn(`[LES:parser] Match arm missing '->': ${JSON.stringify(t.text)}`, t)
      return { patterns: [{ kind: 'wildcard' }], body: expr('') }
    }

    const patternRaw = t.text.slice(0, arrowIdx).trim()
    const afterArrow = t.text.slice(arrowIdx + 3).trim()  // everything after `->`

    const patterns = parsePatterns(patternRaw)

    let body: LESNode
    if (afterArrow.length > 0) {
      // Inline arm: `['error'] -> set $feedState to 'error'`
      body = this.parseSingleLine(afterArrow, armIndent, token)
    } else {
      // Multi-line arm: body is the deeper-indented block
      body = this.parseBlock(armIndent)
    }

    return { patterns, body }
  }

  // ─── Try block ─────────────────────────────────────────────────────────────

  private parseTry(indent: number, token: Token): TryNode {
    // Note: the `try` token was already consumed by the calling parseStatementOrParallel.
    // Do NOT call this.advance() here — that would skip the first body line.

    // Parse body — stops at rescue/afterwards//try at the same indent level
    const body = this.parseBlock(indent)

    let rescue: LESNode | undefined = undefined
    let afterwards: LESNode | undefined = undefined

    // rescue clause (optional)
    if (this.peek()?.text === 'rescue' && this.peek()?.indent === indent) {
      this.advance() // consume `rescue`
      rescue = this.parseBlock(indent)
    }

    // afterwards clause (optional)
    if (this.peek()?.text === 'afterwards' && this.peek()?.indent === indent) {
      this.advance() // consume `afterwards`
      afterwards = this.parseBlock(indent)
    }

    // Consume /try
    if (this.peek()?.text === '/try') {
      this.advance()
    } else {
      console.warn(`[LES:parser] Unclosed try block — missing /try`, token)
    }

    const tryNode: TryNode = { type: 'try', body }
    if (rescue    !== undefined) tryNode.rescue     = rescue
    if (afterwards !== undefined) tryNode.afterwards = afterwards
    return tryNode
  }

  // ─── Simple statement parsers ──────────────────────────────────────────────

  private parseSet(text: string, token: Token): SetNode {
    // `set $signal to expr`
    const m = text.match(/^set\s+\$(\w+)\s+to\s+(.+)$/)
    if (!m) {
      console.warn(`[LES:parser] Malformed set statement: ${JSON.stringify(text)}`, token)
      return { type: 'set', signal: '??', value: expr(text) }
    }
    return {
      type: 'set',
      signal: m[1]!,
      value: expr(m[2]!.trim()),
    }
  }

  private parseEmit(text: string, token: Token): EmitNode {
    // `emit event:name [payload, ...]` or `emit event:name`
    const { name, payload } = parseEventLine(text.slice('emit'.length).trim(), token)
    return { type: 'emit', event: name, payload }
  }

  private parseBroadcast(text: string, token: Token): BroadcastNode {
    const { name, payload } = parseEventLine(text.slice('broadcast'.length).trim(), token)
    return { type: 'broadcast', event: name, payload }
  }

  private parseBubble(text: string, token: Token): BubbleNode {
    const { name, payload } = parseEventLine(text.slice('bubble'.length).trim(), token)
    return { type: 'bubble', event: name, payload }
  }

  private parseCascade(text: string, token: Token): CascadeNode {
    const { name, payload } = parseEventLine(text.slice('cascade'.length).trim(), token)
    return { type: 'cascade', event: name, payload }
  }

  private parseForward(text: string, token: Token): ForwardNode {
    // `forward name` or `forward name [payload, ...]`
    // Same shape as parseEmit/parseBroadcast but the "event" is a bridge name.
    const { name, payload } = parseEventLine(text.slice('forward'.length).trim(), token)
    return { type: 'forward', name, payload }
  }

  private parseCall(text: string, token: Token): CallNode {
    // `call command:name [arg: value, ...]` or `call command:name`
    const m = text.match(/^call\s+([^\s\[]+)\s*(?:\[(.+)\])?$/)
    if (!m) {
      console.warn(`[LES:parser] Malformed call statement: ${JSON.stringify(text)}`, token)
      return { type: 'call', command: '??', args: {} }
    }
    return {
      type: 'call',
      command: m[1]!,
      args: parseArgList(m[2] ?? ''),
    }
  }

  private parseWait(text: string, token: Token): WaitNode {
    // `wait 300ms` or `wait (attempt + 1) * 500ms`
    const m = text.match(/^wait\s+(.+?)ms$/)
    if (!m) {
      console.warn(`[LES:parser] Malformed wait statement: ${JSON.stringify(text)}`, token)
      return { type: 'wait', ms: 0 }
    }
    const msExpr = m[1]!.trim()
    // Simple literal
    const literal = Number(msExpr)
    if (!Number.isNaN(literal)) return { type: 'wait', ms: literal }
    // Expression — store as 0 with the expression as a comment (executor will eval)
    // Phase 3 will handle dynamic durations properly
    return { type: 'wait', ms: 0 }
  }

  private parseBind(text: string, token: Token): BindNode {
    // `name <- @verb 'url' [args]`
    const m = text.match(/^(\w+)\s+<-\s+@(\w+)\s+'([^']+)'\s*(?:\[(.+)\])?$/)
    if (!m) {
      console.warn(`[LES:parser] Malformed bind statement: ${JSON.stringify(text)}`, token)
      return {
        type: 'bind',
        name: '??',
        action: { type: 'action', verb: 'get', url: '', args: {} },
      }
    }
    const action: ActionNode = {
      type: 'action',
      verb: m[2]!.toLowerCase(),
      url: m[3]!,
      args: parseArgList(m[4] ?? ''),
    }
    return { type: 'bind', name: m[1]!, action }
  }

  private parseAction(text: string, token: Token): ActionNode {
    // `@get '/url' [args]` or `@post '/url' [args]`
    const m = text.match(/^@(\w+)\s+'([^']+)'\s*(?:\[(.+)\])?$/)
    if (!m) {
      console.warn(`[LES:parser] Malformed action: ${JSON.stringify(text)}`, token)
      return { type: 'action', verb: 'get', url: '', args: {} }
    }
    return {
      type: 'action',
      verb: m[1]!.toLowerCase(),
      url: m[2]!,
      args: parseArgList(m[3] ?? ''),
    }
  }

  private parseAnimation(text: string, token: Token): AnimationNode {
    // `primitive selector duration easing [options]`
    // Examples:
    //   stagger-enter .feed-item  120ms ease-out [gap: 40ms  from: right]
    //   pulse .feed-item.is-updated  300ms ease-in-out
    //   slide-out [data-item-id: id]  150ms ease-in [to: right]

    // Tokenize: split on whitespace but preserve [...] groups
    const parts = splitAnimationLine(text)

    const primitive = parts[0] ?? ''
    const selector  = parts[1] ?? ''
    const durationStr = parts[2] ?? '0ms'
    const easing    = parts[3] ?? 'ease'
    const optionsStr = parts[4] ?? ''  // may be absent

    const durationMs = parseInt(durationStr, 10)

    return {
      type: 'animation',
      primitive,
      selector,
      duration: Number.isNaN(durationMs) ? 0 : durationMs,
      easing,
      options: parseAnimationOptions(optionsStr),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a pattern group like `[it   ok   ]`, `[nil  error]`, `[_]`,
 * `['error']`, `[0 | 1 | 2]`.
 *
 * Returns an array of PatternNode — one per element in the tuple pattern.
 * For or-patterns (`0 | 1 | 2`), returns a single OrPatternNode.
 */
function parsePatterns(raw: string): PatternNode[] {
  // Strip outer brackets
  const inner = raw.replace(/^\[|\]$/g, '').trim()

  // Check for or-pattern: contains ` | `
  if (inner.includes(' | ') || inner.includes('|')) {
    const alternatives = inner.split(/\s*\|\s*/).map(p => parseSinglePattern(p.trim()))
    return [{ kind: 'or', patterns: alternatives }]
  }

  // Tuple pattern: space-separated elements
  // Use a custom split to handle multiple spaces (alignment padding)
  return inner.trim().split(/\s{2,}|\s(?=\S)/).filter(s => s.trim())
    .map(p => parseSinglePattern(p.trim()))
}

function parseSinglePattern(s: string): PatternNode {
  if (s === '_')   return { kind: 'wildcard' }
  if (s === 'nil') return { kind: 'literal', value: null }

  // String literal: 'value'
  if (s.startsWith("'") && s.endsWith("'")) {
    return { kind: 'literal', value: s.slice(1, -1) }
  }

  // Number literal
  const n = Number(s)
  if (!Number.isNaN(n)) return { kind: 'literal', value: n }

  // Boolean
  if (s === 'true')  return { kind: 'literal', value: true }
  if (s === 'false') return { kind: 'literal', value: false }

  // Everything else is a binding (captures the value for use in the body)
  return { kind: 'binding', name: s }
}

// ─────────────────────────────────────────────────────────────────────────────
// Argument list parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses `key: value  key2: value2` from inside a [...] argument block.
 * Values are stored as ExprNode (evaluated at runtime).
 */
function parseArgList(raw: string): Record<string, ExprNode> {
  if (!raw.trim()) return {}

  const result: Record<string, ExprNode> = {}

  // Split on `  ` (double-space used as separator in LES style)
  // but also handle single `  key: value` entries
  // Simple regex: `word: rest_until_next_word:`
  const pairs = raw.trim().split(/(?<=\S)\s{2,}(?=\w)/)
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':')
    if (colonIdx === -1) continue
    const key   = pair.slice(0, colonIdx).trim()
    const value = pair.slice(colonIdx + 1).trim()
    if (key) result[key] = expr(value)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Event line parsing: `event:name [payload...]`
// ─────────────────────────────────────────────────────────────────────────────

function parseEventLine(
  raw: string,
  token: Token
): { name: string; payload: ExprNode[] } {
  // `feed:data-ready` or `feed:data-ready [$feedItems]` or `feed:error [$error]`
  const bracketIdx = raw.indexOf('[')
  if (bracketIdx === -1) {
    return { name: raw.trim(), payload: [] }
  }
  const name = raw.slice(0, bracketIdx).trim()
  const payloadRaw = raw.slice(bracketIdx + 1, raw.lastIndexOf(']')).trim()

  // Payload elements are comma-separated or two-or-more-space separated.
  // Single space is intentionally NOT a separator — expressions can contain
  // spaces (e.g., `a + b`). Use commas or double-space to separate items:
  //   [payload[0], payload[1]]   ← preferred (unambiguous)
  //   [payload[0]  payload[1]]   ← also works (legacy double-space)
  const payload: ExprNode[] = payloadRaw
    ? payloadRaw.split(/,\s*|\s{2,}/).map(s => expr(s.trim())).filter(e => e.raw)
    : []

  return { name, payload }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation line parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits an animation line into its structural parts, preserving [...] groups.
 *
 * Input:  `stagger-enter .feed-item  120ms ease-out [gap: 40ms  from: right]`
 * Output: ['stagger-enter', '.feed-item', '120ms', 'ease-out', '[gap: 40ms  from: right]']
 */
function splitAnimationLine(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let inBracket = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '[') {
      inBracket++
      current += ch
    } else if (ch === ']') {
      inBracket--
      current += ch
    } else if (ch === ' ' && inBracket === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Parses animation options from a `[key: value  key2: value2]` string.
 * The outer brackets are included in the input.
 */
function parseAnimationOptions(raw: string): Record<string, ExprNode> {
  if (!raw.trim()) return {}
  // Strip outer brackets
  const inner = raw.replace(/^\[|\]$/g, '').trim()
  return parseArgList(inner)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function expr(raw: string): ExprNode {
  return { type: 'expr', raw }
}

function firstWord(text: string): string {
  return text.split(/\s+/)[0] ?? ''
}

/**
 * Returns true if a statement looks like an animation call:
 *   <word-with-hyphen>  <selector|duration>  ...
 *
 * This allows userland module primitives (scroll-reveal, spring-in, etc.)
 * to be parsed as AnimationNode without being listed in ANIMATION_PRIMITIVES.
 * The executor then dispatches them through the ModuleRegistry.
 */
function looksLikeAnimationCall(text: string): boolean {
  const parts = text.trim().split(/\s+/)
  if (parts.length < 2) return false
  const second = parts[1] ?? ''
  // Second token is a CSS selector (.class, #id, [attr], tagname) or a duration (Nms)
  return /^[.#\[]/.test(second) ||  // CSS selector
         /^\d+ms$/.test(second)      // bare duration (unusual but valid)
}

function toSequenceOrSingle(steps: LESNode[]): LESNode {
  if (steps.length === 0) return expr('')
  if (steps.length === 1) return steps[0]!
  return { type: 'sequence', steps } satisfies SequenceNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse error
// ─────────────────────────────────────────────────────────────────────────────

export class LESParseError extends Error {
  constructor(message: string, public readonly token: Token | undefined) {
    const loc = token ? ` (line ${token.lineNum}: ${JSON.stringify(token.text)})` : ''
    super(`[LES:parser] ${message}${loc}`)
    this.name = 'LESParseError'
  }
}
